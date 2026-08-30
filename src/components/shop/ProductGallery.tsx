import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

import { ProductImage } from "@/components/shop/ProductImage";
import { Button } from "@/components/ui/button";
import { galleryImages, nextGalleryIndex, type GalleryImage } from "@/lib/product-gallery";

type ProductGalleryImage = GalleryImage & {
  id?: string;
};

export function ProductGallery({
  images,
  productName,
  badge,
}: {
  images: ProductGalleryImage[];
  productName: string;
  badge?: ReactNode;
}) {
  const usableImages = useMemo(() => galleryImages(images), [images]);
  const imageIdentity = usableImages.map((image) => image.url).join("|");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = usableImages[selectedIndex] ?? null;

  useEffect(() => {
    setSelectedIndex(0);
  }, [imageIdentity]);

  function move(direction: 1 | -1) {
    setSelectedIndex((current) => nextGalleryIndex(current, usableImages.length, direction));
  }

  return (
    <section
      aria-label={`${productName} image gallery`}
      tabIndex={usableImages.length > 1 ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        }
      }}
      className="outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="relative aspect-4/3 overflow-hidden rounded-lg border border-border bg-secondary">
        {selected?.url ? (
          <ProductImage
            url={selected.url}
            alt={selected.alt || productName}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center">
            <div>
              <Package className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                Product image pending
              </p>
            </div>
          </div>
        )}

        {badge}

        {usableImages.length > 1 ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/90 hover:bg-background"
              aria-label="Show previous product image"
              onClick={() => move(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/90 hover:bg-background"
              aria-label="Show next product image"
              onClick={() => move(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>

      {usableImages.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Choose a product image">
          {usableImages.map((image, index) => {
            const selectedThumbnail = index === selectedIndex;
            return (
              <button
                key={image.id ?? `${image.url}-${index}`}
                type="button"
                aria-label={`Show image ${index + 1} of ${usableImages.length}`}
                aria-pressed={selectedThumbnail}
                onClick={() => setSelectedIndex(index)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-secondary p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  selectedThumbnail
                    ? "border-primary ring-1 ring-primary"
                    : "border-border hover:border-primary/60"
                }`}
              >
                <ProductImage
                  url={image.url}
                  alt={image.alt || `${productName} image ${index + 1}`}
                  className="h-full w-full"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
