export type ProductTaxonomy = {
  department: string;
  subdepartments: string[];
  tags: string[];
};

export type MarketEvidence = {
  retailer: string;
  price: number;
  url?: string;
  observedAt?: string;
  exactMatch?: boolean;
};

export type CommercialDecision = {
  status: "competitive" | "review" | "blocked" | "missing";
  marketLow: number | null;
  marketMedian: number | null;
  priceGapPct: number | null;
  reason: string;
};

const GENERIC_IMAGE_MARKERS = [
  "logo", "favicon", "placeholder", "banner", "header", "footer", "icon", "avatar",
  "payment", "woocommerce-placeholder", "astrum-logo", "site-logo", "astrum-2.png",
];

export function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function slugToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function modelToken(value: string) {
  return (value.match(/\b[A-Z]{1,8}[ -]?\d{2,6}[A-Z0-9-]*\b/i)?.[0] ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function classifyProduct(supplierCategory: string | null, title: string): ProductTaxonomy {
  const hay = `${supplierCategory ?? ""} ${title}`.toLowerCase();
  const result = (department: string, subdepartments: string[], extraTags: string[] = []): ProductTaxonomy => ({
    department,
    subdepartments: [...new Set(subdepartments)],
    tags: [...new Set(extraTags.map(slugToken).filter(Boolean))],
  });

  if (/ip\s*cam|camera|cctv|surveillance|security/.test(hay))
    return result("security-smart-home", ["cctv-cameras", "security-systems"], ["security camera", "smart security", "ip camera"]);
  if (/barcode|barcode scanner|scanner/.test(hay))
    return result("technology-electronics", ["productivity-equipment", "computer-accessories"], ["barcode scanner", "business technology", "pos accessories"]);
  if (/keyboard/.test(hay))
    return result("technology-electronics", ["computer-accessories", "productivity-equipment"], ["keyboard", "wireless keyboard", "computer accessories"]);
  if (/mouse|trackball/.test(hay))
    return result("technology-electronics", ["computer-accessories", "productivity-equipment"], ["mouse", "computer accessories"]);
  if (/earbud|tws|headphone|headset|earphone/.test(hay))
    return result("technology-electronics", ["audio", "headphones"], ["wireless audio", "headphones", "earbuds"]);
  if (/speaker|soundbar|audio/.test(hay))
    return result("technology-electronics", ["audio", "tv-entertainment"], ["audio", "speaker"]);
  if (/router|mifi|wi-?fi|network|ethernet|lan|switch/.test(hay))
    return result("technology-electronics", ["networking", "computer-accessories"], ["networking", "wifi", "ethernet"]);
  if (/ssd|nvme|hard drive|hdd|enclosure|storage/.test(hay))
    return result("technology-electronics", ["storage-devices", "computer-accessories"], ["storage", "ssd", "computer accessories"]);
  if (/charger|power bank|powerbank|pd\b|gan\b|charging/.test(hay))
    return result("technology-electronics", ["power-charging", "cables-adapters"], ["charging", "power", "mobile accessories"]);
  if (/usb|adapter|converter|hub|type-c|type c|cable/.test(hay))
    return result("technology-electronics", ["cables-adapters", "computer-accessories"], ["adapter", "usb", "computer accessories"]);
  if (/watch|smartwatch|fitness band|wearable/.test(hay))
    return result("technology-electronics", ["wearables", "smart-devices"], ["wearable", "smartwatch"]);
  if (/ups|backup power/.test(hay))
    return result("technology-electronics", ["ups-backup-power", "power-charging"], ["backup power", "ups"]);

  return result("technology-electronics", ["computer-accessories"], [supplierCategory ?? "technology"]);
}

function normaliseImageUrl(value: string) {
  return value.replace(/&amp;/g, "&").trim();
}

function canonicalImageKey(url: string) {
  return url
    .replace(/-\d+x\d+(?=\.[a-z]+(?:\?|$))/i, "")
    .replace(/\?.*$/, "")
    .toLowerCase();
}

function imageScore(url: string, model: string, supplierRef: string, isOgImage: boolean) {
  const lower = url.toLowerCase();
  let score = isOgImage ? 12 : 0;
  if (lower.includes("/wp-content/uploads/")) score += 4;
  if (model && lower.includes(model.toLowerCase())) score += 7;
  if (supplierRef && lower.includes(supplierRef.toLowerCase())) score += 8;
  if (/\.(?:webp|jpe?g|png)(?:\?|$)/i.test(lower)) score += 2;
  if (/product|gallery|woocommerce|detail|front|side|back|case/.test(lower)) score += 2;
  if (GENERIC_IMAGE_MARKERS.some((marker) => lower.includes(marker))) score -= 30;
  return score;
}

export function extractOfficialProductGallery(html: string, title: string, supplierRef: string, ogImage = "") {
  const model = modelToken(title);
  const candidates = new Map<string, { url: string; galleryContext: boolean; isOgImage: boolean }>();
  const add = (raw: string, galleryContext: boolean, isOgImage = false) => {
    const url = normaliseImageUrl(raw);
    if (!/^https:\/\/astrum\.co\.za\/wp-content\/uploads\//i.test(url)) return;
    const key = canonicalImageKey(url);
    const current = candidates.get(key);
    if (!current || (!current.galleryContext && galleryContext) || (!current.isOgImage && isOgImage)) {
      candidates.set(key, { url, galleryContext, isOgImage });
    }
  };

  if (ogImage) add(ogImage, true, true);

  const galleryBlocks: string[] = [];
  for (const match of html.matchAll(/<(?:figure|div)[^>]+class=["'][^"']*woocommerce-product-gallery[^"']*["'][^>]*>([\s\S]*?)<\/(?:figure|div)>/gi)) {
    galleryBlocks.push(match[0]);
  }
  for (const match of html.matchAll(/<div[^>]+class=["'][^"']*woocommerce-product-gallery__image[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    galleryBlocks.push(match[0]);
  }

  for (const block of galleryBlocks) {
    for (const match of block.matchAll(/(?:src|data-src|data-lazy-src|data-large_image|href)=["'](https:\/\/astrum\.co\.za\/wp-content\/uploads\/[^"']+)["']/gi)) {
      add(match[1], true);
    }
    for (const match of block.matchAll(/(?:srcset|data-srcset)=["']([^"']+)["']/gi)) {
      for (const part of match[1].split(",")) {
        const url = part.trim().split(/\s+/)[0];
        add(url, true);
      }
    }
  }

  if (candidates.size <= 1) {
    for (const match of html.matchAll(/(?:src|data-src|data-lazy-src|data-large_image|href)=["'](https:\/\/astrum\.co\.za\/wp-content\/uploads\/[^"']+)["']/gi)) {
      const url = match[1];
      const lower = url.toLowerCase();
      if ((model && lower.includes(model.toLowerCase())) || lower.includes(supplierRef.toLowerCase())) add(url, false);
    }
  }

  return [...candidates.values()]
    .filter((item) => !GENERIC_IMAGE_MARKERS.some((marker) => item.url.toLowerCase().includes(marker)))
    .map((item) => ({
      ...item,
      score: imageScore(item.url, model, supplierRef, item.isOgImage) + (item.galleryContext ? 5 : 0),
    }))
    .filter((item) => item.score >= 8)
    .sort((a, b) => b.score - a.score || a.url.length - b.url.length)
    .slice(0, 8)
    .map((item) => item.url);
}

export function evaluateCommercialPosition(sellingPrice: number, evidence: MarketEvidence[]): CommercialDecision {
  const exact = evidence
    .filter((item) => item.exactMatch !== false && Number.isFinite(item.price) && item.price > 0)
    .map((item) => item.price)
    .sort((a, b) => a - b);
  if (!exact.length) {
    return { status: "missing", marketLow: null, marketMedian: null, priceGapPct: null, reason: "No fresh exact-match competitor price evidence is attached." };
  }
  const marketLow = exact[0];
  const middle = Math.floor(exact.length / 2);
  const marketMedian = exact.length % 2 ? exact[middle] : (exact[middle - 1] + exact[middle]) / 2;
  const priceGapPct = ((sellingPrice - marketLow) / marketLow) * 100;
  if (priceGapPct > 15) return { status: "blocked", marketLow, marketMedian, priceGapPct, reason: `Cossa price is ${priceGapPct.toFixed(1)}% above the lowest verified exact-match market price.` };
  if (priceGapPct > 5) return { status: "review", marketLow, marketMedian, priceGapPct, reason: `Cossa price is ${priceGapPct.toFixed(1)}% above the lowest verified exact-match market price.` };
  return { status: "competitive", marketLow, marketMedian, priceGapPct, reason: "Cossa price is within the approved competitive range." };
}
