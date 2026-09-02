import "./lib/error-capture";

import { SITE_URL } from "./config/seo";
import { supabase } from "./integrations/supabase/client";
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
  // store_public_products is already the Store's published/public catalogue boundary,
  // so the sitemap cannot accidentally expose private drafts or archived source rows.
  const { data, error } = await db
    .from("store_public_products")
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

  const productEntries = products.map((product) => ({
    loc: absoluteStoreUrl(`/product/${encodeURIComponent(product.slug)}`),
    lastmod: safeIsoDate(product.updated_at || product.created_at),
  }));

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
  const price = Number(product.price);
  if (!Number.isFinite(price) || price <= 0) return false;
  if (!product.image_urls?.[0]) return false;
  return merchantAvailability(product) !== null;
}

function buildMerchantFeed(products: SeoProductRow[]): string {
  const items = products
    .filter(isMerchantFeedEligible)
    .map((product) => {
      const link = absoluteStoreUrl(`/product/${encodeURIComponent(product.slug)}`);
      const imageLink = new URL(product.image_urls[0], SITE_URL).toString();
      const description =
        product.seo_description || product.short_description || product.description || product.name;
      const availability = merchantAvailability(product);
      const price = Number(product.price);

      const optionalBrand = product.brand
        ? `\n      <g:brand>${xmlEscape(product.brand)}</g:brand>`
        : "";

      // Condition, GTIN, MPN and identifier_exists are intentionally omitted until
      // Cossa has source-backed values. Internal SKUs are valid feed IDs, not UPIs.
      return `    <item>\n      <g:id>${xmlEscape(product.sku || product.id)}</g:id>\n      <title>${xmlEscape(product.seo_title || product.name)}</title>\n      <description>${xmlEscape(description)}</description>\n      <link>${xmlEscape(link)}</link>\n      <g:image_link>${xmlEscape(imageLink)}</g:image_link>\n      <g:availability>${availability}</g:availability>\n      <g:price>${price.toFixed(2)} ZAR</g:price>${optionalBrand}\n    </item>`;
    })
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

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const seoFeedResponse = await handleSeoFeedRequest(request);
      if (seoFeedResponse) return seoFeedResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};