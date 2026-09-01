/**
 * Additive Store search helpers.
 *
 * Results are always matched against published customer-facing product data.
 * The small equivalence list only bridges common retail wording; it never
 * uses supplier, affiliate, cost, or other operational data.
 */
export type SearchableStoreProduct = {
  name: string;
  sku?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  display_category?: string | null;
  tags?: string[] | null;
};

const EQUIVALENT_TERMS = [
  ["phone", "mobile", "smartphone", "cellphone"],
  ["laptop", "notebook"],
  ["headphones", "headset", "earphones", "earbuds"],
  ["charger", "charging", "power"],
  ["luggage", "travel", "suitcase"],
  ["bag", "backpack", "handbag"],
  ["tool", "tools", "diy"],
  ["storage", "organisation", "organization"],
] as const;

function normalise(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function equivalentsFor(token: string): readonly string[] {
  return EQUIVALENT_TERMS.find((group) => group.includes(token as never)) ?? [token];
}

export function customerSearchText(product: SearchableStoreProduct): string {
  return normalise(
    [
      product.name,
      product.sku ?? "",
      product.short_description ?? "",
      product.full_description ?? "",
      product.brand ?? "",
      product.category ?? "",
      product.subcategory ?? "",
      product.display_category ?? "",
      ...(product.tags ?? []),
    ].join(" "),
  );
}

/**
 * Exact wording wins. For a multi-word search, every word must still match
 * product data (or a common equivalent), so broad category aliases cannot
 * pull in unrelated merchandise.
 */
export function matchesStoreSearch(
  product: SearchableStoreProduct,
  query: string,
): boolean {
  const term = normalise(query);
  if (!term) return true;

  const text = customerSearchText(product);
  if (text.includes(term)) return true;

  return term.split(" ").every((token) =>
    equivalentsFor(token).some((candidate) => new RegExp(`(?:^| )${candidate}(?: |$)`).test(text)),
  );
}
