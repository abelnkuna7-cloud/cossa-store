import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const COSSA_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const ALLOWED_ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);

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
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function uuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
    admin.from("organisation_members").select("role").eq("organisation_id", COSSA_ORGANISATION_ID).eq("user_id", userId).eq("status", "active").in("role", ["owner", "admin"]),
    admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
  ]);
  if (membership.error || role.error || (!(membership.data ?? []).length && !(role.data ?? []).length)) {
    throw new Error("An authorised Cossa Store administrator is required.");
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(request, { error: "Origin not allowed." }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) return json(request, { error: "Readiness service is not configured." }, 503);

  const customerClient = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const user = await requireUser(request, customerClient);
    await requireAdmin(admin, user.id);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (!uuid(body.storeProductId)) throw new Error("A valid Cossa Store product ID is required.");

    const { data: product, error: productError } = await admin
      .from("store_products")
      .select("id,sku,name,brand,status,price,currency")
      .eq("id", String(body.storeProductId))
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .maybeSingle();
    if (productError || !product) throw new Error("Cossa Store product was not found.");

    const { data: variants, error: variantError } = await admin
      .from("store_product_variants")
      .select("id,sku,title,is_available")
      .eq("product_id", product.id)
      .eq("is_available", true)
      .order("sort_order", { ascending: true });
    if (variantError) throw variantError;

    const { data: mappings, error: mappingError } = await admin
      .from("store_product_fulfilment_mappings")
      .select("id,store_variant_id,provider_product_id,provider_variant_id,blueprint_id,print_provider_id,artwork_asset_ref,fulfilment_status,sync_status")
      .eq("organisation_id", COSSA_ORGANISATION_ID)
      .eq("store_product_id", product.id)
      .eq("provider", "Printify")
      .eq("fulfilment_status", "active");
    if (mappingError) throw mappingError;

    const activeVariants = variants ?? [];
    const activeMappings = mappings ?? [];
    const mappedByVariant = new Map(activeMappings.filter((m) => m.store_variant_id).map((m) => [m.store_variant_id, m]));
    const productLevel = activeMappings.find((m) => !m.store_variant_id) ?? null;

    const variantChecks = activeVariants.map((variant) => {
      const mapping = mappedByVariant.get(variant.id) ?? productLevel;
      const missing: string[] = [];
      if (!mapping) missing.push("mapping");
      if (mapping) {
        if (!mapping.provider_variant_id) missing.push("provider_variant_id");
        const existingProductReady = Boolean(mapping.provider_product_id && mapping.provider_variant_id);
        const customArtworkReady = Boolean(mapping.blueprint_id && mapping.print_provider_id && mapping.provider_variant_id && mapping.artwork_asset_ref);
        if (!existingProductReady && !customArtworkReady) {
          if (!mapping.provider_product_id) missing.push("provider_product_id_or_custom_blueprint");
          if (!mapping.blueprint_id) missing.push("blueprint_id");
          if (!mapping.print_provider_id) missing.push("print_provider_id");
          if (!mapping.artwork_asset_ref) missing.push("artwork_asset_ref");
        }
        if (mapping.sync_status !== "synced") missing.push("mapping_not_synced");
      }
      return { variantId: variant.id, sku: variant.sku, title: variant.title, ready: missing.length === 0, missing: [...new Set(missing)] };
    });

    const missingProductFields: string[] = [];
    if (product.brand !== "Cossa Lifestyle") missingProductFields.push("brand_must_be_cossa_lifestyle");
    if (!product.sku) missingProductFields.push("sku");
    if (!(Number(product.price) > 0)) missingProductFields.push("retail_price");
    if (!activeVariants.length) missingProductFields.push("available_variants");

    const ready = missingProductFields.length === 0 && variantChecks.length > 0 && variantChecks.every((v) => v.ready);
    return json(request, {
      product: { id: product.id, sku: product.sku, name: product.name, brand: product.brand, status: product.status, price: product.price, currency: product.currency },
      productionReady: ready,
      gate: ready ? "PRODUCTION_READY" : "NOT_PRODUCTION_READY",
      missingProductFields,
      variants: variantChecks,
      rule: "Cossa Lifestyle cannot be treated as production-ready until every available variant has one valid synced Printify production mapping.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Production readiness check failed.";
    console.error(JSON.stringify({ event: "printify_production_readiness_failed", message }));
    return json(request, { error: message }, 400);
  }
});
