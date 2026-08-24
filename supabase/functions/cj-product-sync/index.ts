import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";
const ORG_ID = "00000000-0000-4000-8000-000000000001",
  CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1",
  MAX_PRODUCTS = 5,
  DISCOVERY_SIZE = 100,
  DISCOVERY_PAGES = 4,
  REQUEST_GAP_MS = 1100;
const ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);
const PRIORITY = [
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
];
type Admin = ReturnType<typeof createClient>;
type Candidate = { id: string; title: string; category: string; score: number };
function envDefault(n: string) {
  const r = Deno.env.get(n);
  if (!r) return;
  try {
    const o = JSON.parse(r);
    return typeof o.default === "string" ? o.default : undefined;
  } catch {
    return;
  }
}
function isNewKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}
function sf(k: string): typeof fetch {
  return (i, n) => {
    const h = new Headers(i instanceof Request ? i.headers : undefined);
    if (n?.headers) new Headers(n.headers).forEach((v, x) => h.set(x, v));
    if (isNewKey(k) && h.get("authorization") === `Bearer ${k}`) h.delete("authorization");
    h.set("apikey", k);
    return fetch(i, { ...n, headers: h });
  };
}
function cors(r: Request): HeadersInit {
  const o = r.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": o && ORIGINS.has(o) ? o : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}
function json(r: Request, b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: {
      ...cors(r),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
function text(v: unknown, n = 500) {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "";
}
function ident(v: unknown) {
  const x = text(v, 200);
  return /^[A-Za-z0-9_-]{1,200}$/.test(x) ? x : "";
}
function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function qty(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function isUrl(v: unknown): v is string {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
function slug(v: string) {
  return v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
function clean(v: unknown) {
  return text(
    text(v, 12000)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'"),
    12000,
  );
}
function blocked(v: string) {
  const t = v.toLowerCase();
  if (/\b(vape|e-cig|cigarette|nicotine|tobacco|cbd|thc|cannabis|marijuana)\b/.test(t))
    return "regulated";
  if (
    /\b(gun|rifle|pistol|ammo|ammunition|bullet|taser|pepper spray|switchblade|dagger|sword|scimitar|machete|butcher knife|skinning knife|tactical helmet|brass knuckle)\b/.test(
      t,
    )
  )
    return "weapon";
  if (
    /\b(spy camera|hidden camera|micro camera|mini hidden camera|covert camera|a9 wifi camera|wireless network camera|camera jammer|gps jammer|signal jammer)\b/.test(
      t,
    )
  )
    return "surveillance";
  if (/\b(dildo|vibrator|sex toy|adult toy|masturbat)\b/.test(t)) return "adult";
  if (/\b(steroid|hormone|prescription drug|prescription medicine)\b/.test(t))
    return "restricted_health";
  if (/\b(miracle cure|cures cancer|weight loss pill|slimming pill)\b/.test(t))
    return "unsafe_claim";
  return null;
}
function category(cat: string, title: string, description = "") {
  const x = `${title} ${cat} ${description}`.toLowerCase();
  // Specific product functions take precedence over generic words such as "car",
  // "men" or "outdoor" in CJ marketing copy.
  if (/humidifier|air purifier|shower head|kitchen|bathroom storage|home lighting/.test(x))
    return "home-living";
  if (/resistance band|knee pad|skipping rope|exercise|fitness|gym|yoga/.test(x))
    return "sports-fitness";
  if (/beauty|makeup|cosmetic|nail|skincare|blackhead|facial|hair care|grooming/.test(x))
    return "beauty-grooming";
  if (/pet|dog|cat/.test(x)) return "pet-supplies";
  if (/car scratch|car wash|car care|automotive|vehicle|motorcycle|dash cam/.test(x))
    return "automotive";
  if (/phone case|screen protector|mobile charger|charging cable|phone holder/.test(x))
    return "mobile-accessories";
  if (/security|alarm|doorbell|smart lock|motion sensor/.test(x)) return "security-smart-home";
  if (/clean|laundry|mop|lint|vacuum|wash towel|dishwash/.test(x)) return "cleaning-household";
  if (/power tool|hand tool|industrial|workshop|tool bag|needle threader/.test(x))
    return "tools-industrial";
  if (
    /measure|ruler|hardware|plumbing|drain|dredger|construction|repair tool|home improvement/.test(
      x,
    )
  )
    return "construction-diy";
  if (/speaker|earbud|computer|electronic|wifi|antenna|camera|usb|bluetooth/.test(x))
    return "technology-electronics";
  if (/office|business|stationery|workspace|packaging/.test(x)) return "office-business";
  if (/oral care|toothbrush|personal care|hygiene|wellness/.test(x)) return "health-personal-care";
  if (/sport|fitness|exercise|gym|yoga|resistance band|knee pad|skipping rope/.test(x))
    return "sports-fitness";
  if (/garden|plant|outdoor|camping/.test(x)) return "outdoor-garden";
  if (/baby|infant|child|kids|toy/.test(x)) return "kids-baby";
  if (/women|female|ladies|bra|handbag|women shoes/.test(x)) return "women";
  if (/men|male|mens|hoodie/.test(x)) return "men";
  if (/travel|luggage|cosmetic bag|shoulder bag/.test(x)) return "travel-luggage";
  if (/gaming|game controller|console/.test(x)) return "gaming-entertainment";
  if (/school|education|drawing pad|learning/.test(x)) return "school-education";
  if (/home|kitchen|bathroom|storage|rack|shelf|lighting|humidifier|appliance/.test(x))
    return "home-living";
  return null;
}
function useful(v: string) {
  const t = v.toLowerCase();
  let s = 0;
  for (const r of [
    /clean|remover|repair|measure|organizer|storage|holder|rack|shelf/,
    /charger|power|battery|cable|adapter|sensor|alarm|tracker|finder/,
    /portable|reusable|foldable|wireless|automatic|waterproof|saving|protect/,
    /kitchen|bathroom|car care|home improvement|pet care/,
  ])
    if (r.test(t)) s += 5;
  if (/miracle|slimming|anti cellulite|ultimate ems/.test(t)) s -= 10;
  return s;
}
function score(cat: string, title: string, raw: any) {
  const p = PRIORITY.indexOf(cat);
  let s = p >= 0 ? 30 - p : 0;
  s += useful(title);
  for (const k of ["sales", "saleCount", "salesVolume", "orderCount", "listedNum"]) {
    const n = Number(raw?.[k]);
    if (Number.isFinite(n) && n > 0) s += Math.min(15, Math.log10(n + 1) * 4);
  }
  return s;
}
async function authUser(r: Request, c: ReturnType<typeof createClient>): Promise<User> {
  const t = r.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!t) throw 0;
  const { data, error } = await c.auth.getUser(t);
  if (error || !data.user) throw 0;
  return data.user;
}
async function requireAdmin(a: Admin, u: string) {
  const [m, r] = await Promise.all([
    a
      .from("organisation_members")
      .select("role")
      .eq("organisation_id", ORG_ID)
      .eq("user_id", u)
      .eq("status", "active")
      .in("role", ["owner", "admin"]),
    a.from("user_roles").select("role").eq("user_id", u).eq("role", "admin"),
  ]);
  if (m.error || r.error || (!(m.data ?? []).length && !(r.data ?? []).length)) throw 0;
}
async function token(k: string) {
  const r = await fetch(`${CJ_API_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ apiKey: k }),
  });
  const p = (await r.json().catch(() => null)) as any;
  if (!r.ok || p?.code !== 200 || !p?.data?.accessToken)
    throw new Error("cj_authentication_failed");
  return String(p.data.accessToken);
}
function client(t: string) {
  let last = 0;
  return async (path: string) => {
    const wait = REQUEST_GAP_MS - (Date.now() - last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const r = await fetch(`${CJ_API_BASE}${path}`, {
      headers: { Accept: "application/json", "CJ-Access-Token": t },
    });
    last = Date.now();
    const p = (await r.json().catch(() => null)) as any;
    if (!r.ok || p?.code !== 200) throw new Error("cj_request_failed");
    return p;
  };
}
function idsFrom(p: any) {
  const out = new Set<string>();
  const rows = Array.isArray(p?.data?.variants)
    ? p.data.variants
    : Array.isArray(p?.data)
      ? p.data
      : [];
  for (const r of rows) {
    const v = ident(r?.vid);
    if (v) out.add(v);
  }
  return out;
}
function inventory(p: any) {
  const totals = new Map<string, number>(),
    available = new Set<string>();
  const pi = Array.isArray(p?.data?.inventories) ? p.data.inventories : [];
  let total = pi.reduce(
    (s: number, x: any) => s + qty(x?.totalInventoryNum ?? x?.totalInventory),
    0,
  );
  for (const v of Array.isArray(p?.data?.variantInventories) ? p.data.variantInventories : []) {
    const vid = ident(v?.vid);
    if (!vid) continue;
    const n = (Array.isArray(v?.inventory) ? v.inventory : []).reduce(
      (s: number, x: any) => s + qty(x?.totalInventory ?? x?.totalInventoryNum),
      0,
    );
    totals.set(vid, n);
    if (n > 0) available.add(vid);
  }
  if (total <= 0 && totals.size) total = [...totals.values()].reduce((s, n) => s + n, 0);
  return { total, totals, available };
}
async function availability(cj: (p: string) => Promise<any>, pid: string, detail: any) {
  const inv = inventory(
    await cj(`/product/stock/getInventoryByPid?pid=${encodeURIComponent(pid)}`).catch(() => ({
      data: {},
    })),
  );
  let available = new Set(inv.available),
    source = "inventory";
  if (!available.size) {
    const [cn, us] = await Promise.all([
      cj(`/product/query?pid=${encodeURIComponent(pid)}&countryCode=CN`).catch(() => ({
        data: { variants: [] },
      })),
      cj(`/product/query?pid=${encodeURIComponent(pid)}&countryCode=US`).catch(() => ({
        data: { variants: [] },
      })),
    ]);
    available = new Set([...idsFrom(cn), ...idsFrom(us)]);
    if (available.size) source = "country_product_query";
  }
  if (!available.size) {
    const [cn, us] = await Promise.all([
      cj(`/product/variant/query?pid=${encodeURIComponent(pid)}&countryCode=CN`).catch(() => ({
        data: [],
      })),
      cj(`/product/variant/query?pid=${encodeURIComponent(pid)}&countryCode=US`).catch(() => ({
        data: [],
      })),
    ]);
    available = new Set([...idsFrom(cn), ...idsFrom(us)]);
    if (available.size) source = "country_variant_query";
  }
  if (!available.size) {
    for (const v of Array.isArray(detail?.variants) ? detail.variants : []) {
      const vid = ident(v?.vid),
        n = (Array.isArray(v?.inventories) ? v.inventories : []).reduce(
          (s: number, x: any) => s + qty(x?.totalInventory ?? x?.totalInventoryNum),
          0,
        );
      if (vid && n > 0) {
        available.add(vid);
        if (!inv.totals.has(vid)) inv.totals.set(vid, n);
      }
    }
    if (available.size) source = "detail_fallback";
  }
  const effectiveTotal = inv.total > 0 ? inv.total : available.size;
  return { ...inv, total: effectiveTotal, available, source };
}
function collect(payload: any, existing: Set<string>, seen: Set<string>) {
  const out: Candidate[] = [];
  const walk = (v: any) => {
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (!v || typeof v !== "object") return;
    const pid = ident(v.pid) || ident(v.id),
      title = text(v.productNameEn ?? v.productName ?? v.nameEn ?? v.name ?? v.title, 260),
      cat = category(
        text(
          v.categoryName ??
            [v.oneCategoryName, v.twoCategoryName, v.threeCategoryName].filter(Boolean).join(" / "),
          700,
        ),
        title,
      );
    if (pid && title && cat && !existing.has(pid) && !seen.has(pid) && !blocked(title)) {
      seen.add(pid);
      out.push({ id: pid, title, category: cat, score: score(cat, title, v) });
    }
    for (const n of Object.values(v)) if (Array.isArray(n) || (n && typeof n === "object")) walk(n);
  };
  walk(payload?.data);
  return out;
}
function select(pool: Candidate[]) {
  const buckets = new Map<string, Candidate[]>();
  for (const c of pool) {
    const x = buckets.get(c.category) ?? [];
    x.push(c);
    buckets.set(c.category, x);
  }
  for (const x of buckets.values()) x.sort((a, b) => b.score - a.score);
  const out: Candidate[] = [],
    used = new Set<string>();
  let i = 0;
  while (out.length < MAX_PRODUCTS) {
    let add = false;
    for (const c of PRIORITY) {
      const x = (buckets.get(c) ?? [])[i];
      if (x && !used.has(x.id)) {
        out.push(x);
        used.add(x.id);
        add = true;
        if (out.length === MAX_PRODUCTS) break;
      }
    }
    if (!add) break;
    i++;
  }
  return out;
}
Deno.serve(async (r) => {
  if (r.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(r) });
  if (r.method !== "POST") return json(r, { error: "Method not allowed." }, 405);
  const o = r.headers.get("origin");
  if (o && !ORIGINS.has(o)) return json(r, { error: "Origin not allowed." }, 403);
  const url = Deno.env.get("SUPABASE_URL"),
    pub =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      envDefault("SUPABASE_PUBLISHABLE_KEYS"),
    srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? envDefault("SUPABASE_SECRET_KEYS"),
    ck = Deno.env.get("CJ_API_KEY");
  if (!url || !pub || !srv || !ck)
    return json(r, { error: "CJ catalogue sync is not configured." }, 503);
  const uc = createClient(url, pub, {
      global: { fetch: sf(pub) },
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    a = createClient(url, srv, {
      global: { fetch: sf(srv) },
      auth: { autoRefreshToken: false, persistSession: false },
    });
  let u: User;
  try {
    u = await authUser(r, uc);
    await requireAdmin(a, u.id);
  } catch {
    return json(r, { error: "An authorised Cossa Store administrator is required." }, 401);
  }
  try {
    const cj = client(await token(ck));
    const { data: existingRows, error: ee } = await a
      .from("store_products")
      .select("supplier_product_ref")
      .eq("organisation_id", ORG_ID)
      .eq("supplier_name", "CJ Dropshipping");
    if (ee) throw ee;
    const existing = new Set(
        (existingRows ?? []).map((x: any) => String(x.supplier_product_ref ?? "")).filter(Boolean),
      ),
      seen = new Set<string>(),
      pool: Candidate[] = [];
    for (let page = 1; page <= DISCOVERY_PAGES; page++) {
      const q = new URLSearchParams({
        page: String(page),
        size: String(DISCOVERY_SIZE),
        productFlag: "0",
        startWarehouseInventory: "1",
        verifiedWarehouse: "1",
        orderBy: "4",
        sort: "desc",
      });
      q.append("features", "enable_description");
      q.append("features", "enable_category");
      pool.push(...collect(await cj(`/product/listV2?${q}`), existing, seen));
    }
    const chosen = select(pool);
    const summary: any = {
      requested: chosen.length,
      createdAsDraft: 0,
      refreshed: 0,
      skipped: 0,
      products: [],
      rejections: { blocked: 0, incomplete: 0, noInventory: 0, noAvailableVariants: 0, failed: 0 },
      rejectionDetails: [],
      discovery: { candidatePool: pool.length, existingFiltered: existing.size },
    };
    for (const c of chosen) {
      let insertedProductId: string | null = null;
      try {
        const p = (await cj(`/product/query?pid=${encodeURIComponent(c.id)}`))?.data ?? {},
          pid = ident(p.pid),
          name = text(p.productNameEn, 220),
          description = clean(p.description),
          cat = category(text(p.categoryName, 700), name, description) ?? c.category,
          images = [p.bigImage, ...(Array.isArray(p.productImageSet) ? p.productImageSet : [])]
            .filter(isUrl)
            .filter((x: string, i: number, a: string[]) => a.indexOf(x) === i)
            .slice(0, 12),
          variants = Array.isArray(p.variants) ? p.variants : [],
          costs = variants
            .map((v: any) => num(v.variantSellPrice))
            .filter((x: any): x is number => x !== null);
        if (blocked(`${name} ${description.slice(0, 500)}`)) {
          summary.skipped++;
          summary.rejections.blocked++;
          continue;
        }
        if (
          !pid ||
          !name ||
          description.length < 40 ||
          !cat ||
          !images.length ||
          !variants.length ||
          !costs.length
        ) {
          summary.skipped++;
          summary.rejections.incomplete++;
          continue;
        }
        const live = await availability(cj, pid, p);
        if (live.total <= 0) {
          summary.skipped++;
          summary.rejections.noInventory++;
          continue;
        }
        if (!live.available.size) {
          summary.skipped++;
          summary.rejections.noAvailableVariants++;
          continue;
        }
        const now = new Date().toISOString(),
          min = Math.min(...costs),
          row = {
            organisation_id: ORG_ID,
            name,
            slug: `cj-${slug(name).slice(0, 130)}-${pid.slice(0, 8).toLowerCase()}`,
            sku: `CJ-${pid
              .replace(/[^A-Za-z0-9]/g, "")
              .slice(0, 16)
              .toUpperCase()}`,
            product_type: "dropshipping",
            fulfilment_model: "international_dropshipping",
            status: "draft",
            short_description: description.slice(0, 240),
            description,
            category: cat,
            brand: "Cossa Store",
            supplier_name: "CJ Dropshipping",
            supplier_product_ref: pid,
            currency: "ZAR",
            source_currency: "USD",
            source_price: min,
            source_cost: min,
            cost_price: 0,
            price: 0,
            track_inventory: true,
            stock_quantity: live.total,
            unlimited_stock: false,
            image_urls: images,
            seo_title: name.slice(0, 70),
            seo_description: description.slice(0, 160),
            updated_at: now,
          };
        const saved = await a.from("store_products").insert(row).select("id").single();
        if (saved.error) throw saved.error;
        insertedProductId = saved.data.id;
        const candidateRows = variants
          .map((v: any, i: number) => {
            const vid = ident(v.vid),
              source = num(v.variantSellPrice);
            if (!vid || !source) return null;
            const known = live.totals.has(vid),
              n = live.totals.get(vid) ?? 0,
              ok = known ? n > 0 : live.available.has(vid);
            return {
              product_id: saved.data.id,
              provider: "CJ Dropshipping",
              provider_product_id: pid,
              provider_variant_id: vid,
              sku: text(v.variantSku, 220) || null,
              title: text(v.variantNameEn, 220) || text(v.variantKey, 220) || `CJ option ${i + 1}`,
              option_values: text(v.variantKey, 220)
                ? [{ name: "CJ option", value: text(v.variantKey, 220) }]
                : [],
              source_currency: "USD",
              source_price: source,
              source_cost: source,
              // Drafts retain the CJ USD source cost. The commercial sync replaces
              // this required catalogue metadata only after its pricing checks pass.
              fx_rate_to_zar: 1,
              price_zar: 0,
              cost_zar: null,
              is_default: i === 0,
              is_available: ok,
              sort_order: i,
              raw_provider_data: {
                source: "CJ Dropshipping",
                live_inventory: known ? n : null,
                availability_source: live.source,
                variant: v,
              },
              updated_at: now,
            };
          })
          .filter(Boolean);
        // CJ can repeat a variant in product detail responses. A single upsert
        // cannot contain duplicate conflict keys, so retain one authoritative row
        // per CJ variant ID before writing the catalogue.
        const rows = Array.from(
          new Map(
            (candidateRows as Array<{ provider_variant_id: string }>).map((row) => [
              row.provider_variant_id,
              row,
            ]),
          ).values(),
        );
        if (!rows.some((x: any) => x.is_available)) {
          await a.from("store_products").delete().eq("id", saved.data.id);
          summary.skipped++;
          summary.rejections.noAvailableVariants++;
          continue;
        }
        const up = await a
          .from("store_product_variants")
          .upsert(rows, { onConflict: "product_id,provider,provider_variant_id" });
        if (up.error) throw up.error;
        summary.createdAsDraft++;
        summary.products.push({
          productId: pid,
          title: name,
          category: cat,
          variants: rows.length,
          availableVariants: rows.filter((x: any) => x.is_available).length,
          totalInventory: live.total,
          inventoryUnitsKnown: live.totals.size > 0,
          availabilitySource: live.source,
        });
      } catch (error) {
        if (insertedProductId) {
          await a
            .from("store_products")
            .delete()
            .eq("id", insertedProductId)
            .eq("supplier_name", "CJ Dropshipping");
        }
        const message = error instanceof Error ? error.message : "unknown";
        const providerCode =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code ?? "")
            : "";
        const missingField =
          providerCode === "23502"
            ? message.match(/null value in column "([a-z_]+)"/i)?.[1]
            : undefined;
        const reason = message.includes("cj_request_failed")
          ? "cj_product_query_failed"
          : providerCode === "23505"
            ? "duplicate"
            : providerCode === "21000"
              ? "duplicate_variant_id"
              : providerCode === "23514"
                ? "catalogue_validation_failed"
                : message.includes("store_product_variants")
                  ? "variant_write_failed"
                  : message.includes("store_products")
                    ? "product_write_failed"
                    : "import_failed";
        summary.skipped++;
        summary.rejections.failed++;
        summary.rejectionDetails.push({
          productId: c.id,
          reason,
          diagnosticCode: providerCode || undefined,
          missingField,
        });
      }
    }
    await a.from("audit_events").insert({
      organisation_id: ORG_ID,
      actor_type: "user",
      actor_user_id: u.id,
      event_type: "cj_catalogue_sync_succeeded",
      entity_type: "store_catalogue",
      entity_id: "cj_dropshipping",
      metadata: {
        requested: summary.requested,
        created_draft: summary.createdAsDraft,
        skipped: summary.skipped,
        batch_size: MAX_PRODUCTS,
        candidate_pool: pool.length,
        rejections: summary.rejections,
      },
    });
    return json(r, summary);
  } catch {
    return json(
      r,
      {
        error:
          "CJ catalogue sync is temporarily unavailable. No customer-facing catalogue data was changed.",
      },
      502,
    );
  }
});
