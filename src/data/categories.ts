import type {
  Category,
  CategorySlug,
  ProjectBundle,
  ProjectFieldValues,
  ProjectServiceOption,
} from "@/types/catalog";

/* -------------------------------------------------------------------------- */
/* HYBRID STORE DEPARTMENTS                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Cossa Store is a hybrid commerce platform.
 *
 * These are STORE DEPARTMENTS.
 * They are NOT Cossa Nexus Holdings subsidiaries.
 *
 * The taxonomy is intentionally broad enough to support:
 *
 * - Cossa-owned inventory
 * - local supplier products
 * - dropshipping
 * - international fulfilment
 * - affiliate products
 * - print-on-demand
 * - digital products
 * - project kits
 * - business procurement
 *
 * Cossa Nexus Construction, Cossa Facility Services and Cossa Tech remain
 * specialist group companies that can support relevant customer projects.
 */
export const CATEGORIES: Category[] = [
  /* ---------------------------------------------------------------------- */
  /* CONSTRUCTION & DIY                                                    */
  /* ---------------------------------------------------------------------- */

  {
    slug: "construction-diy",
    name: "Construction & DIY",
    tagline: "Building materials, hardware, tools and improvement products",
    description:
      "Shop construction, renovation, repair and DIY products for homes, contractors, maintenance teams and commercial projects.",
    subcategories: [
      { slug: "building-materials", name: "Building materials" },
      { slug: "cement-concrete", name: "Cement & concrete" },
      { slug: "bricks-blocks", name: "Bricks & blocks" },
      { slug: "timber-boards", name: "Timber & boards" },
      { slug: "roofing", name: "Roofing" },
      { slug: "ceilings-drywall", name: "Ceilings & drywall" },
      { slug: "doors-windows", name: "Doors & windows" },
      { slug: "plumbing", name: "Plumbing" },
      { slug: "electrical", name: "Electrical" },
      { slug: "hardware", name: "Hardware" },
      { slug: "fasteners-fixings", name: "Fasteners & fixings" },
      { slug: "painting-supplies", name: "Paint & painting supplies" },
      { slug: "tiling-flooring", name: "Tiling & flooring" },
      { slug: "waterproofing-sealants", name: "Waterproofing & sealants" },
      { slug: "tools-accessories", name: "Tools & accessories" },
      { slug: "measuring-equipment", name: "Measuring equipment" },
      { slug: "safety-ppe", name: "Safety & PPE" },
      { slug: "ladders-access", name: "Ladders & access equipment" },
      { slug: "storage-organisation", name: "Storage & organisation" },
      { slug: "home-improvement", name: "Home improvement" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* HOME & LIVING                                                         */
  /* ---------------------------------------------------------------------- */

  {
    slug: "home-living",
    name: "Home & Living",
    tagline: "Everyday products for comfortable, functional homes",
    description:
      "Furniture, kitchenware, décor, storage, appliances, lighting and everyday household essentials.",
    subcategories: [
      { slug: "furniture", name: "Furniture" },
      { slug: "living-room", name: "Living room" },
      { slug: "bedroom", name: "Bedroom" },
      { slug: "bathroom", name: "Bathroom" },
      { slug: "kitchen", name: "Kitchen" },
      { slug: "cookware", name: "Cookware" },
      { slug: "dining", name: "Dining" },
      { slug: "home-decor", name: "Home décor" },
      { slug: "lighting", name: "Lighting" },
      { slug: "bedding", name: "Bedding" },
      { slug: "storage-home", name: "Storage & organisation" },
      { slug: "small-appliances", name: "Small appliances" },
      { slug: "home-essentials", name: "Home essentials" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* CLEANING                                                              */
  /* ---------------------------------------------------------------------- */

  {
    slug: "cleaning-household",
    name: "Cleaning Products",
    tagline: "Cleaning, hygiene and household care",
    description:
      "Cleaning chemicals, equipment, hygiene products, waste supplies and household cleaning essentials for homes and businesses.",
    subcategories: [
      { slug: "cleaning-tools", name: "Cleaning tools" },
      { slug: "cleaning-chemicals", name: "Cleaning chemicals" },
      { slug: "janitorial-supplies", name: "Janitorial supplies" },
      { slug: "cleaning-equipment", name: "Cleaning equipment" },
      { slug: "hygiene-products", name: "Hygiene products" },
      { slug: "washroom-supplies", name: "Washroom supplies" },
      { slug: "laundry-care", name: "Laundry care" },
      { slug: "dishwashing", name: "Dishwashing" },
      { slug: "waste-management", name: "Waste management" },
      { slug: "paper-products", name: "Paper products" },
      { slug: "air-care", name: "Air care" },
      { slug: "cleaning-ppe", name: "Cleaning PPE" },
      { slug: "commercial-cleaning", name: "Commercial cleaning supplies" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* TECHNOLOGY                                                             */
  /* ---------------------------------------------------------------------- */

  {
    slug: "technology-electronics",
    name: "Technology",
    tagline: "Computers, electronics, devices and connected technology",
    description:
      "Technology for work, home, entertainment and everyday life — from computers and phones to networking, power and smart devices.",
    subcategories: [
      { slug: "laptops", name: "Laptops" },
      { slug: "desktop-computers", name: "Desktop computers" },
      { slug: "monitors", name: "Monitors" },
      { slug: "tablets", name: "Tablets" },
      { slug: "phones", name: "Mobile phones" },
      { slug: "computer-components", name: "Computer components" },
      { slug: "computer-accessories", name: "Computer accessories" },
      { slug: "printers-scanners", name: "Printers & scanners" },
      { slug: "storage-devices", name: "Storage devices" },
      { slug: "networking", name: "Networking & Wi-Fi" },
      { slug: "audio", name: "Audio" },
      { slug: "headphones", name: "Headphones & earbuds" },
      { slug: "tv-entertainment", name: "TV & entertainment" },
      { slug: "wearables", name: "Wearables" },
      { slug: "smart-devices", name: "Smart devices" },
      { slug: "power-charging", name: "Power & charging" },
      { slug: "ups-backup-power", name: "UPS & backup power" },
      { slug: "cables-adapters", name: "Cables & adapters" },
      { slug: "productivity-equipment", name: "Productivity equipment" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* WOMEN                                                                  */
  /* ---------------------------------------------------------------------- */

  {
    slug: "women",
    name: "Women",
    tagline: "Fashion, accessories, lifestyle and essentials",
    description:
      "Women's fashion, footwear, accessories, beauty, lifestyle products and everyday essentials.",
    subcategories: [
      { slug: "women-clothing", name: "Clothing" },
      { slug: "women-tops", name: "Tops" },
      { slug: "women-dresses", name: "Dresses" },
      { slug: "women-bottoms", name: "Jeans, trousers & skirts" },
      { slug: "women-activewear", name: "Activewear" },
      { slug: "women-sleepwear", name: "Sleepwear" },
      { slug: "women-shoes", name: "Shoes" },
      { slug: "women-bags", name: "Handbags & bags" },
      { slug: "women-accessories", name: "Accessories" },
      { slug: "women-jewellery", name: "Jewellery" },
      { slug: "women-watches", name: "Watches" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* MEN                                                                    */
  /* ---------------------------------------------------------------------- */

  {
    slug: "men",
    name: "Men",
    tagline: "Clothing, footwear, accessories and lifestyle",
    description:
      "Men's clothing, footwear, accessories, grooming and everyday lifestyle products.",
    subcategories: [
      { slug: "men-clothing", name: "Clothing" },
      { slug: "men-shirts", name: "Shirts & T-shirts" },
      { slug: "men-trousers", name: "Jeans & trousers" },
      { slug: "men-activewear", name: "Activewear" },
      { slug: "men-workwear", name: "Workwear" },
      { slug: "men-shoes", name: "Shoes" },
      { slug: "men-accessories", name: "Accessories" },
      { slug: "men-bags", name: "Bags & backpacks" },
      { slug: "men-watches", name: "Watches" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* KIDS & BABY                                                            */
  /* ---------------------------------------------------------------------- */

  {
    slug: "kids-baby",
    name: "Kids & Baby",
    tagline: "Clothing, learning, play and baby essentials",
    description:
      "Products for babies, toddlers and children including clothing, toys, learning products and everyday essentials.",
    subcategories: [
      { slug: "baby-clothing", name: "Baby clothing" },
      { slug: "kids-clothing", name: "Kids clothing" },
      { slug: "kids-shoes", name: "Kids shoes" },
      { slug: "baby-care", name: "Baby care" },
      { slug: "feeding", name: "Feeding" },
      { slug: "nursery", name: "Nursery" },
      { slug: "toys", name: "Toys" },
      { slug: "educational-toys", name: "Educational toys" },
      { slug: "school-essentials", name: "School essentials" },
      { slug: "kids-accessories", name: "Kids accessories" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* AUTOMOTIVE                                                             */
  /* ---------------------------------------------------------------------- */

  {
    slug: "automotive",
    name: "Cars & Automotive",
    tagline: "Vehicle accessories, care, tools and electronics",
    description:
      "Automotive accessories, maintenance products, vehicle electronics, detailing products and driving essentials.",
    subcategories: [
      { slug: "car-accessories", name: "Car accessories" },
      { slug: "car-electronics", name: "Car electronics" },
      { slug: "car-audio", name: "Car audio" },
      { slug: "car-cleaning", name: "Car cleaning & detailing" },
      { slug: "car-care", name: "Vehicle care" },
      { slug: "car-tools", name: "Automotive tools" },
      { slug: "interior-accessories", name: "Interior accessories" },
      { slug: "exterior-accessories", name: "Exterior accessories" },
      { slug: "phone-mounts", name: "Phone mounts & chargers" },
      { slug: "dash-cameras", name: "Dash cameras" },
      { slug: "emergency-roadside", name: "Emergency & roadside" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* OFFICE & BUSINESS                                                       */
  /* ---------------------------------------------------------------------- */

  {
    slug: "office-business",
    name: "Office & Business",
    tagline: "Workplace, procurement and business essentials",
    description:
      "Office furniture, stationery, workplace technology, packaging and operational supplies for businesses.",
    subcategories: [
      { slug: "office-furniture", name: "Office furniture" },
      { slug: "office-stationery", name: "Stationery" },
      { slug: "office-supplies", name: "Office supplies" },
      { slug: "filing-storage", name: "Filing & storage" },
      { slug: "office-technology", name: "Office technology" },
      { slug: "workspace-accessories", name: "Workspace accessories" },
      { slug: "packaging", name: "Packaging" },
      { slug: "business-consumables", name: "Business consumables" },
      { slug: "presentation-products", name: "Presentation products" },
      { slug: "office-safety", name: "Office safety" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* HEALTH                                                                 */
  /* ---------------------------------------------------------------------- */

  {
    slug: "health-personal-care",
    name: "Health & Personal Care",
    tagline: "Everyday wellness, hygiene and personal care essentials",
    description:
      "General personal-care, hygiene, wellness accessories and everyday health-support products.",
    subcategories: [
      { slug: "personal-hygiene", name: "Personal hygiene" },
      { slug: "oral-care", name: "Oral care" },
      { slug: "body-care", name: "Body care" },
      { slug: "first-aid", name: "First aid" },
      { slug: "wellness-accessories", name: "Wellness accessories" },
      { slug: "mobility-support", name: "Mobility & support products" },
      { slug: "health-devices", name: "Health devices" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* BEAUTY                                                                 */
  /* ---------------------------------------------------------------------- */

  {
    slug: "beauty-grooming",
    name: "Beauty & Grooming",
    tagline: "Beauty, skincare, haircare and grooming",
    description:
      "Beauty tools, skincare, haircare, grooming equipment, cosmetics accessories and personal-care products.",
    subcategories: [
      { slug: "skincare", name: "Skincare" },
      { slug: "haircare", name: "Haircare" },
      { slug: "hair-tools", name: "Hair tools" },
      { slug: "makeup", name: "Makeup" },
      { slug: "beauty-tools", name: "Beauty tools" },
      { slug: "fragrance", name: "Fragrance" },
      { slug: "mens-grooming", name: "Men's grooming" },
      { slug: "nail-care", name: "Nail care" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* SPORTS                                                                 */
  /* ---------------------------------------------------------------------- */

  {
    slug: "sports-fitness",
    name: "Sports & Fitness",
    tagline: "Training, exercise and active lifestyle products",
    description:
      "Fitness equipment, sports accessories, activewear and products for training at home or outdoors.",
    subcategories: [
      { slug: "fitness-equipment", name: "Fitness equipment" },
      { slug: "home-gym", name: "Home gym" },
      { slug: "weights", name: "Weights" },
      { slug: "yoga", name: "Yoga & stretching" },
      { slug: "running", name: "Running" },
      { slug: "cycling", name: "Cycling" },
      { slug: "team-sports", name: "Team sports" },
      { slug: "sports-accessories", name: "Sports accessories" },
      { slug: "fitness-wearables", name: "Fitness wearables" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* OUTDOOR                                                                */
  /* ---------------------------------------------------------------------- */

  {
    slug: "outdoor-garden",
    name: "Outdoor & Garden",
    tagline: "Garden, outdoor living and property care",
    description:
      "Gardening tools, outdoor equipment, landscaping products and outdoor-living essentials.",
    subcategories: [
      { slug: "garden-tools", name: "Garden tools" },
      { slug: "watering-irrigation", name: "Watering & irrigation" },
      { slug: "garden-power-tools", name: "Garden power tools" },
      { slug: "plants-care", name: "Plant care" },
      { slug: "outdoor-furniture", name: "Outdoor furniture" },
      { slug: "braai-outdoor-cooking", name: "Braai & outdoor cooking" },
      { slug: "camping", name: "Camping" },
      { slug: "outdoor-lighting", name: "Outdoor lighting" },
      { slug: "garden-storage", name: "Garden storage" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* PETS                                                                   */
  /* ---------------------------------------------------------------------- */

  {
    slug: "pet-supplies",
    name: "Pet Supplies",
    tagline: "Everyday products for pets and pet owners",
    description:
      "Feeding, grooming, sleeping, play and everyday pet accessories.",
    subcategories: [
      { slug: "dog-supplies", name: "Dog supplies" },
      { slug: "cat-supplies", name: "Cat supplies" },
      { slug: "pet-feeding", name: "Feeding" },
      { slug: "pet-beds", name: "Beds" },
      { slug: "pet-toys", name: "Pet toys" },
      { slug: "pet-grooming", name: "Pet grooming" },
      { slug: "pet-travel", name: "Pet travel" },
      { slug: "pet-cleaning", name: "Pet cleaning" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* DIGITAL                                                                */
  /* ---------------------------------------------------------------------- */

  {
    slug: "digital-products",
    name: "Digital Products",
    tagline: "Downloadable products, templates and digital tools",
    description:
      "Digital products delivered electronically including templates, business resources, planners, guides and creative assets.",
    subcategories: [
      { slug: "business-templates", name: "Business templates" },
      { slug: "document-templates", name: "Document templates" },
      { slug: "spreadsheets", name: "Spreadsheets" },
      { slug: "planners", name: "Planners" },
      { slug: "ebooks-guides", name: "eBooks & guides" },
      { slug: "design-assets", name: "Design assets" },
      { slug: "social-media-templates", name: "Social media templates" },
      { slug: "marketing-resources", name: "Marketing resources" },
      { slug: "business-kits", name: "Business starter kits" },
      { slug: "educational-downloads", name: "Educational downloads" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* PRINT ON DEMAND                                                        */
  /* ---------------------------------------------------------------------- */

  {
    slug: "print-on-demand",
    name: "Print on Demand",
    tagline: "Made-to-order clothing, accessories and branded products",
    description:
      "Cossa-designed and personalised products produced after ordering through approved print-on-demand fulfilment partners.",
    subcategories: [
      { slug: "pod-tshirts", name: "T-shirts" },
      { slug: "pod-hoodies", name: "Hoodies & sweatshirts" },
      { slug: "pod-polo-shirts", name: "Polo shirts" },
      { slug: "pod-workwear", name: "Workwear" },
      { slug: "pod-mugs", name: "Mugs" },
      { slug: "pod-bottles", name: "Bottles & tumblers" },
      { slug: "pod-phone-cases", name: "Phone cases" },
      { slug: "pod-bags", name: "Bags & totes" },
      { slug: "pod-caps", name: "Caps & hats" },
      { slug: "pod-home-decor", name: "Home décor" },
      { slug: "pod-kids", name: "Kids products" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* GIFTS                                                                  */
  /* ---------------------------------------------------------------------- */

  {
    slug: "gifts-personalised",
    name: "Gifts & Personalised",
    tagline: "Gift ideas and personalised products",
    description:
      "Gift products for birthdays, celebrations, businesses, teams, families and special occasions.",
    subcategories: [
      { slug: "personalised-gifts", name: "Personalised gifts" },
      { slug: "corporate-gifts", name: "Corporate gifts" },
      { slug: "birthday-gifts", name: "Birthday gifts" },
      { slug: "wedding-gifts", name: "Wedding gifts" },
      { slug: "family-gifts", name: "Family gifts" },
      { slug: "gift-sets", name: "Gift sets" },
      { slug: "custom-clothing", name: "Custom clothing" },
      { slug: "custom-mugs", name: "Custom mugs" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* SECURITY                                                               */
  /* ---------------------------------------------------------------------- */

  {
    slug: "security-smart-home",
    name: "Security & Smart Home",
    tagline: "Security, surveillance, automation and smart control",
    description:
      "Connected security and smart-home products for homes, offices, facilities and commercial properties.",
    subcategories: [
      { slug: "cctv-cameras", name: "CCTV cameras" },
      { slug: "security-systems", name: "Security systems" },
      { slug: "alarms-sensors", name: "Alarms & sensors" },
      { slug: "access-control", name: "Access control" },
      { slug: "video-doorbells", name: "Video doorbells" },
      { slug: "smart-locks", name: "Smart locks" },
      { slug: "smart-lighting", name: "Smart lighting" },
      { slug: "smart-plugs", name: "Smart plugs" },
      { slug: "smart-switches", name: "Smart switches" },
      { slug: "smart-hubs", name: "Smart hubs" },
      { slug: "home-automation", name: "Home automation" },
      { slug: "security-storage", name: "Security recording & storage" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* TOOLS & INDUSTRIAL                                                     */
  /* ---------------------------------------------------------------------- */

  {
    slug: "tools-industrial",
    name: "Tools & Industrial",
    tagline: "Professional tools, equipment and industrial supplies",
    description:
      "Professional hand tools, power tools, workshop equipment, PPE and industrial consumables.",
    subcategories: [
      { slug: "hand-tools", name: "Hand tools" },
      { slug: "power-tools", name: "Power tools" },
      { slug: "tool-accessories", name: "Tool accessories" },
      { slug: "workshop-equipment", name: "Workshop equipment" },
      { slug: "industrial-supplies", name: "Industrial supplies" },
      { slug: "industrial-ppe", name: "Industrial PPE" },
      { slug: "welding", name: "Welding" },
      { slug: "compressors", name: "Compressors & pneumatic tools" },
      { slug: "material-handling", name: "Material handling" },
      { slug: "site-equipment", name: "Site equipment" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* EDUCATION                                                              */
  /* ---------------------------------------------------------------------- */

  {
    slug: "school-education",
    name: "School & Education",
    tagline: "Learning, stationery and educational essentials",
    description:
      "School supplies, stationery, educational products and learning resources.",
    subcategories: [
      { slug: "school-stationery", name: "School stationery" },
      { slug: "school-bags", name: "School bags" },
      { slug: "art-supplies", name: "Art supplies" },
      { slug: "learning-resources", name: "Learning resources" },
      { slug: "educational-books", name: "Educational books" },
      { slug: "study-accessories", name: "Study accessories" },
      { slug: "classroom-supplies", name: "Classroom supplies" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* TRAVEL                                                                 */
  /* ---------------------------------------------------------------------- */

  {
    slug: "travel-luggage",
    name: "Travel & Luggage",
    tagline: "Luggage, bags and travel accessories",
    description:
      "Travel bags, luggage, organisers and accessories for local and international travel.",
    subcategories: [
      { slug: "suitcases", name: "Suitcases" },
      { slug: "travel-bags", name: "Travel bags" },
      { slug: "backpacks", name: "Backpacks" },
      { slug: "laptop-bags", name: "Laptop bags" },
      { slug: "travel-organisers", name: "Travel organisers" },
      { slug: "travel-accessories", name: "Travel accessories" },
      { slug: "travel-electronics", name: "Travel electronics" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* MOBILE ACCESSORIES                                                     */
  /* ---------------------------------------------------------------------- */

  {
    slug: "mobile-accessories",
    name: "Mobile Accessories",
    tagline: "Phone protection, charging, audio and accessories",
    description:
      "Phone cases, chargers, cables, screen protection, mounts and everyday mobile accessories.",
    subcategories: [
      { slug: "phone-cases", name: "Phone cases" },
      { slug: "screen-protectors", name: "Screen protectors" },
      { slug: "phone-chargers", name: "Chargers" },
      { slug: "charging-cables", name: "Charging cables" },
      { slug: "power-banks", name: "Power banks" },
      { slug: "wireless-chargers", name: "Wireless chargers" },
      { slug: "phone-holders", name: "Phone holders" },
      { slug: "mobile-audio", name: "Mobile audio" },
      { slug: "tablet-accessories", name: "Tablet accessories" },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* GAMING                                                                 */
  /* ---------------------------------------------------------------------- */

  {
    slug: "gaming-entertainment",
    name: "Gaming & Entertainment",
    tagline: "Gaming gear, accessories and entertainment technology",
    description:
      "Gaming accessories, PC gaming equipment, controllers, audio and entertainment products.",
    subcategories: [
      { slug: "gaming-accessories", name: "Gaming accessories" },
      { slug: "gaming-keyboards", name: "Gaming keyboards" },
      { slug: "gaming-mice", name: "Gaming mice" },
      { slug: "gaming-headsets", name: "Gaming headsets" },
      { slug: "controllers", name: "Controllers" },
      { slug: "gaming-chairs", name: "Gaming chairs" },
      { slug: "gaming-monitors", name: "Gaming monitors" },
      { slug: "pc-gaming", name: "PC gaming" },
      { slug: "streaming-accessories", name: "Streaming accessories" },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* RESPONSIVE NAVIGATION GROUPING                                             */
/* -------------------------------------------------------------------------- */

/**
 * DO NOT render every CATEGORIES item across the desktop header.
 *
 * Desktop:
 * - show these major departments
 * - expose the rest through "All Departments"
 *
 * Mobile:
 * - show all departments inside the mobile navigation drawer
 * - subcategories should expand/collapse as an accordion
 *
 * This prevents the navigation from overflowing on smaller screens.
 */
export const PRIMARY_NAV_CATEGORY_SLUGS: CategorySlug[] = [
  "construction-diy",
  "home-living",
  "cleaning-household",
  "technology-electronics",
  "women",
  "men",
  "kids-baby",
];

export const FEATURED_CATEGORY_SLUGS: CategorySlug[] = [
  "construction-diy",
  "technology-electronics",
  "home-living",
  "women",
  "men",
  "digital-products",
  "automotive",
  "print-on-demand",
];

/**
 * Useful for desktop mega-menu groupings.
 */
export const CATEGORY_MENU_GROUPS = [
  {
    id: "popular",
    label: "Popular Departments",
    slugs: [
      "construction-diy",
      "home-living",
      "technology-electronics",
      "cleaning-household",
      "women",
      "men",
      "kids-baby",
      "automotive",
    ] satisfies CategorySlug[],
  },
  {
    id: "business",
    label: "Business & Professional",
    slugs: [
      "office-business",
      "tools-industrial",
      "construction-diy",
      "cleaning-household",
      "security-smart-home",
      "technology-electronics",
    ] satisfies CategorySlug[],
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    slugs: [
      "beauty-grooming",
      "health-personal-care",
      "sports-fitness",
      "outdoor-garden",
      "pet-supplies",
      "travel-luggage",
    ] satisfies CategorySlug[],
  },
  {
    id: "digital",
    label: "Digital & Custom",
    slugs: [
      "digital-products",
      "print-on-demand",
      "gifts-personalised",
      "mobile-accessories",
      "gaming-entertainment",
      "school-education",
    ] satisfies CategorySlug[],
  },
] as const;

/* -------------------------------------------------------------------------- */
/* CALCULATOR HELPERS                                                         */
/* -------------------------------------------------------------------------- */

/** Safe positive number read — never returns NaN or a negative value. */
const n = (
  values: ProjectFieldValues,
  key: string,
): number => {
  const value = Number(values[key]);

  return Number.isFinite(value) &&
    value > 0
    ? value
    : 0;
};

/** Safe string read for select fields. */
const s = (
  values: ProjectFieldValues,
  key: string,
): string =>
  String(values[key] ?? "");

const FREQUENCY_FACTOR: Record<
  string,
  number
> = {
  daily: 1,
  three_weekly: 0.6,
  weekly: 0.25,
  monthly: 0.1,
};

/* -------------------------------------------------------------------------- */
/* SHARED SERVICE OPTIONS                                                     */
/* -------------------------------------------------------------------------- */

/**
 * These remain subsidiary/service references.
 *
 * They are intentionally NOT Store department names.
 */
const INSTALL_SERVICE: ProjectServiceOption = {
  id: "installation",

  name: "Installation and site work",

  provider:
    "Cossa Nexus Construction",

  description:
    "Our construction team can carry out suitable installation, renovation and site work connected to the customer's project.",
};

const CLEANING_SERVICE: ProjectServiceOption = {
  id: "cleaning",

  name: "Cleaning and facility support",

  provider:
    "Cossa Facility Services",

  description:
    "Once-off or recurring cleaning, hygiene and facility-support services can be added where appropriate.",
};

const TECH_SERVICE: ProjectServiceOption = {
  id: "tech_setup",

  name: "Technology setup and support",

  provider:
    "Cossa Tech",

  description:
    "Technology installation, configuration and support can be added where appropriate.",
};

/* -------------------------------------------------------------------------- */
/* PROJECT COMMERCE                                                           */
/* -------------------------------------------------------------------------- */

export const PROJECTS: ProjectBundle[] = [
  {
    slug: "paint-a-room",

    name: "Paint a room",

    description:
      "Preparation, application and protection supplies for a clean interior repaint.",

    job:
      "Repaint an interior room properly the first time — prep, protect, apply and clean up.",

    categories: [
      "construction-diy",
    ],

    subcategories: [
      "painting-supplies",
      "tools-accessories",
      "safety-ppe",
    ],

    themes: [
      "construction",
    ],

    audiences: [
      "home",
      "personal",
      "business",
    ],

    availability:
      "quote_required",

    effort: 2,

    budgetBand:
      "low",

    popularity: 96,

    addedAt:
      "2026-01-12",

    accessories: [
      "Sandpaper and filler",
      "Paint tray and stirrers",
      "Cleaning cloths",
    ],

    services: [
      INSTALL_SERVICE,
      CLEANING_SERVICE,
    ],

    calculator: {
      label:
        "Wall area",

      note:
        "Based on roughly 6 m² coverage per litre per coat. Porous or dark walls need more.",

      fields: [
        {
          id: "rooms",
          label:
            "Number of rooms",
          type: "number",
          unit: "rooms",
          defaultValue: 1,
          min: 1,
          max: 60,
        },

        {
          id: "perimeter",
          label:
            "Wall length (perimeter of the room)",
          type: "number",
          unit: "m",
          defaultValue: 16,
          min: 1,
          max: 400,
          step: 0.5,
        },

        {
          id: "height",
          label:
            "Wall height",
          type: "number",
          unit: "m",
          defaultValue: 2.7,
          min: 1,
          max: 12,
          step: 0.1,
        },

        {
          id: "coats",
          label:
            "Number of coats",
          type: "select",
          defaultValue: "2",
          options: [
            {
              value: "1",
              label: "1 coat",
            },
            {
              value: "2",
              label:
                "2 coats (recommended)",
            },
            {
              value: "3",
              label: "3 coats",
            },
          ],
        },

        {
          id: "surface",
          label:
            "Surface condition",
          type: "select",
          defaultValue:
            "painted",
          options: [
            {
              value:
                "painted",
              label:
                "Previously painted, good condition",
            },
            {
              value: "new",
              label:
                "New plaster or bare wall",
            },
            {
              value: "dark",
              label:
                "Dark or heavily marked wall",
            },
          ],
        },
      ],

      outputs: [
        {
          id: "paint",

          label:
            "Interior wall paint",

          resultUnit:
            "litres",

          wastePercent:
            0.1,

          availability:
            "quote",

          compute: (values) => {
            const area =
              n(values, "rooms") *
              n(values, "perimeter") *
              n(values, "height");

            const coats =
              Number(
                s(
                  values,
                  "coats",
                ),
              ) || 2;

            const surface =
              s(
                values,
                "surface",
              );

            const factor =
              surface === "dark"
                ? 1.25
                : surface === "new"
                  ? 1.15
                  : 1;

            return (
              area *
              coats *
              factor
            ) / 6;
          },
        },

        {
          id: "primer",

          label:
            "Primer / undercoat",

          resultUnit:
            "litres",

          wastePercent:
            0.05,

          availability:
            "quote",

          compute: (values) => {
            const area =
              n(values, "rooms") *
              n(values, "perimeter") *
              n(values, "height");

            return s(
              values,
              "surface",
            ) === "painted"
              ? area / 22
              : area / 10;
          },
        },

        {
          id: "sleeves",

          label:
            "Roller sleeves",

          resultUnit:
            "sleeves",

          roundUp: true,

          availability:
            "quote",

          compute: (values) =>
            (
              n(
                values,
                "rooms",
              ) *
              n(
                values,
                "perimeter",
              ) *
              n(
                values,
                "height",
              )
            ) / 45,
        },

        {
          id: "tape",

          label:
            "Masking tape",

          resultUnit:
            "rolls",

          roundUp: true,

          availability:
            "quote",

          compute: (values) =>
            n(
              values,
              "rooms",
            ) *
            (
              n(
                values,
                "perimeter",
              ) / 25
            ),
        },

        {
          id: "sheets",

          label:
            "Drop sheets",

          resultUnit:
            "sheets",

          roundUp: true,

          availability:
            "quote",

          compute: (values) =>
            n(
              values,
              "rooms",
            ),
        },
      ],
    },
  },

  {
    slug:
      "clean-an-office",

    name:
      "Clean an office",

    description:
      "Daily and periodic cleaning consumables for commercial office space.",

    job:
      "Keep an office presentable every day without running out of consumables mid-month.",

    categories: [
      "cleaning-household",
      "office-business",
    ],

    subcategories: [
      "cleaning-tools",
      "commercial-cleaning",
      "janitorial-supplies",
    ],

    themes: [
      "cleaning",
      "workplace",
    ],

    audiences: [
      "business",
    ],

    availability:
      "quote_required",

    effort: 1,

    budgetBand:
      "medium",

    popularity: 91,

    addedAt:
      "2026-01-12",

    accessories: [
      "Colour-coded buckets",
      "Wet-floor signage",
      "Storage trolley",
    ],

    services: [
      CLEANING_SERVICE,
    ],

    calculator: {
      label:
        "Floor area",

      note:
        "Monthly consumable estimate for a standard commercial office.",

      fields: [
        {
          id: "length",
          label:
            "Floor length",
          type: "number",
          unit: "m",
          defaultValue: 20,
          min: 1,
          max: 500,
          step: 0.5,
        },

        {
          id: "width",
          label:
            "Floor width",
          type: "number",
          unit: "m",
          defaultValue: 12,
          min: 1,
          max: 500,
          step: 0.5,
        },

        {
          id: "people",
          label:
            "Number of people",
          type: "number",
          unit: "people",
          defaultValue: 30,
          min: 1,
          max: 5000,
        },

        {
          id: "frequency",
          label:
            "Cleaning frequency",
          type: "select",
          defaultValue:
            "daily",
          options: [
            {
              value: "daily",
              label: "Daily",
            },
            {
              value:
                "three_weekly",
              label:
                "Three times a week",
            },
            {
              value:
                "weekly",
              label: "Weekly",
            },
            {
              value:
                "monthly",
              label: "Monthly",
            },
          ],
        },

        {
          id:
            "propertyType",
          label:
            "Property type",
          type: "select",
          defaultValue:
            "office",
          options: [
            {
              value:
                "office",
              label: "Office",
            },
            {
              value:
                "retail",
              label:
                "Retail or hospitality",
            },
            {
              value:
                "warehouse",
              label:
                "Warehouse or industrial",
            },
          ],
        },
      ],

      outputs: [
        {
          id: "apc",

          label:
            "All-purpose cleaner (monthly)",

          resultUnit:
            "litres",

          availability:
            "quote",

          compute: (values) =>
            (
              n(
                values,
                "length",
              ) *
              n(
                values,
                "width",
              )
            ) *
            0.02 *
            (
              FREQUENCY_FACTOR[
                s(
                  values,
                  "frequency",
                )
              ] ?? 1
            ) *
            (
              s(
                values,
                "propertyType",
              ) ===
              "retail"
                ? 1.3
                : 1
            ),
        },

        {
          id: "floor",

          label:
            "Floor cleaner (monthly)",

          resultUnit:
            "litres",

          availability:
            "quote",

          compute: (values) =>
            (
              n(
                values,
                "length",
              ) *
              n(
                values,
                "width",
              )
            ) *
            0.015 *
            (
              FREQUENCY_FACTOR[
                s(
                  values,
                  "frequency",
                )
              ] ?? 1
            ),
        },

        {
          id: "bags",

          label:
            "Refuse bags (monthly)",

          resultUnit:
            "bags",

          roundUp: true,

          availability:
            "quote",

          compute: (values) =>
            n(
              values,
              "people",
            ) *
            4 *
            (
              FREQUENCY_FACTOR[
                s(
                  values,
                  "frequency",
                )
              ] ?? 1
            ),
        },

        {
          id: "cloths",

          label:
            "Microfibre cloths",

          resultUnit:
            "cloths",

          roundUp: true,

          availability:
            "quote",

          compute: (values) =>
            (
              n(
                values,
                "length",
              ) *
              n(
                values,
                "width",
              )
            ) *
            0.03,
        },

        {
          id: "mops",

          label:
            "Mop heads (quarterly)",

          resultUnit:
            "heads",

          roundUp: true,

          availability:
            "quote",

          compute: (values) =>
            (
              n(
                values,
                "length",
              ) *
              n(
                values,
                "width",
              )
            ) *
            0.006,
        },
      ],
    },
  },

  {
    slug:
      "equip-a-construction-team",

    name:
      "Equip a construction team",

    description:
      "Core tools, measuring gear and PPE to get a crew productive on site.",

    job:
      "Kit out a new crew so nobody stands idle waiting for a tool or a hard hat.",

    categories: [
      "construction-diy",
      "tools-industrial",
    ],

    subcategories: [
      "tools-accessories",
      "measuring-equipment",
      "safety-ppe",
      "hardware",
      "hand-tools",
      "power-tools",
    ],

    themes: [
      "construction",
      "workplace",
    ],

    audiences: [
      "business",
      "men",
      "women",
    ],

    availability:
      "quote_required",

    effort: 3,

    budgetBand:
      "high",

    popularity: 88,

    addedAt:
      "2026-01-12",

    accessories: [
      "Tool storage and site box",
      "Extension leads",
      "Site first-aid kit",
    ],

    services: [
      INSTALL_SERVICE,
    ],

    calculator: {
      label:
        "Crew size",

      note:
        "Consumable PPE allows for rotation and replacement over the project duration.",

      fields: [
        {
          id: "crew",
          label:
            "Crew size",
          type: "number",
          unit: "people",
          defaultValue: 6,
          min: 1,
          max: 300,
        },

        {
          id: "weeks",
          label:
            "Project duration",
          type: "number",
          unit: "weeks",
          defaultValue: 8,
          min: 1,
          max: 156,
        },

        {
          id: "sizeMix",
          label:
            "Clothing size range",
          type: "select",
          defaultValue:
            "standard",
          options: [
            {
              value:
                "standard",
              label:
                "Standard adult sizes (S–XXL)",
            },
            {
              value:
                "extended",
              label:
                "Extended sizes required",
            },
          ],
        },
      ],

      outputs: [
        {
          id: "hats",
          label:
            "Hard hats",
          resultUnit:
            "units",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "crew",
            ),
        },

        {
          id: "vests",
          label:
            "Hi-vis vests",
          resultUnit:
            "units",
          roundUp: true,
          wastePercent:
            0.1,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "crew",
            ) * 1.5,
        },

        {
          id: "boots",
          label:
            "Safety boots",
          resultUnit:
            "pairs",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "crew",
            ),
        },

        {
          id: "gloves",
          label:
            "Work gloves",
          resultUnit:
            "pairs",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "crew",
            ) *
            Math.max(
              1,
              n(
                values,
                "weeks",
              ) / 4,
            ) *
            0.75,
        },

        {
          id: "toolsets",
          label:
            "Shared tool sets",
          resultUnit:
            "sets",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "crew",
            ) / 3,
        },
      ],
    },
  },

  {
    slug:
      "improve-workplace-hygiene",

    name:
      "Improve workplace hygiene",

    description:
      "Hygiene, waste and sanitation products for healthier workplaces.",

    job:
      "Raise hygiene standards across washrooms, kitchens and shared workspaces.",

    categories: [
      "cleaning-household",
      "office-business",
    ],

    subcategories: [
      "hygiene-products",
      "washroom-supplies",
      "waste-management",
      "commercial-cleaning",
    ],

    themes: [
      "cleaning",
      "workplace",
    ],

    audiences: [
      "business",
    ],

    availability:
      "quote_required",

    effort: 1,

    budgetBand:
      "low",

    popularity: 74,

    addedAt:
      "2026-01-20",

    accessories: [
      "Dispensers and brackets",
      "Sanitiser stands",
      "Washroom signage",
    ],

    services: [
      CLEANING_SERVICE,
    ],

    calculator: {
      label:
        "People on site",

      fields: [
        {
          id: "people",
          label:
            "Number of people on site",
          type: "number",
          unit: "people",
          defaultValue: 40,
          min: 1,
          max: 10000,
        },

        {
          id:
            "washrooms",
          label:
            "Number of washrooms",
          type: "number",
          unit:
            "washrooms",
          defaultValue: 4,
          min: 1,
          max: 200,
        },

        {
          id:
            "frequency",
          label:
            "Servicing frequency",
          type: "select",
          defaultValue:
            "daily",
          options: [
            {
              value: "daily",
              label: "Daily",
            },
            {
              value:
                "three_weekly",
              label:
                "Three times a week",
            },
            {
              value:
                "weekly",
              label:
                "Weekly",
            },
          ],
        },
      ],

      outputs: [
        {
          id: "soap",
          label:
            "Hand soap (monthly)",
          resultUnit:
            "litres",
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "people",
            ) * 0.08,
        },

        {
          id:
            "sanitiser",
          label:
            "Hand sanitiser (monthly)",
          resultUnit:
            "litres",
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "people",
            ) * 0.06,
        },

        {
          id: "tp",
          label:
            "Toilet paper (monthly)",
          resultUnit:
            "rolls",
          roundUp: true,
          wastePercent:
            0.1,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "people",
            ) * 2.2,
        },

        {
          id: "towel",
          label:
            "Paper towel (monthly)",
          resultUnit:
            "rolls",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "people",
            ) * 0.9,
        },

        {
          id:
            "liners",
          label:
            "Bin liners (monthly)",
          resultUnit:
            "liners",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "washrooms",
            ) *
            22 *
            (
              FREQUENCY_FACTOR[
                s(
                  values,
                  "frequency",
                )
              ] ?? 1
            ),
        },
      ],
    },
  },

  {
    slug:
      "upgrade-a-smart-home",

    name:
      "Upgrade a smart home",

    description:
      "Smart control, lighting and monitoring products for residential upgrades.",

    job:
      "Add smart lighting, control and monitoring to a home without a full rewire.",

    categories: [
      "security-smart-home",
      "technology-electronics",
    ],

    subcategories: [
      "smart-lighting",
      "smart-plugs",
      "smart-switches",
      "smart-hubs",
      "home-automation",
    ],

    themes: [
      "technology",
    ],

    audiences: [
      "home",
      "personal",
    ],

    availability:
      "quote_required",

    effort: 2,

    budgetBand:
      "medium",

    popularity: 82,

    addedAt:
      "2026-02-02",

    accessories: [
      "Wi-Fi mesh extender",
      "Surge protection",
      "Mounting hardware",
    ],

    services: [
      TECH_SERVICE,
      INSTALL_SERVICE,
    ],

    calculator: {
      label:
        "Rooms to upgrade",

      note:
        "One hub typically covers a standard home. Larger properties may need additional network or control equipment.",

      fields: [
        {
          id: "rooms",
          label:
            "Number of rooms",
          type: "number",
          unit: "rooms",
          defaultValue: 4,
          min: 1,
          max: 60,
        },

        {
          id:
            "propertyType",
          label:
            "Property type",
          type: "select",
          defaultValue:
            "house",
          options: [
            {
              value:
                "apartment",
              label:
                "Apartment or flat",
            },
            {
              value: "house",
              label:
                "Freestanding house",
            },
            {
              value:
                "estate",
              label:
                "Large property or estate",
            },
          ],
        },

        {
          id: "level",
          label:
            "Technology requirement",
          type: "select",
          defaultValue:
            "standard",
          options: [
            {
              value: "basic",
              label:
                "Basic — lighting and plugs",
            },
            {
              value:
                "standard",
              label:
                "Standard — lighting, plugs and switches",
            },
            {
              value:
                "advanced",
              label:
                "Advanced — full control and monitoring",
            },
          ],
        },
      ],

      outputs: [
        {
          id: "bulbs",
          label:
            "Smart bulbs",
          resultUnit:
            "bulbs",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "rooms",
            ) *
            (
              s(
                values,
                "level",
              ) ===
              "advanced"
                ? 3.5
                : s(
                      values,
                      "level",
                    ) ===
                    "basic"
                  ? 1.5
                  : 2.5
            ),
        },

        {
          id: "plugs",
          label:
            "Smart plugs",
          resultUnit:
            "plugs",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "rooms",
            ),
        },

        {
          id:
            "switches",
          label:
            "Smart switches",
          resultUnit:
            "switches",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            s(
              values,
              "level",
            ) === "basic"
              ? 0
              : n(
                  values,
                  "rooms",
                ),
        },

        {
          id: "hub",
          label:
            "Hub / gateway",
          resultUnit:
            "units",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            s(
              values,
              "propertyType",
            ) === "estate"
              ? 2
              : 1,
        },

        {
          id:
            "sensors",
          label:
            "Motion / door sensors",
          resultUnit:
            "sensors",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            s(
              values,
              "level",
            ) ===
            "advanced"
              ? n(
                  values,
                  "rooms",
                ) *
                1.5
              : 0,
        },
      ],
    },
  },

  {
    slug:
      "set-up-a-productive-workspace",

    name:
      "Set up a productive workspace",

    description:
      "Desk technology, accessories and organisation for focused work.",

    job:
      "Turn empty desks into working, cable-managed, ergonomic workstations.",

    categories: [
      "office-business",
      "technology-electronics",
      "home-living",
    ],

    subcategories: [
      "productivity-equipment",
      "computer-accessories",
      "workspace-accessories",
      "office-furniture",
      "storage-home",
    ],

    themes: [
      "technology",
      "workplace",
    ],

    audiences: [
      "business",
      "home",
    ],

    availability:
      "quote_required",

    effort: 2,

    budgetBand:
      "medium",

    popularity: 70,

    addedAt:
      "2026-02-10",

    accessories: [
      "Desk lamps",
      "Headsets",
      "Labelling and cable ties",
    ],

    services: [
      TECH_SERVICE,
    ],

    calculator: {
      label:
        "Workstations",

      fields: [
        {
          id: "desks",
          label:
            "Number of workstations",
          type: "number",
          unit: "desks",
          defaultValue: 8,
          min: 1,
          max: 1000,
        },

        {
          id:
            "monitors",
          label:
            "Monitors per desk",
          type: "select",
          defaultValue: "1",
          options: [
            {
              value: "1",
              label:
                "One monitor",
            },
            {
              value: "2",
              label:
                "Two monitors",
            },
          ],
        },

        {
          id:
            "storage",
          label:
            "Desk storage required",
          type: "select",
          defaultValue:
            "yes",
          options: [
            {
              value: "yes",
              label: "Yes",
            },
            {
              value: "no",
              label: "No",
            },
          ],
        },
      ],

      outputs: [
        {
          id: "arms",
          label:
            "Monitor stands / arms",
          resultUnit:
            "units",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "desks",
            ) *
            (
              Number(
                s(
                  values,
                  "monitors",
                ),
              ) || 1
            ),
        },

        {
          id:
            "peripherals",
          label:
            "Keyboard and mouse sets",
          resultUnit:
            "sets",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "desks",
            ),
        },

        {
          id: "power",
          label:
            "Power / surge strips",
          resultUnit:
            "units",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "desks",
            ),
        },

        {
          id: "cable",
          label:
            "Cable-management kits",
          resultUnit:
            "kits",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "desks",
            ),
        },

        {
          id:
            "storage",
          label:
            "Desk storage units",
          resultUnit:
            "units",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            s(
              values,
              "storage",
            ) === "yes"
              ? n(
                  values,
                  "desks",
                )
              : 0,
        },
      ],
    },
  },

  {
    slug:
      "site-safety-kit",

    name:
      "Site safety kit",

    description:
      "Signage, PPE and first-response equipment to support site safety requirements.",

    job:
      "Prepare a project site with core safety equipment before work begins.",

    categories: [
      "construction-diy",
      "tools-industrial",
      "health-personal-care",
    ],

    subcategories: [
      "safety-ppe",
      "industrial-ppe",
      "first-aid",
      "site-equipment",
    ],

    themes: [
      "construction",
      "workplace",
    ],

    audiences: [
      "business",
    ],

    availability:
      "quote_required",

    effort: 2,

    budgetBand:
      "medium",

    popularity: 66,

    addedAt:
      "2026-02-14",

    accessories: [
      "Incident register",
      "Emergency contact boards",
      "Torches",
    ],

    services: [
      INSTALL_SERVICE,
    ],

    calculator: {
      label:
        "Workers on site",

      note:
        "Minimum planning guidance only. The applicable OHS risk assessment and legal requirements take precedence.",

      fields: [
        {
          id:
            "workers",
          label:
            "Number of people on site",
          type: "number",
          unit: "people",
          defaultValue: 12,
          min: 1,
          max: 2000,
        },

        {
          id: "weeks",
          label:
            "Project duration",
          type: "number",
          unit: "weeks",
          defaultValue: 12,
          min: 1,
          max: 260,
        },

        {
          id:
            "siteArea",
          label:
            "Site area",
          type: "number",
          unit: "m²",
          defaultValue: 400,
          min: 10,
          max: 100000,
          step: 10,
        },
      ],

      outputs: [
        {
          id:
            "firstaid",
          label:
            "First-aid kits",
          resultUnit:
            "kits",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            Math.max(
              1,
              n(
                values,
                "workers",
              ) / 10,
            ),
        },

        {
          id:
            "extinguishers",
          label:
            "Fire extinguishers",
          resultUnit:
            "units",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            Math.max(
              1,
              n(
                values,
                "siteArea",
              ) / 200,
            ),
        },

        {
          id:
            "signage",
          label:
            "Safety signage",
          resultUnit:
            "signs",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            Math.max(
              4,
              n(
                values,
                "siteArea",
              ) / 100,
            ),
        },

        {
          id: "tape",
          label:
            "Barrier / hazard tape",
          resultUnit:
            "rolls",
          roundUp: true,
          wastePercent:
            0.15,
          availability:
            "quote",
          compute: (values) =>
            Math.max(
              2,
              n(
                values,
                "siteArea",
              ) / 150,
            ),
        },

        {
          id: "eyes",
          label:
            "Eye protection",
          resultUnit:
            "pairs",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "workers",
            ) *
            Math.max(
              1,
              n(
                values,
                "weeks",
              ) / 12,
            ),
        },
      ],
    },
  },

  {
    slug:
      "facility-consumables-starter-pack",

    name:
      "Facility consumables starter pack",

    description:
      "Recurring cleaning and hygiene consumables for commercial facilities.",

    job:
      "Create a predictable monthly consumables order instead of relying on emergency purchasing.",

    categories: [
      "cleaning-household",
      "office-business",
    ],

    subcategories: [
      "janitorial-supplies",
      "hygiene-products",
      "washroom-supplies",
      "waste-management",
      "business-consumables",
    ],

    themes: [
      "cleaning",
      "workplace",
    ],

    audiences: [
      "business",
    ],

    availability:
      "quote_required",

    effort: 1,

    budgetBand:
      "medium",

    popularity: 61,

    addedAt:
      "2026-02-18",

    accessories: [
      "Storeroom shelving",
      "Stock-count sheets",
      "Decanting bottles",
    ],

    services: [
      CLEANING_SERVICE,
    ],

    calculator: {
      label:
        "Building occupancy",

      fields: [
        {
          id:
            "people",
          label:
            "Building occupancy",
          type: "number",
          unit: "people",
          defaultValue: 60,
          min: 1,
          max: 10000,
        },

        {
          id: "area",
          label:
            "Floor area",
          type: "number",
          unit: "m²",
          defaultValue: 600,
          min: 10,
          max: 100000,
          step: 10,
        },

        {
          id:
            "frequency",
          label:
            "Cleaning frequency",
          type: "select",
          defaultValue:
            "daily",
          options: [
            {
              value: "daily",
              label: "Daily",
            },
            {
              value:
                "three_weekly",
              label:
                "Three times a week",
            },
            {
              value:
                "weekly",
              label:
                "Weekly",
            },
          ],
        },
      ],

      outputs: [
        {
          id: "bags",
          label:
            "Refuse bags (monthly)",
          resultUnit:
            "bags",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "people",
            ) *
            2 *
            (
              FREQUENCY_FACTOR[
                s(
                  values,
                  "frequency",
                )
              ] ?? 1
            ) *
            4,
        },

        {
          id:
            "detergent",
          label:
            "Detergent concentrate",
          resultUnit:
            "litres",
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "area",
            ) * 0.005,
        },

        {
          id:
            "disinfectant",
          label:
            "Disinfectant",
          resultUnit:
            "litres",
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "area",
            ) * 0.004,
        },

        {
          id:
            "cloths",
          label:
            "Cleaning cloths",
          resultUnit:
            "cloths",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "people",
            ) * 0.25,
        },

        {
          id:
            "gloves",
          label:
            "Gloves",
          resultUnit:
            "pairs",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "people",
            ) * 0.6,
        },
      ],
    },
  },

  {
    slug:
      "secure-a-property",

    name:
      "Secure a property",

    description:
      "Cameras, sensors, smart security and access control for homes, offices and sites.",

    job:
      "Create a practical property-security system using cameras, monitoring and access-control products.",

    categories: [
      "security-smart-home",
      "technology-electronics",
    ],

    subcategories: [
      "cctv-cameras",
      "security-systems",
      "alarms-sensors",
      "access-control",
      "security-storage",
      "networking",
    ],

    themes: [
      "technology",
    ],

    audiences: [
      "home",
      "business",
    ],

    availability:
      "quote_required",

    effort: 3,

    budgetBand:
      "high",

    popularity: 79,

    addedAt:
      "2026-02-22",

    accessories: [
      "UPS or backup power",
      "Network switch",
      "Weatherproof housings",
    ],

    services: [
      TECH_SERVICE,
      INSTALL_SERVICE,
    ],

    calculator: {
      label:
        "Coverage points",

      note:
        "Actual requirements depend on the property layout, connectivity and security risk. An assessment may be recommended.",

      fields: [
        {
          id: "points",
          label:
            "Entry points and areas to cover",
          type: "number",
          unit: "points",
          defaultValue: 5,
          min: 1,
          max: 300,
        },

        {
          id: "floors",
          label:
            "Number of floors or buildings",
          type: "number",
          unit: "floors",
          defaultValue: 1,
          min: 1,
          max: 50,
        },

        {
          id:
            "propertyType",
          label:
            "Property type",
          type: "select",
          defaultValue:
            "home",
          options: [
            {
              value: "home",
              label: "Home",
            },
            {
              value:
                "office",
              label:
                "Office or retail",
            },
            {
              value: "site",
              label:
                "Construction or industrial site",
            },
          ],
        },

        {
          id:
            "wiring",
          label:
            "Installation type",
          type: "select",
          defaultValue:
            "wired",
          options: [
            {
              value: "wired",
              label: "Wired",
            },
            {
              value:
                "wireless",
              label:
                "Wireless",
            },
          ],
        },
      ],

      outputs: [
        {
          id:
            "cameras",
          label:
            "Cameras",
          resultUnit:
            "units",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "points",
            ),
        },

        {
          id:
            "sensors",
          label:
            "Door / window sensors",
          resultUnit:
            "sensors",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "points",
            ) * 1.4,
        },

        {
          id:
            "recorder",
          label:
            "Recorder / storage",
          resultUnit:
            "units",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            Math.max(
              1,
              n(
                values,
                "points",
              ) / 8,
            ) *
            n(
              values,
              "floors",
            ),
        },

        {
          id:
            "cabling",
          label:
            "Cabling runs",
          resultUnit:
            "runs",
          roundUp: true,
          wastePercent:
            0.1,
          availability:
            "quote",
          compute: (values) =>
            s(
              values,
              "wiring",
            ) === "wired"
              ? n(
                  values,
                  "points",
                ) *
                n(
                  values,
                  "floors",
                )
              : 0,
        },
      ],
    },
  },

  {
    slug:
      "brand-a-team-in-workwear",

    name:
      "Brand a team in workwear",

    description:
      "Printed and branded clothing for teams, businesses, crews and groups.",

    job:
      "Prepare coordinated branded clothing for staff, crews, teams or groups.",

    categories: [
      "print-on-demand",
      "gifts-personalised",
      "men",
      "women",
      "kids-baby",
    ],

    subcategories: [
      "pod-tshirts",
      "pod-hoodies",
      "pod-polo-shirts",
      "pod-workwear",
      "corporate-gifts",
      "custom-clothing",
    ],

    themes: [
      "workplace",
    ],

    audiences: [
      "business",
      "men",
      "women",
      "kids",
      "toddlers",
      "personal",
    ],

    availability:
      "quote_required",

    effort: 2,

    budgetBand:
      "medium",

    popularity: 58,

    addedAt:
      "2026-03-04",

    accessories: [
      "Name badges",
      "Garment bags",
      "Care labels",
    ],

    calculator: {
      label:
        "Garment quantity",

      note:
        "Print-on-demand items are produced after ordering. Final sizes, artwork, production availability and pricing are confirmed before fulfilment.",

      fields: [
        {
          id: "adults",
          label:
            "Adult garments required",
          type: "number",
          unit: "items",
          defaultValue: 12,
          min: 0,
          max: 5000,
        },

        {
          id: "kids",
          label:
            "Child garments required",
          type: "number",
          unit: "items",
          defaultValue: 0,
          min: 0,
          max: 5000,
        },

        {
          id:
            "toddlers",
          label:
            "Toddler garments required",
          type: "number",
          unit: "items",
          defaultValue: 0,
          min: 0,
          max: 5000,
        },

        {
          id:
            "perPerson",
          label:
            "Garments per person",
          type: "number",
          unit: "items",
          defaultValue: 2,
          min: 1,
          max: 20,
        },

        {
          id:
            "sizeMix",
          label:
            "Size range",
          type: "select",
          defaultValue:
            "standard",
          options: [
            {
              value:
                "standard",
              label:
                "Standard sizes",
            },
            {
              value:
                "extended",
              label:
                "Extended sizes required",
            },
          ],
        },
      ],

      outputs: [
        {
          id:
            "adultItems",
          label:
            "Adult items to produce",
          resultUnit:
            "items",
          roundUp: true,
          wastePercent:
            0.05,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "adults",
            ) *
            n(
              values,
              "perPerson",
            ),
        },

        {
          id:
            "kidItems",
          label:
            "Child items to produce",
          resultUnit:
            "items",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "kids",
            ) *
            n(
              values,
              "perPerson",
            ),
        },

        {
          id:
            "toddlerItems",
          label:
            "Toddler items to produce",
          resultUnit:
            "items",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            n(
              values,
              "toddlers",
            ) *
            n(
              values,
              "perPerson",
            ),
        },

        {
          id:
            "prints",
          label:
            "Print / embroidery positions",
          resultUnit:
            "positions",
          roundUp: true,
          availability:
            "quote",
          compute: (values) =>
            (
              n(
                values,
                "adults",
              ) +
              n(
                values,
                "kids",
              ) +
              n(
                values,
                "toddlers",
              )
            ) *
            n(
              values,
              "perPerson",
            ),
        },
      ],
    },
  },
];

/* -------------------------------------------------------------------------- */
/* LOOKUPS                                                                    */
/* -------------------------------------------------------------------------- */

export function getCategory(
  slug: string,
): Category | undefined {
  return CATEGORIES.find(
    (category) =>
      category.slug === slug,
  );
}

export function getProject(
  slug: string,
): ProjectBundle | undefined {
  return PROJECTS.find(
    (project) =>
      project.slug === slug,
  );
}

export function subcategoryName(
  categorySlug: string,
  subSlug: string,
): string {
  return (
    getCategory(
      categorySlug,
    )?.subcategories.find(
      (subcategory) =>
        subcategory.slug ===
        subSlug,
    )?.name ?? subSlug
  );
}

/**
 * Primary desktop department links.
 *
 * SiteHeader should use this instead of mapping all CATEGORIES directly.
 */
export function getPrimaryNavCategories(): Category[] {
  return PRIMARY_NAV_CATEGORY_SLUGS
    .map((slug) =>
      getCategory(slug),
    )
    .filter(
      (
        category,
      ): category is Category =>
        Boolean(category),
    );
}

/**
 * Departments not already displayed in the primary desktop navigation.
 *
 * These belong under the "All Departments" mega menu.
 */
export function getMoreCategories(): Category[] {
  const primary =
    new Set<CategorySlug>(
      PRIMARY_NAV_CATEGORY_SLUGS,
    );

  return CATEGORIES.filter(
    (category) =>
      !primary.has(
        category.slug,
      ),
  );
}
