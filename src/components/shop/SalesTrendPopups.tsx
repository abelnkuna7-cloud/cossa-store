/**
 * Sliding catalogue-highlight popups.
 *
 * Every card is built from factual published catalogue data. No sales volume,
 * popularity, demand or trending activity is inferred or invented.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";

import { ProductImage } from "@/components/shop/ProductImage";
import { formatZar } from "@/lib/format";
import { isNewArrival } from "@/lib/merchandising";
import { storefrontProductsQuery } from "@/lib/queries";
import type { Product } from "@/types/catalog";
import { cn } from "@/lib/utils";

const FIRST_DELAY = 12000;
const VISIBLE_MS = 9000;
const GAP_MS = 18000;

function highlightLabel(product: Product): string {
  if (product.is_featured) return "Featured by Cossa Store";
  if (isNewArrival(product)) return "New arrival";
  return "From the Cossa Store catalogue";
}

export function SalesTrendPopups() {
  const products = useQuery(storefrontProductsQuery());
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const picks = useMemo(() => {
    const all = products.data ?? [];
    const highlighted = all.filter((p) => p.is_featured || isNewArrival(p));
    return (highlighted.length ? highlighted : all).slice(0, 6);
  }, [products.data]);

  useEffect(() => {
    if (dismissed || picks.length === 0) return;
    let cancelled = false;
    const show = window.setTimeout(function cycle() {
      if (cancelled) return;
      setVisible(true);
      window.setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
        setIndex((i) => (i + 1) % picks.length);
        window.setTimeout(cycle, GAP_MS);
      }, VISIBLE_MS);
    }, FIRST_DELAY);
    return () => {
      cancelled = true;
      window.clearTimeout(show);
    };
  }, [dismissed, picks.length]);

  if (dismissed || picks.length === 0) return null;
  const product = picks[index % picks.length];
  if (!product) return null;

  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-24 left-4 z-40 hidden max-w-[20rem] transition-all duration-500 sm:block",
        visible ? "translate-x-0 opacity-100" : "-translate-x-[120%] opacity-0",
      )}
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <ProductImage
          url={product.images[0]?.url ?? null}
          alt={product.images[0]?.alt ?? product.name}
          className="h-14 w-14 shrink-0 rounded-lg"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {highlightLabel(product)}
          </p>
          <Link
            to="/product/$slug"
            params={{ slug: product.slug }}
            className="line-clamp-1 text-sm font-medium hover:underline"
          >
            {product.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {product.requires_quote ? "Quote on request" : formatZar(product.selling_price)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss catalogue highlight"
          className="ml-auto self-start rounded p-1 text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
