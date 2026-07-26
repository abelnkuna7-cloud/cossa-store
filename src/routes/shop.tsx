import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { ProductGrid } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/data/categories";
import { productsQuery } from "@/lib/queries";

const searchSchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "name_asc"]).optional(),
});

const TITLE = "Shop all products | Cossa Store";
const DESCRIPTION =
  "Browse construction and DIY tools, cleaning and facility supplies, and smart technology from Cossa Store.";

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useQuery(productsQuery(search));

  const activeCategory = CATEGORIES.find((c) => c.slug === search.category);

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title="Shop all products"
        description={DESCRIPTION}
        actions={
          <Button asChild variant="outline">
            <Link to="/request-a-quote">Request a quote instead</Link>
          </Button>
        }
      />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="space-y-6">
          <div>
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">Categories</h2>
            <div className="mt-3 flex flex-col gap-1">
              <FilterButton
                active={!search.category}
                onClick={() => navigate({ to: "/shop", search: { sort: search.sort } })}
                label="All products"
              />
              {CATEGORIES.map((category) => (
                <FilterButton
                  key={category.slug}
                  active={search.category === category.slug}
                  onClick={() =>
                    navigate({
                      to: "/shop",
                      search: { category: category.slug, sort: search.sort },
                    })
                  }
                  label={category.name}
                />
              ))}
            </div>
          </div>

          {activeCategory ? (
            <div>
              <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">
                Subcategories
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                <FilterButton
                  active={!search.subcategory}
                  onClick={() =>
                    navigate({
                      to: "/shop",
                      search: { category: activeCategory.slug, sort: search.sort },
                    })
                  }
                  label="All in range"
                />
                {activeCategory.subcategories.map((sub) => (
                  <FilterButton
                    key={sub.slug}
                    active={search.subcategory === sub.slug}
                    onClick={() =>
                      navigate({
                        to: "/shop",
                        search: {
                          category: activeCategory.slug,
                          subcategory: sub.slug,
                          sort: search.sort,
                        },
                      })
                    }
                    label={sub.name}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {query.data ? `${query.data.length} product${query.data.length === 1 ? "" : "s"}` : ""}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <select
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                value={search.sort ?? "relevance"}
                onChange={(e) =>
                  navigate({
                    to: "/shop",
                    search: {
                      ...search,
                      sort: e.target.value as "relevance" | "price_asc" | "price_desc" | "name_asc",
                    },
                  })
                }
              >
                <option value="relevance">Default</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="name_asc">Name A–Z</option>
              </select>
            </label>
          </div>

          {query.isPending ? <LoadingBlock label="Loading products…" /> : null}
          {query.isError ? (
            <ErrorBlock
              description="The catalogue could not be loaded."
              action={<Button onClick={() => query.refetch()}>Try again</Button>}
            />
          ) : null}
          {query.data && query.data.length === 0 ? (
            <EmptyBlock
              title="No products match this filter"
              description="Try a different category, or request a quote and we will source it."
              action={
                <Button asChild>
                  <Link to="/request-a-quote">Request a quote</Link>
                </Button>
              }
            />
          ) : null}
          {query.data && query.data.length > 0 ? <ProductGrid products={query.data} /> : null}
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}