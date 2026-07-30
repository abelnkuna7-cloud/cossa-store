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
  collection: z.string().optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "name_asc"]).optional(),
  fulfilment: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  flag: z
    .enum([
      "new",
      "trending",
      "in_stock",
      "made_to_order",
      "affiliate",
      "digital",
      "service",
      "quote_only",
    ])
    .optional(),
});

const FLAGS: { value: NonNullable<z.infer<typeof searchSchema>["flag"]>; label: string }[] = [
  { value: "new", label: "New arrivals" },
  { value: "trending", label: "Trending" },
  { value: "in_stock", label: "In stock" },
  { value: "made_to_order", label: "Made to order" },
  { value: "affiliate", label: "Partner offers" },
  { value: "digital", label: "Digital" },
  { value: "service", label: "Services" },
  { value: "quote_only", label: "Quote only" },
];

const FULFILMENTS: { value: string; label: string }[] = [
  { value: "cossa_stock", label: "Cossa stock" },
  { value: "local_supplier", label: "Local supplier" },
  { value: "local_dropshipping", label: "Local dropshipping" },
  { value: "international_dropshipping", label: "International" },
  { value: "print_on_demand", label: "Print on demand" },
  { value: "affiliate", label: "Partner offer" },
  { value: "digital", label: "Digital delivery" },
  { value: "service", label: "Service booking" },
];

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

  const products = (query.data ?? []).filter((product) => {
    if (search.fulfilment && product.fulfilment_type !== search.fulfilment) return false;
    if (typeof search.min === "number" && product.selling_price < search.min) return false;
    if (typeof search.max === "number" && product.selling_price > search.max) return false;
    switch (search.flag) {
      case "new":
        return isNewArrival(product);
      case "trending":
        return isTrending(product);
      case "in_stock":
        return product.stock_available;
      case "made_to_order":
        return product.fulfilment_type === "print_on_demand";
      case "affiliate":
        return isAffiliate(product);
      case "digital":
        return isDigital(product);
      case "service":
        return isService(product);
      case "quote_only":
        return product.requires_quote;
      default:
        return true;
    }
  });

  const collections = Array.from(
    new Map(
      (query.data ?? [])
        .filter((p) => p.collection)
        .map((p) => [p.collection!.slug, p.collection!] as const),
    ).values(),
  );

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

          {collections.length > 0 ? (
            <div>
              <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">
                Collections
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                <FilterButton
                  active={!search.collection}
                  onClick={() => navigate({ to: "/shop", search: { ...search, collection: undefined } })}
                  label="All collections"
                />
                {collections.map((collection) => (
                  <FilterButton
                    key={collection.slug}
                    active={search.collection === collection.slug}
                    onClick={() =>
                      navigate({ to: "/shop", search: { ...search, collection: collection.slug } })
                    }
                    label={collection.name}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">Product type</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {FLAGS.map((flag) => (
                <button
                  key={flag.value}
                  type="button"
                  aria-pressed={search.flag === flag.value}
                  onClick={() =>
                    navigate({
                      to: "/shop",
                      search: {
                        ...search,
                        flag: search.flag === flag.value ? undefined : flag.value,
                      },
                    })
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    search.flag === flag.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/60"
                  }`}
                >
                  {flag.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">Fulfilment</h2>
            <select
              className="mt-3 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={search.fulfilment ?? ""}
              onChange={(e) =>
                navigate({
                  to: "/shop",
                  search: { ...search, fulfilment: e.target.value || undefined },
                })
              }
            >
              <option value="">All fulfilment models</option>
              {FULFILMENTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">
              Price range (R)
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label="Minimum price"
                placeholder="Min"
                value={search.min ?? ""}
                onChange={(e) =>
                  navigate({
                    to: "/shop",
                    search: { ...search, min: e.target.value ? Number(e.target.value) : undefined },
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              />
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label="Maximum price"
                placeholder="Max"
                value={search.max ?? ""}
                onChange={(e) =>
                  navigate({
                    to: "/shop",
                    search: { ...search, max: e.target.value ? Number(e.target.value) : undefined },
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
          </div>
        </aside>

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {query.data ? `${products.length} product${products.length === 1 ? "" : "s"}` : ""}
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
          {query.data && products.length === 0 ? (
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
          {query.data && products.length > 0 ? <ProductGrid products={products} /> : null}
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
