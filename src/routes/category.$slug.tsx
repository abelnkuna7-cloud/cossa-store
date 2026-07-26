import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { ProductGrid } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { getCategory } from "@/data/categories";
import { productsQuery } from "@/lib/queries";
import type { Category } from "@/types/catalog";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }): { category: Category } => {
    const category = getCategory(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Category unavailable | Cossa Store" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.category.name} | Cossa Store`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.category.description },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.category.description },
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
        description="That range does not exist in the Cossa Store catalogue."
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
  const { slug } = Route.useParams();
  const category = getCategory(slug) as Category;
  const query = useQuery(productsQuery({ category: category.slug }));

  return (
    <div>
      <PageHeader
        eyebrow="Category"
        title={category.name}
        description={category.description}
        actions={
          <Button asChild variant="outline">
            <Link to="/request-a-quote">Request a quote</Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap gap-2">
          {category.subcategories.map((sub) => (
            <Link
              key={sub.slug}
              to="/shop"
              search={{ category: category.slug, subcategory: sub.slug }}
              className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-accent"
            >
              {sub.name}
            </Link>
          ))}
        </div>

        {query.isPending ? <LoadingBlock /> : null}
        {query.isError ? (
          <ErrorBlock action={<Button onClick={() => query.refetch()}>Try again</Button>} />
        ) : null}
        {query.data && query.data.length === 0 ? (
          <EmptyBlock title="No products listed in this range yet" />
        ) : null}
        {query.data && query.data.length > 0 ? <ProductGrid products={query.data} /> : null}
      </div>
    </div>
  );
}