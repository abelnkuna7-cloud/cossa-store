import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSections,
  productBadges,
} from "../src/lib/merchandising.ts";
import {
  customerAffiliateOffer,
  PARTNER_OFFER_DISCLOSURE,
  PARTNER_RETAILER_LABEL,
} from "../src/lib/customer-facing-store.ts";
import { matchesStoreSearch } from "../src/lib/store-search.ts";

const NOW = Date.parse("2026-09-01T12:00:00.000Z");

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: "product-1",
    sku: "COSSA-1",
    name: "Travel phone case",
    product_type: "physical",
    fulfilment_type: "cossa_stock",
    stock_status: "in_stock",
    stock_available: true,
    selling_price: 159,
    compare_at_price: null,
    tags: [],
    is_demo: false,
    requires_quote: false,
    published_at: "2026-08-30T12:00:00.000Z",
    created_at: "2026-08-30T12:00:00.000Z",
    updated_at: "2026-08-30T12:00:00.000Z",
    kit_items: [],
    short_description: "Protective mobile accessory for travel.",
    full_description: "A practical case for a phone or smartphone.",
    brand: "Cossa Gear",
    category: "travel-luggage",
    subcategory: "travel-accessories",
    display_category: "Travel & Luggage",
    ...overrides,
  } as any;
}

test("the homepage hierarchy is source-derived without creating product copies", () => {
  const products = [
    product({ id: "own" }),
    product({ id: "local", fulfilment_type: "local_dropshipping" }),
    product({ id: "partner", product_type: "affiliate", fulfilment_type: "affiliate" }),
    product({ id: "global", fulfilment_type: "international_dropshipping" }),
  ];

  const sections = buildSections(products, NOW);

  assert.deepEqual(
    sections.slice(0, 5).map((section) => section.id),
    ["new-arrivals", "cossa-stock", "local-dropshipping", "partner-deals", "global-dropshipping"],
  );
  assert.equal(sections.find((section) => section.id === "partner-deals")?.products[0]?.id, "partner");
  assert.equal(products.length, 4);
});

test("badges use actual fulfilment, price and stock data only", () => {
  const badges = productBadges(
    product({ stock_status: "low_stock", compare_at_price: 199, tags: ["popular"] }),
  ).map((badge) => badge.label);

  assert.deepEqual(badges, ["Cossa stock", "New arrival", "Sale", "Limited stock", "Popular"]);
  assert.equal(productBadges(product()).some((badge) => badge.label === "Best Seller"), false);
});

test("partner offers expose neutral wording while retaining the tracked destination", () => {
  const offer = customerAffiliateOffer("https://example.com/tracked-offer?ref=cossa");

  assert.deepEqual(offer, {
    partner_name: PARTNER_RETAILER_LABEL,
    tracking_url: "https://example.com/tracked-offer?ref=cossa",
    disclosure_text: PARTNER_OFFER_DISCLOSURE,
  });
  assert.equal(JSON.stringify(offer).includes("Temu"), false);
});

test("search supports common shopper wording only when product data supports it", () => {
  const caseProduct = product();
  const unrelatedProduct = product({
    name: "Kitchen storage jar",
    short_description: "Glass jar for pantry storage.",
    full_description: "An airtight storage jar for the kitchen.",
    category: "home-living",
    subcategory: "kitchen",
    display_category: "Home & Living",
  });

  assert.equal(matchesStoreSearch(caseProduct, "mobile case"), true);
  assert.equal(matchesStoreSearch(caseProduct, "smartphone travel"), true);
  assert.equal(matchesStoreSearch(unrelatedProduct, "smartphone"), false);
  assert.equal(matchesStoreSearch(unrelatedProduct, "organisation"), true);
});
