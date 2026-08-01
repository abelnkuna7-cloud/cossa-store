/**
 * Client-side image optimisation for catalogue media.
 *
 * Large provider mockups are resized and re-encoded (WebP where the browser
 * supports it) before upload so storefront pages stay fast. The original file
 * is returned unchanged when optimisation is not possible.
 */
export interface OptimiseResult {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
  bytes: number;
}

const MAX_EDGE = 1600;
const QUALITY = 0.82;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be read"));
    };
    img.src = url;
  });
}

export async function optimiseImage(file: File): Promise<OptimiseResult> {
  const fallback: OptimiseResult = {
    file,
    width: 0,
    height: 0,
    originalBytes: file.size,
    bytes: file.size,
  };
  if (typeof document === "undefined" || !file.type.startsWith("image/")) return fallback;
  if (file.type === "image/svg+xml" || file.type === "image/gif") return fallback;

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback;
    ctx.drawImage(img, 0, 0, width, height);

    const supportsWebp = canvas.toDataURL("image/webp").startsWith("data:image/webp");
    const mime = supportsWebp ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, QUALITY),
    );
    if (!blob || blob.size >= file.size) return { ...fallback, width, height };

    const base = file.name.replace(/\.[^.]+$/, "");
    const extension = mime === "image/webp" ? "webp" : "jpg";
    return {
      file: new File([blob], `${base}.${extension}`, { type: mime }),
      width,
      height,
      originalBytes: file.size,
      bytes: blob.size,
    };
  } catch {
    return fallback;
  }
}

/**
 * Suggests descriptive alt text from real product context. It never invents
 * detail that is not already captured on the product.
 */
export function suggestAltText(input: {
  productName?: string | null;
  itemType?: string | null;
  colour?: string | null;
  index?: number;
  fileName?: string | null;
}): string {
  const parts: string[] = [];
  if (input.productName?.trim()) parts.push(input.productName.trim());
  if (input.colour?.trim()) parts.push(`in ${input.colour.trim()}`);
  if (input.itemType?.trim() && !input.productName?.toLowerCase().includes(input.itemType.toLowerCase())) {
    parts.push(`— ${input.itemType.trim()}`);
  }
  if (!parts.length && input.fileName) {
    parts.push(
      input.fileName
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " ")
        .trim(),
    );
  }
  const base = parts.join(" ").replace(/\s+/g, " ").trim();
  if (!base) return "";
  const view = (input.index ?? 0) > 0 ? ` (view ${(input.index ?? 0) + 1})` : "";
  return `${base}${view}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}