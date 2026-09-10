import { supabase } from "@/integrations/supabase/client";

const ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const IMAGE_BUCKET = "store-product-images";
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const TARGET_BYTES = 500 * 1024;
const MAX_DIMENSION = 1600;
const CACHE_SECONDS = "31536000";

type UploadResult = {
  publicUrl: string;
  reused: boolean;
  originalBytes: number;
  storedBytes: number;
};

function safeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
}

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error(`${file.name} could not be decoded as a browser image.`);
  }
}

async function canvasBlob(
  image: ImageBitmap,
  width: number,
  height: number,
  type: string,
  quality?: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Image optimisation is unavailable in this browser.");
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error("The image could not be optimised.");
  return blob;
}

async function optimiseImage(file: File): Promise<{ blob: Blob; extension: string; contentType: string }> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  if (file.size > MAX_SOURCE_BYTES) throw new Error(`${file.name} is larger than 12 MB. Resize it before uploading.`);
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    throw new Error(`${file.name} uses a format that is not accepted for Store catalogue images. Use JPG, PNG or WebP.`);
  }

  const image = await decodeImage(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    if (file.size <= TARGET_BYTES && scale === 1 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      return { blob: file, extension, contentType: file.type };
    }

    const qualities = [0.82, 0.72, 0.62];
    let best = await canvasBlob(image, width, height, "image/webp", qualities[0]);
    for (const quality of qualities.slice(1)) {
      if (best.size <= TARGET_BYTES) break;
      const next = await canvasBlob(image, width, height, "image/webp", quality);
      if (next.size < best.size) best = next;
    }

    return { blob: best, extension: "webp", contentType: "image/webp" };
  } finally {
    image.close();
  }
}

export async function uploadStoreProductImage(file: File, productFolder: string): Promise<UploadResult> {
  const originalBytes = file.size;
  const sourceHash = await sha256Hex(file);
  const optimised = await optimiseImage(file);
  const folder = safeSegment(productFolder);
  const objectName = `${sourceHash}.${optimised.extension}`;
  const objectFolder = `${ORGANISATION_ID}/${folder}`;
  const path = `${objectFolder}/${objectName}`;

  const { data: existing, error: listError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .list(objectFolder, { limit: 10, search: sourceHash });
  if (listError) throw listError;

  const alreadyStored = (existing ?? []).some((item) => item.name === objectName);
  if (!alreadyStored) {
    const { error: uploadError } = await supabase.storage.from(IMAGE_BUCKET).upload(path, optimised.blob, {
      cacheControl: CACHE_SECONDS,
      upsert: false,
      contentType: optimised.contentType,
    });
    if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw uploadError;
  }

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return {
    publicUrl: data.publicUrl,
    reused: alreadyStored,
    originalBytes,
    storedBytes: optimised.blob.size,
  };
}
