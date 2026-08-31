import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

import {
  cjDraftDecision,
  qualifyCjCandidate,
  type CjQualificationInput,
  type CjQualificationVariant,
  type CjShippingPreview,
} from "../_shared/cj-qualification.ts";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const KNOWN_ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);

type ServiceClient = ReturnType<typeof createClient>;
type CjQuote = {
  origin: string;
  usd: number;
  carrier: string;
  aging: string;
  minDays: number | null;
  maxDays: number | null;
};
type InspectedCandidate = {
  input: CjQualificationInput;
  source: {
    description: string;
    category: string;
    images: string[];
    variants: Array<Record<string, unknown>>;
  };
};

function configuredDefault(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed.default === "string" ? parsed.default : undefined;
  } catch {
    return undefined;
  }
}

function isOpaqueKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function apiFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (isOpaqueKey(key) && headers.get("authorization") === `Bearer ${key}`) {
      headers.delete("authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function isPreviewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function allowedOrigin(origin: string | null): boolean {
  return Boolean(origin && (KNOWN_ORIGINS.has(origin) || isPreviewOrigin(origin)));
}

function cors(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigin(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function text(value: unknown, maximum = 500): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maximum) : "";
}

function cleanDescription(value: unknown): string {
  return text(
    text(value, 12000)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'"),
    12000,
  );
}

function identifier(value: unknown): string {
  const candidate = text(value, 200);
  return /^[A-Za-z0-9_-]{1,200}$/.test(candidate) ? candidate : "";
}

function exactProductId(value: unknown): string {
  const raw = text(value, 1000);
  if (!raw) return "";
  const direct = identifier(raw);
  if (direct && direct.length >= 6) return direct;
  try {
    const url = new URL(raw);
    for (const name of ["pid", "productId", "product_id"]) {
      const id = identifier(url.searchParams.get(name));
      if (id && id.length >= 6) return id;
    }
    const uuid = url.href.match(/[A-Za-z0-9]{8}(?:-[A-Za-z0-9]{4}){3}-[A-Za-z0-9]{12}/);
    if (uuid) return uuid[0];
    const numeric = url.href.match(/\d{12,}/);
    if (numeric) return numeric[0];
  } catch {
    // A plain product identifier was handled above.
  }
  return "";
}

function positive(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function quantity(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function isUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function complianceFlag(value: string): string | null {
  const haystack = value.toLowerCase();
  if (/\b(vape|e-cig|cigarette|nicotine|tobacco|cbd|thc|cannabis|marijuana)\b/.test(haystack))
    return "regulated";
  if (
    /\b(gun|rifle|pistol|ammo|ammunition|bullet|taser|pepper spray|switchblade|dagger|sword|machete|brass knuckle)\b/.test(
      haystack,
    )
  )
    return "weapon";
  if (
    /\b(spy camera|hidden camera|micro camera|camera jammer|gps jammer|signal jammer)\b/.test(
      haystack,
    )
  )
    return "surveillance";
  if (/\b(dildo|vibrator|sex toy|adult toy|masturbat)\b/.test(haystack)) return "adult";
  if (/\b(steroid|hormone|prescription drug|prescription medicine)\b/.test(haystack))
    return "restricted_health";
  if (/\b(miracle cure|cures cancer|weight loss pill|slimming pill)\b/.test(haystack))
    return "unsafe_claim";
  return null;
}

function category(value: unknown): string {
  const haystack = text(value, 700).toLowerCase();
  if (/travel|luggage|bag|suitcase/.test(haystack)) return "travel-luggage";
  if (/kitchen|bathroom|home|cleaning|coffee|living/.test(haystack)) return "home-living";
  if (/phone|mobile|electronics|computer|camera/.test(haystack)) return "technology-electronics";
  if (/beauty|grooming|makeup/.test(haystack)) return "beauty-grooming";
  if (/pet/.test(haystack)) return "pet-supplies";
  return "other";
}

async function authenticatedUser(
  request: Request,
  client: ReturnType<typeof createClient>,
): Promise<User> {
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!accessToken) throw new Error("unauthorised");
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("unauthorised");
  return data.user;
}

async function requireCossaStoreAdmin(client: ServiceClient, userId: string): Promise<void> {
  const [member, role] = await Promise.all([
    client
      .from("organisation_members")
      .select("role")
      .eq("organisation_id", ORG_ID)
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["owner", "admin"]),
    client.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
  ]);
  if (member.error || role.error || (!(member.data ?? []).length && !(role.data ?? []).length)) {
    throw new Error("forbidden");
  }
}

async function cjToken(apiKey: string): Promise<string> {
  const response = await fetch(`${CJ_API_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const payload = (await response.json().catch(() => null)) as Record<string, any> | null;
  if (!response.ok || payload?.code !== 200 || !payload?.data?.accessToken) {
    throw new Error("cj_authentication_failed");
  }
  return String(payload.data.accessToken);
}

function cjClient(accessToken: string) {
  return async (path: string, body?: unknown): Promise<Record<string, any>> => {
    const response = await fetch(`${CJ_API_BASE}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        "CJ-Access-Token": accessToken,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = (await response.json().catch(() => null)) as Record<string, any> | null;
    if (!response.ok || payload?.code !== 200 || payload?.result === false) {
      throw new Error(`cj_request_failed:${response.status}`);
    }
    return payload;
  };
}

function inventory(payload: Record<string, any>) {
  const totals = new Map<string, number>();
  const available = new Set<string>();
  const inventories = Array.isArray(payload?.data?.inventories) ? payload.data.inventories : [];
  let total = inventories.reduce(
    (sum: number, item: Record<string, unknown>) =>
      sum + quantity(item.totalInventoryNum ?? item.totalInventory),
    0,
  );
  for (const item of Array.isArray(payload?.data?.variantInventories)
    ? payload.data.variantInventories
    : []) {
    const variantId = identifier(item?.vid);
    if (!variantId) continue;
    const availableUnits = (Array.isArray(item?.inventory) ? item.inventory : []).reduce(
      (sum: number, entry: Record<string, unknown>) =>
        sum + quantity(entry.totalInventory ?? entry.totalInventoryNum),
      0,
    );
    totals.set(variantId, availableUnits);
    if (availableUnits > 0) available.add(variantId);
  }
  if (total <= 0 && totals.size)
    total = [...totals.values()].reduce((sum, amount) => sum + amount, 0);
  return { total, totals, available };
}

function idsFrom(payload: Record<string, any>): Set<string> {
  const ids = new Set<string>();
  const variants = Array.isArray(payload?.data?.variants)
    ? payload.data.variants
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  for (const variant of variants) {
    const id = identifier(variant?.vid);
    if (id) ids.add(id);
  }
  return ids;
}

async function availability(
  cj: ReturnType<typeof cjClient>,
  productId: string,
  detail: Record<string, any>,
) {
  const live = inventory(
    await cj(`/product/stock/getInventoryByPid?pid=${encodeURIComponent(productId)}`).catch(() => ({
      data: {},
    })),
  );
  let available = new Set(live.available);
  let source = "inventory";
  if (!available.size) {
    const [cn, us] = await Promise.all([
      cj(`/product/query?pid=${encodeURIComponent(productId)}&countryCode=CN`).catch(() => ({
        data: { variants: [] },
      })),
      cj(`/product/query?pid=${encodeURIComponent(productId)}&countryCode=US`).catch(() => ({
        data: { variants: [] },
      })),
    ]);
    available = new Set([...idsFrom(cn), ...idsFrom(us)]);
    if (available.size) source = "country_product_query";
  }
  if (!available.size) {
    const [cn, us] = await Promise.all([
      cj(`/product/variant/query?pid=${encodeURIComponent(productId)}&countryCode=CN`).catch(
        () => ({ data: [] }),
      ),
      cj(`/product/variant/query?pid=${encodeURIComponent(productId)}&countryCode=US`).catch(
        () => ({ data: [] }),
      ),
    ]);
    available = new Set([...idsFrom(cn), ...idsFrom(us)]);
    if (available.size) source = "country_variant_query";
  }
  if (!available.size) {
    for (const variant of Array.isArray(detail.variants) ? detail.variants : []) {
      const id = identifier(variant?.vid);
      const units = (Array.isArray(variant?.inventories) ? variant.inventories : []).reduce(
        (sum: number, entry: Record<string, unknown>) =>
          sum + quantity(entry.totalInventory ?? entry.totalInventoryNum),
        0,
      );
      if (id && units > 0) {
        available.add(id);
        if (!live.totals.has(id)) live.totals.set(id, units);
      }
    }
    if (available.size) source = "detail_fallback";
  }
  return {
    total: live.total > 0 ? live.total : available.size,
    totals: live.totals,
    available,
    source,
  };
}

function parseAging(value: unknown) {
  const label = text(value, 200);
  const days = label.match(/\d+/g)?.map(Number).filter(Number.isFinite) ?? [];
  return {
    label,
    minDays: days.length ? Math.min(...days) : null,
    maxDays: days.length ? Math.max(...days) : null,
  };
}

function freightOptions(payload: Record<string, any>, origin: string): CjQuote[] {
  const options = Array.isArray(payload.data) ? payload.data : [];
  return options
    .map((option: Record<string, unknown>) => {
      const total =
        positive(option.totalPostageFee) ??
        (positive(option.logisticPrice) ?? 0) +
          (positive(option.taxesFee) ?? 0) +
          (positive(option.clearanceOperationFee) ?? 0);
      const aging = parseAging(option.logisticAging);
      return {
        origin,
        usd: total,
        carrier: text(option.logisticName, 160) || "CJ logistics",
        aging: aging.label,
        minDays: aging.minDays,
        maxDays: aging.maxDays,
      };
    })
    .filter((option: CjQuote) => option.usd > 0);
}

function chooseQuote(options: CjQuote[]): CjQuote | null {
  return (
    [...options].sort((left, right) => {
      const leftSlow = left.maxDays !== null && left.maxDays <= 30 ? 0 : 1;
      const rightSlow = right.maxDays !== null && right.maxDays <= 30 ? 0 : 1;
      return (
        leftSlow - rightSlow ||
        (left.maxDays ?? 999) - (right.maxDays ?? 999) ||
        left.usd - right.usd
      );
    })[0] ?? null
  );
}

async function zaShipping(
  cj: ReturnType<typeof cjClient>,
  variantId: string | null,
): Promise<CjShippingPreview> {
  if (!variantId)
    return {
      status: "unverified",
      reason: "CJ returned no available variant for ZA freight.",
      variantId: null,
    };
  const results = await Promise.all(
    ["CN", "US"].map(async (origin) => {
      try {
        return freightOptions(
          await cj("/logistic/freightCalculate", {
            startCountryCode: origin,
            endCountryCode: "ZA",
            products: [{ quantity: 1, vid: variantId }],
          }),
          origin,
        );
      } catch {
        return null;
      }
    }),
  );
  if (results.every((result) => result === null)) {
    return {
      status: "unverified",
      reason: "CJ freight could not be verified for South Africa.",
      variantId,
    };
  }
  const quote = chooseQuote(results.flatMap((result) => result ?? []));
  if (!quote)
    return {
      status: "unavailable",
      reason: "CJ returned no freight method to South Africa.",
      variantId,
    };
  return {
    status: "verified",
    carrier: quote.carrier,
    aging: quote.aging,
    origin: quote.origin,
    freightUsd: quote.usd,
    minDays: quote.minDays,
    maxDays: quote.maxDays,
    variantId,
  };
}

async function inspectCandidate(
  database: ServiceClient,
  apiKey: string,
  productId: string,
): Promise<InspectedCandidate> {
  const accessToken = await cjToken(apiKey);
  const cj = cjClient(accessToken);
  const detail = (await cj(`/product/query?pid=${encodeURIComponent(productId)}`)).data ?? {};
  const canonicalProductId = identifier(detail.pid);
  if (!canonicalProductId) throw new Error("CJ did not return a valid product identifier.");

  const [existingResult, live] = await Promise.all([
    database
      .from("store_products")
      .select("id,status")
      .eq("organisation_id", ORG_ID)
      .eq("supplier_name", "CJ Dropshipping")
      .eq("supplier_product_ref", canonicalProductId)
      .maybeSingle(),
    availability(cj, canonicalProductId, detail),
  ]);
  if (existingResult.error) throw new Error("Cossa could not check for an existing CJ product.");

  const title = text(detail.productNameEn, 220);
  const description = cleanDescription(detail.description);
  const sourceVariants = Array.isArray(detail.variants) ? detail.variants : [];
  const variants: CjQualificationVariant[] = sourceVariants
    .map((variant: Record<string, unknown>, index: number) => {
      const id = identifier(variant.vid);
      if (!id) return null;
      return {
        id,
        sku: text(variant.variantSku, 220) || null,
        title:
          text(variant.variantNameEn, 220) ||
          text(variant.variantKey, 220) ||
          `CJ option ${index + 1}`,
        sourcePriceUsd: positive(variant.variantSellPrice),
        stockQuantity: live.totals.has(id) ? (live.totals.get(id) ?? 0) : null,
        available: live.available.has(id),
        warehouse:
          text(variant.warehouseName ?? variant.warehouse ?? detail.warehouseName, 120) || null,
      };
    })
    .filter((variant): variant is CjQualificationVariant => variant !== null);
  const representative =
    [...variants]
      .filter((variant) => variant.available)
      .sort((left, right) => (right.stockQuantity ?? 0) - (left.stockQuantity ?? 0))[0] ?? null;
  const images = [
    detail.bigImage,
    ...(Array.isArray(detail.productImageSet) ? detail.productImageSet : []),
  ]
    .filter(isUrl)
    .filter((image: string, index: number, list: string[]) => list.indexOf(image) === index)
    .slice(0, 12);
  const shipping = await zaShipping(cj, representative?.id ?? null);
  const input: CjQualificationInput = {
    productId: canonicalProductId,
    title,
    description,
    category: category([detail.categoryName, title, description].filter(Boolean).join(" ")),
    images,
    variants,
    totalInventory: live.total,
    inventoryUnitsKnown: live.totals.size > 0,
    inventorySource: live.source,
    shipping,
    complianceReason: complianceFlag(`${title} ${description.slice(0, 500)}`),
    duplicate: existingResult.data
      ? { id: existingResult.data.id, status: existingResult.data.status }
      : null,
  };
  return {
    input,
    source: { description, category: input.category ?? "other", images, variants: sourceVariants },
  };
}

async function savePrivateDraft(database: ServiceClient, candidate: InspectedCandidate) {
  const preview = qualifyCjCandidate(candidate.input);
  if (preview.outcome !== "READY_FOR_REVIEW") {
    throw new Error(`This CJ candidate cannot enter the Storeroom: ${preview.outcome}.`);
  }
  const decision = cjDraftDecision(candidate.input.duplicate?.status);
  if (decision === "preserve_active") {
    return {
      action: decision,
      productId: candidate.input.duplicate?.id,
      message:
        "The existing active CJ record was preserved. Review it manually; no public product was changed.",
    };
  }

  const now = new Date().toISOString();
  const row = {
    organisation_id: ORG_ID,
    name: candidate.input.title,
    slug: `cj-${slug(candidate.input.title).slice(0, 130)}-${candidate.input.productId.slice(0, 8).toLowerCase()}`,
    sku: `CJ-${candidate.input.productId
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 16)
      .toUpperCase()}`,
    product_type: "dropshipping",
    fulfilment_model: "international_dropshipping",
    status: "draft",
    short_description: candidate.source.description.slice(0, 240),
    description: candidate.source.description,
    category: candidate.source.category,
    brand: "Cossa Store",
    supplier_name: "CJ Dropshipping",
    supplier_product_ref: candidate.input.productId,
    currency: "ZAR",
    source_currency: "USD",
    source_price: preview.pricing.supplierCostUsd,
    source_cost: preview.pricing.supplierCostUsd,
    fx_rate_to_zar: preview.pricing.fxZarPerUsd,
    fx_rate_updated_at: now,
    cost_price: preview.pricing.bufferedCostZar,
    price: preview.pricing.proposedSellingPriceZar,
    track_inventory: true,
    stock_quantity: candidate.input.totalInventory,
    unlimited_stock: false,
    image_urls: candidate.source.images,
    seo_title: candidate.input.title.slice(0, 70),
    seo_description: candidate.source.description.slice(0, 160),
    updated_at: now,
  };
  let productId = candidate.input.duplicate?.id ?? null;
  if (productId) {
    const update = await database
      .from("store_products")
      .update(row)
      .eq("id", productId)
      .eq("organisation_id", ORG_ID)
      .eq("supplier_name", "CJ Dropshipping");
    if (update.error) throw new Error("The existing CJ Storeroom draft could not be updated.");
  } else {
    const inserted = await database.from("store_products").insert(row).select("id").single();
    if (inserted.error || !inserted.data?.id)
      throw new Error("The CJ Storeroom draft could not be created.");
    productId = inserted.data.id;
  }

  const variants = candidate.input.variants
    .filter((variant) => variant.sourcePriceUsd !== null)
    .map((variant, index) => ({
      product_id: productId,
      provider: "CJ Dropshipping",
      provider_product_id: candidate.input.productId,
      provider_variant_id: variant.id,
      sku: variant.sku,
      title: variant.title,
      option_values: [],
      source_currency: "USD",
      source_price: variant.sourcePriceUsd,
      source_cost: variant.sourcePriceUsd,
      fx_rate_to_zar: preview.pricing.fxZarPerUsd,
      price_zar: preview.pricing.proposedSellingPriceZar ?? 0,
      cost_zar: preview.pricing.bufferedCostZar,
      is_default: index === 0,
      is_available: variant.available,
      sort_order: index,
      raw_provider_data: {
        source: "CJ Dropshipping",
        warehouse: variant.warehouse,
        live_inventory: variant.stockQuantity,
        availability_source: candidate.input.inventorySource,
        qualification: preview,
        captured_at: now,
      },
      updated_at: now,
    }));
  if (!variants.length) throw new Error("CJ returned no priceable variants for the private draft.");
  const variantWrite = await database
    .from("store_product_variants")
    .upsert(variants, { onConflict: "product_id,provider,provider_variant_id" });
  if (variantWrite.error) throw new Error("The CJ variant provenance could not be saved.");

  return {
    action: decision,
    productId,
    status: "draft",
    message:
      "Saved as a private Storeroom draft. Commercial approval and publication remain separate.",
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigin(origin)) return json(request, { error: "Origin not allowed." }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const publicKey =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    configuredDefault("SUPABASE_PUBLISHABLE_KEYS");
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? configuredDefault("SUPABASE_SECRET_KEYS");
  const cjApiKey = Deno.env.get("CJ_API_KEY");
  if (!url || !publicKey || !serviceKey || !cjApiKey) {
    return json(request, { error: "CJ qualification is not configured." }, 503);
  }

  const userClient = createClient(url, publicKey, {
    global: {
      fetch: apiFetch(publicKey),
      headers: { Authorization: request.headers.get("authorization") ?? "" },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const database = createClient(url, serviceKey, {
    global: { fetch: apiFetch(serviceKey) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  try {
    const user = await authenticatedUser(request, userClient);
    await requireCossaStoreAdmin(database, user.id);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action =
      body.action === "create_private_draft"
        ? "create_private_draft"
        : body.action === "inspect"
          ? "inspect"
          : null;
    const productId = exactProductId(body.productRef);
    if (!action || !productId) {
      return json(request, { error: "Use an exact CJ product ID or CJ product URL." }, 400);
    }

    // This single inspection performs only authenticated supplier and database reads.
    // It deliberately creates neither an audit record nor a Store product.
    const candidate = await inspectCandidate(database, cjApiKey, productId);
    const preview = qualifyCjCandidate(candidate.input);
    if (action === "inspect") {
      return json(request, { action, preview, readOnly: true });
    }

    const draft = await savePrivateDraft(database, candidate);
    return json(request, { action, preview, draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CJ qualification failed.";
    const status = message === "unauthorised" || message === "forbidden" ? 401 : 502;
    return json(request, { error: message }, status);
  }
});
