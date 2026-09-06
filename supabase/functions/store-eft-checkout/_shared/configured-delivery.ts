/**
 * Server-side resolver for configured supplier delivery rates.
 *
 * The browser never supplies a delivery price. It can only send the selected
 * product IDs, variants and quantities; the checkout service loads every rate,
 * measurement and supplier/profile relationship from trusted storage.
 */

export const DELIVERY_QUOTE_REQUIRED = "Delivery quote required.";
export const CUSTOM_DELIVERY_QUOTE_REQUIRED =
  "This order requires a custom delivery quote before payment.";

export type DeliveryClassification = "standard" | "oversized";
export type MeasurementKind = "product" | "packed_parcel";
export type DeliveryOperationalState =
  "STANDARD_RATE_ELIGIBLE" | "OVERSIZED_OR_SURCHARGE_REQUIRED" | "MANUAL_DELIVERY_QUOTE_REQUIRED";

export type DeliveryRateEligibility = {
  requires_dimensions?: boolean;
  requires_weight?: boolean;
  allowed_dimension_kinds?: MeasurementKind[];
  max_length_cm?: number;
  max_width_cm?: number;
  max_height_cm?: number;
  max_weight_kg?: number;
  // Use this where a carrier states "under" a limit. For example, PUDO's
  // 20 kg rule means 20 kg itself is not eligible.
  max_weight_kg_exclusive?: number;
  max_rate_age_days?: number;
  // DMC's published rate warns that remote-area surcharges can apply. A rate
  // that requires this check must not be used until a trusted server-side
  // address resolver has confirmed the destination.
  requires_address_eligibility?: boolean;
};

export type ConfiguredDeliveryRate = {
  id: string;
  supplierId: string;
  fulfilmentProfileId: string;
  methodCode: string;
  customerLabel: string;
  price: number;
  currency: string;
  isActive: boolean;
  customerSelectable: boolean;
  isDefault: boolean;
  classification: DeliveryClassification;
  eligibility: DeliveryRateEligibility;
  sourceUrl: string | null;
  sourceEvidence: string | null;
  verifiedAt: string | null;
  operationalNotes?: string | null;
};

export type DeliveryItemMeasurements = {
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  weightKg: number | null;
  dimensionKind: MeasurementKind | null;
  dimensionsVerifiedAt: string | null;
  weightVerifiedAt: string | null;
};

export type ConfiguredDeliveryItem = {
  productId: string;
  quantity: number;
  measurements: DeliveryItemMeasurements | null;
};

export type ConfiguredDeliveryGroup = {
  supplierId: string;
  fulfilmentProfileId: string;
  supplierIsActive: boolean;
  fulfilmentProfileIsActive: boolean;
  customerPaysDelivery: boolean;
  addressEligibility?: "eligible" | "unknown" | "surcharge_required" | "unsupported";
  items: ConfiguredDeliveryItem[];
  rates: ConfiguredDeliveryRate[];
};

export type ResolvedParcel = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  itemQuantity: number;
};

export type DeliveryResolution =
  | {
      status: "quoted";
      rate: ConfiguredDeliveryRate;
      parcel: ResolvedParcel;
      shippingTotal: number;
      shippingMethod: string;
      operationalState: "STANDARD_RATE_ELIGIBLE" | "OVERSIZED_OR_SURCHARGE_REQUIRED";
    }
  | {
      status: "quote_required";
      reason:
        | "inactive_supplier_or_profile"
        | "customer_payer_not_configured"
        | "address_eligibility_unknown"
        | "remote_or_surcharge_required"
        | "invalid_or_stale_rate"
        | "missing_measurements"
        | "unsupported_measurements"
        | "oversized_without_rate";
      message: string;
      operationalState: DeliveryOperationalState;
    };

const money = (value: number) => Math.round(value * 100) / 100;
const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

function dateIsFresh(verifiedAt: string | null, maxAgeDays: number | undefined, now: Date) {
  if (!verifiedAt || !Number.isFinite(Date.parse(verifiedAt))) return false;
  const ageDays = (now.getTime() - Date.parse(verifiedAt)) / 86_400_000;
  return ageDays >= 0 && ageDays <= (positive(maxAgeDays) ? maxAgeDays : 90);
}

function isUsableRate(rate: ConfiguredDeliveryRate, now: Date) {
  return (
    rate.isActive &&
    rate.customerSelectable &&
    rate.currency === "ZAR" &&
    positive(rate.price) &&
    Boolean(rate.methodCode.trim()) &&
    Boolean(rate.customerLabel.trim()) &&
    Boolean(rate.sourceUrl?.trim()) &&
    Boolean(rate.sourceEvidence?.trim()) &&
    dateIsFresh(rate.verifiedAt, rate.eligibility.max_rate_age_days, now)
  );
}

function selectRate(
  rates: ConfiguredDeliveryRate[],
  classification: DeliveryClassification,
  now: Date,
) {
  const usable = rates.filter(
    (rate) => rate.classification === classification && isUsableRate(rate, now),
  );
  const defaultRate = usable.filter((rate) => rate.isDefault);
  // More than one default would make a customer charge non-deterministic.
  if (defaultRate.length === 1) return defaultRate[0];
  return usable.length === 1 ? usable[0] : null;
}

function normalizedDimensions(lengthCm: number, widthCm: number, heightCm: number) {
  return [lengthCm, widthCm, heightCm].sort((left, right) => right - left) as [
    number,
    number,
    number,
  ];
}

function rateBounds(rate: ConfiguredDeliveryRate) {
  const requirements = rate.eligibility;
  if (!positive(requirements.max_weight_kg) && !positive(requirements.max_weight_kg_exclusive)) {
    return null;
  }

  const dimensionLimits = [
    requirements.max_length_cm,
    requirements.max_width_cm,
    requirements.max_height_cm,
  ];
  const hasAnyDimensionLimit = dimensionLimits.some(positive);
  // A carrier can require that a parcel fits a locker without publishing an
  // exact internal dimension. In that case the staff confirmation is the
  // evidence of fit; never manufacture a numeric limit in code.
  if (hasAnyDimensionLimit && !dimensionLimits.every(positive)) return null;

  return {
    dimensions: hasAnyDimensionLimit
      ? normalizedDimensions(
          requirements.max_length_cm!,
          requirements.max_width_cm!,
          requirements.max_height_cm!,
        )
      : null,
    maximumWeightKg: requirements.max_weight_kg,
    exclusiveMaximumWeightKg: requirements.max_weight_kg_exclusive,
  };
}

function resolveParcel(
  items: ConfiguredDeliveryItem[],
  eligibility: DeliveryRateEligibility,
): { parcel: ResolvedParcel } | { reason: "missing_measurements" | "unsupported_measurements" } {
  const expanded: DeliveryItemMeasurements[] = [];
  const allowedKinds = eligibility.allowed_dimension_kinds ?? [];

  for (const item of items) {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 25 ||
      !item.measurements
    ) {
      return { reason: "missing_measurements" };
    }
    const measurements = item.measurements;
    const hasDimensions =
      positive(measurements.lengthCm) &&
      positive(measurements.widthCm) &&
      positive(measurements.heightCm) &&
      Boolean(measurements.dimensionsVerifiedAt);
    const hasWeight = positive(measurements.weightKg) && Boolean(measurements.weightVerifiedAt);
    if (eligibility.requires_dimensions !== false && !hasDimensions) {
      return { reason: "missing_measurements" };
    }
    if (eligibility.requires_weight !== false && !hasWeight) {
      return { reason: "missing_measurements" };
    }
    if (
      allowedKinds.length &&
      (!measurements.dimensionKind || !allowedKinds.includes(measurements.dimensionKind))
    ) {
      return { reason: "unsupported_measurements" };
    }
    for (let index = 0; index < item.quantity; index += 1) expanded.push(measurements);
  }

  if (!expanded.length) return { reason: "missing_measurements" };

  // Lay every parcel out along its longest side. This is deliberately
  // conservative: when the resulting single parcel fits, we have not
  // underestimated its bounding box. If it does not fit, staff must quote.
  const dimensions = expanded.map((item) =>
    normalizedDimensions(item.lengthCm!, item.widthCm!, item.heightCm!),
  );
  const lengthCm = dimensions.reduce((total, item) => total + item[0], 0);
  const widthCm = Math.max(...dimensions.map((item) => item[1]));
  const heightCm = Math.max(...dimensions.map((item) => item[2]));
  const weightKg = expanded.reduce((total, item) => total + (item.weightKg ?? 0), 0);

  return {
    parcel: {
      lengthCm,
      widthCm,
      heightCm,
      weightKg,
      itemQuantity: expanded.length,
    },
  };
}

function parcelFitsRate(parcel: ResolvedParcel, rate: ConfiguredDeliveryRate) {
  const bounds = rateBounds(rate);
  if (!bounds) return false;
  const parcelBounds = normalizedDimensions(parcel.lengthCm, parcel.widthCm, parcel.heightCm);
  const weightFits = positive(bounds.exclusiveMaximumWeightKg)
    ? parcel.weightKg < bounds.exclusiveMaximumWeightKg
    : parcel.weightKg <= (bounds.maximumWeightKg ?? 0);
  return (
    (!bounds.dimensions ||
      (parcelBounds[0] <= bounds.dimensions[0] &&
        parcelBounds[1] <= bounds.dimensions[1] &&
        parcelBounds[2] <= bounds.dimensions[2])) &&
    weightFits
  );
}

function quoteRequired(
  reason: Extract<DeliveryResolution, { status: "quote_required" }>["reason"],
  message: string,
  operationalState: DeliveryOperationalState = "MANUAL_DELIVERY_QUOTE_REQUIRED",
): DeliveryResolution {
  return { status: "quote_required", reason, message, operationalState };
}

/**
 * Resolves exactly one supplier fulfilment group. It returns a charge once for
 * the group, never once per product, and never falls back to a client value.
 */
export function resolveConfiguredDeliveryGroup(
  group: ConfiguredDeliveryGroup,
  now = new Date(),
): DeliveryResolution {
  if (!group.supplierIsActive || !group.fulfilmentProfileIsActive) {
    return quoteRequired(
      "inactive_supplier_or_profile",
      `${DELIVERY_QUOTE_REQUIRED} The selected fulfilment route is not active.`,
    );
  }
  if (!group.customerPaysDelivery) {
    return quoteRequired(
      "customer_payer_not_configured",
      `${DELIVERY_QUOTE_REQUIRED} Customer-paid delivery is not configured for this order.`,
    );
  }

  const standardRate = selectRate(group.rates, "standard", now);
  if (!standardRate) {
    return quoteRequired(
      "invalid_or_stale_rate",
      `${DELIVERY_QUOTE_REQUIRED} No active, verified delivery rate is available.`,
    );
  }

  if (
    standardRate.eligibility.requires_address_eligibility &&
    group.addressEligibility !== "eligible"
  ) {
    if (
      group.addressEligibility === "surcharge_required" ||
      group.addressEligibility === "unsupported"
    ) {
      return quoteRequired(
        "remote_or_surcharge_required",
        CUSTOM_DELIVERY_QUOTE_REQUIRED,
        "OVERSIZED_OR_SURCHARGE_REQUIRED",
      );
    }
    return quoteRequired(
      "address_eligibility_unknown",
      `${DELIVERY_QUOTE_REQUIRED} This destination needs a verified delivery eligibility check.`,
    );
  }

  const parcelResult = resolveParcel(group.items, standardRate.eligibility);
  if ("reason" in parcelResult) {
    return quoteRequired(
      parcelResult.reason,
      `${DELIVERY_QUOTE_REQUIRED} Verified parcel dimensions and weight are needed before payment.`,
    );
  }

  if (parcelFitsRate(parcelResult.parcel, standardRate)) {
    return {
      status: "quoted",
      rate: standardRate,
      parcel: parcelResult.parcel,
      shippingTotal: money(standardRate.price),
      shippingMethod: standardRate.customerLabel,
      operationalState: "STANDARD_RATE_ELIGIBLE",
    };
  }

  const oversizedRate = selectRate(group.rates, "oversized", now);
  if (oversizedRate && parcelFitsRate(parcelResult.parcel, oversizedRate)) {
    return {
      status: "quoted",
      rate: oversizedRate,
      parcel: parcelResult.parcel,
      shippingTotal: money(oversizedRate.price),
      shippingMethod: oversizedRate.customerLabel,
      operationalState: "OVERSIZED_OR_SURCHARGE_REQUIRED",
    };
  }

  return quoteRequired(
    "oversized_without_rate",
    CUSTOM_DELIVERY_QUOTE_REQUIRED,
    "OVERSIZED_OR_SURCHARGE_REQUIRED",
  );
}
