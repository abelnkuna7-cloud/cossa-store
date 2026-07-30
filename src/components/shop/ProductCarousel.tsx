import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { trackEvent } from "@/lib/analytics";
import type { Product } from "@/types/catalog";

/**
 * Horizontally scrollable product rail.
 *
 * Pointer drag, touch swipe, previous/next controls, native keyboard
 * scrolling and reduced-motion support. There is no autoplay: nothing moves
 * unless the customer moves it.
 */
export function ProductCarousel({
  sectionId,
  title,
  description,
  products,
  action,
}: {
  sectionId: string;
  title: string;
  description?: string;
  products: Product[];
  action?: React.ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const seen = useRef(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    const onResize = () => sync();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [sync, products.length]);

  /* Fire carousel_view only once the rail is actually on screen. */
  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !seen.current) {
            seen.current = true;
            trackEvent("carousel_view", { section: sectionId, items: products.length });
          }
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sectionId, products.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction * Math.max(240, el.clientWidth * 0.85),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  /* Mouse drag-to-scroll (pointer events only; touch uses native scrolling). */
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  return (
    <section aria-labelledby={`${sectionId}-heading`} className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id={`${sectionId}-heading`}
              className="text-xl font-semibold tracking-tight sm:text-2xl"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {action}
            <div className="hidden gap-1 sm:flex">
              <Button
                variant="outline"
                size="icon"
                aria-label={`Scroll ${title} backwards`}
                disabled={!canPrev}
                onClick={() => scrollBy(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Scroll ${title} forwards`}
                disabled={!canNext}
                onClick={() => scrollBy(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div
          ref={trackRef}
          role="group"
          aria-label={`${title} products`}
          tabIndex={0}
          onScroll={sync}
          onPointerDown={(event) => {
            if (event.pointerType !== "mouse") return;
            const el = trackRef.current;
            if (!el) return;
            drag.current = {
              active: true,
              startX: event.clientX,
              startLeft: el.scrollLeft,
              moved: false,
            };
          }}
          onPointerMove={(event) => {
            const el = trackRef.current;
            if (!drag.current.active || !el) return;
            const delta = event.clientX - drag.current.startX;
            if (Math.abs(delta) > 4) drag.current.moved = true;
            el.scrollLeft = drag.current.startLeft - delta;
          }}
          onPointerUp={() => {
            drag.current.active = false;
          }}
          onPointerLeave={() => {
            drag.current.active = false;
          }}
          onClickCapture={(event) => {
            if (drag.current.moved) {
              event.preventDefault();
              event.stopPropagation();
              drag.current.moved = false;
            }
          }}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[calc(50%-0.5rem)] shrink-0 snap-start sm:w-56 lg:w-64"
            >
              <ProductCard
                product={product}
                onOpen={() =>
                  trackEvent("carousel_product_click", {
                    section: sectionId,
                    product_id: product.id,
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}