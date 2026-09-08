/**
 * Storefront merchandising configuration.
 *
 * These are the only "tuning" values behind the homepage sections. They are
 * intentionally centralised so an administrator can change the behaviour in
 * one place without touching component code or the database schema.
 */
export const MERCHANDISING = {
  /** A published product counts as a new arrival for this many days. */
  newArrivalWindowDays: 30,
  /** Maximum cards rendered per horizontal section. */
  sectionLimit: 12,
} as const;

/**
 * Merchandising tags written by the Store intake/catalogue workflow.
 * Customer-facing claims still need matching evidence rules in merchandising.ts.
 */
export const MERCH_TAGS = {
  newArrival: "new_arrival",
  trending: "trending",
  bestSeller: "best_seller",
  sale: "sale",
  /** Legacy evidence-backed demand tag retained for compatibility. */
  popular: "popular",
  businessDeal: "business-deal",
} as const;
