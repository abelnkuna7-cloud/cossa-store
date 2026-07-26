export function formatZar(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export const VAT_RATE = 0.15;

/** Selling prices are stored VAT inclusive; this extracts the VAT portion. */
export function vatPortion(vatInclusiveTotal: number): number {
  return vatInclusiveTotal - vatInclusiveTotal / (1 + VAT_RATE);
}
