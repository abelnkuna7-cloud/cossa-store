import { XMLParser } from "npm:fast-xml-parser@5.2.5";

export type CanonicalSupplierProduct = {
  supplierProductRef: string;
  name: string;
  supplierCategory: string | null;
  cost: number | null;
  rrp: number | null;
  salePrice: number | null;
  currency: string;
  stockStatus: "available" | "unavailable" | "unknown";
  availableQuantity: number | null;
  sourceUrl: string | null;
  imageUrls: string[];
  brand: string | null;
  description: string | null;
  features: string[];
  specifications: Record<string, string>;
  observedAt: string;
  raw: Record<string, unknown>;
};

export type SupplierFieldMap = {
  sku: string;
  name: string;
  category?: string;
  cost?: string;
  rrp?: string;
  salePrice?: string;
  currency?: string;
  stock?: string;
  quantity?: string;
  sourceUrl?: string;
  imageUrls?: string;
  brand?: string;
  description?: string;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown): number | null {
  const raw = text(value).replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function quantityOrNull(value: unknown): number | null {
  const parsed = numberOrNull(value);
  return parsed !== null && parsed >= 0 ? Math.trunc(parsed) : null;
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.map(text).filter(Boolean))];
  const raw = text(value);
  if (!raw) return [];
  return [...new Set(raw.split(/[|;,\n]+/).map((item) => item.trim()).filter(Boolean))];
}

function stockStatus(value: unknown, quantity: number | null): CanonicalSupplierProduct["stockStatus"] {
  if (quantity !== null) return quantity > 0 ? "available" : "unavailable";
  const raw = text(value).toLowerCase();
  if (!raw) return "unknown";
  if (/^(in stock|available|yes|true|active|1)$/i.test(raw)) return "available";
  if (/^(out of stock|unavailable|no|false|inactive|0)$/i.test(raw)) return "unavailable";
  return "unknown";
}

function readPath(source: Record<string, unknown>, path?: string): unknown {
  if (!path) return undefined;
  let current: unknown = source;
  for (const segment of path.split(".").filter(Boolean)) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function normaliseSupplierRecord(
  raw: Record<string, unknown>,
  map: SupplierFieldMap,
  observedAt = new Date().toISOString(),
): CanonicalSupplierProduct {
  const supplierProductRef = text(readPath(raw, map.sku));
  const name = text(readPath(raw, map.name));
  if (!supplierProductRef || !name) throw new Error("Supplier SKU and product name are required.");

  const quantity = quantityOrNull(readPath(raw, map.quantity));
  const status = stockStatus(readPath(raw, map.stock), quantity);

  return {
    supplierProductRef,
    name,
    supplierCategory: text(readPath(raw, map.category)) || null,
    cost: numberOrNull(readPath(raw, map.cost)),
    rrp: numberOrNull(readPath(raw, map.rrp)),
    salePrice: numberOrNull(readPath(raw, map.salePrice)),
    currency: text(readPath(raw, map.currency)) || "ZAR",
    stockStatus: status,
    availableQuantity: quantity,
    sourceUrl: text(readPath(raw, map.sourceUrl)) || null,
    imageUrls: stringList(readPath(raw, map.imageUrls)),
    brand: text(readPath(raw, map.brand)) || null,
    description: text(readPath(raw, map.description)) || null,
    features: [],
    specifications: {},
    observedAt,
    raw,
  };
}

// RFC-4180-style enough for supplier exports: quoted delimiters and escaped quotes are supported.
export function parseCsv(source: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const header = rows.shift()?.map((value) => value.trim()) ?? [];
  if (!header.length) return [];
  return rows
    .filter((values) => values.some((value) => value.trim()))
    .map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

export function parseXmlProducts(source: string, productPath: string): Array<Record<string, unknown>> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
  });
  const root = parser.parse(source) as Record<string, unknown>;
  const value = readPath(root, productPath);
  if (!value) return [];
  const rows = Array.isArray(value) ? value : [value];
  return rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
}

export function parseJsonProducts(source: string, productPath?: string): Array<Record<string, unknown>> {
  const root = JSON.parse(source) as unknown;
  let value: unknown = root;
  if (productPath) {
    if (!root || typeof root !== "object") return [];
    value = readPath(root as Record<string, unknown>, productPath);
  }
  const rows = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
  return rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
}
