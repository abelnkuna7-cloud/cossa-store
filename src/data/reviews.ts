/**
 * Manually seeded product reviews.
 *
 * Reviews are intentionally EMPTY. Do not add invented reviews here — every
 * entry must be a real, verifiable customer review supplied by Cossa Nexus
 * Holdings. The storefront renders a clean "no reviews yet" state until this
 * list is populated, and swaps to full rating summaries automatically.
 *
 * To seed a review, append an object below (or later move this to the
 * database without changing the component API).
 */
export interface ProductReview {
  id: string;
  /** Product SKU the review belongs to. */
  sku: string;
  /** Category slug, so category pages can summarise range-level feedback. */
  category?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  author: string;
  location?: string;
  /** ISO date. */
  date: string;
  verified_purchase: boolean;
}

export const PRODUCT_REVIEWS: ProductReview[] = [];

export function reviewsForSku(sku: string): ProductReview[] {
  return PRODUCT_REVIEWS.filter((r) => r.sku === sku);
}

export function reviewsForCategory(category: string): ProductReview[] {
  return PRODUCT_REVIEWS.filter((r) => r.category === category);
}

export interface RatingSummary {
  count: number;
  average: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function summarise(reviews: ProductReview[]): RatingSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingSummary["distribution"];
  for (const r of reviews) distribution[r.rating] += 1;
  const count = reviews.length;
  const average = count === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / count;
  return { count, average: Math.round(average * 10) / 10, distribution };
}
