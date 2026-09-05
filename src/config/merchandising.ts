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
 * Merchandising tags. Staff set these on a product in the catalogue manager.
 * Nothing here fabricates demand — a product only appears in "Trending now"
 * when a staff member has deliberately marked it.
 */
export const MERCH_TAGS = {
  trending: "trending",
  /** Set only after an administrator verifies a genuine demand signal. */
  popular: "popular",
  businessDeal: "business-deal",
} as const;
