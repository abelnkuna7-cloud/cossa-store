import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const PRINTIFY_BASE = "https://api.printify.com/v1";
const USD_ZAR = 16.0141;
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
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function centsToUsd(value: unknown) {
  const cents = Number(value ?? 0);
  return Number.isFinite(cents) ? Math.round(cents) / 100 : 0;
}

function toZar(usd: number) {
  return Math.round(usd * USD_ZAR * 100) / 100;
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
  if (error || !data.user) {
    throw new Error("Your session could not be verified.");
  }

  return data.user;
}

async function requireAdmin(
  admin: ReturnType<typeof createClient>,
  userId: string,
) {
  const [
    { data: memberships, error: membershipError },
    { data: roles, error: roleError },
  ] = await Promise.all([
    admin
      .from("organisation_members")
      .select("role")
      .eq("organisation_id", ORG_ID)
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["owner", "admin"]),
    admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin"),
  ]);

  if (
    membershipError ||
    roleError ||
    (!(memberships ?? []).length && !(roles ?? []).length)
  ) {
    throw new Error(
      "Only the authorised Cossa Store administrator can run Printify sync.",
    );
  }
}

async function printify(path: string, token: string) {
  const response = await fetch(`${PRINTIFY_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "CossaStore/1.0",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Printify ${response.status}: ${text.slice(0, 300)}`);
  }

  return text ? JSON.parse(text) : null;
}

async function discoverShop(token: string) {
  const shops = await printify("/shops.json", token);

  if (!Array.isArray(shops) || shops.length === 0) {
    throw new Error("No Printify shops are available for this token.");
  }

  const preferred =
    shops.find((shop: any) =>
      String(shop?.title ?? "").toLowerCase().includes("cossa"),
    ) ?? shops[0];

  return {
    id: String(preferred.id),
    title: String(preferred.title ?? "Printify shop"),
    salesChannel: preferred.sales_channel ?? null,
  };
}

function summarizeProduct(product: any) {
  const enabled = Array.isArray(product?.variants)
    ? product.variants.filter((variant: any) => variant?.is_enabled !== false)
    : [];

  const images = Array.isArray(product?.images)
    ? product.images
        .map((image: any) => String(image?.src ?? ""))
        .filter(Boolean)
    : [];

  const defaultImage = Array.isArray(product?.images)
    ? product.images.find((image: any) => image?.is_default)?.src
    : null;

  const variants = enabled.map((variant: any, index: number) => {
    const sourcePrice = centsToUsd(variant?.price);
    const sourceCost = centsToUsd(variant?.cost);

    return {
      providerVariantId: String(variant?.id ?? ""),
      sku: variant?.sku ? String(variant.sku) : null,
      title: String(variant?.title ?? "Option"),
      sourcePrice,
      sourceCost,
      priceZar: toZar(sourcePrice),
      costZar: toZar(sourceCost),
      grams: Number(variant?.grams ?? 0),
      isDefault: Boolean(variant?.is_default),
      isAvailable: variant?.is_available !== false,
      options: Array.isArray(variant?.options) ? variant.options : [],
      sortOrder: index,
      raw: variant,
    };
  });

  const minRetailUsd = variants.length
    ? Math.min(...variants.map((variant: any) => variant.sourcePrice))
    : null;
  const minRetailZar = variants.length
    ? Math.min(...variants.map((variant: any) => variant.priceZar))
    : null;
  const minCostUsd = variants.length
    ? Math.min(...variants.map((variant: any) => variant.sourceCost))
    : null;
  const minCostZar = variants.length
    ? Math.min(...variants.map((variant: any) => variant.costZar))
    : null;

  return {
    printifyProductId: String(product?.id ?? ""),
    title: String(product?.title ?? "Untitled Printify product"),
    description: String(product?.description ?? ""),
    visibleInPrintify: Boolean(product?.visible),
    locked: Boolean(product?.is_locked),
    blueprintId: product?.blueprint_id ?? null,
    printProviderId: product?.print_provider_id ?? null,
    defaultImage: defaultImage ? String(defaultImage) : images[0] ?? null,
    images,
    variants,
    enabledVariantCount: variants.length,
    minRetailUsd,
    minRetailZar,
    minCostUsd,
    minCostZar,
    minRetailCents:
      minRetailUsd == null ? null : Math.round(minRetailUsd * 100),
    minCostCents: minCostUsd == null ? null : Math.round(minCostUsd * 100),
    updatedAt: product?.updated_at ?? null,
  };
}

async function listAllProducts(shopId: string, token: string) {
  const products: any[] = [];
  let page = 1;

  for (;;) {
    const response = await printify(
      `/shops/${encodeURIComponent(shopId)}/products.json?limit=50&page=${page}`,
      token,
    );
    const batch = Array.isArray(response?.data) ? response.data : [];
    products.push(...batch);

    if (!response?.next_page_url || batch.length === 0) break;

    page += 1;
    if (page > 100) {
      throw new Error("Printify pagination safety limit reached.");
    }
  }

  return products;
}

async function previewSync(
  shop: { id: string; title: string; salesChannel: unknown },
  token: string,
) {
  const products = await listAllProducts(shop.id, token);

  return {
    shop,
    count: products.length,
    currency: {
      source: "USD",
      store: "ZAR",
      fxRate: USD_ZAR,
    },
    products: products.map(summarizeProduct),
  };
}

async function stageDrafts(
  admin: ReturnType<typeof createClient>,
  shop: { id: string; title: string },
  token: string,
) {
  const products = await listAllProducts(shop.id, token);
  const staged: any[] = [];
  const now = new Date().toISOString();

  for (const raw of products) {
    const product = summarizeProduct(raw);

    if (
      !product.printifyProductId ||
      !product.title ||
      product.variants.length === 0
    ) {
      continue;
    }

    const existing = await admin
      .from("store_products")
      .select("id,slug,status,category,seo_title,seo_description")
      .eq("organisation_id", ORG_ID)
      .eq("supplier_name", "Printify")
      .eq("supplier_product_ref", product.printifyProductId)
      .maybeSingle();

    if (existing.error) throw existing.error;

    const stableSlug =
      existing.data?.slug ||
      `${slugify(product.title) || "printify-product"}-${product.printifyProductId
        .slice(-6)
        .toLowerCase()}`;

    const row = {
      organisation_id: ORG_ID,
      name: product.title.slice(0, 220),
      slug: stableSlug,
      sku: null,
      product_type: "pod",
      fulfilment_model: "print_on_demand",
      status: existing.data?.status === "active" ? "active" : "draft",
      short_description:
        cleanText(
          product.description
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " "),
          240,
        ) || "Print-on-demand product fulfilled by Printify.",
      description:
        product.description || "Print-on-demand product fulfilled by Printify.",
      category: existing.data?.category ?? "print-on-demand",
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
      price: product.minRetailZar ?? 0,
      compare_at_price: null,
      track_inventory: false,
      stock_quantity: 0,
      unlimited_stock: true,
      image_urls: product.images.slice(0, 20),
      seo_title: existing.data?.seo_title ?? product.title.slice(0, 70),
      seo_description:
        existing.data?.seo_description ??
        cleanText(
          product.description
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " "),
          160,
        ),
      updated_at: now,
    };

    let saved: any;

    if (existing.data?.id) {
      const result = await admin
        .from("store_products")
        .update(row)
        .eq("id", existing.data.id)
        .select("id,name,slug,status,supplier_product_ref,price")
        .single();
      if (result.error) throw result.error;
      saved = result.data;
    } else {
      const result = await admin
        .from("store_products")
        .insert(row)
        .select("id,name,slug,status,supplier_product_ref,price")
        .single();
      if (result.error) throw result.error;
      saved = result.data;
    }

    for (const variant of product.variants) {
      const variantRow = {
        product_id: saved.id,
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
      };

      const upsert = await admin
        .from("store_product_variants")
        .upsert(variantRow, {
          onConflict: "product_id,provider,provider_variant_id",
        });

      if (upsert.error) throw upsert.error;
    }

    staged.push({
      ...saved,
      variantCount: product.enabledVariantCount,
      minRetailUsd: product.minRetailUsd,
      minRetailZar: product.minRetailZar,
    });
  }

  return {
    shop,
    count: staged.length,
    currency: {
      source: "USD",
      store: "ZAR",
      fxRate: USD_ZAR,
    },
    staged,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }

  if (request.method !== "POST") {
    return json(request, { error: "Method not allowed." }, 405);
  }

  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(request, { error: "Origin not allowed." }, 403);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const printifyToken = Deno.env.get("PRINTIFY_API_TOKEN");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !printifyToken) {
    return json(
      request,
      { error: "Printify sync is not fully configured." },
      503,
    );
  }

  const customerClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const user = await requireUser(request, customerClient);
    await requireAdmin(admin, user.id);

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = cleanText(body.action, 50) || "preview";
    const shop = await discoverShop(printifyToken);

    if (action === "preview") {
      return json(request, await previewSync(shop, printifyToken));
    }

    if (action === "stage_drafts") {
      return json(request, await stageDrafts(admin, shop, printifyToken));
    }

    return json(request, { error: "Unsupported Printify sync action." }, 400);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Printify sync failed.";
    console.error(
      JSON.stringify({ event: "printify_sync_failed", message }),
    );
    return json(request, { error: message }, 400);
  }
});
