export const CJ_PROTECTED_PRICING = {
  fxZarPerUsd: 16.5,
  riskBufferRate: 0.12,
  fixedOrderBufferZar: 20,
  targetGrossMargin: 0.35,
  maxRetailZar: 3000,
} as const;

export type CjQualificationOutcome =
  | "SHIPPING_UNVERIFIED"
  | "REJECTED_NO_ZA_SHIPPING"
  | "REJECTED_NO_STOCK"
  | "REJECTED_LOW_MARGIN"
  | "REJECTED_COMPLIANCE"
  | "REVIEW_PRICING"
  | "READY_FOR_REVIEW";

export type CjShippingPreview =
  | {
      status: "verified";
      carrier: string;
      aging: string;
      origin: string;
      freightUsd: number;
      minDays: number | null;
      maxDays: number | null;
      variantId: string;
    }
  | { status: "unverified"; reason: string; variantId: string | null }
  | { status: "unavailable"; reason: string; variantId: string | null };

export type CjQualificationVariant = {
  id: string;
  sku: string | null;
  title: string;
  sourcePriceUsd: number | null;
  stockQuantity: number | null;
  available: boolean;
  warehouse: string | null;
};

export type CjQualificationInput = {
  productId: string;
  title: string;
  description: string;
  category: string | null;
  images: string[];
  variants: CjQualificationVariant[];
  totalInventory: number;
  inventoryUnitsKnown: boolean;
  inventorySource: string;
  shipping: CjShippingPreview;
  complianceReason: string | null;
  duplicate: { id: string; status: string } | null;
};

export type CjQualificationPreview = CjQualificationInput & {
  pricing: {
    supplierCostUsd: number | null;
    freightUsd: number | null;
    landedCostZar: number | null;
    bufferedCostZar: number | null;
    proposedSellingPriceZar: number | null;
    grossProfitZar: number | null;
    grossMargin: number | null;
    fxZarPerUsd: number;
    targetGrossMargin: number;
  };
  outcome: CjQualificationOutcome;
  reasons: string[];
  checkedAt: string;
};

export type CjDraftDecision = "create" | "update_draft" | "reopen_archived" | "preserve_active";

function positive(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function psychologicalPrice(value: number): number {
  const ten = Math.ceil(value / 10) * 10;
  return Math.max(49.9, rounded(ten - 0.1));
}

export function calculateCjCommercialPreview(supplierCostUsd: number, freightUsd: number) {
  const landedCostZar = rounded((supplierCostUsd + freightUsd) * CJ_PROTECTED_PRICING.fxZarPerUsd);
  const bufferedCostZar = rounded(
    landedCostZar * (1 + CJ_PROTECTED_PRICING.riskBufferRate) +
      CJ_PROTECTED_PRICING.fixedOrderBufferZar,
  );
  const proposedSellingPriceZar = psychologicalPrice(
    bufferedCostZar / (1 - CJ_PROTECTED_PRICING.targetGrossMargin),
  );
  const grossProfitZar = rounded(proposedSellingPriceZar - bufferedCostZar);
  const grossMargin = grossProfitZar / proposedSellingPriceZar;
  return {
    landedCostZar,
    bufferedCostZar,
    proposedSellingPriceZar,
    grossProfitZar,
    grossMargin,
  };
}

export function cjDraftDecision(existingStatus: string | null | undefined): CjDraftDecision {
  if (!existingStatus) return "create";
  if (existingStatus === "draft") return "update_draft";
  if (existingStatus === "archived") return "reopen_archived";
  return "preserve_active";
}

export function qualifyCjCandidate(input: CjQualificationInput): CjQualificationPreview {
  const reasons: string[] = [];
  const availableVariants = input.variants.filter((variant) => variant.available);
  const supplierCosts = availableVariants
    .map((variant) => positive(variant.sourcePriceUsd))
    .filter((value): value is number => value !== null);
  const supplierCostUsd = supplierCosts.length ? Math.min(...supplierCosts) : null;
  const freightUsd = input.shipping.status === "verified" ? input.shipping.freightUsd : null;
  let commercial: ReturnType<typeof calculateCjCommercialPreview> | null = null;

  if (supplierCostUsd !== null && freightUsd !== null) {
    commercial = calculateCjCommercialPreview(supplierCostUsd, freightUsd);
  }

  let outcome: CjQualificationOutcome;
  if (input.complianceReason) {
    outcome = "REJECTED_COMPLIANCE";
    reasons.push(`Compliance review: ${input.complianceReason}.`);
  } else if (!availableVariants.length || input.totalInventory <= 0) {
    outcome = "REJECTED_NO_STOCK";
    reasons.push("No current CJ variant with confirmed availability was returned.");
  } else if (input.shipping.status === "unverified") {
    outcome = "SHIPPING_UNVERIFIED";
    reasons.push(input.shipping.reason);
  } else if (input.shipping.status === "unavailable") {
    outcome = "REJECTED_NO_ZA_SHIPPING";
    reasons.push(input.shipping.reason);
  } else if (!commercial || supplierCostUsd === null) {
    outcome = "REVIEW_PRICING";
    reasons.push("A usable supplier cost and ZA freight quote are required for pricing.");
  } else if (commercial.proposedSellingPriceZar > CJ_PROTECTED_PRICING.maxRetailZar) {
    outcome = "REVIEW_PRICING";
    reasons.push("The protected proposed selling price exceeds the configured CJ review ceiling.");
  } else if (commercial.grossMargin < CJ_PROTECTED_PRICING.targetGrossMargin) {
    outcome = "REJECTED_LOW_MARGIN";
    reasons.push("The calculated gross margin is below Cossa's 35% target margin.");
  } else {
    outcome = "READY_FOR_REVIEW";
    reasons.push(
      "Live product, availability, ZA freight and protected pricing are ready for staff review.",
    );
  }

  if (input.duplicate) {
    reasons.push(
      `A CJ-backed Cossa record already exists (${input.duplicate.status}); no duplicate will be created.`,
    );
  }
  if (!input.inventoryUnitsKnown) {
    reasons.push("CJ confirmed available variants, but returned no per-variant unit count.");
  }

  return {
    ...input,
    pricing: {
      supplierCostUsd,
      freightUsd,
      landedCostZar: commercial?.landedCostZar ?? null,
      bufferedCostZar: commercial?.bufferedCostZar ?? null,
      proposedSellingPriceZar: commercial?.proposedSellingPriceZar ?? null,
      grossProfitZar: commercial?.grossProfitZar ?? null,
      grossMargin: commercial?.grossMargin ?? null,
      fxZarPerUsd: CJ_PROTECTED_PRICING.fxZarPerUsd,
      targetGrossMargin: CJ_PROTECTED_PRICING.targetGrossMargin,
    },
    outcome,
    reasons,
    checkedAt: new Date().toISOString(),
  };
}
