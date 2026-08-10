/**
 * Product media URL resolution.
 *
 * `product_media.url` stores either an external provider URL (e.g. a Printify
 * mockup) or a path inside the private `product-media` storage bucket.
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const PRODUCT_MEDIA_BUCKET = "product-media";

export function isExternalUrl(value: string | null | undefined): boolean {
  // Absolute http(s) URLs and app-served asset paths ("/assets/...") are used
  // directly; anything else is a private storage bucket path.
  return typeof value === "string" && (/^https?:\/\//i.test(value) || value.startsWith("/"));
}

export async function signedMediaUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export const mediaUrlQuery = (value: string | null | undefined) =>
  queryOptions({
    queryKey: ["media", value],
    enabled: Boolean(value) && !isExternalUrl(value),
    staleTime: 50 * 60 * 1000,
    queryFn: () => signedMediaUrl(value as string),
  });

export async function uploadProductMedia(file: File, productId: string): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}
