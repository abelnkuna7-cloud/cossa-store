import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

const FX_ZAR_PER_USD = 16.5;
const RISK_BUFFER_RATE = 0.12;
const FIXED_ORDER_BUFFER_ZAR = 20;
const TARGET_GROSS_MARGIN = 0.35;
const MAX_ACCEPTABLE_DELIVERY_DAYS = 60;
const MAX_SHIPPING_USD = 35;
const MAX_FIRST_WAVE_RETAIL_ZAR = 3000;
const PROCESS_LIMIT = 40;

const ALLOWED_ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);

type AdminClient = ReturnType<typeof createClient>;
type VariantRow = {
  id: string;
  product_id: string;
  provider_variant_id: string;
  source_price: number | string | null;
  source_cost: number | string | null;
  price_zar: number | string | null;
  cost_zar: number | string | null;
  is_available: boolean;
  raw_provider_data: Record<string, unknown> | null;
};
type FreightQuote = {
  origin: string;
  usd: number;
  carrier: string;
  aging: string;
  minDays: number | null;
  maxDays: number | null;
};

function defaultApiKey(name: string) {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed.default === "string" && parsed.default ? parsed.default : undefined;
  } catch {
    return undefined;
  }
}

function isNewKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function supabaseFetch(apiKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (isNewKey(apiKey) && headers.get("authorization") === `Bearer ${apiKey}`) {
      headers.delete("authorization");
    }
    headers.set("apikey", apiKey);
    return fetch(input, { ...init, headers });
  };
}

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
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function positive(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function rawWeight(raw: Record<string, unknown> | null) {
  if (!raw) return 0;
  const direct = positive(raw.weight_g);
  if (direct) return direct;
  const variant = raw.variant && typeof raw.variant === "object"
    ? raw.variant as Record<string, unknown>
    : null;
  return positive(variant?.variantWeight) ?? 0;
}

function parseAging(value: unknown) {
  const label = typeof value === "string" ? value.trim() : "";
  const numbers = label.match(/\d+/g)?.map(Number).filter(Number.isFinite) ?? [];
  return {
    minDays: numbers.length ? Math.min(...numbers) : null,
    maxDays: numbers.length ? Math.max(...numbers) : null,
    label,
  };
}

function freightOptions(payload: any, origin: string): FreightQuote[] {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows
    .map((row: any) => {
      const total = positive(row?.totalPostageFee) ??
        ((positive(row?.logisticPrice) ?? 0) +
          (positive(row?.taxesFee) ?? 0) +
          (positive(row?.clearanceOperationFee) ?? 0));
      const aging = parseAging(row?.logisticAging);
      return {
        origin,
        usd: total,
        carrier:
          typeof row?.logisticName === "string" && row.logisticName.trim()
            ? row.logisticName.trim()
            : "CJ logistics",
        aging: aging.label,
        minDays: aging.minDays,
        maxDays: aging.maxDays,
      };
    })
    .filter((option: FreightQuote) => option.usd > 0);
}

function chooseFreight(options: FreightQuote[]) {
  if (!options.length) return null;
  return [...options].sort((a, b) => {
    const aKnown = a.maxDays !== null ? 0 : 1;
    const bKnown = b.maxDays !== null ? 0 : 1;
    if (aKnown !== bKnown) return aKnown - bKnown;
    const aFast = a.maxDays !== null && a.maxDays <= 30 ? 0 : 1;
    const bFast = b.maxDays !== null && b.maxDays <= 30 ? 0 : 1;
    if (aFast !== bFast) return aFast - bFast;
    const aMax = a.maxDays ?? 999;
    const bMax = b.maxDays ?? 999;
    if (aMax !== bMax) return aMax - bMax;
    return a.usd - b.usd;
  })[0] ?? null;
}

async function requireUser(request: Request, client: ReturnType<typeof createClient>): Promise<User> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("authorization_required");
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("authorization_required");
  return data.user;
}

async function requireAdmin(admin: AdminClient, userId: string) {
  const [memberships, roles] = await Promise.all([
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
    memberships.error ||
    roles.error ||
    (!(memberships.data ?? []).length && !(roles.data ?? []).length)
  ) {
    throw new Error("authorization_required");
  }
}

async function obtainToken(apiKey: string) {
  const response = await fetch(`${CJ_API_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const payload = await response.json().catch(() => null) as any;
  const token = payload?.data?.accessToken;
  if (!response.ok || payload?.code !== 200 || !token) throw new Error("cj_authentication_failed");
  return String(token);
}

async function cjPost(path: string, token: string, body: unknown) {
  const response = await fetch(`${CJ_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null) as any;
  if (!response.ok || payload?.code !== 200 || payload?.result === false) {
    throw new Error("cj_request_failed");
  }
  return payload;
}

async function quoteFreight(token: string, vid: string) {
  const options: FreightQuote[] = [];
  for (const origin of ["CN", "US"]) {
    try {
      const payload = await cjPost("/logistic/freightCalculate", token, {
        startCountryCode: origin,
        endCountryCode: "ZA",
        products: [{ quantity: 1, vid }],
      });
      options.push(...freightOptions(payload, origin));
    } catch {
      // Try the other origin.
    }
  }
  return chooseFreight(options);
}

function psychologicalPrice(value: number) {
  const ceilTen = Math.ceil(value / 10) * 10;
  return Math.max(49.9, Math.round((ceilTen - 0.1) * 100) / 100);
}

function commercialPrice(sourceUsd: number, freightUsd: number) {
  const landed = (sourceUsd + freightUsd) * FX_ZAR_PER_USD;
  const buffered = landed * (1 + RISK_BUFFER_RATE) + FIXED_ORDER_BUFFER_ZAR;
  const retail = psychologicalPrice(buffered / (1 - TARGET_GROSS_MARGIN));
  return {
    landedZar: Math.round(landed * 100) / 100,
    bufferedCostZar: Math.round(buffered * 100) / 100,
    retailZar: retail,
  };
}

async function demote(admin: AdminClient, productId: string) {
  const { error } = await admin
    .from("store_products")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("organisation_id", ORG_ID)
    .eq("supplier_name", "CJ Dropshipping");
  if (error) throw error;
}

async function writeAudit(admin: AdminClient, userId: string, metadata: Record<string, unknown>) {
  const { error } = await admin.from("audit_events").insert({
    organisation_id: ORG_ID,
    actor_type: "user",
    actor_user_id: userId,
    event_type: "cj_commercial_sync_succeeded",
    entity_type: "store_catalogue",
    entity_id: "cj_dropshipping",
    metadata,
  });
  if (error) console.error(JSON.stringify({ event: "cj_commercial_audit_failed", code: error.code ?? "unknown" }));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);

  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(request, { error: "Origin not allowed." }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const pub =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    defaultApiKey("SUPABASE_PUBLISHABLE_KEYS");
  const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? defaultApiKey("SUPABASE_SECRET_KEYS");
  const cjApiKey = Deno.env.get("CJ_API_KEY");

  if (!url || !pub || !srv || !cjApiKey) {
    return json(request, { error: "CJ commercial sync is not configured." }, 503);
  }

  const userClient = createClient(url, pub, {
    global: { fetch: supabaseFetch(pub) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(url, srv, {
    global: { fetch: supabaseFetch(srv) },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let currentUser: User;
  try {
    currentUser = await requireUser(request, userClient);
    await requireAdmin(admin, currentUser.id);
  } catch {
    return json(request, { error: "An authorised Cossa Store administrator is required." }, 401);
  }

  let accessToken: string;
  try {
    accessToken = await obtainToken(cjApiKey);
  } catch {
    return json(request, { error: "CJ authentication is temporarily unavailable." }, 502);
  }

  const { data: products, error: productsError } = await admin
    .from("store_products")
    .select("id,name,status,supplier_product_ref,stock_quantity")
    .eq("organisation_id", ORG_ID)
    .eq("supplier_name", "CJ Dropshipping")
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(PROCESS_LIMIT);

  if (productsError) return json(request, { error: "Cossa catalogue data could not be loaded for CJ pricing." }, 502);

  const results: Array<Record<string, unknown>> = [];

  for (const product of products ?? []) {
    try {
      if (Number(product.stock_quantity ?? 0) <= 0) {
        if (product.status === "active") await demote(admin, product.id);
        results.push({ productId: product.supplier_product_ref, title: product.name, status: "draft", reason: "no_live_inventory" });
        continue;
      }

      const { data: variants, error: variantsError } = await admin
        .from("store_product_variants")
        .select("id,product_id,provider_variant_id,source_price,source_cost,price_zar,cost_zar,is_available,raw_provider_data")
        .eq("product_id", product.id)
        .eq("provider", "CJ Dropshipping")
        .eq("is_available", true);
      if (variantsError) throw variantsError;

      const available = (variants ?? []) as VariantRow[];
      if (!available.length) {
        if (product.status === "active") await demote(admin, product.id);
        results.push({ productId: product.supplier_product_ref, title: product.name, status: "draft", reason: "no_available_variants" });
        continue;
      }

      const representative = [...available].sort(
        (a, b) => rawWeight(b.raw_provider_data) - rawWeight(a.raw_provider_data),
      )[0];
      const quote = await quoteFreight(accessToken, representative.provider_variant_id);

      if (!quote || (quote.maxDays !== null && quote.maxDays > MAX_ACCEPTABLE_DELIVERY_DAYS)) {
        if (product.status === "active") await demote(admin, product.id);
        results.push({ productId: product.supplier_product_ref, title: product.name, status: "draft", reason: "no_za_shipping_method" });
        continue;
      }

      if (quote.usd > MAX_SHIPPING_USD) {
        if (product.status === "active") await demote(admin, product.id);
        results.push({
          productId: product.supplier_product_ref,
          title: product.name,
          status: "draft",
          reason: "freight_too_high",
          shippingCarrier: quote.carrier,
          shippingUsd: quote.usd,
          shippingAging: quote.aging,
        });
        continue;
      }

      const now = new Date().toISOString();
      let minCost = Number.POSITIVE_INFINITY;
      let minRetail = Number.POSITIVE_INFINITY;
      let pricedVariants = 0;

      for (const variant of available) {
        const sourceUsd = positive(variant.source_cost) ?? positive(variant.source_price);
        if (!sourceUsd) continue;
        const pricing = commercialPrice(sourceUsd, quote.usd);
        minCost = Math.min(minCost, pricing.bufferedCostZar);
        minRetail = Math.min(minRetail, pricing.retailZar);
        pricedVariants += 1;

        const raw = variant.raw_provider_data && typeof variant.raw_provider_data === "object"
          ? variant.raw_provider_data
          : {};
        const { error } = await admin
          .from("store_product_variants")
          .update({
            fx_rate_to_zar: FX_ZAR_PER_USD,
            cost_zar: pricing.bufferedCostZar,
            price_zar: pricing.retailZar,
            raw_provider_data: {
              ...raw,
              commercial: {
                destination_country: "ZA",
                shipping_origin: quote.origin,
                shipping_carrier: quote.carrier,
                shipping_aging: quote.aging,
                shipping_min_days: quote.minDays,
                shipping_max_days: quote.maxDays,
                shipping_usd: quote.usd,
                fx_zar_per_usd: FX_ZAR_PER_USD,
                landed_zar: pricing.landedZar,
                buffered_cost_zar: pricing.bufferedCostZar,
                retail_zar: pricing.retailZar,
                priced_at: now,
              },
            },
            updated_at: now,
          })
          .eq("id", variant.id);
        if (error) throw error;
      }

      if (!pricedVariants || !Number.isFinite(minCost) || !Number.isFinite(minRetail)) {
        if (product.status === "active") await demote(admin, product.id);
        results.push({ productId: product.supplier_product_ref, title: product.name, status: "draft", reason: "no_priced_variants" });
        continue;
      }

      if (minRetail > MAX_FIRST_WAVE_RETAIL_ZAR) {
        if (product.status === "active") await demote(admin, product.id);
        results.push({
          productId: product.supplier_product_ref,
          title: product.name,
          status: "draft",
          reason: "retail_price_too_high",
          shippingCarrier: quote.carrier,
          shippingUsd: quote.usd,
          shippingAging: quote.aging,
          minCostZar: Math.round(minCost * 100) / 100,
          fromPriceZar: Math.round(minRetail * 100) / 100,
        });
        continue;
      }

      const { error: productUpdateError } = await admin
        .from("store_products")
        .update({
          fx_rate_to_zar: FX_ZAR_PER_USD,
          fx_rate_updated_at: now,
          cost_price: Math.round(minCost * 100) / 100,
          price: Math.round(minRetail * 100) / 100,
          status: "active",
          updated_at: now,
        })
        .eq("id", product.id)
        .eq("organisation_id", ORG_ID);
      if (productUpdateError) throw productUpdateError;

      results.push({
        productId: product.supplier_product_ref,
        title: product.name,
        status: "active",
        availableVariants: available.length,
        shippingOrigin: quote.origin,
        shippingCarrier: quote.carrier,
        shippingAging: quote.aging,
        shippingMinDays: quote.minDays,
        shippingMaxDays: quote.maxDays,
        shippingUsd: quote.usd,
        minCostZar: Math.round(minCost * 100) / 100,
        fromPriceZar: Math.round(minRetail * 100) / 100,
      });
    } catch (error) {
      try {
        if (product.status === "active") await demote(admin, product.id);
      } catch {
        // Keep the original pricing error as the main failure.
      }
      console.error(JSON.stringify({
        event: "cj_commercial_product_failed",
        productId: String(product.supplier_product_ref ?? "").slice(0, 80),
        kind: error instanceof Error ? error.message.slice(0, 120) : "unknown",
      }));
      results.push({ productId: product.supplier_product_ref, title: product.name, status: "draft", reason: "pricing_failed" });
    }
  }

  const active = results.filter((row) => row.status === "active").length;
  const keptDraft = results.length - active;
  await writeAudit(admin, currentUser.id, {
    processed: results.length,
    active,
    kept_draft: keptDraft,
    fx: FX_ZAR_PER_USD,
    process_limit: PROCESS_LIMIT,
    max_shipping_usd: MAX_SHIPPING_USD,
    max_first_wave_retail_zar: MAX_FIRST_WAVE_RETAIL_ZAR,
  });

  return json(request, {
    processed: results.length,
    activated: active,
    keptDraft,
    pricing: {
      fxZarPerUsd: FX_ZAR_PER_USD,
      riskBufferRate: RISK_BUFFER_RATE,
      fixedOrderBufferZar: FIXED_ORDER_BUFFER_ZAR,
      targetGrossMargin: TARGET_GROSS_MARGIN,
    },
    products: results,
  });
});
