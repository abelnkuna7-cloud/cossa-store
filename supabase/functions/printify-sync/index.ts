import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

import {
  configureProductWebhooks,
  previewPrintifyCatalogue,
  reconcilePrintifyCatalogue,
} from "../_shared/printify-catalogue.ts";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ALLOWED_ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function defaultApiKey(environmentVariable: string): string | undefined {
  const raw = Deno.env.get(environmentVariable);
  if (!raw) return undefined;
  try {
    const values = JSON.parse(raw) as Record<string, unknown>;
    return typeof values.default === "string" && values.default ? values.default : undefined;
  } catch {
    return undefined;
  }
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(apiKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(apiKey) && headers.get("authorization") === `Bearer ${apiKey}`) {
      headers.delete("authorization");
    }
    headers.set("apikey", apiKey);
    return fetch(input, { ...init, headers });
  };
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function actionName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 50) : "";
}

async function requireUser(
  request: Request,
  client: ReturnType<typeof createClient>,
): Promise<User> {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) throw new Error("Sign in is required.");
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Your session could not be verified.");
  return data.user;
}

async function requireAdmin(admin: ReturnType<typeof createClient>, userId: string) {
  const [{ data: memberships, error: membershipError }, { data: roles, error: roleError }] =
    await Promise.all([
      admin
        .from("organisation_members")
        .select("role")
        .eq("organisation_id", ORG_ID)
        .eq("user_id", userId)
        .eq("status", "active")
        .in("role", ["owner", "admin"]),
      admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
    ]);
  if (membershipError || roleError || (!(memberships ?? []).length && !(roles ?? []).length)) {
    throw new Error("Only the authorised Cossa Store administrator can run Printify sync.");
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(request, { error: "Origin not allowed." }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    defaultApiKey("SUPABASE_PUBLISHABLE_KEYS");
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    defaultApiKey("SUPABASE_SECRET_KEYS");
  const printifyToken = Deno.env.get("PRINTIFY_API_TOKEN");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !printifyToken) {
    const missingConfig = [
      ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
      ...(!publishableKey ? ["Supabase publishable API key"] : []),
      ...(!serviceRoleKey ? ["Supabase server API key"] : []),
      ...(!printifyToken ? ["PRINTIFY_API_TOKEN"] : []),
    ];
    console.error(JSON.stringify({ event: "printify_sync_missing_config", missingConfig }));
    return json(request, { error: `Printify sync needs server configuration: ${missingConfig.join(", ")}.` }, 503);
  }

  const customerClient = createClient(supabaseUrl, publishableKey, {
    global: { fetch: createSupabaseFetch(publishableKey) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    global: { fetch: createSupabaseFetch(serviceRoleKey) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  try {
    const user = await requireUser(request, customerClient);
    await requireAdmin(admin, user.id);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = actionName(body.action) || "preview";

    if (action === "preview") return json(request, await previewPrintifyCatalogue(printifyToken));
    if (action === "stage_drafts" || action === "reconcile") {
      return json(request, await reconcilePrintifyCatalogue(admin, printifyToken));
    }
    if (action === "configure_webhooks") {
      const webhookSecret = Deno.env.get("PRINTIFY_WEBHOOK_SECRET");
      if (!webhookSecret) return json(request, { error: "Automatic Printify sync is not configured." }, 503);
      return json(
        request,
        await configureProductWebhooks(printifyToken, webhookSecret, supabaseUrl),
      );
    }
    return json(request, { error: "Unsupported Printify sync action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Printify sync failed.";
    console.error(JSON.stringify({ event: "printify_sync_failed", message }));
    // The authenticated admin client consumes this explicit payload and displays its safe message.
    // A 2xx response is required because supabase-js otherwise hides the response body.
    return json(request, { error: message });
  }
});
