import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Package } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { ProductGrid } from "@/components/shop/ProductCard";
import { FulfilmentBadge, StockBadge } from "@/components/shop/ProductMeta";
import { subcategoryName } from "@/data/categories";
import { useCommerce } from "@/lib/commerce-store";
import { formatZar } from "@/lib/format";
import { productQuery, relatedProductsQuery } from "@/lib/queries";
import { fetchProductBySlug } from "@/services/catalog.service";
import type { Product } from "@/types/catalog";
import { ServiceCrossSell } from "@/components/support/ServiceCrossSell";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params, context }): Promise<{ product: Product }> => {
    const product = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product unavailable | Cossa Store" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const p = loaderData.product;
    return {
      meta: [
        { title: p.seo_title },
        { name: "description", content: p.seo_description },
        { property: "og:title", content: p.seo_title },
        { property: "og:description", content: p.seo_description },
      ],
    };
  },
  errorComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <ErrorBlock description="This product could not be loaded." />
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyBlock
        title="Product not found"
        description="This product is no longer listed."
        action={
          <Button asChild>
            <Link to="/shop">Browse the catalogue</Link>
          </Button>
        }
      />
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const productQ = useQuery({
    queryKey: ["products", "detail", slug],
    queryFn: () => fetchProductBySlug(slug),
  });
  const product = productQ.data ?? null;

  if (productQ.isPending) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <LoadingBlock label="Loading product…" />
      </div>
    );
  }
  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyBlock title="Product not found" />
      </div>
    );
  }
  return <ProductDetail product={product} />;
}

function ProductDetail({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart, addToQuote, toggleWishlist, isWishlisted, hydrated } = useCommerce();
  const related = useQuery(relatedProductsQuery(product));
  const wishlisted = hydrated && isWishlisted(product.id);
  const purchasable = product.stock_status !== "out_of_stock";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/shop" className="hover:underline">
          Shop
        </Link>
        <span className="px-2">/</span>
        <Link to="/category/$slug" params={{ slug: product.category }} className="hover:underline">
          {subcategoryName(product.category, product.subcategory)}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex aspect-4/3 items-center justify-center rounded-lg border border-border bg-secondary">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
              Product image pending
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.brand}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{product.short_description}</p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatZar(product.selling_price)}</span>
            {product.compare_at_price ? (
              <span className="text-sm text-muted-foreground line-through">
                {formatZar(product.compare_at_price)}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">Price includes VAT · SKU {product.sku}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <StockBadge status={product.stock_status} />
            <FulfilmentBadge type={product.fulfilment_type} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Estimated delivery: {product.estimated_delivery}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-md border border-input">
              <button
                type="button"
                className="px-3 py-2 text-sm"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-10 text-center text-sm" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                className="px-3 py-2 text-sm"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </button>
            </div>
            <Button
              size="lg"
              disabled={!purchasable}
              onClick={() => {
                addToCart(product.id, quantity);
                toast.success("Added to cart", { description: product.name });
              }}
            >
              {purchasable ? "Add to cart" : "Currently unavailable"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                addToQuote(product.id, quantity);
                toast.success("Added to your quote request");
              }}
            >
              Add to quote
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-pressed={wishlisted}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart className={wishlisted ? "h-4 w-4 fill-current text-accent" : "h-4 w-4"} />
            </Button>
          </div>

          <div className="mt-8 space-y-6 border-t border-border pt-6">
            <section>
              <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">
                Description
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{product.full_description}</p>
            </section>

            <section>
              <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">Features</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {product.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">
                Specifications
              </h2>
              <dl className="mt-2 divide-y divide-border border-y border-border text-sm">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="flex justify-between gap-4 py-2">
                    <dt className="text-muted-foreground">{spec.label}</dt>
                    <dd className="text-right font-medium">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Warranty:</span>{" "}
                {product.warranty ?? "No manufacturer warranty listed."}
              </p>
              <p className="mt-1">
                <span className="font-medium text-foreground">Returns:</span>{" "}
                {product.return_eligibility}{" "}
                <Link to="/returns" className="underline">
                  Full returns policy
                </Link>
              </p>
            </section>

            <ServiceCrossSell categorySlug={product.category} />
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">Related products</h2>
        <div className="mt-6">
          {related.isPending ? <LoadingBlock /> : null}
          {related.data && related.data.length > 0 ? <ProductGrid products={related.data} /> : null}
          {related.data && related.data.length === 0 ? (
            <EmptyBlock title="No related products yet" />
          ) : null}
        </div>
      </section>
    </div>
  );
}
