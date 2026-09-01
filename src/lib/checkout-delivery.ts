export const SOUTH_AFRICAN_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
] as const;

export type CheckoutDeliveryAddress = {
  address1: string;
  address2: string;
  suburb: string;
  city: string;
  region: string;
  zip: string;
  country: "ZA";
  deliveryInstructions: string;
};

export type PublicCartProduct = {
  product_type: string;
  fulfilment_type: string;
  affiliate: unknown;
};

export type CheckoutQuoteLine = {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
};

export type CheckoutQuoteFingerprintInput = {
  cart: CheckoutQuoteLine[];
  customerName: string;
  customerPhone: string;
  deliveryAddress: CheckoutDeliveryAddress | null;
};

const clean = (value: string) => value.trim();

export function requiresPhysicalDelivery(product: PublicCartProduct): boolean {
  return (
    product.product_type !== "digital" &&
    product.fulfilment_type !== "digital" &&
    product.product_type !== "affiliate" &&
    product.fulfilment_type !== "affiliate" &&
    !product.affiliate
  );
}

export function deliveryAddressErrors(
  address: CheckoutDeliveryAddress,
): Partial<Record<keyof CheckoutDeliveryAddress, string>> {
  const errors: Partial<Record<keyof CheckoutDeliveryAddress, string>> = {};
  if (clean(address.address1).length < 4) errors.address1 = "Street address is required.";
  if (clean(address.suburb).length < 2) errors.suburb = "Suburb is required.";
  if (clean(address.city).length < 2) errors.city = "City or town is required.";
  if (
    !SOUTH_AFRICAN_PROVINCES.includes(address.region as (typeof SOUTH_AFRICAN_PROVINCES)[number])
  ) {
    errors.region = "Select a South African province.";
  }
  if (!/^\d{4}$/.test(clean(address.zip))) errors.zip = "Enter a valid four-digit postal code.";
  return errors;
}

export function isCompleteDeliveryAddress(address: CheckoutDeliveryAddress): boolean {
  return Object.keys(deliveryAddressErrors(address)).length === 0;
}

/**
 * A browser quote is usable only for this exact selected-cart, customer and
 * address state. The server repeats the full price/delivery calculation when
 * an EFT request is created; this only prevents a stale UI quote from enabling
 * the button after the cart or address changes.
 */
export function checkoutQuoteFingerprint(input: CheckoutQuoteFingerprintInput): string {
  return JSON.stringify({
    cart: input.cart.map((line) => ({
      product_id: line.product_id,
      variant_id: line.variant_id ?? null,
      quantity: line.quantity,
    })),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    deliveryAddress: input.deliveryAddress,
  });
}
