import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/PageHeader";
import { ConstructionBadge } from "@/components/company/GroupBadge";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/common/StateBlocks";
import { ProductGrid } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";

import { getCategory } from "@/data/categories";
import { productsQuery } from "@/lib/queries";

import type { Category } from "@/types/catalog";

import { SITE_URL } from "@/config/seo";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }): { category: Category } => {
    const category = getCategory(params.slug);

    if (!category) {
      throw notFound();
    }

    return { category };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          {
            title: "Category unavailable | Cossa Store",
          },
          {
            name: "robots",
            content: "noindex, nofollow",
          },
        ],
      };
    }

    const category = loaderData.category;

    const title = `${category.name} | Cossa Store`;

    const description = category.description;

    const url = `${SITE_URL}/category/${category.slug}`;

    const breadcrumbId = `${url}#breadcrumb`;
    const pageId = `${url}#collection`;

    return {
      meta: [
        {
          title,
        },

        {
          name: "description",
          content: description,
        },

        /*
         * Open Graph
         */
        {
          property: "og:type",
          content: "website",
        },

        {
          property: "og:site_name",
          content: SITE.name,
        },

        {
          property: "og:title",
          content: title,
        },

        {
          property: "og:description",
          content: description,
        },

        {
          property: "og:url",
          content: url,
        },

        {
          property: "og:locale",
          content: "en_ZA",
        },

        /*
         * X / Twitter fallback metadata
         */
        {
          name: "twitter:card",
          content: "summary_large_image",
        },

        {
          name: "twitter:title",
          content: title,
        },

        {
          name: "twitter:description",
          content: description,
        },
      ],

      /*
       * Every public category owns its own canonical URL.
       */
      links: [
        {
          rel: "canonical",
          href: url,
        },
      ],

      /*
       * Category-level structured data.
       *
       * We intentionally do not invent Product/ItemList entries here.
       * Real product structured data belongs on the product routes,
       * and catalogue data should only be represented when verified.
       */
      scripts: [
        {
          type: "application/ld+json",

          children: JSON.stringify({
            "@context": "https://schema.org",

            "@graph": [
              {
                "@type": "CollectionPage",
                "@id": pageId,

                name: category.name,

                description,

                url,

                inLanguage: "en-ZA",

                isPartOf: {
                  "@id": `${SITE_URL}/#website`,
                },

                publisher: {
                  "@id": SITE.structuredDataId,
                },

                breadcrumb: {
                  "@id": breadcrumbId,
                },
              },

              {
                "@type": "BreadcrumbList",
                "@id": breadcrumbId,

                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Cossa Store",
                    item: `${SITE_URL}/`,
                  },

                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Shop",
                    item: `${SITE_URL}/shop`,
                  },

                  {
                    "@type": "ListItem",
                    position: 3,
                    name: category.name,
                    item: url,
                  },
                ],
              },
            ],
          }),
        },
      ],
    };
  },

  errorComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <ErrorBlock description="This category could not be loaded." />
    </div>
  ),

  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyBlock
        title="Category not found"
        description="That product range does not exist in the Cossa Store catalogue."
        action={
          <Button asChild>
            <Link to="/shop">Browse all products</Link>
          </Button>
        }
      />
    </div>
  ),

  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();

  const query = useQuery(
    productsQuery({
      category: category.slug,
    }),
  );

  const isConstructionCategory =
    category.slug === "construction-diy";

  return (
    <div>
      <PageHeader
        eyebrow="Product category"
        title={category.name}
        description={category.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/request-a-quote">
                Request a quote
              </Link>
            </Button>

            <Button asChild variant="ghost">
              <Link to="/shop-by-project">
                Shop by project
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/*
         * Contextual Cossa ecosystem support.
         *
         * Construction branding appears because this category
         * directly relates to Cossa Nexus Construction.
         *
         * Do not expose Construction registration/tax information here.
         */}
        {isConstructionCategory ? (
          <ConstructionBadge className="mb-6" />
        ) : null}

        {/* SUBCATEGORY NAVIGATION */}
        {category.subcategories.length > 0 ? (
          <nav
            aria-label={`${category.name} subcategories`}
            className="mb-8 flex flex-wrap gap-2"
          >
            {category.subcategories.map((sub) => (
              <Link
                key={sub.slug}
                to="/shop"
                search={{
                  category: category.slug,
                  subcategory: sub.slug,
                }}
                className="rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent hover:text-foreground"
              >
                {sub.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {/* LOADING */}
        {query.isPending ? <LoadingBlock /> : null}

        {/* ERROR */}
        {query.isError ? (
          <ErrorBlock
            description="We could not load this category's products."
            action={
              <Button
                type="button"
                onClick={() => query.refetch()}
              >
                Try again
              </Button>
            }
          />
        ) : null}

        {/* EMPTY CATEGORY */}
        {query.data && query.data.length === 0 ? (
          <EmptyBlock
            title="No products listed in this range yet"
            description="This category is active, but no real published products are currently available in this range. You can ask Cossa Store to source what you need or request a quotation."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/request-a-quote">
                    Request a quotation
                  </Link>
                </Button>

                <Button asChild variant="outline">
                  <Link to="/shop">
                    Browse all products
                  </Link>
                </Button>
              </div>
            }
          />
        ) : null}

        {/* PRODUCTS */}
        {query.data && query.data.length > 0 ? (
          <ProductGrid products={query.data} />
        ) : null}
      </div>
    </div>
  );
}
