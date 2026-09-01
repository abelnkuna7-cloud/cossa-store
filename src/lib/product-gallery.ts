export type GalleryImage = {
  url: string | null | undefined;
  alt?: string | null;
};

export function galleryImages<T extends GalleryImage>(images: T[]): T[] {
  const seen = new Set<string>();
  return images.filter((image) => {
    const url = image.url?.trim();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export function nextGalleryIndex(current: number, length: number, direction: 1 | -1): number {
  if (length <= 0) return 0;
  return (current + direction + length) % length;
}
