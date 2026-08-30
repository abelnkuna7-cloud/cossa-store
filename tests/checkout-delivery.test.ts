import assert from "node:assert/strict";
import test from "node:test";

import {
  checkoutQuoteFingerprint,
  deliveryAddressErrors,
  isCompleteDeliveryAddress,
  requiresPhysicalDelivery,
  type CheckoutDeliveryAddress,
} from "../src/lib/checkout-delivery.ts";

const completeAddress: CheckoutDeliveryAddress = {
  address1: "12 Cossa Avenue",
  address2: "Unit 4",
  suburb: "Rosebank",
  city: "Johannesburg",
  region: "Gauteng",
  zip: "2196",
  country: "ZA",
  deliveryInstructions: "Leave with reception.",
};

test("physical and mixed carts require a delivery address", () => {
  assert.equal(
    requiresPhysicalDelivery({
      product_type: "dropshipping",
      fulfilment_type: "local_dropshipping",
      affiliate: null,
    }),
    true,
  );
  assert.equal(
    requiresPhysicalDelivery({
      product_type: "pod",
      fulfilment_type: "print_on_demand",
      affiliate: null,
    }),
    true,
  );
});

test("digital-only and affiliate carts do not require a delivery address", () => {
  assert.equal(
    requiresPhysicalDelivery({
      product_type: "digital",
      fulfilment_type: "digital",
      affiliate: null,
    }),
    false,
  );
  assert.equal(
    requiresPhysicalDelivery({
      product_type: "affiliate",
      fulfilment_type: "affiliate",
      affiliate: {},
    }),
    false,
  );
});

test("a complete South African delivery address passes frontend validation", () => {
  assert.deepEqual(deliveryAddressErrors(completeAddress), {});
  assert.equal(isCompleteDeliveryAddress(completeAddress), true);
});

test("missing address information receives field-level errors", () => {
  const errors = deliveryAddressErrors({
    ...completeAddress,
    address1: "",
    suburb: "",
    city: "",
    region: "",
    zip: "123",
  });
  assert.equal(errors.address1, "Street address is required.");
  assert.equal(errors.suburb, "Suburb is required.");
  assert.equal(errors.city, "City or town is required.");
  assert.equal(errors.region, "Select a South African province.");
  assert.equal(errors.zip, "Enter a valid four-digit postal code.");
});

test("changing an address or selected cart invalidates the browser delivery quote", () => {
  const quoteFor = checkoutQuoteFingerprint({
    cart: [{ product_id: "dm8363", variant_id: null, quantity: 1 }],
    customerName: "Cossa Customer",
    customerPhone: "082 000 0000",
    deliveryAddress: completeAddress,
  });
  const changedAddress = checkoutQuoteFingerprint({
    cart: [{ product_id: "dm8363", variant_id: null, quantity: 1 }],
    customerName: "Cossa Customer",
    customerPhone: "082 000 0000",
    deliveryAddress: { ...completeAddress, zip: "2000" },
  });
  const changedCart = checkoutQuoteFingerprint({
    cart: [{ product_id: "dm8363", variant_id: null, quantity: 2 }],
    customerName: "Cossa Customer",
    customerPhone: "082 000 0000",
    deliveryAddress: completeAddress,
  });
  assert.notEqual(quoteFor, changedAddress);
  assert.notEqual(quoteFor, changedCart);
});
