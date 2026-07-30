/**
 * Pure, presentation-only merchandising helpers.
 *
 * Nothing in here invents data: every badge and every section is derived from
 * real published catalogue values (fulfilment model, real counted stock,
 * genuine promotional prices and staff-set merchandising tags).
 */
import { MERCH_TAGS, MERCHANDISING } from "@/config/merchandising";
import { FULFILMENT_LABELS, type Product } from "@/types/catalog";

export type BadgeTone = "gold" | "neutral" | "positive" | "warning";

export interface ProductBadge {
  label: string;
  tone: BadgeTone;
}

export function isNewArrival(product: Product, now = Date.now()): boolean {
  if (!product.published_at) return false;
  const published = new Date(product.published_at).getTime();
  if (!Number.isFinite(published)) return false;
  const windowMs = MERCHANDISING.newArrivalWindowDays * 24 * 60 * 60 * 1000;
  return now - published <= windowMs && published <= now;
}

export function isTrending(product: Product): boolean {
  return product.tags.includes(MERCH_TAGS.trending);
}

export function isAffiliate(product: Product): boolean {
  return product.product_type === "affiliate" || product.fulfilment_type === "affiliate";
}

export function isDigital(product: Product): boolean {
  return product.product_type === "digital" || product.fulfilment_type === "digital";
}

export function isService(product: Product): boolean {
  return product.product_type === "service" || product.fulfilment_type === "service";
}

/** Affiliate and quote-only lines never enter the Cossa cart. */
export function canAddToCart(product: Product): boolean {
  if (isAffiliate(product)) return false;
  if (product.requires_quote) return false;
  if (isService(product)) return false;
  if (product.selling_price <= 0) return false;
  return product.stock_status !== "out_of_stock";
}

/** Customer-facing availability wording. Never exposes internal stock counts. */
export function availabilityLabel(product: Product): ProductBadge {
  if (isAffiliate(product)) return { label: FULFILMENT_LABELS.affiliate, tone: "neutral" };
  if (isDigital(product)) return { label: FULFILMENT_LABELS.digital, tone: "positive" };
  if (isService(product)) return { label: FULFILMENT_LABELS.service, tone: "neutral" };
  if (product.fulfilment_type === "cossa_stock") {
    return product.stock_available
      ? { label: "In stock", tone: "positive" }
      : { label: "Available on request", tone: "warning" };
  }
  return { label: FULFILMENT_LABELS[product.fulfilment_type], tone: "neutral" };
}

export function productBadges(product: Product): ProductBadge[] {
  const badges: ProductBadge[] = [availabilityLabel(product)];
  if (isNewArrival(product)) badges.push({ label: "New arrival", tone: "gold" });
  if (isTrending(product)) badges.push({ label: "Trending", tone: "gold" });
  if (product.requires_quote) badges.push({ label: "Quote only", tone: "neutral" });
  return badges;
}

/** Only show a struck-through price when it is a genuine higher former price. */
export function genuineComparePrice(product: Product): number | null {
  const compare = product.compare_at_price;
  if (typeof compare !== "number" || compare <= 0) return null;
  if (product.selling_price <= 0) return null;
  return compare > product.selling_price ? compare : null;
}

export interface MerchandisingSection {
  id: string;
  title: string;
  description: string;
  products: Product[];
}

const cap = (items: Product[]) => items.slice(0, MERCHANDISING.sectionLimit);

/**
 * Builds every homepage section. Empty sections are dropped by the caller so
 * no placeholder carousels are ever rendered.
 */
export function buildSections(products: Product[], now = Date.now()): MerchandisingSection[] {
  const byNewest = [...products].sort(
    (a, b) =>
      new Date(b.published_at ?? b.created_at).getTime() -
      new Date(a.published_at ?? a.created_at).getTime(),
  );

  const sections: MerchandisingSection[] = [
    {
      id: "new-arrivals",
      title: "New arrivals",
      description: `Published in the last ${MERCHANDISING.newArrivalWindowDays} days.`,
      products: cap(byNewest.filter((p) => isNewArrival(p, now))),
    },
    {
      id: "trending",
      title: "Trending now",
      description: "Lines the Cossa team is currently highlighting.",
      products: cap(products.filter(isTrending)),
    },
    {
      id: "featured",
      title: "Featured products",
      description: "Hand-picked from the Cossa Store catalogue.",
      products: cap(products.filter((p) => p.is_featured)),
    },
    {
      id: "made-to-order",
      title: "Made to order",
      description: "Printed and produced for you after ordering.",
      products: cap(products.filter((p) => p.fulfilment_type === "print_on_demand")),
    },
    {
      id: "physical-stock",
      title: "In stock now",
      description: "Held in Cossa stock with real available quantities.",
      products: cap(products.filter((p) => p.stock_available)),
    },
    {
      id: "affiliate",
      title: "Partner offers",
      description: "Products fulfilled by vetted Cossa partners.",
      products: cap(products.filter(isAffiliate)),
    },
    {
      id: "digital",
      title: "Digital products",
      description: "Delivered instantly after purchase is confirmed.",
      products: cap(products.filter(isDigital)),
    },
    {
      id: "business-buying",
      title: "Business buying",
      description: "Bulk, quote-only and procurement lines.",
      products: cap(
        products.filter((p) => p.requires_quote || p.tags.includes(MERCH_TAGS.businessDeal)),
      ),
    },
    {
      id: "recently-added",
      title: "Recently added",
      description: "The latest additions to the catalogue.",
      products: cap(byNewest),
    },
  ];

  return sections.filter((section) => section.products.length > 0);
}