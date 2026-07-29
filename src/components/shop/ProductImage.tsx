import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";

import { isExternalUrl, mediaUrlQuery } from "@/lib/media";
import { cn } from "@/lib/utils";

export function ProductImage({
  url,
  alt,
  className,
}: {
  url: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const signed = useQuery(mediaUrlQuery(url));
  const resolved = isExternalUrl(url) ? (url as string) : (signed.data ?? null);

  if (!resolved) {
    return (
      <div
        className={cn("flex items-center justify-center bg-secondary", className)}
        aria-hidden={Boolean(alt)}
      >
        <Package className="h-10 w-10 text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return <img src={resolved} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}
