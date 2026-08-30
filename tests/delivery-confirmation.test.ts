import assert from "node:assert/strict";
import test from "node:test";

import {
  addressEligibilityFromConfirmation,
  canonicalDeliveryConfirmationScope,
  deliveryConfirmationFingerprint,
} from "../supabase/functions/_shared/delivery-confirmation.ts";

const base = {
  cart: [{ productId: "product-a", variantId: null, quantity: 1 }],
  address: {
    address1: "1 Main Road",
    address2: "",
    suburb: "Rosebank",
    city: "Johannesburg",
    region: "Gauteng",
    zip: "2196",
    country: "ZA",
    deliveryInstructions: "",
  },
};

test("a delivery confirmation is invalidated by either a cart or address change", async () => {
  const original = await deliveryConfirmationFingerprint(base);
  const cartChanged = await deliveryConfirmationFingerprint({
    ...base,
    cart: [{ ...base.cart[0], quantity: 2 }],
  });
  const addressChanged = await deliveryConfirmationFingerprint({
    ...base,
    address: { ...base.address, zip: "2001" },
  });
  assert.notEqual(original, cartChanged);
  assert.notEqual(original, addressChanged);
});

test("scope normalization is stable but does not remove material address differences", () => {
  assert.equal(
    canonicalDeliveryConfirmationScope(base),
    canonicalDeliveryConfirmationScope({
      ...base,
      address: { ...base.address, city: "  JOHANNESBURG " },
    }),
  );
  assert.notEqual(
    canonicalDeliveryConfirmationScope(base),
    canonicalDeliveryConfirmationScope({
      ...base,
      address: { ...base.address, address1: "2 Main Road" },
    }),
  );
});

test("only a staff-held standard confirmation maps to an eligible destination", () => {
  assert.equal(addressEligibilityFromConfirmation(null), "unknown");
  assert.equal(
    addressEligibilityFromConfirmation({
      eligibilityClassification: "STANDARD_RATE_ELIGIBLE",
    }),
    "eligible",
  );
  assert.equal(
    addressEligibilityFromConfirmation({
      eligibilityClassification: "OVERSIZED_OR_SURCHARGE_REQUIRED",
    }),
    "surcharge_required",
  );
  assert.equal(
    addressEligibilityFromConfirmation({
      eligibilityClassification: "MANUAL_DELIVERY_QUOTE_REQUIRED",
    }),
    "unknown",
  );
});
