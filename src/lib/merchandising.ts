/**
 * Pure, presentation-only merchandising helpers.
 *
 * Nothing in here invents data: every badge and every section is derived from
 * real published catalogue values (fulfilment model, real counted stock,
 * genuine promotional prices and staff-set merchandising tags).
 */
import { MERCH_TAGS, MERCHANDISING } from "../config/merchandising.ts";
import { type FulfilmentType, type Product } from "../types/catalog.ts";

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

/**
 * A legacy merchandising tag may still exist on records, but the public Store
 * does not label a product as trending unless a verified demand-data pipeline
 * is introduced. This prevents a staff tag from becoming an unsupported market
 * demand claim.
 */
export function isTrending(product: Product): boolean {
  return product.tags.includes(MERCH_TAGS.trending);
}

/** A popular label is shown only after staff set the evidence-backed tag. */
export function isPopular(product: Product): boolean {
  return product.tags.includes(MERCH_TAGS.popular);
}

export function isAffiliate(product: Product): boolean {
  return product.product_type === "affiliate" || product.fulfilment_type === "affiliate";
}

/** Only products physically owned by Cossa can use the Cossa Stock label. */
export function isCossaStock(product: Product): boolean {
  return product.fulfilment_type === "cossa_stock" && product.product_type === "physical";
}

/** Supplier location is internal; this label is driven only by the fulfilment model. */
export function isLocalDropshipping(product: Product): boolean {
  return product.fulfilment_type === "local_dropshipping";
}

/** International dropshipping is Cossa-sold, never an affiliate redirect. */
export function isGlobalDropshipping(product: Product): boolean {
  return product.fulfilment_type === "international_dropshipping" && !isAffiliate(product);
}

export function isDigital(product: Product): boolean {
  return product.product_type === "digital" || product.fulfilment_type === "digital";
}

export function isService(product: Product): boolean {
  return product.product_type === "service" || product.fulfilment_type === "service";
}

export function isDemo(product: Product): boolean {
  return product.is_demo === true;
}

export function isProjectKit(product: Product): boolean {
  return product.product_type === "bundle" || (product.kit_items?.length ?? 0) > 0;
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
  if (isAffiliate(product)) return { label: "Partner offer", tone: "neutral" };
  if (isCossaStock(product)) return { label: "Cossa stock", tone: "positive" };
  if (isLocalDropshipping(product)) return { label: "Local", tone: "positive" };
  if (isGlobalDropshipping(product)) return { label: "Global fulfilment", tone: "neutral" };
  if (isDigital(product)) return { label: "Digital", tone: "positive" };
  if (isService(product)) return { label: "Service", tone: "neutral" };
  return { label: "Available to order", tone: "neutral" };
}

export function productBadges(product: Product): ProductBadge[] {
  const badges: ProductBadge[] = [];
  if (isDemo(product)) badges.push({ label: "Demo product", tone: "warning" });
  badges.push(availabilityLabel(product));
  if (isProjectKit(product)) badges.push({ label: "Project kit", tone: "gold" });
  if (isNewArrival(product)) badges.push({ label: "New arrival", tone: "gold" });
  if (genuineComparePrice(product)) badges.push({ label: "Sale", tone: "gold" });
  if (isCossaStock(product) && product.stock_status === "low_stock") {
    badges.push({ label: "Limited stock", tone: "warning" });
  }
  if (isPopular(product)) badges.push({ label: "Popular", tone: "positive" });
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
  filter?: {
    fulfilment?: FulfilmentType;
    flag?: "new" | "affiliate" | "made_to_order" | "popular";
  };
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
      description: "Recently published products from the live Cossa Store catalogue.",
      products: cap(byNewest.filter((p) => isNewArrival(p, now))),
      filter: { flag: "new" },
    },
    {
      id: "cossa-stock",
      title: "Cossa Stock",
      description: "Physical products genuinely held by Cossa Store.",
      products: cap(products.filter(isCossaStock)),
      filter: { fulfilment: "cossa_stock" },
    },
    {
      id: "local-dropshipping",
      title: "Local Dropshipping",
      description: "Cossa-sold products fulfilled locally after an order is confirmed.",
      products: cap(products.filter(isLocalDropshipping)),
      filter: { fulfilment: "local_dropshipping" },
    },
    {
      id: "partner-deals",
      title: "Partner Deals",
      description: "Selected offers from independent retailers. Payment, delivery and returns are completed with the retailer.",
      products: cap(products.filter(isAffiliate)),
      filter: { flag: "affiliate" },
    },
    {
      id: "global-dropshipping",
      title: "Global Dropshipping",
      description: "Cossa-sold products fulfilled through international supply routes.",
      products: cap(products.filter(isGlobalDropshipping)),
      filter: { fulfilment: "international_dropshipping" },
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
      filter: { flag: "made_to_order" },
    },
    {
      id: "popular",
      title: "Popular",
      description: "Products marked from verified Cossa Store demand signals.",
      products: cap(products.filter(isPopular)),
      filter: { flag: "popular" },
    },
    {
      id: "digital",
      title: "Digital products",
      description: "Digital products supplied according to the access terms shown on each listing.",
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
