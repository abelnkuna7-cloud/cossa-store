/**
 * DEMO / PLACEHOLDER CATALOGUE
 * ============================
 *
 * Every record in this file is a placeholder used to design and test the store
 * before real inventory is loaded. Nothing here is real stock, a real price or
 * a real supplier commitment — each record carries `demo: true`, which renders
 * a visible "DEMO PRODUCT — REPLACE BEFORE LAUNCH" mark everywhere it appears
 * and keeps it out of anything that implies genuine availability.
 *
 * REPLACEMENT WORKFLOW (no component or layout changes required)
 * -------------------------------------------------------------
 *  1. Open the record below (or the same product in the Catalogue Manager).
 *  2. Replace `image` (single field) and, optionally, `gallery`.
 *  3. Replace `name`, `shortDescription`, `description`.
 *  4. Replace `sku`, `supplier`, `supplierReference`.
 *  5. Enter the real `price` / `compareAtPrice`.
 *  6. Choose the correct `fulfilment` (and `productType`).
 *  7. Set `stockStatus`, `stockQuantity`, `deliveryWindow`, `provinces`.
 *  8. Add `variants`, `affiliateUrl`, `printifyProductId` or
 *     `dropshipReference` where relevant.
 *  9. Set `demo: false` and `status: "published"`.
 *
 * Project relationships, service add-ons, filters and product cards keep
 * working because they read these fields, not hard-coded markup.
 */
import apparelImage from "@/assets/demo/apparel-mockup.jpg";
import cleaningImage from "@/assets/demo/cleaning-supplies.jpg";
import constructionImage from "@/assets/demo/construction-tools.jpg";
import digitalImage from "@/assets/demo/digital-download.jpg";
import facilityImage from "@/assets/demo/facility-supplies.jpg";
import homeImage from "@/assets/demo/home-improvement.jpg";
import kidsImage from "@/assets/demo/kids-apparel.jpg";
import kitImage from "@/assets/demo/project-kit.jpg";
import securityImage from "@/assets/demo/smart-security.jpg";
import technologyImage from "@/assets/demo/technology-laptop.jpg";
import workwearImage from "@/assets/demo/workwear.jpg";

import type {
  FulfilmentType,
  Product,
  ProductVariantPublic,
  StockStatus,
} from "@/types/catalog";

export const DEMO_FLAG_LABEL = "DEMO PRODUCT — REPLACE BEFORE LAUNCH";

export interface DemoVariant {
  name: string;
  sku: string;
  size?: string | null;
  colour?: string | null;
  material?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  shippingEstimate?: string | null;
}

/** One reusable placeholder product record. */
export interface DemoProductRecord {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  /** Core storefront category slug (drives navigation and filters). */
  category: string;
  subcategory: string;
  /** Merchandising label, e.g. "Print-on-Demand Apparel". */
  displayCategory: string;
  brand: string;
  productType: Product["product_type"];
  fulfilment: FulfilmentType;
  supplier: string | null;
  supplierReference: string | null;
  /** ONE field controls the main placeholder image. */
  image: string;
  gallery?: string[];
  price: number;
  compareAtPrice?: number | null;
  vatStatus?: Product["vat_status"];
  stockStatus: StockStatus;
  stockQuantity?: number | null;
  deliveryWindow: string;
  provinces: string[];
  variants?: DemoVariant[];
  features?: string[];
  specifications?: { label: string; value: string }[];
  projects?: string[];
  services?: string[];
  related?: string[];
  frequentlyTogether?: string[];
  digitalDownload?: boolean;
  affiliateUrl?: string | null;
  affiliatePartner?: string | null;
  printifyProductId?: string | null;
  dropshipReference?: string | null;
  requiresQuote?: boolean;
  serviceIncluded?: boolean;
  serviceDescription?: string | null;
  leadTime?: string | null;
  customisation?: string[];
  kitItems?: { label: string; quantity: string }[];
  featured?: boolean;
  tags?: string[];
  status: "draft" | "published";
  /** Leave true until a real product replaces this record. */
  demo: boolean;
  warranty?: string | null;
  returnPolicy?: string;
  publishedAt?: string;
}

const PROVINCES_ALL = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
];

const PROVINCES_METRO = ["Gauteng", "Western Cape", "KwaZulu-Natal"];

export const DEMO_PRODUCTS: DemoProductRecord[] = [
  /* ---------------- Own stock ---------------- */
  {
    id: "demo-own-drill",
    name: "18V Brushless Cordless Drill Kit",
    slug: "demo-18v-cordless-drill-kit",
    sku: "DEMO-CON-0001",
    shortDescription:
      "Placeholder listing for a two-battery cordless drill kit held in Cossa stock.",
    description:
      "This is a demonstration record used to show how an own-stock power tool behaves on Cossa Store: live stock indicator, courier delivery window, add to cart and add to project. Replace the image, copy, SKU and pricing with the real product before launch.",
    category: "construction-diy",
    subcategory: "tools-accessories",
    displayCategory: "Construction · Tools",
    brand: "Demo Toolworks",
    productType: "physical",
    fulfilment: "cossa_stock",
    supplier: "Cossa Store warehouse",
    supplierReference: "WH-JHB-A12",
    image: constructionImage,
    price: 2499,
    compareAtPrice: 2899,
    stockStatus: "in_stock",
    stockQuantity: 24,
    deliveryWindow: "1–3 business days (metro), 2–5 days outlying",
    provinces: PROVINCES_ALL,
    features: [
      "Two batteries and fast charger in the case",
      "Keyless 13 mm chuck",
      "LED work light",
    ],
    specifications: [
      { label: "Voltage", value: "18 V" },
      { label: "Torque", value: "60 Nm" },
      { label: "Weight", value: "1.6 kg" },
    ],
    projects: ["equip-a-construction-team", "paint-a-room"],
    services: ["Cossa Nexus Construction site support"],
    related: ["demo-site-safety-kit", "demo-quote-bulk-materials"],
    frequentlyTogether: ["demo-workwear-safety-set"],
    featured: true,
    tags: ["trending"],
    status: "published",
    demo: true,
    warranty: "Demo warranty text — replace with the supplier warranty.",
    publishedAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
  },
  {
    id: "demo-own-mop",
    name: "Commercial Twin-Bucket Mop System",
    slug: "demo-commercial-mop-system",
    sku: "DEMO-CLN-0002",
    shortDescription: "Placeholder listing for a twin-bucket wringer mop system in Cossa stock.",
    description:
      "Demonstration record for own-stock cleaning equipment. Shows real stock behaviour, delivery estimate and cart flow. Replace with the real product record when inventory lands.",
    category: "cleaning-facility-supplies",
    subcategory: "cleaning-equipment",
    displayCategory: "Cleaning · Equipment",
    brand: "Demo Hygiene Co",
    productType: "physical",
    fulfilment: "cossa_stock",
    supplier: "Cossa Store warehouse",
    supplierReference: "WH-JHB-C04",
    image: cleaningImage,
    price: 1299,
    stockStatus: "in_stock",
    stockQuantity: 11,
    deliveryWindow: "1–3 business days (metro)",
    provinces: PROVINCES_ALL,
    features: ["Separate clean and dirty chambers", "Heavy-duty castors", "Replaceable mop heads"],
    projects: ["clean-an-office"],
    services: ["Cossa Facility Services deep clean"],
    related: ["demo-facility-consumables"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
  {
    id: "demo-own-camera",
    name: "Indoor Smart Security Camera 2K",
    slug: "demo-smart-security-camera",
    sku: "DEMO-TEC-0003",
    shortDescription: "Placeholder listing for a 2K indoor smart camera held in Cossa stock.",
    description:
      "Demonstration record for an own-stock technology product with app-based monitoring. Replace all copy, specification and pricing values with the real product.",
    category: "technology-smart-solutions",
    subcategory: "security-monitoring",
    displayCategory: "Technology · Electronics",
    brand: "Demo SmartTech",
    productType: "physical",
    fulfilment: "cossa_stock",
    supplier: "Cossa Store warehouse",
    supplierReference: "WH-JHB-T09",
    image: securityImage,
    price: 899,
    compareAtPrice: 1099,
    stockStatus: "low_stock",
    stockQuantity: 4,
    deliveryWindow: "1–3 business days (metro)",
    provinces: PROVINCES_METRO,
    features: ["2K resolution", "Motion alerts", "Local and cloud recording options"],
    projects: ["upgrade-a-smart-home"],
    services: ["Cossa Tech installation"],
    related: ["demo-service-cctv-install"],
    featured: true,
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 9 * 86_400_000).toISOString(),
  },

  /* ---------------- Local supplier ---------------- */
  {
    id: "demo-supplier-hardware",
    name: "Galvanised Fixings & Fasteners Trade Pack",
    slug: "demo-fixings-trade-pack",
    sku: "DEMO-CON-0004",
    shortDescription: "Placeholder listing fulfilled from a local supplier's warehouse.",
    description:
      "Demonstration record for local-supplier fulfilment. Availability is confirmed with the supplier before dispatch, which is why the card offers a confirmation step rather than instant stock.",
    category: "construction-diy",
    subcategory: "hardware",
    displayCategory: "Construction · Hardware",
    brand: "Demo Hardware Supply",
    productType: "physical",
    fulfilment: "local_supplier",
    supplier: "Demo Local Supplier (Pty) Ltd",
    supplierReference: "SUP-DEMO-1187",
    image: constructionImage,
    price: 749,
    stockStatus: "backorder",
    deliveryWindow: "2–5 business days after supplier confirmation",
    provinces: PROVINCES_ALL,
    projects: ["equip-a-construction-team"],
    related: ["demo-own-drill"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 14 * 86_400_000).toISOString(),
  },
  {
    id: "demo-facility-consumables",
    name: "Washroom Consumables Bulk Pack",
    slug: "demo-washroom-consumables-bulk-pack",
    sku: "DEMO-FAC-0005",
    shortDescription: "Placeholder listing for facility consumables supplied locally in bulk.",
    description:
      "Demonstration record for a facility-supplies line held by a local distributor. Shows the supplier fulfilment message and availability confirmation flow.",
    category: "cleaning-facility-supplies",
    subcategory: "janitorial-supplies",
    displayCategory: "Facility Supplies",
    brand: "Demo Facility Brands",
    productType: "physical",
    fulfilment: "local_supplier",
    supplier: "Demo Janitorial Distributors",
    supplierReference: "SUP-DEMO-2204",
    image: facilityImage,
    price: 1650,
    stockStatus: "backorder",
    deliveryWindow: "3–6 business days after supplier confirmation",
    provinces: PROVINCES_ALL,
    projects: ["improve-workplace-hygiene", "clean-an-office"],
    services: ["Cossa Facility Services scheduled cleaning"],
    tags: ["business-deal"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
  },

  /* ---------------- Dropshipping ---------------- */
  {
    id: "demo-dropship-router",
    name: "Mesh Wi-Fi 6 Router (2-Pack)",
    slug: "demo-mesh-wifi-router",
    sku: "DEMO-TEC-0006",
    shortDescription: "Placeholder listing shipped directly by a local dropshipping partner.",
    description:
      "Demonstration record for local dropshipping. The partner ships directly to the customer, so the delivery estimate and returns route are the partner's, clearly disclosed on the page.",
    category: "technology-smart-solutions",
    subcategory: "smart-home",
    displayCategory: "Technology · Networking",
    brand: "Demo Networks",
    productType: "physical",
    fulfilment: "local_dropshipping",
    supplier: "Demo Dropship Partner SA",
    supplierReference: "DS-SA-55120",
    dropshipReference: "https://partner.example.com/skus/DS-SA-55120",
    image: securityImage,
    price: 2199,
    stockStatus: "made_to_order",
    deliveryWindow: "3–7 business days from the partner warehouse",
    provinces: PROVINCES_ALL,
    projects: ["upgrade-a-smart-home", "set-up-a-productive-workspace"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 11 * 86_400_000).toISOString(),
  },
  {
    id: "demo-dropship-accessories",
    name: "Laptop Docking & Accessory Bundle",
    slug: "demo-laptop-docking-bundle",
    sku: "DEMO-TEC-0007",
    shortDescription: "Placeholder listing shipped from an international dropshipping partner.",
    description:
      "Demonstration record for international dropshipping, including a longer delivery window and an import-handling note. Replace with real partner data before launch.",
    category: "technology-smart-solutions",
    subcategory: "computer-mobile-accessories",
    displayCategory: "Technology · Accessories",
    brand: "Demo Peripherals",
    productType: "physical",
    fulfilment: "international_dropshipping",
    supplier: "Demo Global Fulfilment",
    supplierReference: "INT-DS-90032",
    dropshipReference: "https://global-partner.example.com/item/INT-DS-90032",
    image: technologyImage,
    price: 1450,
    stockStatus: "made_to_order",
    deliveryWindow: "10–21 business days (international fulfilment)",
    provinces: PROVINCES_ALL,
    projects: ["set-up-a-productive-workspace"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 26 * 86_400_000).toISOString(),
  },

  /* ---------------- Affiliate ---------------- */
  {
    id: "demo-affiliate-laptop",
    name: "14\" Business Laptop (Partner Offer)",
    slug: "demo-business-laptop-partner-offer",
    sku: "DEMO-AFF-0008",
    shortDescription: "Placeholder affiliate listing sold and fulfilled by a partner retailer.",
    description:
      "Demonstration record for an affiliate product. Cossa is not the merchant of record: checkout happens on the partner's site and the disclosure is shown on the card and product page.",
    category: "technology-smart-solutions",
    subcategory: "productivity-equipment",
    displayCategory: "Technology · Business Products",
    brand: "Demo Computing",
    productType: "affiliate",
    fulfilment: "affiliate",
    supplier: "Demo Partner Retailer",
    supplierReference: "AFF-DEMO-771",
    affiliatePartner: "Demo Partner Retailer",
    affiliateUrl: "https://partner.example.com/demo-business-laptop",
    image: technologyImage,
    price: 13999,
    stockStatus: "made_to_order",
    deliveryWindow: "Set by the partner retailer at checkout",
    provinces: PROVINCES_ALL,
    projects: ["set-up-a-productive-workspace"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  },
  {
    id: "demo-affiliate-paint",
    name: "Premium Interior Paint 20L (Partner Offer)",
    slug: "demo-interior-paint-partner-offer",
    sku: "DEMO-AFF-0009",
    shortDescription: "Placeholder affiliate listing for interior paint from a partner retailer.",
    description:
      "Demonstration affiliate record in the home-improvement range. Purchases complete on the partner's website; Cossa may earn a commission.",
    category: "construction-diy",
    subcategory: "painting-supplies",
    displayCategory: "Home Improvement · Paint",
    brand: "Demo Coatings",
    productType: "affiliate",
    fulfilment: "affiliate",
    supplier: "Demo Paint Partner",
    supplierReference: "AFF-DEMO-812",
    affiliatePartner: "Demo Paint Partner",
    affiliateUrl: "https://paint-partner.example.com/demo-interior-20l",
    image: homeImage,
    price: 1899,
    stockStatus: "made_to_order",
    deliveryWindow: "Set by the partner retailer at checkout",
    provinces: PROVINCES_ALL,
    projects: ["paint-a-room"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 17 * 86_400_000).toISOString(),
  },

  /* ---------------- Print on demand ---------------- */
  {
    id: "demo-pod-tee",
    name: "Cossa Trade Tee — Printed to Order",
    slug: "demo-cossa-trade-tee",
    sku: "DEMO-POD-0010",
    shortDescription: "Placeholder print-on-demand tee for men and women, produced after ordering.",
    description:
      "Demonstration Printify record. Variants, production time and delivery are shown separately so customers understand the item is made after the order is placed.",
    category: "construction-diy",
    subcategory: "safety-ppe",
    displayCategory: "Print-on-Demand Apparel · Men & Women",
    brand: "Cossa Apparel (Demo)",
    productType: "physical",
    fulfilment: "print_on_demand",
    supplier: "Printify (demo account)",
    supplierReference: "PRINTIFY-DEMO-0001",
    printifyProductId: "printify_demo_0001",
    image: apparelImage,
    price: 399,
    stockStatus: "made_to_order",
    deliveryWindow: "Produced in 2–5 days, delivered in 3–7 business days",
    leadTime: "2–5 production days",
    provinces: PROVINCES_ALL,
    variants: [
      { name: "Black / S", sku: "DEMO-POD-0010-BLK-S", colour: "Black", size: "S", price: 399 },
      { name: "Black / M", sku: "DEMO-POD-0010-BLK-M", colour: "Black", size: "M", price: 399 },
      { name: "Black / L", sku: "DEMO-POD-0010-BLK-L", colour: "Black", size: "L", price: 399 },
      {
        name: "Charcoal / XL",
        sku: "DEMO-POD-0010-CHR-XL",
        colour: "Charcoal",
        size: "XL",
        price: 429,
      },
    ],
    tags: ["trending"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
  {
    id: "demo-pod-kids",
    name: "Kids & Toddler Tee — Printed to Order",
    slug: "demo-kids-toddler-tee",
    sku: "DEMO-POD-0011",
    shortDescription: "Placeholder print-on-demand tee for kids and toddlers.",
    description:
      "Demonstration Printify record for the kids and toddler range, showing size variants and made-after-order messaging.",
    category: "construction-diy",
    subcategory: "home-improvement",
    displayCategory: "Print-on-Demand Apparel · Kids & Toddlers",
    brand: "Cossa Apparel (Demo)",
    productType: "physical",
    fulfilment: "print_on_demand",
    supplier: "Printify (demo account)",
    supplierReference: "PRINTIFY-DEMO-0002",
    printifyProductId: "printify_demo_0002",
    image: kidsImage,
    price: 299,
    stockStatus: "made_to_order",
    deliveryWindow: "Produced in 2–5 days, delivered in 3–7 business days",
    leadTime: "2–5 production days",
    provinces: PROVINCES_ALL,
    variants: [
      { name: "Cream / 2–3y", sku: "DEMO-POD-0011-CRM-23", colour: "Cream", size: "2–3y", price: 299 },
      { name: "Grey / 4–5y", sku: "DEMO-POD-0011-GRY-45", colour: "Grey", size: "4–5y", price: 299 },
      { name: "White / 6–7y", sku: "DEMO-POD-0011-WHT-67", colour: "White", size: "6–7y", price: 319 },
    ],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
  },

  /* ---------------- Digital ---------------- */
  {
    id: "demo-digital-safety-pack",
    name: "Site Safety Checklist Pack (Digital Download)",
    slug: "demo-site-safety-checklist-pack",
    sku: "DEMO-DIG-0012",
    shortDescription: "Placeholder digital download — editable site safety checklists.",
    description:
      "Demonstration digital product. No physical delivery: access is issued after payment confirmation, with the digital cancellation notice shown on the page.",
    category: "construction-diy",
    subcategory: "safety-ppe",
    displayCategory: "Digital Products",
    brand: "Cossa Store (Demo)",
    productType: "digital",
    fulfilment: "digital",
    supplier: null,
    supplierReference: null,
    image: digitalImage,
    price: 249,
    stockStatus: "made_to_order",
    deliveryWindow: "Instant access after payment confirmation",
    provinces: PROVINCES_ALL,
    digitalDownload: true,
    projects: ["site-safety-kit"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
  },
  {
    id: "demo-digital-cleaning-sop",
    name: "Facility Cleaning SOP Template Pack (Digital)",
    slug: "demo-facility-cleaning-sop-pack",
    sku: "DEMO-DIG-0013",
    shortDescription: "Placeholder digital download — cleaning standard-operating-procedure pack.",
    description:
      "Demonstration digital product for the facility-management range. Delivered as a download link, no shipping involved.",
    category: "cleaning-facility-supplies",
    subcategory: "office-commercial",
    displayCategory: "Digital Products · Business",
    brand: "Cossa Store (Demo)",
    productType: "digital",
    fulfilment: "digital",
    supplier: null,
    supplierReference: null,
    image: digitalImage,
    price: 349,
    stockStatus: "made_to_order",
    deliveryWindow: "Instant access after payment confirmation",
    provinces: PROVINCES_ALL,
    digitalDownload: true,
    projects: ["clean-an-office"],
    tags: ["business-deal"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
  },

  /* ---------------- Service included ---------------- */
  {
    id: "demo-service-cctv-install",
    name: "4-Camera CCTV Kit + Installation",
    slug: "demo-cctv-kit-with-installation",
    sku: "DEMO-SRV-0014",
    shortDescription: "Placeholder product-plus-service listing installed by Cossa Tech.",
    description:
      "Demonstration record for a product sold together with an installation service. A site address and service area check are required before the job can be scheduled.",
    category: "technology-smart-solutions",
    subcategory: "security-monitoring",
    displayCategory: "Technology · Product + Service",
    brand: "Demo SmartTech",
    productType: "service",
    fulfilment: "service",
    supplier: "Cossa Tech",
    supplierReference: "SRV-DEMO-014",
    image: securityImage,
    price: 0,
    stockStatus: "made_to_order",
    deliveryWindow: "Scheduled after the site check",
    provinces: PROVINCES_METRO,
    serviceIncluded: true,
    serviceDescription:
      "Supply, mounting, cabling, configuration and a handover walkthrough by a Cossa Tech technician.",
    requiresQuote: true,
    projects: ["upgrade-a-smart-home"],
    services: ["Cossa Tech installation"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  },

  /* ---------------- Made to order ---------------- */
  {
    id: "demo-workwear-safety-set",
    name: "Branded Workwear & Safety Set — Made to Order",
    slug: "demo-branded-workwear-set",
    sku: "DEMO-MTO-0015",
    shortDescription: "Placeholder made-to-order workwear set with company branding.",
    description:
      "Demonstration made-to-order record: customisation options, a production lead time and a confirmation step before the order is produced.",
    category: "construction-diy",
    subcategory: "safety-ppe",
    displayCategory: "Workplace · Workwear",
    brand: "Demo Workwear",
    productType: "physical",
    fulfilment: "print_on_demand",
    supplier: "Demo Branding Workshop",
    supplierReference: "MTO-DEMO-4410",
    image: workwearImage,
    price: 1250,
    stockStatus: "made_to_order",
    deliveryWindow: "7–12 business days after artwork approval",
    leadTime: "7–12 business days",
    customisation: ["Company logo embroidery", "Name badges", "Reflective tape colour"],
    provinces: PROVINCES_ALL,
    variants: [
      { name: "Standard set / M", sku: "DEMO-MTO-0015-M", size: "M", price: 1250 },
      { name: "Standard set / L", sku: "DEMO-MTO-0015-L", size: "L", price: 1250 },
      { name: "Standard set / XL", sku: "DEMO-MTO-0015-XL", size: "XL", price: 1310 },
    ],
    projects: ["site-safety-kit", "equip-a-construction-team"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 15 * 86_400_000).toISOString(),
  },

  /* ---------------- Quote required ---------------- */
  {
    id: "demo-quote-bulk-materials",
    name: "Bulk Site Materials Order (Quote Required)",
    slug: "demo-bulk-site-materials",
    sku: "DEMO-QTE-0016",
    shortDescription: "Placeholder quote-only listing for bulk construction materials.",
    description:
      "Demonstration quote-required record. No price is displayed because pricing depends on volume, delivery distance and current material rates.",
    category: "construction-diy",
    subcategory: "hardware",
    displayCategory: "Construction · Business Products",
    brand: "Demo Materials",
    productType: "physical",
    fulfilment: "local_supplier",
    supplier: "Demo Building Materials",
    supplierReference: "QTE-DEMO-6001",
    image: kitImage,
    price: 0,
    stockStatus: "made_to_order",
    deliveryWindow: "Confirmed with your quotation",
    provinces: PROVINCES_ALL,
    requiresQuote: true,
    tags: ["business-deal"],
    projects: ["equip-a-construction-team"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 22 * 86_400_000).toISOString(),
  },

  /* ---------------- Project kits / bundles ---------------- */
  {
    id: "demo-kit-paint-room",
    name: "Paint a Room — Complete Project Kit",
    slug: "demo-paint-a-room-kit",
    sku: "DEMO-KIT-0017",
    shortDescription: "Placeholder project kit bundling everything needed to paint one room.",
    description:
      "Demonstration project-kit record. Shows the included-items summary, estimated quantities, full-kit cart action and the option to request a complete project quote with painting support.",
    category: "construction-diy",
    subcategory: "painting-supplies",
    displayCategory: "Project Kits",
    brand: "Cossa Store (Demo)",
    productType: "bundle",
    fulfilment: "cossa_stock",
    supplier: "Cossa Store warehouse",
    supplierReference: "KIT-DEMO-7001",
    image: homeImage,
    price: 3450,
    compareAtPrice: 3990,
    stockStatus: "in_stock",
    stockQuantity: 6,
    deliveryWindow: "2–4 business days",
    provinces: PROVINCES_ALL,
    kitItems: [
      { label: "Interior wall paint", quantity: "2 × 20 L" },
      { label: "Undercoat / primer", quantity: "1 × 5 L" },
      { label: "Roller and tray set", quantity: "2 sets" },
      { label: "Brush set", quantity: "1 set" },
      { label: "Masking tape and drop sheets", quantity: "1 pack" },
    ],
    projects: ["paint-a-room"],
    services: ["Cossa Nexus Construction painting crew"],
    featured: true,
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
  },
  {
    id: "demo-kit-office-clean",
    name: "Office Cleaning Starter Kit — Project Bundle",
    slug: "demo-office-cleaning-starter-kit",
    sku: "DEMO-KIT-0018",
    shortDescription: "Placeholder project kit for setting up cleaning in a small office.",
    description:
      "Demonstration bundle for the cleaning range, including estimated quantities for a 200 m² office and an optional scheduled cleaning service.",
    category: "cleaning-facility-supplies",
    subcategory: "office-commercial",
    displayCategory: "Project Kits · Cleaning",
    brand: "Cossa Store (Demo)",
    productType: "bundle",
    fulfilment: "cossa_stock",
    supplier: "Cossa Store warehouse",
    supplierReference: "KIT-DEMO-7002",
    image: cleaningImage,
    price: 2790,
    stockStatus: "in_stock",
    stockQuantity: 9,
    deliveryWindow: "2–4 business days",
    provinces: PROVINCES_ALL,
    kitItems: [
      { label: "Twin-bucket mop system", quantity: "1" },
      { label: "Multi-surface cleaner", quantity: "4 × 5 L" },
      { label: "Microfibre cloth pack", quantity: "3 packs" },
      { label: "Washroom consumables", quantity: "1 bulk pack" },
      { label: "Waste bags and bins", quantity: "1 set" },
    ],
    projects: ["clean-an-office", "improve-workplace-hygiene"],
    services: ["Cossa Facility Services scheduled cleaning"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 13 * 86_400_000).toISOString(),
  },
  {
    id: "demo-site-safety-kit",
    name: "Site Safety Starter Kit — Project Bundle",
    slug: "demo-site-safety-starter-kit",
    sku: "DEMO-KIT-0019",
    shortDescription: "Placeholder project kit covering basic site safety for a small crew.",
    description:
      "Demonstration bundle showing kit contents, quantities per crew member and the path to a full project quote.",
    category: "construction-diy",
    subcategory: "safety-ppe",
    displayCategory: "Project Kits · Safety",
    brand: "Cossa Store (Demo)",
    productType: "bundle",
    fulfilment: "cossa_stock",
    supplier: "Cossa Store warehouse",
    supplierReference: "KIT-DEMO-7003",
    image: workwearImage,
    price: 4150,
    stockStatus: "in_stock",
    stockQuantity: 5,
    deliveryWindow: "2–4 business days",
    provinces: PROVINCES_ALL,
    kitItems: [
      { label: "Hard hats", quantity: "5" },
      { label: "High-visibility vests", quantity: "5" },
      { label: "Safety gloves", quantity: "5 pairs" },
      { label: "Safety signage set", quantity: "1" },
      { label: "First-aid kit", quantity: "1" },
    ],
    projects: ["site-safety-kit", "equip-a-construction-team"],
    services: ["Cossa Nexus Construction site support"],
    status: "published",
    demo: true,
    publishedAt: new Date(Date.now() - 18 * 86_400_000).toISOString(),
  },

  /* ---------------- Draft example (not on the storefront) ---------------- */
  {
    id: "demo-draft-workspace",
    name: "Ergonomic Workspace Bundle (Draft)",
    slug: "demo-ergonomic-workspace-bundle",
    sku: "DEMO-DRF-0020",
    shortDescription: "Draft placeholder used to test unpublished catalogue records.",
    description:
      "Demonstration draft record. It is intentionally not published, so it appears only in catalogue tooling — never on the storefront.",
    category: "technology-smart-solutions",
    subcategory: "productivity-equipment",
    displayCategory: "Workplace · Business Products",
    brand: "Demo Office",
    productType: "bundle",
    fulfilment: "cossa_stock",
    supplier: "Cossa Store warehouse",
    supplierReference: "WH-JHB-W02",
    image: technologyImage,
    price: 5600,
    stockStatus: "made_to_order",
    deliveryWindow: "To be confirmed",
    provinces: PROVINCES_METRO,
    projects: ["set-up-a-productive-workspace"],
    status: "draft",
    demo: true,
  },
];

function toVariant(v: DemoVariant, index: number): ProductVariantPublic {
  return {
    id: `${v.sku}-${index}`,
    name: v.name,
    sku: v.sku,
    colour: v.colour ?? null,
    size: v.size ?? null,
    finish: null,
    phone_model: null,
    material: v.material ?? null,
    retail_price: v.price ?? null,
    compare_at_price: v.compareAtPrice ?? null,
    shipping_estimate: v.shippingEstimate ?? null,
    is_active: true,
  };
}

/** Converts one placeholder record into the shared storefront Product shape. */
export function demoRecordToProduct(record: DemoProductRecord): Product {
  const now = new Date().toISOString();
  const gallery = [record.image, ...(record.gallery ?? [])];

  return {
    id: record.id,
    sku: record.sku,
    name: record.name,
    slug: record.slug,
    short_description: record.shortDescription,
    full_description: record.description,
    category: record.category,
    subcategory: record.subcategory,
    brand: record.brand,
    supplier_id: null,
    supplier_sku: record.supplierReference,
    cost_price: null,
    selling_price: record.requiresQuote ? 0 : record.price,
    compare_at_price: record.compareAtPrice ?? null,
    vat_status: record.vatStatus ?? "vat_inclusive",
    stock_status: record.stockStatus,
    stock_quantity: record.stockQuantity ?? null,
    fulfilment_type: record.fulfilment,
    estimated_delivery: record.deliveryWindow,
    images: gallery.map((url) => ({
      url,
      alt: `${record.name} — placeholder image for the ${record.displayCategory} range`,
    })),
    specifications: record.specifications ?? [],
    features: record.features ?? [],
    warranty: record.warranty ?? null,
    return_eligibility:
      record.returnPolicy ??
      (record.digitalDownload
        ? "Digital products cannot be returned once access has been issued."
        : "Standard Cossa Store returns policy applies."),
    status: record.status === "published" ? "active" : "draft",
    seo_title: `${record.name} | Cossa Store`,
    seo_description: record.shortDescription,
    created_at: record.publishedAt ?? now,
    updated_at: record.publishedAt ?? now,
    collection: null,
    item_type: record.displayCategory,
    product_story: null,
    care_instructions: null,
    requires_quote: Boolean(record.requiresQuote),
    made_to_order:
      record.fulfilment === "print_on_demand" || record.stockStatus === "made_to_order",
    variants: (record.variants ?? []).map(toVariant),
    product_type: record.productType,
    is_featured: Boolean(record.featured),
    tags: record.tags ?? [],
    published_at: record.status === "published" ? (record.publishedAt ?? now) : null,
    stock_available:
      record.fulfilment === "cossa_stock" && (record.stockQuantity ?? 0) > 0,
    affiliate:
      record.affiliateUrl && record.affiliatePartner
        ? {
            partner_name: record.affiliatePartner,
            tracking_url: record.affiliateUrl,
            disclosure_text: `Sold and fulfilled by ${record.affiliatePartner}. Cossa may earn a commission. This is a demo listing.`,
          }
        : null,
    is_demo: record.demo,
    publication_status: record.status,
    supplier_name: record.supplier,
    supplier_reference: record.supplierReference,
    province_availability: record.provinces,
    project_slugs: record.projects ?? [],
    service_options: record.services ?? [],
    related_slugs: record.related ?? [],
    frequently_together: record.frequentlyTogether ?? [],
    digital_download: Boolean(record.digitalDownload),
    affiliate_url: record.affiliateUrl ?? null,
    printify_product_id: record.printifyProductId ?? null,
    dropship_reference: record.dropshipReference ?? null,
    service_included: Boolean(record.serviceIncluded),
    lead_time: record.leadTime ?? null,
    customisation_options: record.customisation ?? [],
    kit_items: record.kitItems ?? [],
    display_category: record.displayCategory,
  };
}

/** Every demo record, including drafts (used by catalogue tooling). */
export const DEMO_CATALOGUE: Product[] = DEMO_PRODUCTS.map(demoRecordToProduct);

/** Only the records that should appear on the storefront. */
export const DEMO_STOREFRONT: Product[] = DEMO_CATALOGUE.filter(
  (p) => p.publication_status === "published",
);

export function findDemoProductBySlug(slug: string): Product | null {
  return DEMO_STOREFRONT.find((p) => p.slug === slug) ?? null;
}

export function serviceDescriptionFor(product: Product): string | null {
  const record = DEMO_PRODUCTS.find((r) => r.id === product.id);
  return record?.serviceDescription ?? null;
}