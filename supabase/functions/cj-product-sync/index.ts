import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const MAX_PRODUCTS = 30;
const DISCOVERY_SIZE = 100;
const DISCOVERY_PAGES = 4;
const REQUEST_GAP_MS = 1100;

const ALLOWED_ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);

const CATEGORY_PRIORITY = [
  "construction-diy",
  "home-living",
  "cleaning-household",
  "technology-electronics",
  "office-business",
  "tools-industrial",
  "security-smart-home",
  "mobile-accessories",
  "automotive",
  "health-personal-care",
  "beauty-grooming",
  "pet-supplies",
  "outdoor-garden",
  "sports-fitness",
  "women",
  "men",
  "kids-baby",
  "travel-luggage",
  "gaming-entertainment",
  "school-education",
] as const;

type AdminClient = ReturnType<typeof createClient>;
type Candidate = {
  id: string;
  category: string;
  title: string;
  inventoryHint: number;
  popularityHint: number;
  score: number;
};

type InventorySummary = {
  productTotal: number;
  variantTotals: Map<string, number>;
  availableVariantIds: Set<string>;
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

function newKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function sf(apiKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (newKey(apiKey) && headers.get("authorization") === `Bearer ${apiKey}`) {
      headers.delete("authorization");
    }
    headers.set("apikey", apiKey);
    return fetch(input, { ...init, headers });
  };
}

function cors(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function txt(value: unknown, max = 500) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function id(value: unknown) {
  const normalized = txt(value, 200);
  return /^[A-Za-z0-9_-]{1,200}$/.test(normalized) ? normalized : "";
}

function pos(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function int0(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function http(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function desc(value: unknown) {
  return txt(
    txt(value, 12000)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'"),
    12000,
  );
}

function category(value: unknown): string | null {
  const c = txt(value, 700).toLowerCase();
  if (!c) return null;

  if (/automotive|automobile|motorcycle|vehicle|car accessories|car care/.test(c)) return "automotive";
  if (/office|stationery|business supplies|workspace|packaging/.test(c)) return "office-business";
  if (/security|surveillance|alarm|smart home|doorbell|access control/.test(c)) return "security-smart-home";
  if (/phone accessories|mobile accessories|phone case|charging cable|screen protector/.test(c)) return "mobile-accessories";
  if (/gaming|game accessories|controller|console accessories/.test(c)) return "gaming-entertainment";
  if (/school|education|stationery|learning supplies/.test(c)) return "school-education";
  if (/travel|luggage|suitcase|travel accessories/.test(c)) return "travel-luggage";
  if (/beauty|makeup|cosmetic|hair care|haircare|skincare|grooming/.test(c)) return "beauty-grooming";
  if (/health|personal care|oral care|hygiene|wellness/.test(c)) return "health-personal-care";
  if (/pet|dog|cat supplies/.test(c)) return "pet-supplies";
  if (/clean|laundry|household cleaner|janitorial|dishwashing/.test(c)) return "cleaning-household";
  if (/industrial|power tool|hand tool|tool equipment|workshop/.test(c)) return "tools-industrial";
  if (/home improvement|construction|hardware|building|plumbing|electrical|repair tool/.test(c)) return "construction-diy";
  if (/computer|consumer electronic|electronic|camera|network|audio|wearable/.test(c)) return "technology-electronics";
  if (/men'?s clothing|menswear|\bmen\b/.test(c)) return "men";
  if (/women'?s clothing|womenswear|\bwomen\b/.test(c)) return "women";
  if (/home|furniture|kitchen|bath|lighting|storage|bedding|decor|appliance/.test(c)) return "home-living";
  if (/garden|outdoor|patio|camping/.test(c)) return "outdoor-garden";
  if (/sport|fitness|exercise|gym|running|cycling/.test(c)) return "sports-fitness";
  if (/baby|kids|child|toy|infant/.test(c)) return "kids-baby";
  return null;
}

function blockedReason(value: string): string | null {
  const text = value.toLowerCase();
  if (/\b(vape|e-cig|e cigarette|cigarette|nicotine|tobacco)\b/.test(text)) return "regulated_nicotine";
  if (/\b(cbd|thc|cannabis|marijuana|magic mushroom|psychedelic)\b/.test(text)) return "regulated_drug";
  if (/\b(gun|rifle|pistol|ammunition|ammo|bullet|taser|pepper spray|switchblade|dagger|sword|brass knuckle)\b/.test(text)) return "weapon_or_weapon_accessory";
  if (/\b(dildo|vibrator|sex toy|adult toy|masturbat)\b/.test(text)) return "adult_product";
  if (/\b(steroid|hormone|prescription medicine|prescription drug)\b/.test(text)) return "restricted_health_product";
  return null;
}

function demandScore(value: string) {
  const text = value.toLowerCase();
  let score = 0;
  const highIntent = [
    /organizer|storage|holder|rack|shelf/,
    /clean|remover|brush|vacuum|mop|washer/,
    /repair|tool|measure|meter|tester|drill|cutter/,
    /sensor|security|alarm|tracker|finder|camera/,
    /charger|charging|power|adapter|cable|battery/,
    /waterproof|protect|safety|anti[- ]?slip|anti[- ]?lost/,
    /portable|reusable|foldable|wireless|automatic|smart/,
    /water saving|energy saving|time saving|space saving/,
    /kitchen|bathroom|home improvement|car care/,
  ];
  for (const pattern of highIntent) if (pattern.test(text)) score += 4;
  if (/new|2026|latest|upgrade/.test(text)) score += 1;
  if (/anti cellulite|slimming|weight loss|miracle|ultimate ems|instant result/.test(text)) score -= 6;
  return score;
}

function numericHint(record: Record<string, unknown>, keys: string[]) {
  let best = 0;
  for (const key of keys) {
    const n = Number(record[key]);
    if (Number.isFinite(n) && n > best) best = n;
  }
  return best;
}

function inventoryHint(record: Record<string, unknown>) {
  return numericHint(record, [
    "totalInventory",
    "totalInventoryNum",
    "warehouseInventory",
    "warehouseInventoryNum",
    "inventory",
    "inventoryNum",
    "stock",
    "stockNum",
  ]);
}

function popularityHint(record: Record<string, unknown>) {
  return numericHint(record, [
    "sales",
    "saleCount",
    "salesVolume",
    "sellQuantity",
    "orderCount",
    "orders",
    "listedNum",
    "productSales",
  ]);
}

function candidateTitle(record: Record<string, unknown>) {
  return txt(
    record.productNameEn ??
      record.productName ??
      record.nameEn ??
      record.name ??
      record.title,
    260,
  );
}

function categoryText(record: Record<string, unknown>) {
  return txt(
    record.categoryName ??
      [record.oneCategoryName, record.twoCategoryName, record.threeCategoryName]
        .filter(Boolean)
        .join(" / "),
    700,
  );
}

function scoreCandidate(item: Omit<Candidate, "score">) {
  const priorityIndex = CATEGORY_PRIORITY.indexOf(item.category as (typeof CATEGORY_PRIORITY)[number]);
  const categoryPoints = priorityIndex >= 0 ? Math.max(1, 24 - priorityIndex) : 0;
  const stockPoints = item.inventoryHint > 0 ? 24 + Math.min(12, Math.log10(item.inventoryHint + 1) * 3) : 0;
  const popularityPoints = item.popularityHint > 0 ? Math.min(16, Math.log10(item.popularityHint + 1) * 4) : 0;
  const usefulPoints = demandScore(item.title);
  const titleQuality = item.title.length >= 18 && item.title.length <= 180 ? 4 : item.title.length > 220 ? -3 : 0;
  return categoryPoints + stockPoints + popularityPoints + usefulPoints + titleQuality;
}

function collectCandidates(payload: any, existingRefs: Set<string>, seen: Set<string>) {
  const out: Candidate[] = [];

  const scan = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(scan);
      return;
    }
    if (!value || typeof value !== "object") return;

    const record = value as Record<string, unknown>;
    const pid = id(record.pid) || id(record.id);
    const title = candidateTitle(record);
    const cat = category(categoryText(record));

    if (pid && title && cat && !existingRefs.has(pid) && !seen.has(pid) && !blockedReason(title)) {
      const base = {
        id: pid,
        category: cat,
        title,
        inventoryHint: inventoryHint(record),
        popularityHint: popularityHint(record),
      };
      seen.add(pid);
      out.push({ ...base, score: scoreCandidate(base) });
    }

    for (const nested of Object.values(record)) {
      if (Array.isArray(nested) || (nested && typeof nested === "object")) scan(nested);
    }
  };

  scan(payload?.data);
  return out;
}

function balancedSelection(pool: Candidate[]) {
  const buckets = new Map<string, Candidate[]>();
  for (const candidate of pool) {
    const list = buckets.get(candidate.category) ?? [];
    list.push(candidate);
    buckets.set(candidate.category, list);
  }
  for (const list of buckets.values()) list.sort((a, b) => b.score - a.score);

  const selected: Candidate[] = [];
  const chosen = new Set<string>();
  let cursor = 0;

  while (selected.length < MAX_PRODUCTS) {
    let added = false;
    for (const cat of CATEGORY_PRIORITY) {
      const list = buckets.get(cat) ?? [];
      const candidate = list[cursor];
      if (candidate && !chosen.has(candidate.id)) {
        selected.push(candidate);
        chosen.add(candidate.id);
        added = true;
        if (selected.length >= MAX_PRODUCTS) break;
      }
    }
    if (!added) break;
    cursor += 1;
  }

  if (selected.length < MAX_PRODUCTS) {
    for (const candidate of [...pool].sort((a, b) => b.score - a.score)) {
      if (chosen.has(candidate.id)) continue;
      selected.push(candidate);
      chosen.add(candidate.id);
      if (selected.length >= MAX_PRODUCTS) break;
    }
  }

  return selected;
}

function inv(value: any) {
  return Array.isArray(value)
    ? value.reduce((sum: number, row: any) => sum + int0(row?.totalInventory ?? row?.totalInventoryNum), 0)
    : 0;
}

function inventorySummary(payload: any): InventorySummary {
  const variantTotals = new Map<string, number>();
  const availableVariantIds = new Set<string>();

  const productInventories = Array.isArray(payload?.data?.inventories) ? payload.data.inventories : [];
  let productTotal = productInventories.reduce(
    (sum: number, row: any) => sum + int0(row?.totalInventoryNum ?? row?.totalInventory),
    0,
  );

  const variants = Array.isArray(payload?.data?.variantInventories) ? payload.data.variantInventories : [];
  for (const variant of variants) {
    const vid = id(variant?.vid);
    if (!vid) continue;
    const warehouses = Array.isArray(variant?.inventory) ? variant.inventory : [];
    const total = warehouses.reduce(
      (sum: number, row: any) => sum + int0(row?.totalInventory ?? row?.totalInventoryNum),
      0,
    );
    variantTotals.set(vid, total);
    if (total > 0) availableVariantIds.add(vid);
  }

  if (productTotal <= 0 && variantTotals.size) {
    productTotal = [...variantTotals.values()].reduce((sum, total) => sum + total, 0);
  }

  return { productTotal, variantTotals, availableVariantIds };
}

async function user(req: Request, client: ReturnType<typeof createClient>): Promise<User> {
  const authToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!authToken) throw new Error("authorization_required");
  const { data, error } = await client.auth.getUser(authToken);
  if (error || !data.user) throw new Error("authorization_required");
  return data.user;
}

async function adminOk(admin: AdminClient, userId: string) {
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

async function token(apiKey: string) {
  const response = await fetch(`${CJ_API_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const payload = (await response.json().catch(() => null)) as any;
  const accessToken = payload?.data?.accessToken;
  if (!response.ok || payload?.code !== 200 || !accessToken) throw new Error("cj_authentication_failed");
  return String(accessToken);
}

function client(accessToken: string) {
  let lastRequestAt = 0;
  return async (path: string) => {
    const wait = REQUEST_GAP_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

    const response = await fetch(`${CJ_API_BASE}${path}`, {
      headers: { Accept: "application/json", "CJ-Access-Token": accessToken },
    });
    lastRequestAt = Date.now();

    const payload = (await response.json().catch(() => null)) as any;
    if (!response.ok || payload?.code !== 200) throw new Error("cj_request_failed");
    return payload;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed." }, 405);

  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { error: "Origin not allowed." }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const pub =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    defaultApiKey("SUPABASE_PUBLISHABLE_KEYS");
  const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? defaultApiKey("SUPABASE_SECRET_KEYS");
  const cjApiKey = Deno.env.get("CJ_API_KEY");

  if (!url || !pub || !srv || !cjApiKey) {
    return json(req, { error: "CJ catalogue sync is not configured." }, 503);
  }

  const userClient = createClient(url, pub, {
    global: { fetch: sf(pub) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(url, srv, {
    global: { fetch: sf(srv) },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let currentUser: User;
  try {
    currentUser = await user(req, userClient);
    await adminOk(admin, currentUser.id);
  } catch {
    return json(req, { error: "An authorised Cossa Store administrator is required." }, 401);
  }

  try {
    const cj = client(await token(cjApiKey));

    const { data: existingProducts, error: existingError } = await admin
      .from("store_products")
      .select("supplier_product_ref")
      .eq("organisation_id", ORG_ID)
      .eq("supplier_name", "CJ Dropshipping");
    if (existingError) throw existingError;

    const existingRefs = new Set(
      (existingProducts ?? [])
        .map((row: any) => String(row.supplier_product_ref ?? "").trim())
        .filter(Boolean),
    );

    const pool: Candidate[] = [];
    const seen = new Set<string>();
    let discoveryPagesLoaded = 0;

    for (let page = 1; page <= DISCOVERY_PAGES; page += 1) {
      const params = new URLSearchParams({
        page: String(page),
        size: String(DISCOVERY_SIZE),
        productFlag: "0",
        startWarehouseInventory: "1",
        verifiedWarehouse: "1",
        orderBy: "1",
        sort: "desc",
      });
      params.append("features", "enable_description");
      params.append("features", "enable_category");

      try {
        const payload = await cj(`/product/listV2?${params}`);
        pool.push(...collectCandidates(payload, existingRefs, seen));
        discoveryPagesLoaded += 1;
      } catch {
        if (page === 1) throw new Error("cj_discovery_failed");
        break;
      }
    }

    const list = balancedSelection(pool);
    const summary = {
      requested: list.length,
      createdAsDraft: 0,
      refreshed: 0,
      skipped: 0,
      products: [] as any[],
      discovery: {
        pagesLoaded: discoveryPagesLoaded,
        candidatePool: pool.length,
        existingFiltered: existingRefs.size,
      },
      rejections: {
        blocked: 0,
        incomplete: 0,
        noInventory: 0,
        noAvailableVariants: 0,
        failed: 0,
      },
    };

    for (const candidate of list) {
      try {
        const productPayload = await cj(`/product/query?pid=${encodeURIComponent(candidate.id)}`);
        const product = productPayload?.data ?? {};

        const pid = id(product.pid);
        const rawName = txt(product.productNameEn, 220);
        const full = desc(product.description);
        const images = [
          product.bigImage,
          ...(Array.isArray(product.productImageSet) ? product.productImageSet : []),
        ]
          .filter(http)
          .filter((value: string, index: number, values: string[]) => values.indexOf(value) === index)
          .slice(0, 12);
        const variants = Array.isArray(product.variants) ? product.variants : [];
        const costs = variants
          .map((variant: any) => pos(variant.variantSellPrice))
          .filter((value: any): value is number => value !== null);
        const cat = category(product.categoryName) ?? candidate.category;

        const blocked = blockedReason(`${rawName} ${full.slice(0, 500)}`);
        if (blocked) {
          summary.skipped += 1;
          summary.rejections.blocked += 1;
          continue;
        }

        if (
          !pid ||
          !rawName ||
          full.length < 40 ||
          !images.length ||
          !variants.length ||
          !costs.length ||
          !cat
        ) {
          summary.skipped += 1;
          summary.rejections.incomplete += 1;
          continue;
        }

        const stockPayload = await cj(
          `/product/stock/getInventoryByPid?pid=${encodeURIComponent(pid)}`,
        );
        const live = inventorySummary(stockPayload);

        const detailAvailability = new Set<string>();
        for (const variant of variants) {
          const vid = id(variant?.vid);
          if (vid && inv(variant?.inventories) > 0) detailAvailability.add(vid);
        }

        const availableIds = live.availableVariantIds.size
          ? live.availableVariantIds
          : detailAvailability;
        const totalInventory = live.productTotal > 0
          ? live.productTotal
          : variants.reduce((sum: number, variant: any) => sum + inv(variant?.inventories), 0);

        if (totalInventory <= 0) {
          summary.skipped += 1;
          summary.rejections.noInventory += 1;
          continue;
        }

        if (!availableIds.size) {
          summary.skipped += 1;
          summary.rejections.noAvailableVariants += 1;
          continue;
        }

        const existing = await admin
          .from("store_products")
          .select("id,slug,sku,status,name,short_description,description,category,brand,price,cost_price,seo_title,seo_description")
          .eq("organisation_id", ORG_ID)
          .eq("supplier_name", "CJ Dropshipping")
          .eq("supplier_product_ref", pid)
          .maybeSingle();
        if (existing.error) throw existing.error;

        const old = existing.data as any;
        const active = old?.status === "active";
        const now = new Date().toISOString();
        const minSourceCost = Math.min(...costs);

        const row = {
          organisation_id: ORG_ID,
          name: active && old.name ? old.name : rawName,
          slug:
            old?.slug ||
            `cj-${slug(rawName).slice(0, 130)}-${pid.slice(0, 8).toLowerCase()}`,
          sku:
            old?.sku ||
            `CJ-${pid.replace(/[^A-Za-z0-9]/g, "").slice(0, 16).toUpperCase()}`,
          product_type: "dropshipping",
          fulfilment_model: "international_dropshipping",
          status:
            old?.status === "active"
              ? "active"
              : old?.status === "archived"
                ? "archived"
                : "draft",
          short_description:
            active && old.short_description ? old.short_description : full.slice(0, 240),
          description: active && old.description ? old.description : full,
          category: old?.category || cat,
          brand: old?.brand || "Cossa Store",
          supplier_name: "CJ Dropshipping",
          supplier_product_ref: pid,
          currency: "ZAR",
          source_currency: "USD",
          source_price: minSourceCost,
          source_cost: minSourceCost,
          cost_price: old?.cost_price ?? 0,
          price: old?.price ?? 0,
          track_inventory: true,
          stock_quantity: totalInventory,
          unlimited_stock: false,
          image_urls: images,
          seo_title: active && old.seo_title ? old.seo_title : rawName.slice(0, 70),
          seo_description:
            active && old.seo_description ? old.seo_description : full.slice(0, 160),
          updated_at: now,
        };

        const saved = old
          ? await admin.from("store_products").update(row).eq("id", old.id).select("id").single()
          : await admin.from("store_products").insert(row).select("id").single();
        if (saved.error) throw saved.error;

        const currentVariants = await admin
          .from("store_product_variants")
          .select("provider_variant_id,price_zar,cost_zar,fx_rate_to_zar")
          .eq("product_id", saved.data.id)
          .eq("provider", "CJ Dropshipping");
        if (currentVariants.error) throw currentVariants.error;

        const previousPrices = new Map(
          (currentVariants.data ?? []).map((variant: any) => [variant.provider_variant_id, variant]),
        );

        const rows = variants
          .map((variant: any, index: number) => {
            const vid = id(variant.vid);
            const source = pos(variant.variantSellPrice);
            if (!vid || !source) return null;

            const previous = previousPrices.get(vid) as any;
            const liveInventory = live.variantTotals.get(vid) ?? inv(variant.inventories);
            const isAvailable = availableIds.has(vid) && liveInventory > 0;

            return {
              product_id: saved.data.id,
              provider: "CJ Dropshipping",
              provider_product_id: pid,
              provider_variant_id: vid,
              sku: txt(variant.variantSku, 220) || null,
              title:
                txt(variant.variantNameEn, 220) ||
                txt(variant.variantKey, 220) ||
                `CJ option ${index + 1}`,
              option_values: txt(variant.variantKey, 220)
                ? [{ name: "CJ option", value: txt(variant.variantKey, 220) }]
                : [],
              source_currency: "USD",
              source_price: source,
              source_cost: source,
              fx_rate_to_zar: previous?.fx_rate_to_zar ?? null,
              price_zar: previous?.price_zar ?? 0,
              cost_zar: previous?.cost_zar ?? null,
              is_default: index === 0,
              is_available: isAvailable,
              sort_order: index,
              raw_provider_data: {
                source: "CJ Dropshipping",
                weight_g: pos(variant.variantWeight),
                live_inventory: liveInventory,
                availability_checked_at: now,
                discovery_score: candidate.score,
                discovery_category: candidate.category,
                inventory: Array.isArray(variant.inventories) ? variant.inventories : [],
                variant,
              },
              updated_at: now,
            };
          })
          .filter(Boolean);

        if (!rows.length || !rows.some((variant: any) => variant.is_available)) {
          summary.skipped += 1;
          summary.rejections.noAvailableVariants += 1;
          if (!old) await admin.from("store_products").delete().eq("id", saved.data.id);
          continue;
        }

        const upsert = await admin
          .from("store_product_variants")
          .upsert(rows, { onConflict: "product_id,provider,provider_variant_id" });
        if (upsert.error) throw upsert.error;

        summary[old ? "refreshed" : "createdAsDraft"] += 1;
        summary.products.push({
          productId: pid,
          title: row.name,
          category: row.category,
          variants: rows.length,
          availableVariants: rows.filter((variant: any) => variant.is_available).length,
          totalInventory,
          discoveryScore: Math.round(candidate.score * 10) / 10,
        });
      } catch {
        summary.skipped += 1;
        summary.rejections.failed += 1;
      }
    }

    await admin.from("audit_events").insert({
      organisation_id: ORG_ID,
      actor_type: "user",
      actor_user_id: currentUser.id,
      event_type: "cj_catalogue_sync_succeeded",
      entity_type: "store_catalogue",
      entity_id: "cj_dropshipping",
      metadata: {
        requested: summary.requested,
        created_draft: summary.createdAsDraft,
        refreshed: summary.refreshed,
        skipped: summary.skipped,
        batch_size: MAX_PRODUCTS,
        discovery_size: DISCOVERY_SIZE,
        discovery_pages: discoveryPagesLoaded,
        candidate_pool: pool.length,
        rejections: summary.rejections,
      },
    });

    return json(req, summary);
  } catch {
    return json(
      req,
      { error: "CJ catalogue sync is temporarily unavailable. No customer-facing catalogue data was changed." },
      502,
    );
  }
});
