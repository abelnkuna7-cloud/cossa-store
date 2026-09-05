import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

import {
  PRINTIFY_SHOP_ID,
  configuredShop,
  listAllPrintifyProducts,
  summarizePrintifyProduct,
} from "../_shared/printify-catalogue.ts";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ALLOWED_ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function cors(request: Request): HeadersInit {
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
      ...cors(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function text(value: unknown, max = 240) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function requireUser(request: Request, client: ReturnType<typeof createClient>): Promise<User> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Sign in is required.");
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Your session could not be verified.");
  return data.user;
}

async function requireAdmin(admin: ReturnType<typeof createClient>, userId: string) {
  const [membership, role] = await Promise.all([
    admin
      .from("organisation_members")
      .select("role")
      .eq("organisation_id", ORG_ID)
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["owner", "admin"]),
    admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
  ]);

  if (
    membership.error ||
    role.error ||
    (!(membership.data ?? []).length && !(role.data ?? []).length)
  ) {
    throw new Error("Only an authorised Cossa Store administrator can browse Printify fulfilment products.");
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);

  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(request, { error: "Origin not allowed." }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const printifyToken = Deno.env.get("PRINTIFY_API_TOKEN");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !printifyToken) {
    return json(request, { error: "Printify catalogue browser is not configured." }, 503);
  }

  const customerClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const user = await requireUser(request, customerClient);
    await requireAdmin(admin, user.id);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const search = text(body.search, 120).toLowerCase();

    const [shop, rawProducts] = await Promise.all([
      configuredShop(printifyToken),
      listAllPrintifyProducts(PRINTIFY_SHOP_ID, printifyToken),
    ]);

    const products = rawProducts
      .map((raw: unknown) => summarizePrintifyProduct(raw))
      .filter((product) => !search || product.title.toLowerCase().includes(search) || product.printifyProductId.toLowerCase().includes(search))
      .map((product) => ({
        productId: product.printifyProductId,
        title: product.title,
        images: product.images.slice(0, 4),
        enabledVariantCount: product.enabledVariantCount,
        availableVariantCount: product.availableVariantCount,
        minCostUsd: product.minCostUsd,
        minRetailUsd: product.minRetailUsd,
        variants: product.variants
          .filter((variant) => variant.isEligible)
          .map((variant) => ({
            variantId: variant.providerVariantId,
            sku: variant.sku,
            title: variant.title,
            sourceCostUsd: variant.sourceCost,
            sourceRetailUsd: variant.sourcePrice,
            available: variant.isAvailable,
            enabled: variant.isEnabled,
            options: variant.options,
          })),
      }));

    return json(request, {
      readOnly: true,
      shop,
      count: products.length,
      products,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Printify catalogue browser failed.";
    return json(request, { error: message }, 400);
  }
});
