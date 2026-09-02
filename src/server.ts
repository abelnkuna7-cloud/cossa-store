import "./lib/error-capture";

import { SITE_URL } from "./config/seo";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { listStorefrontProducts } from "./services/store-products.service";

import type { Product } from "./types/catalog";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

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

function xmlResponse(body: string, cacheSeconds = 900): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": `public, max-age=300, s-maxage=${cacheSeconds}, stale-while-revalidate=3600`,
    },
  });
}

function isPublicIndexableProduct(product: Product): boolean {
  return (
    !product.is_demo &&
    product.status === "active" &&
    (!product.publication_state || product.publication_state === "published") &&
    (!product.visibility || product.visibility === "public")
  );
}

function buildSitemap(products: Product[]): string {
  const staticEntries = [
    { loc: absoluteStoreUrl("/"), lastmod: null },
    { loc: absoluteStoreUrl("/shop"), lastmod: null },
    { loc: absoluteStoreUrl("/about"), lastmod: null },
    { loc: absoluteStoreUrl("/contact"), lastmod: null },
  ];

  const productEntries = products
    .filter(isPublicIndexableProduct)
    .map((product) => ({
      loc: absoluteStoreUrl(`/product/${encodeURIComponent(product.slug)}`),
      lastmod: product.updated_at || product.published_at || product.created_at || null,
    }));

  const urls = [...staticEntries, ...productEntries]
    .map(
      ({ loc, lastmod }) =>
        `  <url>\n    <loc>${xmlEscape(loc)}</loc>${
          lastmod ? `\n    <lastmod>${xmlEscape(new Date(lastmod).toISOString())}</lastmod>` : ""
        }\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function merchantAvailability(product: Product): "in_stock" | "out_of_stock" | null {
  const availability = product.availability_status ?? product.stock_status;

  if (availability === "in_stock" || availability === "low_stock") {
    return "in_stock";
  }

  if (availability === "out_of_stock") {
    return "out_of_stock";
  }

  // Cossa deliberately does not guess Merchant availability for supplier-managed,
  // made-to-order, backorder, quote, preorder or otherwise uncertain states.
  return null;
}

function isMerchantFeedEligible(product: Product): boolean {
  if (!isPublicIndexableProduct(product)) return false;
  if (product.fulfilment_type === "affiliate") return false;
  if (product.product_type === "affiliate" || product.product_type === "digital") return false;
  if (product.requires_quote || product.price_display_mode === "quote") return false;
  if (!Number.isFinite(product.selling_price) || product.selling_price <= 0) return false;
  if (product.variants.length > 0) return false;
  if (!product.images[0]?.url) return false;
  return merchantAvailability(product) !== null;
}

function buildMerchantFeed(products: Product[]): string {
  const items = products
    .filter(isMerchantFeedEligible)
    .map((product) => {
      const link = absoluteStoreUrl(`/product/${encodeURIComponent(product.slug)}`);
      const imageLink = new URL(product.images[0].url, SITE_URL).toString();
      const description =
        product.seo_description || product.short_description || product.full_description || product.name;
      const availability = merchantAvailability(product);

      const optionalBrand = product.brand
        ? `\n      <g:brand>${xmlEscape(product.brand)}</g:brand>`
        : "";

      return `    <item>\n      <g:id>${xmlEscape(product.sku || product.id)}</g:id>\n      <title>${xmlEscape(product.seo_title || product.name)}</title>\n      <description>${xmlEscape(description)}</description>\n      <link>${xmlEscape(link)}</link>\n      <g:image_link>${xmlEscape(imageLink)}</g:image_link>\n      <g:availability>${availability}</g:availability>\n      <g:price>${product.selling_price.toFixed(2)} ZAR</g:price>\n      <g:condition>new</g:condition>${optionalBrand}\n    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>Cossa Store South Africa</title>\n    <link>${xmlEscape(absoluteStoreUrl("/"))}</link>\n    <description>Cossa Store published direct-sale products eligible for Google Merchant review.</description>\n${items}\n  </channel>\n</rss>\n`;
}

async function handleSeoFeedRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname !== "/sitemap.xml" && url.pathname !== "/merchant-feed.xml") {
    return null;
  }

  const products = await listStorefrontProducts();

  if (url.pathname === "/sitemap.xml") {
    return xmlResponse(buildSitemap(products));
  }

  return xmlResponse(buildMerchantFeed(products), 600);
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
