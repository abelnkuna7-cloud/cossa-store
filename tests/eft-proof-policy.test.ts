import assert from "node:assert/strict";
import test from "node:test";

import {
  canUploadEftProof,
  EFT_PROOF_CONTENT_TYPES,
  hasEftProofSignature,
  MAX_EFT_PROOF_BYTES,
  PROOF_SUBMITTED_STATUS,
} from "../supabase/functions/_shared/eft-proof-policy.ts";

test("only an awaiting or rejected payment can accept a proof", () => {
  assert.equal(canUploadEftProof("awaiting_payment"), true);
  assert.equal(canUploadEftProof("rejected"), true);
  assert.equal(canUploadEftProof("proof_submitted"), false);
  assert.equal(canUploadEftProof("approved"), false);
});

test("proof uploads accept only safe formats with matching file signatures", () => {
  assert.deepEqual(EFT_PROOF_CONTENT_TYPES, ["application/pdf", "image/jpeg", "image/png"]);
  assert.equal(MAX_EFT_PROOF_BYTES, 10 * 1024 * 1024);
  assert.equal(hasEftProofSignature("application/pdf", new TextEncoder().encode("%PDF-1.7")), true);
  assert.equal(
    hasEftProofSignature(
      "image/png",
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    true,
  );
  assert.equal(hasEftProofSignature("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff])), true);
  assert.equal(
    hasEftProofSignature("application/pdf", new TextEncoder().encode("not a receipt")),
    false,
  );
});

test("proof upload advances to review, never directly to paid", () => {
  assert.equal(PROOF_SUBMITTED_STATUS, "proof_submitted");
  assert.notEqual(PROOF_SUBMITTED_STATUS, "approved");
});
