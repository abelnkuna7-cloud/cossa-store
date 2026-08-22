const ORG_ID = "00000000-0000-4000-8000-000000000001";
const PRINTIFY_BASE = "https://api.printify.com/v1";
export const PRINTIFY_SHOP_ID = "28233755";
export const USD_ZAR = 16.0141;
export const PRINTIFY_PRODUCT_WEBHOOK_TOPICS = [
  "product:created",
  "product:updated",
  "product:deleted",
] as const;

type AdminClient = any;
type PrintifyShop = { id: string; title: string; salesChannel: unknown };

type SyncVariant = {
  providerVariantId: string;
  sku: string | null;
  title: string;
  sourcePrice: number | null;
  sourceCost: number | null;
  priceZar: number | null;
  costZar: number | null;
  isDefault: boolean;
  isAvailable: boolean;
  isEnabled: boolean;
  isEligible: boolean;
  options: unknown[];
  sortOrder: number;
  raw: unknown;
};

type PrintifyProductSummary = {
  printifyProductId: string;
  title: string;
  description: string;
  images: string[];
  variants: SyncVariant[];
  enabledVariantCount: number;
  availableVariantCount: number;
  minRetailUsd: number | null;
  minRetailZar: number | null;
  minCostUsd: number | null;
  minCostZar: number | null;
};

export type SyncIssue = {
  productId: string;
  title: string;
  reasons: string[];
};

export type SyncSummary = {
  shop: PrintifyShop;
  processed: number;
  createdAsDraft: number;
  refreshed: number;
  keptActive: number;
  demotedToDraft: number;
  archived: number;
  skipped: SyncIssue[];
};

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function identifier(value: unknown, max = 120) {
  return (typeof value === "string" || typeof value === "number")
    ? String(value).trim().slice(0, max)
    : "";
}

function cleanDescription(value: unknown, max: number) {
  return cleanText(
    cleanText(value, 12_000)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " "),
    max,
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function centsToMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const cents = Number(value);
  return Number.isFinite(cents) ? Math.round(cents) / 100 : null;
}

function toZar(usd: number | null) {
  return usd === null ? null : Math.round(usd * USD_ZAR * 100) / 100;
}

function validHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isProviderId(value: string) {
  return /^[a-zA-Z0-9_-]{3,}$/.test(value);
}

function genericDescription(title: string) {
  return `${title} is a print-on-demand product fulfilled by Printify.`;
}

export async function printifyRequest(
  path: string,
  token: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("User-Agent", "CossaStore/1.0");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${PRINTIFY_BASE}${path}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Printify ${response.status}: ${text.slice(0, 300)}`);
  }

  return text ? JSON.parse(text) : null;
}

export async function configuredShop(token: string): Promise<PrintifyShop> {
  const shops = await printifyRequest("/shops.json", token);
  if (!Array.isArray(shops)) {
    throw new Error("Printify did not return a shop list.");
  }

  const shop = shops.find((candidate: any) => String(candidate?.id) === PRINTIFY_SHOP_ID);
  if (!shop) {
    throw new Error(`The configured Printify shop ${PRINTIFY_SHOP_ID} is not available for this token.`);
  }

  return {
    id: PRINTIFY_SHOP_ID,
    title: cleanText(shop.title, 120) || "Cossa Store CNH",
    salesChannel: shop.sales_channel ?? null,
  };
}

export function summarizePrintifyProduct(raw: any): PrintifyProductSummary {
  const variants = Array.isArray(raw?.variants)
    ? raw.variants.map((variant: any, index: number): SyncVariant => {
        const providerVariantId = identifier(variant?.id, 80);
        const sourcePrice = centsToMoney(variant?.price);
        const sourceCost = centsToMoney(variant?.cost);
        const isEnabled = variant?.is_enabled !== false;
        const isAvailable = isEnabled && variant?.is_available !== false;
        const title = cleanText(variant?.title, 220);
        const isEligible =
          isProviderId(providerVariantId) &&
          Boolean(title) &&
          sourcePrice !== null &&
          sourcePrice > 0;

        return {
          providerVariantId,
          sku: cleanText(variant?.sku, 220) || null,
          title: title || "Printify option",
          sourcePrice,
          sourceCost,
          priceZar: toZar(sourcePrice),
          costZar: toZar(sourceCost),
          isDefault: Boolean(variant?.is_default),
          isAvailable,
          isEnabled,
          isEligible,
          options: Array.isArray(variant?.options) ? variant.options : [],
          sortOrder: index,
          raw: variant,
        };
      })
    : [];

  const defaultEligible = variants.find(
    (variant) => variant.isEligible && variant.isAvailable && variant.isDefault,
  );
  if (!defaultEligible) {
    const fallback = variants.find(
      (variant) => variant.isEligible && variant.isAvailable,
    );
    if (fallback) fallback.isDefault = true;
  }

  const images = Array.isArray(raw?.images)
    ? raw.images
        .map((image: any) => image?.src)
        .filter(validHttpUrl)
        .slice(0, 20)
    : [];
  const sellableVariants = variants.filter(
    (variant) => variant.isEligible && variant.isAvailable,
  );
  const pricedVariants = variants.filter((variant) => variant.isEligible);
  const costs = pricedVariants
    .map((variant) => variant.sourceCost)
    .filter((cost): cost is number => cost !== null && cost >= 0);

  return {
    printifyProductId: identifier(raw?.id, 120),
    title: cleanText(raw?.title, 220),
    description: cleanText(raw?.description, 12_000),
    images,
    variants,
    enabledVariantCount: variants.filter((variant) => variant.isEnabled).length,
    availableVariantCount: sellableVariants.length,
    minRetailUsd: sellableVariants.length
      ? Math.min(...sellableVariants.map((variant) => variant.sourcePrice!))
      : null,
    minRetailZar: sellableVariants.length
      ? Math.min(...sellableVariants.map((variant) => variant.priceZar!))
      : null,
    minCostUsd: costs.length ? Math.min(...costs) : null,
    minCostZar: costs.length ? Math.min(...costs.map((cost) => toZar(cost)!)) : null,
  };
}

function validationReasons(product: PrintifyProductSummary) {
  const reasons: string[] = [];
  if (!isProviderId(product.printifyProductId)) reasons.push("missing provider product ID");
  if (!product.title) reasons.push("missing product title");
  if (!product.images.length) reasons.push("no valid product mockup/image");
  if (!product.availableVariantCount) reasons.push("no enabled, available, priced variant");
  if (product.minRetailUsd === null || product.minRetailUsd <= 0) {
    reasons.push("no valid selling price");
  }
  return reasons;
}

function stableSlug(product: PrintifyProductSummary) {
  const base = slugify(product.title).slice(0, 170).replace(/-+$/g, "");
  return `${base || "printify-product"}-${product.printifyProductId.toLowerCase()}`;
}

async function findExistingProduct(admin: AdminClient, providerProductId: string) {
  const result = await admin
    .from("store_products")
    .select("id,slug,sku,status,category,seo_title,seo_description")
    .eq("organisation_id", ORG_ID)
    .eq("supplier_name", "Printify")
    .eq("supplier_product_ref", providerProductId)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data as {
    id: string;
    slug: string;
    sku: string | null;
    status: string;
    category: string | null;
    seo_title: string | null;
    seo_description: string | null;
  } | null;
}

async function disableRemovedVariants(
  admin: AdminClient,
  productId: string,
  providerVariantIds: string[],
  now: string,
) {
  const existing = await admin
    .from("store_product_variants")
    .select("id,provider_variant_id")
    .eq("product_id", productId)
    .eq("provider", "Printify");
  if (existing.error) throw existing.error;

  const incoming = new Set(providerVariantIds);
  const obsoleteIds = (existing.data ?? [])
    .filter((variant: { provider_variant_id: string }) => !incoming.has(variant.provider_variant_id))
    .map((variant: { id: string }) => variant.id);
  if (!obsoleteIds.length) return;

  const result = await admin
    .from("store_product_variants")
    .update({ is_available: false, updated_at: now })
    .in("id", obsoleteIds);
  if (result.error) throw result.error;
}

async function upsertVariants(
  admin: AdminClient,
  productId: string,
  product: PrintifyProductSummary,
  now: string,
) {
  const variants = product.variants.filter((variant) => variant.isEligible);
  const rows = variants.map((variant) => ({
    product_id: productId,
    provider: "Printify",
    provider_product_id: product.printifyProductId,
    provider_variant_id: variant.providerVariantId,
    sku: variant.sku,
    title: variant.title,
    option_values: variant.options,
    source_currency: "USD",
    source_price: variant.sourcePrice,
    source_cost: variant.sourceCost,
    fx_rate_to_zar: USD_ZAR,
    price_zar: variant.priceZar,
    cost_zar: variant.costZar,
    is_default: variant.isDefault,
    is_available: variant.isAvailable,
    sort_order: variant.sortOrder,
    raw_provider_data: variant.raw,
    updated_at: now,
  }));

  // For live listings, persist available options before disabling anything.
  // The database guard therefore always sees a purchasable Printify option.
  for (const availability of [true, false]) {
    const batch = rows.filter((variant) => variant.is_available === availability);
    if (!batch.length) continue;
    const result = await admin.from("store_product_variants").upsert(
      batch,
      { onConflict: "product_id,provider,provider_variant_id" },
    );
    if (result.error) throw result.error;
  }

  // Add or refresh the current provider variants before disabling removed ones.
  // This keeps an active product sellable throughout a valid provider change.
  await disableRemovedVariants(
    admin,
    productId,
    variants.map((variant) => variant.providerVariantId),
    now,
  );
}

export async function syncOnePrintifyProduct(
  admin: AdminClient,
  raw: unknown,
) {
  const product = summarizePrintifyProduct(raw);
  const existing = product.printifyProductId
    ? await findExistingProduct(admin, product.printifyProductId)
    : null;
  const reasons = validationReasons(product);

  if (reasons.length) {
    if (existing?.status === "active") {
      const update = await admin
        .from("store_products")
        .update({ status: "draft", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("organisation_id", ORG_ID);
      if (update.error) throw update.error;
      return { outcome: "demoted" as const, product, reasons };
    }
    return { outcome: "skipped" as const, product, reasons };
  }

  const now = new Date().toISOString();
  const fallbackDescription = genericDescription(product.title);
  const fullDescription = product.description || fallbackDescription;
  const shortDescription = cleanDescription(fullDescription, 240) || fallbackDescription;
  const status =
    existing?.status === "active"
      ? "active"
      : existing?.status === "archived"
        ? "archived"
        : "draft";
  const row = {
    organisation_id: ORG_ID,
    name: product.title,
    slug: existing?.slug || stableSlug(product),
    sku: existing?.sku || `PRT-${product.printifyProductId.toUpperCase()}`,
    product_type: "pod",
    fulfilment_model: "print_on_demand",
    status,
    short_description: shortDescription,
    description: fullDescription,
    category: existing?.category ?? "print-on-demand",
    brand: "Cossa Store",
    supplier_name: "Printify",
    supplier_product_ref: product.printifyProductId,
    supplier_url: null,
    currency: "ZAR",
    source_currency: "USD",
    source_price: product.minRetailUsd,
    source_cost: product.minCostUsd,
    fx_rate_to_zar: USD_ZAR,
    fx_rate_updated_at: now,
    cost_price: product.minCostZar ?? 0,
    price: product.minRetailZar,
    compare_at_price: null,
    track_inventory: false,
    stock_quantity: 0,
    unlimited_stock: true,
    image_urls: product.images,
    seo_title: existing?.seo_title || product.title.slice(0, 70),
    seo_description:
      existing?.seo_description || cleanDescription(fullDescription, 160) || fallbackDescription,
    updated_at: now,
  };

  const saved = existing
    ? await admin
        .from("store_products")
        .update(row)
        .eq("id", existing.id)
        .eq("organisation_id", ORG_ID)
        .select("id,status")
        .single()
    : await admin
        .from("store_products")
        .insert(row)
        .select("id,status")
        .single();
  if (saved.error) throw saved.error;

  await upsertVariants(admin, saved.data.id, product, now);
  return {
    outcome: existing ? (status === "active" ? "refreshed_active" : "refreshed") : "created_draft",
    product,
    id: saved.data.id as string,
  };
}

export async function listAllPrintifyProducts(shopId: string, token: string) {
  const products: any[] = [];
  let page = 1;
  for (;;) {
    const response = await printifyRequest(
      `/shops/${encodeURIComponent(shopId)}/products.json?limit=50&page=${page}`,
      token,
    );
    const batch = Array.isArray(response?.data) ? response.data : [];
    products.push(...batch);
    if (!response?.next_page_url || batch.length === 0) break;
    page += 1;
    if (page > 100) throw new Error("Printify pagination safety limit reached.");
  }
  return products;
}

export async function fetchPrintifyProduct(
  shopId: string,
  productId: string,
  token: string,
) {
  if (!isProviderId(productId)) throw new Error("Invalid Printify product identifier.");
  return printifyRequest(
    `/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}.json`,
    token,
  );
}

export async function previewPrintifyCatalogue(token: string) {
  const shop = await configuredShop(token);
  const products = await listAllPrintifyProducts(shop.id, token);
  return {
    shop,
    count: products.length,
    currency: { source: "USD", store: "ZAR", fxRate: USD_ZAR },
    products: products.map((raw) => {
      const product = summarizePrintifyProduct(raw);
      return {
        printifyProductId: product.printifyProductId,
        title: product.title,
        enabledVariantCount: product.enabledVariantCount,
        availableVariantCount: product.availableVariantCount,
        minRetailUsd: product.minRetailUsd,
        minRetailZar: product.minRetailZar,
        minCostUsd: product.minCostUsd,
        minCostZar: product.minCostZar,
        valid: validationReasons(product).length === 0,
        validationReasons: validationReasons(product),
      };
    }),
  };
}

export async function reconcilePrintifyCatalogue(
  admin: AdminClient,
  token: string,
): Promise<SyncSummary> {
  const shop = await configuredShop(token);
  const products = await listAllPrintifyProducts(shop.id, token);
  const summary: SyncSummary = {
    shop,
    processed: 0,
    createdAsDraft: 0,
    refreshed: 0,
    keptActive: 0,
    demotedToDraft: 0,
    archived: 0,
    skipped: [],
  };

  for (const raw of products) {
    const result = await syncOnePrintifyProduct(admin, raw);
    summary.processed += 1;
    if (result.outcome === "created_draft") summary.createdAsDraft += 1;
    if (result.outcome === "refreshed") summary.refreshed += 1;
    if (result.outcome === "refreshed_active") {
      summary.refreshed += 1;
      summary.keptActive += 1;
    }
    if (result.outcome === "demoted") summary.demotedToDraft += 1;
    if (result.outcome === "skipped") {
      summary.skipped.push({
        productId: result.product.printifyProductId || "unknown",
        title: result.product.title || "Untitled Printify product",
        reasons: result.reasons,
      });
    }
  }
  return summary;
}

export async function archivePrintifyProduct(
  admin: AdminClient,
  providerProductId: string,
) {
  const existing = await findExistingProduct(admin, providerProductId);
  if (!existing) return false;
  const now = new Date().toISOString();
  const product = await admin
    .from("store_products")
    .update({ status: "archived", updated_at: now })
    .eq("id", existing.id)
    .eq("organisation_id", ORG_ID);
  if (product.error) throw product.error;
  const variants = await admin
    .from("store_product_variants")
    .update({ is_available: false, updated_at: now })
    .eq("product_id", existing.id)
    .eq("provider", "Printify");
  if (variants.error) throw variants.error;
  return true;
}

export async function configureProductWebhooks(
  token: string,
  webhookSecret: string,
  supabaseUrl: string,
) {
  const shop = await configuredShop(token);
  const receiverUrl = `${supabaseUrl.replace(/\/+$/g, "")}/functions/v1/printify-webhook`;
  const response = await printifyRequest(
    `/shops/${encodeURIComponent(shop.id)}/webhooks.json`,
    token,
  );
  const existing = Array.isArray(response) ? response : [];
  const configured: Array<{ topic: string; id: string; created: boolean }> = [];

  for (const topic of PRINTIFY_PRODUCT_WEBHOOK_TOPICS) {
    const current = existing.find(
      (webhook: any) => webhook?.topic === topic && webhook?.url === receiverUrl,
    );
    if (current?.id) {
      const updated = await printifyRequest(
        `/shops/${encodeURIComponent(shop.id)}/webhooks/${encodeURIComponent(String(current.id))}.json`,
        token,
        { method: "PUT", body: JSON.stringify({ url: receiverUrl, secret: webhookSecret }) },
      );
      configured.push({ topic, id: String(updated?.id ?? current.id), created: false });
      continue;
    }

    const created = await printifyRequest(
      `/shops/${encodeURIComponent(shop.id)}/webhooks.json`,
      token,
      { method: "POST", body: JSON.stringify({ topic, url: receiverUrl, secret: webhookSecret }) },
    );
    configured.push({ topic, id: String(created?.id ?? ""), created: true });
  }

  return { shop, endpoint: receiverUrl, subscriptions: configured };
}
