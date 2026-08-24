import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
// This runs unattended via pg_cron. Keep it safely within both the Edge
// Function and pg_net response windows; the next daily run continues with
// the newest catalogue records.
const LIMIT = 25;
const MAX_VARIANT_PROBES = 12;
const ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);
type Admin = ReturnType<typeof createClient>;

function d(n: string) {
  const r = Deno.env.get(n);
  if (!r) return;
  try {
    const o = JSON.parse(r);
    return typeof o.default === "string" ? o.default : undefined;
  } catch {
    return;
  }
}
function nk(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}
function sf(k: string): typeof fetch {
  return (i, n) => {
    const h = new Headers(i instanceof Request ? i.headers : undefined);
    if (n?.headers) new Headers(n.headers).forEach((v, x) => h.set(x, v));
    if (nk(k) && h.get("authorization") === `Bearer ${k}`) h.delete("authorization");
    h.set("apikey", k);
    return fetch(i, { ...n, headers: h });
  };
}
function cors(r: Request): HeadersInit {
  const o = r.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": o && ORIGINS.has(o) ? o : "",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cossa-automation-token",
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
function q(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function id(v: unknown) {
  const x = String(v ?? "").trim();
  return /^[A-Za-z0-9_-]{1,200}$/.test(x) ? x : "";
}
async function user(r: Request, c: ReturnType<typeof createClient>): Promise<User> {
  const t = r.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!t) throw 0;
  const { data, error } = await c.auth.getUser(t);
  if (error || !data.user) throw 0;
  return data.user;
}
async function admin(a: Admin, u: string) {
  const [m, rr] = await Promise.all([
    a
      .from("organisation_members")
      .select("role")
      .eq("organisation_id", ORG_ID)
      .eq("user_id", u)
      .eq("status", "active")
      .in("role", ["owner", "admin"]),
    a.from("user_roles").select("role").eq("user_id", u).eq("role", "admin"),
  ]);
  if (m.error || rr.error || (!(m.data ?? []).length && !(rr.data ?? []).length)) throw 0;
}
async function scheduledAutomation(a: Admin, r: Request) {
  const value = r.headers.get("x-cossa-automation-token")?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(value)) return false;
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  const hash = [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
  const { data, error } = await a
    .from("supplier_automation_tokens")
    .select("id")
    .eq("provider", "CJ Dropshipping")
    .eq("token_hash", hash)
    .eq("active", true)
    .maybeSingle();
  return !error && Boolean(data);
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
async function get(path: string, t: string) {
  const r = await fetch(`${CJ_API_BASE}${path}`, {
    headers: { Accept: "application/json", "CJ-Access-Token": t },
  });
  const p = (await r.json().catch(() => null)) as any;
  if (!r.ok || p?.code !== 200) throw new Error("cj_request_failed");
  return p;
}
function productInv(p: any) {
  const totals = new Map<string, number>(),
    available = new Set<string>();
  const pi = Array.isArray(p?.data?.inventories) ? p.data.inventories : [];
  let total = pi.reduce((s: number, x: any) => s + q(x?.totalInventoryNum ?? x?.totalInventory), 0);
  for (const v of Array.isArray(p?.data?.variantInventories) ? p.data.variantInventories : []) {
    const vid = id(v?.vid);
    if (!vid) continue;
    const n = (Array.isArray(v?.inventory) ? v.inventory : []).reduce(
      (s: number, x: any) => s + q(x?.totalInventory ?? x?.totalInventoryNum),
      0,
    );
    totals.set(vid, n);
    if (n > 0) available.add(vid);
  }
  if (total <= 0 && totals.size) total = [...totals.values()].reduce((s, n) => s + n, 0);
  return { total, totals, available };
}
function ids(p: any) {
  const out = new Set<string>();
  const rows = Array.isArray(p?.data?.variants)
    ? p.data.variants
    : Array.isArray(p?.data)
      ? p.data
      : [];
  for (const r of rows) {
    const v = id(r?.vid);
    if (v) out.add(v);
  }
  return out;
}
async function probeVid(t: string, vid: string) {
  try {
    const p = await get(
      `/product/variant/queryByVid?vid=${encodeURIComponent(vid)}&features=enable_inventory`,
      t,
    );
    const n = (Array.isArray(p?.data?.inventories) ? p.data.inventories : []).reduce(
      (s: number, x: any) => s + q(x?.totalInventory ?? x?.totalInventoryNum),
      0,
    );
    if (n > 0) return { qty: n, source: "variant_query_by_vid" };
  } catch {}
  try {
    const p = await get(`/product/stock/queryByVid?vid=${encodeURIComponent(vid)}`, t);
    const n = (Array.isArray(p?.data) ? p.data : []).reduce(
      (s: number, x: any) => s + q(x?.totalInventoryNum ?? x?.totalInventory),
      0,
    );
    return { qty: n, source: "stock_query_by_vid" };
  } catch {
    return { qty: 0, source: "variant_probe_failed" };
  }
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
      d("SUPABASE_PUBLISHABLE_KEYS"),
    srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? d("SUPABASE_SECRET_KEYS"),
    ck = Deno.env.get("CJ_API_KEY");
  if (!url || !pub || !srv || !ck)
    return json(r, { error: "CJ availability sync is not configured." }, 503);
  const uc = createClient(url, pub, {
      global: { fetch: sf(pub) },
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    a = createClient(url, srv, {
      global: { fetch: sf(srv) },
      auth: { autoRefreshToken: false, persistSession: false },
    });
  const automated = await scheduledAutomation(a, r);
  if (!automated) {
    try {
      const u = await user(r, uc);
      await admin(a, u.id);
    } catch {
      return json(r, { error: "An authorised Cossa Store administrator is required." }, 401);
    }
  }
  try {
    const t = await token(ck);
    const { data: products, error } = await a
      .from("store_products")
      .select("id,name,status,supplier_product_ref,stock_quantity")
      .eq("organisation_id", ORG_ID)
      .eq("supplier_name", "CJ Dropshipping")
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(LIMIT);
    if (error) throw error;
    const results: any[] = [];
    for (const p of products ?? []) {
      const pid = String(p.supplier_product_ref ?? "").trim();
      if (!pid) continue;
      const raw = await get(
          `/product/stock/getInventoryByPid?pid=${encodeURIComponent(pid)}`,
          t,
        ).catch(() => ({ data: {} })),
        x = productInv(raw);
      let available = new Set(x.available),
        source = "inventory_by_pid";
      if (!available.size) {
        const [cn, us] = await Promise.all([
          get(`/product/query?pid=${encodeURIComponent(pid)}&countryCode=CN`, t).catch(() => ({
            data: { variants: [] },
          })),
          get(`/product/query?pid=${encodeURIComponent(pid)}&countryCode=US`, t).catch(() => ({
            data: { variants: [] },
          })),
        ]);
        available = new Set([...ids(cn), ...ids(us)]);
        if (available.size) source = "country_product_query";
      }
      if (!available.size) {
        const [cn, us] = await Promise.all([
          get(`/product/variant/query?pid=${encodeURIComponent(pid)}&countryCode=CN`, t).catch(
            () => ({ data: [] }),
          ),
          get(`/product/variant/query?pid=${encodeURIComponent(pid)}&countryCode=US`, t).catch(
            () => ({ data: [] }),
          ),
        ]);
        available = new Set([...ids(cn), ...ids(us)]);
        if (available.size) source = "country_variant_query";
      }
      const { data: variants, error: ve } = await a
        .from("store_product_variants")
        .select("provider_variant_id,raw_provider_data")
        .eq("product_id", p.id)
        .eq("provider", "CJ Dropshipping")
        .order("sort_order", { ascending: true });
      if (ve) throw ve;
      const perVid = new Map<string, { qty: number; source: string }>();
      if (!available.size) {
        for (const v of (variants ?? []).slice(0, MAX_VARIANT_PROBES)) {
          const vid = id(v.provider_variant_id);
          if (!vid) continue;
          const pr = await probeVid(t, vid);
          perVid.set(vid, pr);
          if (pr.qty > 0) available.add(vid);
        }
        if (available.size) source = "authoritative_variant_probe";
      }
      let matched = 0,
        probedTotal = 0;
      const now = new Date().toISOString();
      for (const v of variants ?? []) {
        const vid = id(v.provider_variant_id);
        const probed = perVid.get(vid);
        const known = x.totals.has(vid);
        const n = probed?.qty ?? x.totals.get(vid) ?? 0;
        const ok = probed ? probed.qty > 0 : known ? n > 0 : available.has(vid);
        if (ok) matched++;
        probedTotal += n;
        const old =
          v.raw_provider_data && typeof v.raw_provider_data === "object" ? v.raw_provider_data : {};
        const { error: e } = await a
          .from("store_product_variants")
          .update({
            is_available: ok,
            raw_provider_data: {
              ...old,
              live_inventory: n || null,
              availability_checked_at: now,
              availability_source: probed?.source ?? source,
            },
            updated_at: now,
          })
          .eq("product_id", p.id)
          .eq("provider", "CJ Dropshipping")
          .eq("provider_variant_id", vid);
        if (e) throw e;
      }
      const resolvedTotal = Math.max(x.total, probedTotal, available.size > 0 ? 1 : 0);
      const pe = await a
        .from("store_products")
        .update({ stock_quantity: resolvedTotal, updated_at: now })
        .eq("id", p.id)
        .eq("organisation_id", ORG_ID);
      if (pe.error) throw pe.error;
      if (resolvedTotal <= 0 && p.status === "active")
        await a.from("store_products").update({ status: "draft", updated_at: now }).eq("id", p.id);
      results.push({
        productId: pid,
        title: p.name,
        availableVariants: matched,
        totalInventory: resolvedTotal,
        source,
        diagnostic:
          matched > 0
            ? "ok"
            : resolvedTotal > 0
              ? "variant_inventory_unresolved"
              : "no_live_inventory",
      });
    }
    return json(r, { processed: results.length, products: results });
  } catch (e) {
    console.error(
      JSON.stringify({
        event: "cj_availability_failed",
        reason: e instanceof Error ? e.message : "unknown",
      }),
    );
    return json(
      r,
      { error: "CJ availability refresh failed safely. No products were published." },
      502,
    );
  }
});
