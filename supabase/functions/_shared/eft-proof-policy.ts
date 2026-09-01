export const MAX_EFT_PROOF_BYTES = 10 * 1024 * 1024;

export const EFT_PROOF_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export type EftProofUploadStatus = "awaiting_payment" | "rejected";

export const PROOF_SUBMITTED_STATUS = "proof_submitted" as const;

export function canUploadEftProof(status: string): status is EftProofUploadStatus {
  return status === "awaiting_payment" || status === "rejected";
}

export function isAllowedEftProofContentType(contentType: string): boolean {
  return (EFT_PROOF_CONTENT_TYPES as readonly string[]).includes(contentType);
}

export function hasEftProofSignature(contentType: string, bytes: Uint8Array): boolean {
  const isPdf =
    contentType === "application/pdf" &&
    bytes.length >= 5 &&
    String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  const isJpeg =
    contentType === "image/jpeg" &&
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const isPng =
    contentType === "image/png" &&
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;

  return isPdf || isJpeg || isPng;
}
