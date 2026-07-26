import { Link } from "@tanstack/react-router";
import { Heart, Package } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCommerce } from "@/lib/commerce-store";
import { formatZar } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/catalog";
import { StockBadge } from "./ProductMeta";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWishlisted, hydrated } = useCommerce();
  const wishlisted = hydrated && isWishlisted(product.id);
  const purchasable = product.stock_status !== "out_of_stock";

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="relative flex aspect-4/3 items-center justify-center bg-secondary"
      >
        <Package className="h-10 w-10 text-muted-foreground" aria-hidden />
        <span className="sr-only">{product.name}</span>
        <span className="absolute bottom-2 left-2 rounded bg-background/85 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          Product image pending
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        <h3 className="mt-1 line-clamp-2 font-sans text-sm font-semibold leading-snug">
          <Link to="/product/$slug" params={{ slug: product.slug }} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {product.short_description}
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-semibold">{formatZar(product.selling_price)}</span>
          {product.compare_at_price ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatZar(product.compare_at_price)}
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">Incl. VAT</p>

        <div className="mt-3">
          <StockBadge status={product.stock_status} />
        </div>

        <div className="mt-4 flex items-center gap-2 pt-1">
          <Button
            className="flex-1"
            size="sm"
            disabled={!purchasable}
            onClick={() => {
              addToCart(product.id, 1);
              toast.success("Added to cart", { description: product.name });
            }}
          >
            {purchasable ? "Add to cart" : "Unavailable"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wishlisted}
            onClick={() => {
              toggleWishlist(product.id);
              toast.success(wishlisted ? "Removed from wishlist" : "Saved to wishlist");
            }}
          >
            <Heart className={cn("h-4 w-4", wishlisted && "fill-current text-accent")} />
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
