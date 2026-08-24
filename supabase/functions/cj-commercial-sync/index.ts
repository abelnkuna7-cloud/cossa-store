import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";
const ORG_ID = "00000000-0000-4000-8000-000000000001",
  CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const FX = 16.5,
  RISK = 0.12,
  FIXED = 20,
  MARGIN = 0.35,
  MAX_DAYS = 60,
  MAX_SHIP_USD = 35,
  MAX_RETAIL = 3000,
  // Build the public catalogue evenly. This is a target, not a promise to
  // publish unsuitable CJ products: every candidate must still pass the live
  // stock, South African freight, and price checks below.
  ACTIVE_TARGET_PER_CATEGORY = 12,
  // Each candidate requires a live CJ freight request. Keep one admin run safely
  // below the Edge Runtime execution ceiling; the action can be run again for
  // the next controlled batch.
  LIMIT = 25;
const ORIGINS = new Set([
  "https://store.cossanexusholdings.co.za",
  "https://growth.cossanexusholdings.co.za",
  "http://localhost:3000",
  "http://localhost:5173",
]);
type Admin = ReturnType<typeof createClient>;
type Variant = {
  id: string;
  provider_variant_id: string;
  source_price: number | string | null;
  source_cost: number | string | null;
  raw_provider_data: Record<string, unknown> | null;
};
type Quote = {
  origin: string;
  usd: number;
  carrier: string;
  aging: string;
  minDays: number | null;
  maxDays: number | null;
};
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
function pos(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function productRef(v: unknown) {
  const value = typeof v === "string" ? v.trim() : "";
  return /^[A-Za-z0-9_-]{6,200}$/.test(value) ? value : "";
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
async function automationAlert(
  a: Admin,
  kind: string,
  severity: "warning" | "error",
  message: string,
  details: unknown,
) {
  const day = new Date().toISOString().slice(0, 10);
  await a.from("supplier_automation_alerts").upsert(
    {
      organisation_id: ORG_ID,
      provider: "CJ Dropshipping",
      alert_kind: kind,
      severity,
      message,
      details,
      dedupe_key: `cj:${kind}:${day}`,
    },
    { onConflict: "dedupe_key", ignoreDuplicates: true },
  );
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
async function post(path: string, t: string, b: unknown) {
  const r = await fetch(`${CJ_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "CJ-Access-Token": t,
    },
    body: JSON.stringify(b),
  });
  const p = (await r.json().catch(() => null)) as any;
  if (!r.ok || p?.code !== 200 || p?.result === false)
    throw new Error(`cj_${r.status}_${String(p?.code ?? "error")}`);
  return p;
}
function aging(v: unknown) {
  const label = typeof v === "string" ? v.trim() : "",
    ns = label.match(/\d+/g)?.map(Number).filter(Number.isFinite) ?? [];
  return {
    label,
    minDays: ns.length ? Math.min(...ns) : null,
    maxDays: ns.length ? Math.max(...ns) : null,
  };
}
function options(p: any, origin: string): Quote[] {
  return (Array.isArray(p?.data) ? p.data : [])
    .map((x: any) => {
      const total =
          pos(x?.totalPostageFee) ??
          (pos(x?.logisticPrice) ?? 0) +
            (pos(x?.taxesFee) ?? 0) +
            (pos(x?.clearanceOperationFee) ?? 0),
        a = aging(x?.logisticAging);
      return {
        origin,
        usd: total,
        carrier:
          typeof x?.logisticName === "string" && x.logisticName.trim()
            ? x.logisticName.trim()
            : "CJ logistics",
        aging: a.label,
        minDays: a.minDays,
        maxDays: a.maxDays,
      };
    })
    .filter((x: Quote) => x.usd > 0);
}
function choose(a: Quote[]) {
  if (!a.length) return null;
  return (
    [...a].sort((x, y) => {
      const xa = x.maxDays !== null && x.maxDays <= 30 ? 0 : 1,
        ya = y.maxDays !== null && y.maxDays <= 30 ? 0 : 1;
      if (xa !== ya) return xa - ya;
      const xm = x.maxDays ?? 999,
        ym = y.maxDays ?? 999;
      if (xm !== ym) return xm - ym;
      return x.usd - y.usd;
    })[0] ?? null
  );
}
async function quote(t: string, vid: string) {
  const a: Quote[] = [];
  let errors = 0;
  for (const origin of ["CN", "US"]) {
    try {
      a.push(
        ...options(
          await post("/logistic/freightCalculate", t, {
            startCountryCode: origin,
            endCountryCode: "ZA",
            products: [{ quantity: 1, vid }],
          }),
          origin,
        ),
      );
    } catch {
      errors++;
    }
  }
  return { quote: choose(a), apiFailed: errors === 2 };
}
function psych(v: number) {
  const ten = Math.ceil(v / 10) * 10;
  return Math.max(49.9, Math.round((ten - 0.1) * 100) / 100);
}
function price(s: number, f: number) {
  const landed = (s + f) * FX,
    buffered = landed * (1 + RISK) + FIXED,
    retail = psych(buffered / (1 - MARGIN));
  return { landed: Math.round(landed * 100) / 100, cost: Math.round(buffered * 100) / 100, retail };
}
async function draft(a: Admin, id: string) {
  await a
    .from("store_products")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organisation_id", ORG_ID)
    .eq("supplier_name", "CJ Dropshipping");
}
async function archive(a: Admin, id: string) {
  const { error } = await a
    .from("store_products")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organisation_id", ORG_ID)
    .eq("supplier_name", "CJ Dropshipping");
  if (error) throw error;
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
    return json(r, { error: "CJ commercial sync is not configured." }, 503);
  const uc = createClient(url, pub, {
      global: {
        fetch: sf(pub),
        headers: { Authorization: r.headers.get("authorization") ?? "" },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    a = createClient(url, srv, {
      global: { fetch: sf(srv) },
      auth: { autoRefreshToken: false, persistSession: false },
    });
  let u: User | null = null;
  const automated = await scheduledAutomation(a, r);
  if (!automated) {
    try {
      u = await user(r, uc);
      await admin(a, u.id);
    } catch {
      return json(r, { error: "An authorised Cossa Store administrator is required." }, 401);
    }
  }
  const body = await r.json().catch(() => ({}));
  const requestedRef = productRef(
    body && typeof body === "object" ? (body as any).productRef : undefined,
  );
  if (body && typeof body === "object" && (body as any).productRef && !requestedRef)
    return json(r, { error: "The CJ product reference is invalid." }, 400);
  let t: string;
  try {
    t = await token(ck);
  } catch {
    return json(r, { error: "CJ authentication is temporarily unavailable." }, 502);
  }
  await a
    .from("store_products")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("organisation_id", ORG_ID)
    .eq("supplier_name", "CJ Dropshipping")
    .eq("status", "active")
    .lte("stock_quantity", 0);
  let productQuery = a
    .from("store_products")
    .select("id,name,status,supplier_product_ref,stock_quantity,category,updated_at")
    .eq("organisation_id", ORG_ID)
    .eq("supplier_name", "CJ Dropshipping")
    // A successful product remains active. New commercial work should focus
    // on unapproved drafts so previously approved items cannot crowd out the
    // rest of the Cossa departments on each scheduled run.
    .eq("status", "draft")
    .gt("stock_quantity", 0)
    .order("updated_at", { ascending: false });
  if (requestedRef) productQuery = productQuery.eq("supplier_product_ref", requestedRef);
  const { data: productRows, error } = await productQuery.limit(requestedRef ? 1 : LIMIT * 8);
  if (error)
    return json(r, { error: "Cossa catalogue data could not be loaded for CJ pricing." }, 502);
  const { data: activeRows, error: activeError } = await a
    .from("store_products")
    .select("category")
    .eq("organisation_id", ORG_ID)
    .eq("supplier_name", "CJ Dropshipping")
    .eq("status", "active");
  if (activeError)
    return json(r, { error: "Cossa catalogue categories could not be loaded for CJ pricing." }, 502);
  const activeByCategory = new Map<string, number>();
  for (const row of activeRows ?? []) {
    const key = typeof (row as any).category === "string" ? (row as any).category : "other";
    activeByCategory.set(key, (activeByCategory.get(key) ?? 0) + 1);
  }
  const candidates = (productRows ?? []) as Array<Record<string, any>>;
  const products = requestedRef
    ? candidates.slice(0, 1)
    : (() => {
        const buckets = new Map<string, Array<Record<string, any>>>();
        for (const product of candidates) {
          const key = typeof product.category === "string" && product.category ? product.category : "other";
          const bucket = buckets.get(key) ?? [];
          bucket.push(product);
          buckets.set(key, bucket);
        }
        const categories = [...buckets.keys()].sort((left, right) => {
          const leftGap = ACTIVE_TARGET_PER_CATEGORY - (activeByCategory.get(left) ?? 0);
          const rightGap = ACTIVE_TARGET_PER_CATEGORY - (activeByCategory.get(right) ?? 0);
          return rightGap - leftGap || left.localeCompare(right);
        });
        const selected: Array<Record<string, any>> = [];
        for (let index = 0; selected.length < LIMIT; index++) {
          let added = false;
          for (const key of categories) {
            const candidate = buckets.get(key)?.[index];
            if (!candidate) continue;
            selected.push(candidate);
            added = true;
            if (selected.length === LIMIT) break;
          }
          if (!added) break;
        }
        return selected;
      })();
  const results: any[] = [];
  for (const p of products ?? []) {
    try {
      const { data: variants, error: ve } = await a
        .from("store_product_variants")
        .select("id,provider_variant_id,source_price,source_cost,raw_provider_data")
        .eq("product_id", p.id)
        .eq("provider", "CJ Dropshipping")
        .eq("is_available", true);
      if (ve) throw ve;
      const available = (variants ?? []) as Variant[];
      if (!available.length) {
        await archive(a, p.id);
        results.push({
          productId: p.supplier_product_ref,
          title: p.name,
          status: "archived",
          reason: "variant_inventory_unresolved",
        });
        continue;
      }
      const representative = [...available].sort((x, y) => {
          const wx = pos((x.raw_provider_data as any)?.weight_g) ?? 0,
            wy = pos((y.raw_provider_data as any)?.weight_g) ?? 0;
          return wy - wx;
        })[0],
        fq = await quote(t, representative.provider_variant_id);
      if (fq.apiFailed) {
        if (p.status === "active") await draft(a, p.id);
        results.push({
          productId: p.supplier_product_ref,
          title: p.name,
          status: "draft",
          reason: "freight_api_error",
        });
        continue;
      }
      if (!fq.quote) {
        await archive(a, p.id);
        results.push({
          productId: p.supplier_product_ref,
          title: p.name,
          status: "archived",
          reason: "no_za_shipping_method",
        });
        continue;
      }
      const q = fq.quote;
      if (q.maxDays !== null && q.maxDays > MAX_DAYS) {
        await archive(a, p.id);
        results.push({
          productId: p.supplier_product_ref,
          title: p.name,
          status: "archived",
          reason: "delivery_too_slow",
          shippingCarrier: q.carrier,
          shippingUsd: q.usd,
          shippingAging: q.aging,
        });
        continue;
      }
      if (q.usd > MAX_SHIP_USD) {
        await archive(a, p.id);
        results.push({
          productId: p.supplier_product_ref,
          title: p.name,
          status: "archived",
          reason: "freight_too_high",
          shippingCarrier: q.carrier,
          shippingUsd: q.usd,
          shippingAging: q.aging,
        });
        continue;
      }
      const now = new Date().toISOString();
      let minCost = Infinity,
        minRetail = Infinity,
        count = 0;
      for (const v of available) {
        const source = pos(v.source_cost) ?? pos(v.source_price);
        if (!source) continue;
        const pr = price(source, q.usd);
        if (pr.retail > MAX_RETAIL) continue;
        minCost = Math.min(minCost, pr.cost);
        minRetail = Math.min(minRetail, pr.retail);
        count++;
        const raw =
          v.raw_provider_data && typeof v.raw_provider_data === "object" ? v.raw_provider_data : {};
        const up = await a
          .from("store_product_variants")
          .update({
            fx_rate_to_zar: FX,
            cost_zar: pr.cost,
            price_zar: pr.retail,
            raw_provider_data: {
              ...raw,
              commercial: {
                destination_country: "ZA",
                shipping_origin: q.origin,
                shipping_carrier: q.carrier,
                shipping_aging: q.aging,
                shipping_min_days: q.minDays,
                shipping_max_days: q.maxDays,
                shipping_usd: q.usd,
                fx_zar_per_usd: FX,
                landed_zar: pr.landed,
                buffered_cost_zar: pr.cost,
                retail_zar: pr.retail,
                priced_at: now,
              },
            },
            updated_at: now,
          })
          .eq("id", v.id);
        if (up.error) throw up.error;
      }
      if (!count || !Number.isFinite(minRetail)) {
        await archive(a, p.id);
        results.push({
          productId: p.supplier_product_ref,
          title: p.name,
          status: "archived",
          reason: "retail_not_commercially_viable",
          shippingCarrier: q.carrier,
          shippingUsd: q.usd,
          shippingAging: q.aging,
        });
        continue;
      }
      const pe = await a
        .from("store_products")
        .update({
          fx_rate_to_zar: FX,
          fx_rate_updated_at: now,
          cost_price: Math.round(minCost * 100) / 100,
          price: Math.round(minRetail * 100) / 100,
          status: "active",
          updated_at: now,
        })
        .eq("id", p.id)
        .eq("organisation_id", ORG_ID);
      if (pe.error) throw pe.error;
      results.push({
        productId: p.supplier_product_ref,
        title: p.name,
        status: "active",
        availableVariants: available.length,
        shippingOrigin: q.origin,
        shippingCarrier: q.carrier,
        shippingAging: q.aging,
        shippingUsd: q.usd,
        minCostZar: Math.round(minCost * 100) / 100,
        fromPriceZar: Math.round(minRetail * 100) / 100,
      });
    } catch (e) {
      if (p.status === "active") await draft(a, p.id);
      results.push({
        productId: p.supplier_product_ref,
        title: p.name,
        status: "draft",
        reason: "pricing_failed",
      });
      console.error(
        JSON.stringify({
          event: "cj_commercial_product_failed",
          reason: e instanceof Error ? e.message : "unknown",
        }),
      );
    }
  }
  const active = results.filter((x) => x.status === "active").length,
    archived = results.filter((x) => x.status === "archived").length,
    kept = results.length - active - archived;
  await a.from("audit_events").insert({
    organisation_id: ORG_ID,
    actor_type: automated ? "system" : "user",
    actor_user_id: u?.id ?? null,
    event_type: "cj_commercial_sync_succeeded",
    entity_type: "store_catalogue",
    entity_id: "cj_dropshipping",
    metadata: {
      processed: results.length,
      active,
      kept_draft: kept,
      archived,
      fx: FX,
      product_ref: requestedRef || undefined,
    },
  });
  const pricingFailures = results.filter(
    (x) => x.reason === "freight_api_error" || x.reason === "pricing_failed",
  ).length;
  if (automated && (archived > 0 || pricingFailures > 0))
    await automationAlert(
      a,
      "pricing_review_needed",
      archived > 0 ? "warning" : "error",
      `CJ automatic pricing needs review: ${archived} product${archived === 1 ? "" : "s"} archived and ${pricingFailures} pricing check${pricingFailures === 1 ? "" : "s"} failed.`,
      { processed: results.length, activated: active, archived, pricingFailures },
    );
  return json(r, {
    processed: results.length,
    activated: active,
    keptDraft: kept,
    archived,
    pricing: {
      fxZarPerUsd: FX,
      riskBufferRate: RISK,
      fixedOrderBufferZar: FIXED,
      targetGrossMargin: MARGIN,
    },
    products: results,
  });
});
