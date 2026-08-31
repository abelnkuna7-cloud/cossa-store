import assert from "node:assert/strict";
import test from "node:test";

import {
  CJ_PROTECTED_PRICING,
  cjDraftDecision,
  qualifyCjCandidate,
  type CjQualificationInput,
} from "../supabase/functions/_shared/cj-qualification.ts";

function candidate(overrides: Partial<CjQualificationInput> = {}): CjQualificationInput {
  return {
    productId: "2608240553001605000",
    title: "Coffee Machine Cleaning Tablets",
    description: "A complete product description with enough operational detail for review.",
    category: "home-living",
    images: ["https://example.com/product.jpg"],
    variants: [
      {
        id: "CJ-VARIANT-1",
        sku: "CJ-CLEAN-1",
        title: "Standard",
        sourcePriceUsd: 4,
        stockQuantity: 10,
        available: true,
        warehouse: "CN",
      },
    ],
    totalInventory: 10,
    inventoryUnitsKnown: true,
    inventorySource: "inventory",
    shipping: {
      status: "verified",
      carrier: "CJ Logistics",
      aging: "8-15 days",
      origin: "CN",
      freightUsd: 5,
      minDays: 8,
      maxDays: 15,
      variantId: "CJ-VARIANT-1",
    },
    complianceReason: null,
    duplicate: null,
    ...overrides,
  };
}

test("eligible CJ candidate produces a protected 35% review preview", () => {
  const result = qualifyCjCandidate(candidate());
  assert.equal(result.outcome, "READY_FOR_REVIEW");
  assert.equal(result.pricing.fxZarPerUsd, 16.5);
  assert.equal(result.pricing.targetGrossMargin, CJ_PROTECTED_PRICING.targetGrossMargin);
  assert.equal(result.pricing.landedCostZar, 148.5);
  assert.equal(result.pricing.proposedSellingPriceZar, 289.9);
  assert.ok((result.pricing.grossMargin ?? 0) >= 0.35);
});

test("shipping uncertainty is held for review rather than commercially rejected", () => {
  const result = qualifyCjCandidate(
    candidate({
      shipping: {
        status: "unverified",
        reason: "CJ freight API did not respond.",
        variantId: "CJ-VARIANT-1",
      },
    }),
  );
  assert.equal(result.outcome, "SHIPPING_UNVERIFIED");
});

test("a verified lack of ZA service has a specific rejection", () => {
  const result = qualifyCjCandidate(
    candidate({
      shipping: {
        status: "unavailable",
        reason: "CJ returned no ZA freight method.",
        variantId: "CJ-VARIANT-1",
      },
    }),
  );
  assert.equal(result.outcome, "REJECTED_NO_ZA_SHIPPING");
});

test("a commercially unsuitable no-stock candidate is specifically rejected", () => {
  const result = qualifyCjCandidate(
    candidate({
      totalInventory: 0,
      variants: [{ ...candidate().variants[0], available: false, stockQuantity: 0 }],
    }),
  );
  assert.equal(result.outcome, "REJECTED_NO_STOCK");
});

test("compliance flags take precedence over commercial pricing", () => {
  const result = qualifyCjCandidate(candidate({ complianceReason: "regulated" }));
  assert.equal(result.outcome, "REJECTED_COMPLIANCE");
});

test("draft creation never duplicates or downgrades a public CJ product", () => {
  assert.equal(cjDraftDecision(null), "create");
  assert.equal(cjDraftDecision("draft"), "update_draft");
  assert.equal(cjDraftDecision("archived"), "reopen_archived");
  assert.equal(cjDraftDecision("active"), "preserve_active");
});
