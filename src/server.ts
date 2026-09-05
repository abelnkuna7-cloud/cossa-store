import "./lib/error-capture";

import { SITE_URL } from "./config/seo";
import { supabase } from "./integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type SeoProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  product_type: "physical" | "digital" | "affiliate" | "pod" | "dropshipping";
  fulfilment_model:
    | "cossa_stock"
    | "local_supplier"
    | "local_dropshipping"
    | "international_dropshipping"
    | "print_on_demand"
    | "affiliate"
    | "digital";
  short_description: string | null;
  description: string | null;
  brand: string | null;
  currency: "ZAR";
  price: number | string;
  track_inventory: boolean;
  stock_quantity: number;
  unlimited_stock: boolean;
  image_urls: string[];
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

const SEO_PRODUCT_SELECT =
  "id,name,slug,sku,product_type,fulfilment_model,short_description,description,brand,currency,price,track_inventory,stock_quantity,unlimited_stock,image_urls,seo_title,seo_description,created_at,updated_at";

const db = supabase as unknown as { from: (table: string) => any };

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function absoluteStoreUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

function safeAbsoluteUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, SITE_URL);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function productUrl(slug: string | null | undefined): string | null {
  const normalized = slug?.trim();
  return normalized ? absoluteStoreUrl(`/product/${encodeURIComponent(normalized)}`) : null;
}

function safeIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function xmlResponse(body: string, cacheSeconds = 900): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": `public, max-age=300, s-maxage=${cacheSeconds}, stale-while-revalidate=3600`,
      "x-content-type-options": "nosniff",
    },
  });
}

function xmlFailureResponse(kind: "sitemap" | "merchant-feed"): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<error><message>${kind} temporarily unavailable</message></error>\n`,
    {
      status: 503,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "no-store",
        "retry-after": "300",
        "x-content-type-options": "nosniff",
      },
    },
  );
}

async function loadSeoProducts(): Promise<SeoProductRow[]> {
  // Keep crawler endpoints cheap: never load the 20k+ variant catalogue here.
  // store_customer_products is the Store's published customer-safe catalogue
  // boundary, so the sitemap cannot expose provider, supplier, or draft fields.
  const { data, error } = await db
    .from("store_customer_products")
    .select(SEO_PRODUCT_SELECT)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Cossa Store] Failed to load SEO product rows", error);
    throw error;
  }

  return (data ?? []) as SeoProductRow[];
}

function buildSitemap(products: SeoProductRow[]): string {
  const staticEntries: Array<{ loc: string; lastmod: string | null }> = [
    { loc: absoluteStoreUrl("/"), lastmod: null },
    { loc: absoluteStoreUrl("/shop"), lastmod: null },
    { loc: absoluteStoreUrl("/about"), lastmod: null },
    { loc: absoluteStoreUrl("/contact"), lastmod: null },
  ];

  const productEntries = products
    .map((product) => {
      const loc = productUrl(product.slug);
      return loc
        ? { loc, lastmod: safeIsoDate(product.updated_at || product.created_at) }
        : null;
    })
    .filter((entry): entry is { loc: string; lastmod: string | null } => Boolean(entry));

  const urls = [...staticEntries, ...productEntries]
    .map(
      ({ loc, lastmod }) =>
        `  <url>\n    <loc>${xmlEscape(loc)}</loc>${
          lastmod ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>` : ""
        }\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function merchantAvailability(product: SeoProductRow): "in_stock" | "out_of_stock" | null {
  // Only Cossa-controlled stock can currently be represented with Merchant-level certainty.
  // Supplier-managed / POD availability remains excluded until the landing page, structured
  // data and feed can share one verified Google-supported availability state.
  if (product.fulfilment_model !== "cossa_stock") return null;

  if (product.unlimited_stock) return "in_stock";
  if (!product.track_inventory) return null;
  return product.stock_quantity > 0 ? "in_stock" : "out_of_stock";
}

function isMerchantFeedEligible(product: SeoProductRow): boolean {
  if (product.product_type === "affiliate" || product.product_type === "digital") return false;
  if (product.fulfilment_model !== "cossa_stock") return false;
  if (product.currency !== "ZAR") return false;
  if (!productUrl(product.slug)) return false;
  const price = Number(product.price);
  if (!Number.isFinite(price) || price <= 0) return false;
  if (!safeAbsoluteUrl(product.image_urls?.[0])) return false;
  return merchantAvailability(product) !== null;
}

function buildMerchantFeed(products: SeoProductRow[]): string {
  const items = products
    .filter(isMerchantFeedEligible)
    .map((product) => {
      const link = productUrl(product.slug);
      const imageLink = safeAbsoluteUrl(product.image_urls[0]);
      const description =
        product.seo_description || product.short_description || product.description || product.name;
      const availability = merchantAvailability(product);
      const price = Number(product.price);

      if (!link || !imageLink || !availability) return null;

      const optionalBrand = product.brand
        ? `\n      <g:brand>${xmlEscape(product.brand)}</g:brand>`
        : "";

      // Condition, GTIN, MPN and identifier_exists are intentionally omitted until
      // Cossa has source-backed values. Internal SKUs are valid feed IDs, not UPIs.
      return `    <item>\n      <g:id>${xmlEscape(product.sku || product.id)}</g:id>\n      <title>${xmlEscape(product.seo_title || product.name)}</title>\n      <description>${xmlEscape(description)}</description>\n      <link>${xmlEscape(link)}</link>\n      <g:image_link>${xmlEscape(imageLink)}</g:image_link>\n      <g:availability>${availability}</g:availability>\n      <g:price>${price.toFixed(2)} ZAR</g:price>${optionalBrand}\n    </item>`;
    })
    .filter((item): item is string => Boolean(item))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>Cossa Store South Africa</title>\n    <link>${xmlEscape(absoluteStoreUrl("/"))}</link>\n    <description>Cossa Store published direct-sale products with Merchant-safe availability evidence.</description>\n${items}\n  </channel>\n</rss>\n`;
}

async function handleSeoFeedRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname !== "/sitemap.xml" && url.pathname !== "/merchant-feed.xml") {
    return null;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: { allow: "GET, HEAD", "cache-control": "no-store" },
    });
  }

  const kind = url.pathname === "/sitemap.xml" ? "sitemap" : "merchant-feed";

  try {
    const products = await loadSeoProducts();

    if (kind === "sitemap") {
      return xmlResponse(buildSitemap(products));
    }

    return xmlResponse(buildMerchantFeed(products), 1800);
  } catch (error) {
    console.error(`[Cossa Store] ${kind} generation failed`, error);
    return xmlFailureResponse(kind);
  }
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const STORE_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const APPROVED_STORE_ADMIN_ID = "fe80a00e-ec49-497f-b28b-c5b984c964b6";
const APPROVED_STORE_ADMIN_EMAIL = "cossa@cossanexusholdings.co.za";
const ADMIN_IDLE_TIMEOUT_SECONDS = 15 * 60;
const ADMIN_ABSOLUTE_TIMEOUT_SECONDS = 4 * 60 * 60;

function requestCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

async function guardAdminRequest(request: Request): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/admin")) return null;

  const token = requestCookie(request, "cossa_store_session");
  const redirect = new URL("/auth", request.url);
  redirect.searchParams.set("redirect", pathname);
  if (!token) return Response.redirect(redirect, 302);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return new Response("Admin access unavailable", { status: 503 });

  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claims, error: claimsError } = await client.auth.getClaims(token);
  const tokenClaims = claims?.claims as Record<string, unknown> | undefined;
  const userId = typeof tokenClaims?.sub === "string" ? tokenClaims.sub : null;
  const email = typeof tokenClaims?.email === "string" ? tokenClaims.email.toLowerCase() : null;
  const sessionId = typeof tokenClaims?.session_id === "string" ? tokenClaims.session_id : null;
  const issuedAt = typeof tokenClaims?.iat === "number" ? tokenClaims.iat : null;
  if (claimsError || !userId || !sessionId || !issuedAt) return Response.redirect(redirect, 302);

  // The browser-visible membership check is not an authorization boundary.
  // Bind Store admin access to the verified owner identity and a server-side
  // session record, while keeping the service-role client server-only.
  if (userId !== APPROVED_STORE_ADMIN_ID || email !== APPROVED_STORE_ADMIN_EMAIL) {
    return new Response("Store administrator access required", {
      status: 403,
      headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  }

  const { supabaseAdmin } = await import("./integrations/supabase/client.server");
  const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (
    authUserError ||
    !authUser.user ||
    authUser.user.id !== APPROVED_STORE_ADMIN_ID ||
    authUser.user.email?.toLowerCase() !== APPROVED_STORE_ADMIN_EMAIL ||
    !authUser.user.email_confirmed_at
  ) {
    return new Response("Store administrator access required", {
      status: 403,
      headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", STORE_ORGANISATION_ID)
    .eq("user_id", claims.claims.sub)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (membershipError || !membership) {
    return new Response("Store administrator access required", {
      status: 403,
      headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  }

  const { data: mfaRequired, error: mfaError } = await (supabaseAdmin as any).rpc(
    "store_admin_mfa_required",
    { p_user_id: userId },
  );
  if (mfaError) return new Response("Admin access unavailable", { status: 503 });
  const aal = typeof tokenClaims.aal === "string" ? tokenClaims.aal : null;
  if (mfaRequired === true && aal !== "aal2") {
    const response = Response.redirect(new URL(`/auth?redirect=${encodeURIComponent(pathname)}&mfa=required`, request.url), 302);
    response.headers.append("set-cookie", "cossa_store_session=; Path=/; Max-Age=0; SameSite=Lax; Secure");
    return response;
  }

  const now = Math.floor(Date.now() / 1000);
  const issued = new Date(issuedAt * 1000);
  const absoluteExpiry = new Date((issuedAt + ADMIN_ABSOLUTE_TIMEOUT_SECONDS) * 1000);
  const { data: activeSession, error: sessionReadError } = await (supabaseAdmin as any)
    .from("store_admin_sessions")
    .select("user_id, session_id, issued_at, last_seen_at, absolute_expires_at, revoked_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (sessionReadError) return new Response("Admin access unavailable", { status: 503 });

  const lastSeen = activeSession?.last_seen_at ? Date.parse(activeSession.last_seen_at) : 0;
  const absoluteExpiresAt = activeSession?.absolute_expires_at
    ? Date.parse(activeSession.absolute_expires_at)
    : absoluteExpiry.getTime();
  const timedOut =
    Boolean(activeSession?.revoked_at) ||
    (lastSeen > 0 && now * 1000 - lastSeen > ADMIN_IDLE_TIMEOUT_SECONDS * 1000) ||
    now * 1000 >= absoluteExpiresAt;
  const incomingIssuedAt = issued.getTime();
  const existingIssuedAt = activeSession?.issued_at ? Date.parse(activeSession.issued_at) : 0;
  if (timedOut || (activeSession && activeSession.session_id !== sessionId && incomingIssuedAt <= existingIssuedAt)) {
    const response = Response.redirect(redirect, 302);
    response.headers.append("set-cookie", "cossa_store_session=; Path=/; Max-Age=0; SameSite=Lax; Secure");
    return response;
  }

  if (!activeSession || activeSession.session_id !== sessionId) {
    const { error: sessionWriteError } = await (supabaseAdmin as any)
      .from("store_admin_sessions")
      .upsert({
        user_id: userId,
        session_id: sessionId,
        issued_at: issued.toISOString(),
        last_seen_at: new Date().toISOString(),
        absolute_expires_at: absoluteExpiry.toISOString(),
        revoked_at: null,
      });
    if (sessionWriteError) return new Response("Admin access unavailable", { status: 503 });
  } else {
    const { error: sessionTouchError } = await (supabaseAdmin as any)
      .from("store_admin_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("session_id", sessionId);
    if (sessionTouchError) return new Response("Admin access unavailable", { status: 503 });
  }
  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const seoFeedResponse = await handleSeoFeedRequest(request);
      if (seoFeedResponse) return seoFeedResponse;

      const adminResponse = await guardAdminRequest(request);
      if (adminResponse) return adminResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      const pathname = new URL(request.url).pathname;
      if (pathname === "/admin/security" || (pathname === "/auth" && new URL(request.url).searchParams.get("mfa") === "required")) {
        normalized.headers.set("cache-control", "no-store");
        normalized.headers.set("x-content-type-options", "nosniff");
      }
      return normalized;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
