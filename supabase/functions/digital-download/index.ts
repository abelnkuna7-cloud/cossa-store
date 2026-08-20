import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
]);

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://store.cossanexusholdings.co.za";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  const headers = cors(origin);

  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, headers);

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in is required to download this product." }, 401, headers);

  let body: { entitlementId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400, headers);
  }

  const entitlementId = typeof body.entitlementId === "string" ? body.entitlementId.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entitlementId)) {
    return json({ error: "A valid download entitlement is required." }, 400, headers);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SB_PUBLISHABLE_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !serviceRole) {
    console.error("digital-download is missing required Supabase environment variables");
    return json({ error: "Digital delivery is temporarily unavailable." }, 503, headers);
  }

  const customerClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await customerClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Your sign-in session has expired." }, 401, headers);

  const adminClient = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claim, error: claimError } = await adminClient
    .rpc("claim_store_digital_download", {
      p_entitlement_id: entitlementId,
      p_customer_user_id: userData.user.id,
    })
    .single();

  if (claimError || !claim?.storage_path) {
    console.warn("digital download claim rejected", claimError?.message ?? "missing claim");
    return json({ error: "This download is unavailable, expired, unpaid or has reached its limit." }, 403, headers);
  }

  const { data: signed, error: signedError } = await adminClient.storage
    .from("store-digital-products")
    .createSignedUrl(claim.storage_path, 60);
  if (signedError || !signed?.signedUrl) {
    console.error("digital download signing failed", signedError?.message ?? "missing signed URL");
    return json({ error: "Could not prepare your download. Please try again." }, 500, headers);
  }

  return json(
    {
      url: signed.signedUrl,
      fileName: claim.download_name,
      remainingDownloads: claim.remaining_downloads,
      expiresInSeconds: 60,
    },
    200,
    headers,
  );
});

