/**
 * A delivery confirmation is private operational evidence.  The checkout
 * browser never receives or supplies an eligibility classification; it can
 * only ask the server for a quote that matches this exact scope.
 */
export type DeliveryConfirmationClassification =
  | "STANDARD_RATE_ELIGIBLE"
  | "OVERSIZED_OR_SURCHARGE_REQUIRED"
  | "MANUAL_DELIVERY_QUOTE_REQUIRED";

export type DeliveryConfirmationCartLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

export type DeliveryConfirmationAddress = {
  address1: string;
  address2: string;
  suburb: string;
  city: string;
  region: string;
  zip: string;
  country: string;
  deliveryInstructions: string;
};

export type DeliveryConfirmationScope = {
  cart: DeliveryConfirmationCartLine[];
  address: DeliveryConfirmationAddress;
};

export type StoredDeliveryConfirmation = {
  id?: string;
  eligibilityClassification: DeliveryConfirmationClassification;
  rateConfigurationId: string | null;
  deliveryMethod: string | null;
  deliveryAmount: number | null;
  currency: string | null;
  evidenceNote: string;
  verifiedAt: string;
  expiresAt: string;
};

function normalise(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The canonical scope intentionally includes no name, email or phone number.
 * It is only the selected server-resolved cart and delivery destination.
 */
export function canonicalDeliveryConfirmationScope(scope: DeliveryConfirmationScope) {
  return JSON.stringify({
    cart: [...scope.cart]
      .map((line) => ({
        productId: line.productId,
        variantId: line.variantId ?? null,
        quantity: line.quantity,
      }))
      .sort(
        (left, right) =>
          left.productId.localeCompare(right.productId) ||
          String(left.variantId ?? "").localeCompare(String(right.variantId ?? "")) ||
          left.quantity - right.quantity,
      ),
    address: {
      address1: normalise(scope.address.address1),
      address2: normalise(scope.address.address2),
      suburb: normalise(scope.address.suburb),
      city: normalise(scope.address.city),
      region: normalise(scope.address.region),
      zip: normalise(scope.address.zip),
      country: normalise(scope.address.country),
      deliveryInstructions: normalise(scope.address.deliveryInstructions),
    },
  });
}

export async function deliveryConfirmationFingerprint(scope: DeliveryConfirmationScope) {
  const bytes = new TextEncoder().encode(canonicalDeliveryConfirmationScope(scope));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function addressEligibilityFromConfirmation(
  confirmation: Pick<StoredDeliveryConfirmation, "eligibilityClassification"> | null,
) {
  if (!confirmation) return "unknown" as const;
  if (confirmation.eligibilityClassification === "STANDARD_RATE_ELIGIBLE") {
    return "eligible" as const;
  }
  if (confirmation.eligibilityClassification === "OVERSIZED_OR_SURCHARGE_REQUIRED") {
    return "surcharge_required" as const;
  }
  return "unknown" as const;
}
