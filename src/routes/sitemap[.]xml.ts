import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { CATEGORIES, PROJECTS } from "@/data/categories";
import { listProducts } from "@/services/catalog.service";
import { SITE_URL } from "@/config/seo";

/**
 * Public sitemap for Cossa Store.
 *
 * Rules:
 * - Only include canonical, public, indexable URLs.
 * - Never include demo, draft, pending-review, unpublished or archived products.
 * - Product URLs must come from the real catalogue rather than being hard-coded.
 * - Private/customer-specific routes such as account, cart, checkout, admin
 *   and internal search do not belong in the sitemap.
 *
 * As the catalogue grows, this route can later be split into sitemap indexes
 * for products, categories, projects and static pages.
 */

interface SitemapEntry {
  path: string;
  lastmod?: string;
}

const STATIC_PUBLIC_ROUTES: SitemapEntry[] = [
  { path: "/" },
  { path: "/shop" },
  { path: "/shop-by-project" },

  { path: "/request-a-quote" },
  { path: "/business-account" },
  { path: "/supplier-application" },

  { path: "/about" },
  { path: "/contact" },

  { path: "/delivery" },
  { path: "/returns" },
  { path: "/privacy" },
  { path: "/terms" },
];

/**
 * Escapes values inserted into XML.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Converts a timestamp/date into YYYY-MM-DD where possible.
 *
 * We only emit <lastmod> when we have an actual catalogue timestamp.
 * We do not invent modification dates for static pages.
 */
function formatLastModified(value: unknown): string | undefined {
  if (!value) return undefined;

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Extra sitemap-level protection.
 *
 * Even if catalog.service changes later, development/demo products
 * must never accidentally become indexable through the sitemap.
 */
function isIndexableProduct(product: Record<string, unknown>): boolean {
  const slug =
    typeof product.slug === "string"
      ? product.slug.trim().toLowerCase()
      : "";

  if (!slug) return false;

  /**
   * Demo records are development fixtures and must not be submitted
   * to search engines as real Cossa Store inventory.
   */
  if (slug.startsWith("demo-")) {
    return false;
  }

  /**
   * If these workflow fields exist on the returned product,
   * enforce the public publication requirements.
   *
   * We intentionally do not fail a legitimate product merely because
   * an older service result doesn't expose one of these fields yet.
   * Once catalog.service is fully normalised, these guards can become
   * strict required checks.
   */
  if (
    typeof product.publication_state === "string" &&
    product.publication_state !== "published"
  ) {
    return false;
  }

  if (
    typeof product.status === "string" &&
    product.status !== "active"
  ) {
    return false;
  }

  if (
    typeof product.visibility === "string" &&
    product.visibility !== "public"
  ) {
    return false;
  }

  return true;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let products: Awaited<ReturnType<typeof listProducts>> = [];

        try {
          products = await listProducts({});
        } catch (error) {
          console.error("Failed to load products for sitemap:", error);
          products = [];
        }

        const categoryEntries: SitemapEntry[] = CATEGORIES.map((category) => ({
          path: `/category/${category.slug}`,
        }));

        const projectEntries: SitemapEntry[] = PROJECTS.map((project) => ({
          path: `/project/${project.slug}`,
        }));

        const productEntries: SitemapEntry[] = products
          .filter((product) =>
            isIndexableProduct(product as unknown as Record<string, unknown>),
          )
          .map((product) => {
            const productRecord =
              product as unknown as Record<string, unknown>;

            return {
              path: `/product/${product.slug}`,
              lastmod: formatLastModified(
                productRecord.updated_at ??
                  productRecord.published_at ??
                  productRecord.created_at,
              ),
            };
          });

        /**
         * Assemble the canonical public URL inventory.
         */
        const entries: SitemapEntry[] = [
          ...STATIC_PUBLIC_ROUTES,
          ...categoryEntries,
          ...projectEntries,
          ...productEntries,
        ];

        /**
         * Remove accidental duplicate paths.
         */
        const uniqueEntries = Array.from(
          new Map(entries.map((entry) => [entry.path, entry])).values(),
        );

        const urls = uniqueEntries.map((entry) => {
          const absoluteUrl =
            entry.path === "/"
              ? `${SITE_URL}/`
              : `${SITE_URL}${entry.path}`;

          return [
            "  <url>",
            `    <loc>${escapeXml(absoluteUrl)}</loc>`,
            entry.lastmod
              ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`
              : null,
            "  </url>",
          ]
            .filter(Boolean)
            .join("\n");
        });

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",

            /**
             * Cache sitemap briefly while still allowing catalogue
             * publication changes to appear reasonably quickly.
             */
            "Cache-Control":
              "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
          },
        });
      },
    },
  },
});
