import { Link } from "@tanstack/react-router";
import { ExternalLink, Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shop/ProductImage";
import { useCommerce } from "@/lib/commerce-store";
import { formatZar } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import {
  canAddToCart,
  genuineComparePrice,
  isAffiliate,
  productBadges,
  type BadgeTone,
} from "@/lib/merchandising";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/catalog";

const TONE: Record<BadgeTone, string> = {
  gold: "border-primary/50 text-primary",
  positive: "border-success/40 text-success",
  warning: "border-warning/50 text-warning",
  neutral: "border-border text-muted-foreground",
};

export function ProductCard({
  product,
  onOpen,
}: {
  product: Product;
  onOpen?: () => void;
}) {
  const { addToCart, toggleWishlist, isWishlisted, hydrated } = useCommerce();
  const wishlisted = hydrated && isWishlisted(product.id);
  const affiliate = isAffiliate(product);
  const purchasable = canAddToCart(product);
  const compareAt = genuineComparePrice(product);
  const badges = productBadges(product);
  const image = product.images[0];

  const open = () => {
    trackEvent("product_card_click", { product_id: product.id });
    onOpen?.();
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        onClick={open}
        className="block aspect-square overflow-hidden bg-secondary"
      >
        <ProductImage
          url={image?.url}
          alt={image?.alt ?? product.name}
          className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.collection ? (
          <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
            {product.collection.name}
          </p>
        ) : product.brand ? (
          <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
            {product.brand}
          </p>
        ) : null}

        <h3 className="mt-1 line-clamp-2 font-sans text-sm font-semibold leading-snug">
          <Link
            to="/product/$slug"
            params={{ slug: product.slug }}
            onClick={open}
            className="hover:underline"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap gap-1">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                TONE[badge.tone],
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>

        <div className="mt-3">
          {product.requires_quote || product.selling_price <= 0 ? (
            <p className="text-sm font-semibold">Price on request</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold sm:text-lg">
                  {formatZar(product.selling_price)}
                </span>
                {compareAt ? (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatZar(compareAt)}
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">Incl. VAT</p>
            </>
          )}
        </div>

        {affiliate && product.affiliate ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {product.affiliate.disclosure_text ??
              `Sold and fulfilled by ${product.affiliate.partner_name}. Cossa may earn a commission.`}
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-3">
          {affiliate && product.affiliate ? (
            <Button asChild className="flex-1" size="sm">
              <a
                href={product.affiliate.tracking_url}
                target="_blank"
                rel="nofollow sponsored noreferrer"
                onClick={() =>
                  trackEvent("affiliate_link_click", {
                    product_id: product.id,
                    partner: product.affiliate?.partner_name ?? null,
                  })
                }
              >
                Visit partner <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          ) : product.requires_quote || product.selling_price <= 0 ? (
            <Button asChild className="flex-1" size="sm" variant="outline">
              <Link
                to="/request-a-quote"
                onClick={() => trackEvent("quote_request_click", { product_id: product.id })}
              >
                Request a quote
              </Link>
            </Button>
          ) : purchasable ? (
            <Button
              className="flex-1"
              size="sm"
              onClick={() => {
                addToCart(product.id, 1);
                toast.success("Added to cart", { description: product.name });
              }}
            >
              Add to cart
            </Button>
          ) : (
            <Button asChild className="flex-1" size="sm" variant="outline">
              <Link
                to="/contact"
                onClick={() => trackEvent("availability_request_click", { product_id: product.id })}
              >
                Check availability
              </Link>
            </Button>
          )}

          {affiliate ? null : (
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
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
