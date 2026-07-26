import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { ProductGrid } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { productsQuery } from "@/lib/queries";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Search products | Cossa Store" },
      { name: "description", content: "Search the Cossa Store catalogue by product, brand or SKU." },
      { property: "og:title", content: "Search products | Cossa Store" },
      { property: "og:description", content: "Search the Cossa Store catalogue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [term, setTerm] = useState(q ?? "");
  const query = useQuery({ ...productsQuery({ search: q ?? "" }), enabled: Boolean(q) });

  return (
    <div>
      <PageHeader
        eyebrow="Search"
        title={q ? `Results for “${q}”` : "Search the catalogue"}
        description="Search by product name, brand, SKU or range."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <form
          className="mb-8 flex max-w-xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/search", search: { q: term.trim() || undefined } });
          }}
        >
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Search products"
            placeholder="e.g. drill, mop, camera"
          />
          <Button type="submit">Search</Button>
        </form>

        {!q ? <EmptyBlock title="Enter a search term to begin" /> : null}
        {q && query.isPending ? <LoadingBlock label="Searching…" /> : null}
        {q && query.isError ? (
          <ErrorBlock action={<Button onClick={() => query.refetch()}>Try again</Button>} />
        ) : null}
        {q && query.data && query.data.length === 0 ? (
          <EmptyBlock
            title="No products matched your search"
            description="We may still be able to source it for you."
            action={
              <Button asChild>
                <Link to="/request-a-quote">Request a quote</Link>
              </Button>
            }
          />
        ) : null}
        {q && query.data && query.data.length > 0 ? <ProductGrid products={query.data} /> : null}
      </div>
    </div>
  );
}