import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { ProductGrid } from "@/components/shop/ProductCard";
import { ShopFilters, type ShopFilterState } from "@/components/shop/ShopFilters";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/data/categories";
import { productsQuery } from "@/lib/queries";
import {
  isAffiliate,
  isDigital,
  isNewArrival,
  isPopular,
  isService,
  isTrending,
} from "@/lib/merchandising";
import { SITE_URL } from "@/config/seo";

const searchSchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional(),
  collection: z.string().optional(),
  sort: z.enum(["relevance", "newest", "price_asc", "price_desc", "name_asc"]).optional(),
  fulfilment: z.string().optional(),
  availability: z
    .enum(["available_to_order", "in_stock", "limited_stock", "out_of_stock", "made_to_order"])
    .optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  flag: z
    .enum([
      "new",
      "trending",
      "popular",
      "in_stock",
      "made_to_order",
      "affiliate",
      "digital",
      "service",
      "quote_only",
    ])
    .optional(),
});

const TITLE = "Shop all products | Cossa Store";
const DESCRIPTION =
  "Browse Cossa Store departments, product categories and practical buying solutions.";

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: TITLE },
      { property: "og:title", content: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/shop` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/shop` }],
  }),
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = useQuery(productsQuery(search));
  const activeCategory = CATEGORIES.find((category) => category.slug === search.category);

  const products = (query.data ?? []).filter((product) => {
    if (search.fulfilment && product.fulfilment_type !== search.fulfilment) return false;
    if (typeof search.min === "number" && product.selling_price < search.min) return false;
    if (typeof search.max === "number" && product.selling_price > search.max) return false;

    switch (search.availability) {
      case "available_to_order":
        if (!product.stock_available || product.stock_status === "out_of_stock") return false;
        break;
      case "in_stock":
        if (product.stock_status !== "in_stock") return false;
        break;
      case "limited_stock":
        if (product.stock_status !== "low_stock") return false;
        break;
      case "out_of_stock":
        if (product.stock_status !== "out_of_stock") return false;
        break;
      case "made_to_order":
        if (product.stock_status !== "made_to_order") return false;
        break;
      default:
        break;
    }

    switch (search.flag) {
      case "new":
        return isNewArrival(product);
      case "trending":
        return isTrending(product);
      case "popular":
        return isPopular(product);
      case "in_stock":
        return product.stock_available && product.stock_status !== "out_of_stock";
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
        .filter((product) => product.collection)
        .map((product) => [product.collection!.slug, product.collection!] as const),
    ).values(),
  );

  const updateFilters = (next: ShopFilterState) => {
    navigate({ to: "/shop", search: next });
  };

  const desktopFilters = (
    <ShopFilters
      search={search}
      departments={CATEGORIES}
      activeDepartment={activeCategory}
      collections={collections}
      onChange={updateFilters}
      idPrefix="desktop-store-filters"
    />
  );

  const mobileFilters = (
    <ShopFilters
      search={search}
      departments={CATEGORIES}
      activeDepartment={activeCategory}
      collections={collections}
      onChange={updateFilters}
      idPrefix="mobile-store-filters"
    />
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

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between lg:hidden">
          <p className="text-sm text-muted-foreground">
            {query.data ? `${products.length} product${products.length === 1 ? "" : "s"}` : ""}
          </p>
          <Button variant="outline" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="left" className="w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Filter products</SheetTitle>
            </SheetHeader>
            <div className="mt-6">{mobileFilters}</div>
          </SheetContent>
        </Sheet>

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">{desktopFilters}</aside>

          <div>
            <div className="mb-5 hidden flex-wrap items-center justify-between gap-3 lg:flex">
              <p className="text-sm text-muted-foreground">
                {query.data ? `${products.length} product${products.length === 1 ? "" : "s"}` : ""}
              </p>
              <SortControl search={search} onChange={updateFilters} />
            </div>

            <div className="mb-5 flex justify-end lg:hidden">
              <SortControl search={search} onChange={updateFilters} />
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
                description="Try a different department, or request a quote and we will source it."
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
    </div>
  );
}

function SortControl({
  search,
  onChange,
}: {
  search: ShopFilterState;
  onChange: (next: ShopFilterState) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Sort</span>
      <select
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        value={search.sort ?? "relevance"}
        onChange={(event) =>
          onChange({
            ...search,
            sort: event.target.value as NonNullable<ShopFilterState["sort"]>,
          })
        }
      >
        <option value="relevance">Default</option>
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="name_asc">Name A–Z</option>
      </select>
    </label>
  );
}
