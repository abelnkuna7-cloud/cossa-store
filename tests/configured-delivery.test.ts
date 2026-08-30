import assert from "node:assert/strict";
import test from "node:test";

import {
  CUSTOM_DELIVERY_QUOTE_REQUIRED,
  DELIVERY_QUOTE_REQUIRED,
  resolveConfiguredDeliveryGroup,
  type ConfiguredDeliveryGroup,
  type ConfiguredDeliveryRate,
} from "../supabase/functions/_shared/configured-delivery.ts";

const now = new Date("2026-08-30T10:00:00.000Z");
const verifiedAt = "2026-08-29T10:00:00.000Z";

const standardRate: ConfiguredDeliveryRate = {
  id: "rate-standard",
  supplierId: "dmc",
  fulfilmentProfileId: "dmc-profile",
  methodCode: "dmc_locker_to_door_xl",
  customerLabel: "Locker-to-Door",
  price: 179,
  currency: "ZAR",
  isActive: true,
  customerSelectable: true,
  isDefault: true,
  classification: "standard",
  eligibility: {
    requires_dimensions: true,
    requires_weight: true,
    allowed_dimension_kinds: ["product", "packed_parcel"],
    max_weight_kg_exclusive: 20,
    max_rate_age_days: 90,
    requires_address_eligibility: true,
  },
  sourceUrl: "https://dmcwholesale.co.za/pages/wholesale-customer-terms-conditions",
  sourceEvidence: "Verified DMC Locker-to-Door XL rate.",
  verifiedAt,
};

function dmcGroup(overrides: Partial<ConfiguredDeliveryGroup> = {}): ConfiguredDeliveryGroup {
  return {
    supplierId: "dmc",
    fulfilmentProfileId: "dmc-profile",
    supplierIsActive: true,
    fulfilmentProfileIsActive: true,
    customerPaysDelivery: true,
    addressEligibility: "eligible",
    rates: [standardRate],
    items: [
      {
        productId: "dm8363",
        quantity: 1,
        measurements: {
          lengthCm: 28,
          widthCm: 21,
          heightCm: 9,
          weightKg: 1,
          dimensionKind: "product",
          dimensionsVerifiedAt: verifiedAt,
          weightVerifiedAt: verifiedAt,
        },
      },
    ],
    ...overrides,
  };
}

test("an admin-confirmed eligible DMC fixture receives one R179 Locker-to-Door quote", () => {
  const delivery = resolveConfiguredDeliveryGroup(dmcGroup(), now);
  assert.equal(delivery.status, "quoted");
  if (delivery.status !== "quoted") return;
  assert.equal(delivery.shippingMethod, "Locker-to-Door");
  assert.equal(delivery.shippingTotal, 179);
  assert.equal(delivery.operationalState, "STANDARD_RATE_ELIGIBLE");
  // The checkout receives product prices only from the server. This fixture
  // demonstrates the expected secure total for an authoritative R159 price.
  assert.equal(159 + delivery.shippingTotal, 338);
});

test("missing or uncertain dimensions and weight never silently receive R179", () => {
  const delivery = resolveConfiguredDeliveryGroup(
    dmcGroup({
      items: [
        {
          productId: "dm8363",
          quantity: 1,
          measurements: {
            lengthCm: 28,
            widthCm: 21,
            heightCm: 9,
            weightKg: null,
            dimensionKind: "product",
            dimensionsVerifiedAt: verifiedAt,
            weightVerifiedAt: null,
          },
        },
      ],
    }),
    now,
  );
  assert.equal(delivery.status, "quote_required");
  if (delivery.status !== "quote_required") return;
  assert.equal(delivery.reason, "missing_measurements");
  assert.equal(delivery.operationalState, "MANUAL_DELIVERY_QUOTE_REQUIRED");
  assert.match(delivery.message, /Delivery quote required/i);
});

test("no unverified numeric locker dimensions are needed after staff confirms parcel fit", () => {
  const delivery = resolveConfiguredDeliveryGroup(dmcGroup(), now);
  assert.equal("max_length_cm" in standardRate.eligibility, false);
  assert.equal("max_width_cm" in standardRate.eligibility, false);
  assert.equal("max_height_cm" in standardRate.eligibility, false);
  assert.equal(delivery.status, "quoted");
  if (delivery.status !== "quoted") return;
  assert.equal(delivery.shippingTotal, 179);
});

test("an order too large for the standard DMC rate blocks payment without a configured oversized rate", () => {
  const boundedFixtureRate = {
    ...standardRate,
    eligibility: {
      ...standardRate.eligibility,
      // Test-only dimensions model a carrier rule that has actually supplied
      // limits. Production DMC configuration deliberately has none.
      max_length_cm: 60,
      max_width_cm: 41,
      max_height_cm: 69,
    },
  };
  const delivery = resolveConfiguredDeliveryGroup(
    dmcGroup({
      rates: [boundedFixtureRate],
      items: [
        {
          productId: "large-item",
          quantity: 1,
          measurements: {
            lengthCm: 80,
            widthCm: 30,
            heightCm: 20,
            weightKg: 4,
            dimensionKind: "packed_parcel",
            dimensionsVerifiedAt: verifiedAt,
            weightVerifiedAt: verifiedAt,
          },
        },
      ],
    }),
    now,
  );
  assert.equal(delivery.status, "quote_required");
  if (delivery.status !== "quote_required") return;
  assert.equal(delivery.reason, "oversized_without_rate");
  assert.equal(delivery.message, CUSTOM_DELIVERY_QUOTE_REQUIRED);
  assert.equal(delivery.operationalState, "OVERSIZED_OR_SURCHARGE_REQUIRED");
});

test("a separately verified oversized configuration is used only when it fits", () => {
  const boundedStandardRate: ConfiguredDeliveryRate = {
    ...standardRate,
    eligibility: {
      ...standardRate.eligibility,
      max_length_cm: 60,
      max_width_cm: 41,
      max_height_cm: 69,
    },
  };
  const oversizedRate: ConfiguredDeliveryRate = {
    ...standardRate,
    id: "rate-oversized",
    methodCode: "dmc_oversized_reviewed",
    customerLabel: "Oversized delivery",
    price: 349,
    classification: "oversized",
    eligibility: {
      ...standardRate.eligibility,
      max_length_cm: 100,
      max_width_cm: 60,
      max_height_cm: 60,
      max_weight_kg_exclusive: 30,
    },
  };
  const delivery = resolveConfiguredDeliveryGroup(
    dmcGroup({
      rates: [boundedStandardRate, oversizedRate],
      items: [
        {
          productId: "large-item",
          quantity: 1,
          measurements: {
            lengthCm: 80,
            widthCm: 30,
            heightCm: 20,
            weightKg: 4,
            dimensionKind: "packed_parcel",
            dimensionsVerifiedAt: verifiedAt,
            weightVerifiedAt: verifiedAt,
          },
        },
      ],
    }),
    now,
  );
  assert.equal(delivery.status, "quoted");
  if (delivery.status !== "quoted") return;
  assert.equal(delivery.shippingTotal, 349);
  assert.equal(delivery.shippingMethod, "Oversized delivery");
  assert.equal(delivery.operationalState, "OVERSIZED_OR_SURCHARGE_REQUIRED");
});

test("multiple DMC products are conservatively combined and charged once", () => {
  const delivery = resolveConfiguredDeliveryGroup(
    dmcGroup({
      items: [
        dmcGroup().items[0],
        {
          productId: "second-dmc-product",
          quantity: 1,
          measurements: {
            lengthCm: 10,
            widthCm: 10,
            heightCm: 10,
            weightKg: 0.5,
            dimensionKind: "packed_parcel",
            dimensionsVerifiedAt: verifiedAt,
            weightVerifiedAt: verifiedAt,
          },
        },
      ],
    }),
    now,
  );
  assert.equal(delivery.status, "quoted");
  if (delivery.status !== "quoted") return;
  assert.equal(delivery.shippingTotal, 179);
  assert.equal(delivery.parcel.itemQuantity, 2);
  assert.equal(delivery.parcel.weightKg, 1.5);
  assert.equal(delivery.operationalState, "STANDARD_RATE_ELIGIBLE");
});

test("combined DMC baskets with an unverified item require a quote", () => {
  const delivery = resolveConfiguredDeliveryGroup(
    dmcGroup({
      items: [
        dmcGroup().items[0],
        {
          productId: "unknown-dmc-product",
          quantity: 1,
          measurements: null,
        },
      ],
    }),
    now,
  );
  assert.equal(delivery.status, "quote_required");
  if (delivery.status !== "quote_required") return;
  assert.equal(delivery.reason, "missing_measurements");
});

test("inactive or stale rate configuration cannot create a delivery quote", () => {
  const inactive = resolveConfiguredDeliveryGroup(
    dmcGroup({ rates: [{ ...standardRate, isActive: false }] }),
    now,
  );
  assert.equal(inactive.status, "quote_required");
  if (inactive.status === "quote_required") {
    assert.equal(inactive.reason, "invalid_or_stale_rate");
  }

  const stale = resolveConfiguredDeliveryGroup(
    dmcGroup({ rates: [{ ...standardRate, verifiedAt: "2025-01-01T00:00:00.000Z" }] }),
    now,
  );
  assert.equal(stale.status, "quote_required");
  if (stale.status === "quote_required") {
    assert.equal(stale.reason, "invalid_or_stale_rate");
  }
});

test("a rate requiring destination verification stays blocked until the server has it", () => {
  const rateRequiringAddress = {
    ...standardRate,
    eligibility: { ...standardRate.eligibility, requires_address_eligibility: true },
  };
  const unknown = resolveConfiguredDeliveryGroup(
    dmcGroup({ rates: [rateRequiringAddress], addressEligibility: "unknown" }),
    now,
  );
  assert.equal(unknown.status, "quote_required");
  if (unknown.status === "quote_required") {
    assert.equal(unknown.reason, "address_eligibility_unknown");
    assert.match(unknown.message, /Delivery quote required/i);
    assert.equal(unknown.operationalState, "MANUAL_DELIVERY_QUOTE_REQUIRED");
  }

  const eligible = resolveConfiguredDeliveryGroup(
    dmcGroup({ rates: [rateRequiringAddress], addressEligibility: "eligible" }),
    now,
  );
  assert.equal(eligible.status, "quoted");
});

test("PUDO's under-20-kg limit rejects a parcel at exactly 20 kg", () => {
  const underTwenty = resolveConfiguredDeliveryGroup(
    dmcGroup({
      items: [
        {
          productId: "verified-light-parcel",
          quantity: 1,
          measurements: {
            lengthCm: 28,
            widthCm: 21,
            heightCm: 9,
            weightKg: 19.999,
            dimensionKind: "packed_parcel",
            dimensionsVerifiedAt: verifiedAt,
            weightVerifiedAt: verifiedAt,
          },
        },
      ],
    }),
    now,
  );
  assert.equal(underTwenty.status, "quoted");

  const exactlyTwenty = resolveConfiguredDeliveryGroup(
    dmcGroup({
      items: [
        {
          productId: "limit-parcel",
          quantity: 1,
          measurements: {
            lengthCm: 28,
            widthCm: 21,
            heightCm: 9,
            weightKg: 20,
            dimensionKind: "packed_parcel",
            dimensionsVerifiedAt: verifiedAt,
            weightVerifiedAt: verifiedAt,
          },
        },
      ],
    }),
    now,
  );
  assert.equal(exactlyTwenty.status, "quote_required");
  if (exactlyTwenty.status === "quote_required") {
    assert.equal(exactlyTwenty.operationalState, "OVERSIZED_OR_SURCHARGE_REQUIRED");
  }
});

test("a confirmed remote surcharge maps to the surcharge state, not a guessed rate", () => {
  const rateRequiringAddress = {
    ...standardRate,
    eligibility: { ...standardRate.eligibility, requires_address_eligibility: true },
  };
  const delivery = resolveConfiguredDeliveryGroup(
    dmcGroup({ rates: [rateRequiringAddress], addressEligibility: "surcharge_required" }),
    now,
  );
  assert.equal(delivery.status, "quote_required");
  if (delivery.status !== "quote_required") return;
  assert.equal(delivery.reason, "remote_or_surcharge_required");
  assert.equal(delivery.operationalState, "OVERSIZED_OR_SURCHARGE_REQUIRED");
  assert.equal(delivery.message, CUSTOM_DELIVERY_QUOTE_REQUIRED);
});

test("the resolver does not permit a customer-provided shipping price", () => {
  const delivery = resolveConfiguredDeliveryGroup(dmcGroup(), now);
  assert.equal(delivery.status, "quoted");
  if (delivery.status !== "quoted") return;
  // No client price exists in the resolver input. A browser can only receive
  // this server-selected rate, so a fake R0/R999 field cannot affect R179.
  assert.equal(delivery.shippingTotal, 179);
  assert.equal(DELIVERY_QUOTE_REQUIRED, "Delivery quote required.");
});
