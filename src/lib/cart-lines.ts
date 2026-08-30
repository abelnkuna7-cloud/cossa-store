/**
 * Pure cart-line helpers shared by browser persistence and checkout UI.
 *
 * A product plus its selected variant is a single commercial line. These
 * helpers deliberately do not include price, stock or delivery: those values
 * are always re-read by the secure checkout service.
 */
export type CartLineIdentity = {
  product_id: string;
  variant_id: string | null;
  quantity: number;
};

export function cartLineKey(line: Pick<CartLineIdentity, "product_id" | "variant_id">): string {
  return `${line.product_id}::${line.variant_id ?? "base"}`;
}

export function selectedCartLineKeys(lines: CartLineIdentity[], value: unknown): string[] {
  const available = new Set(lines.map(cartLineKey));

  // Existing carts pre-date selective checkout. Keep their established
  // checkout behaviour by treating all valid lines as selected on migration.
  if (!Array.isArray(value)) return Array.from(available);

  return Array.from(
    new Set(value.filter((key): key is string => typeof key === "string" && available.has(key))),
  );
}

export function mergeCartLines<T extends CartLineIdentity>(lines: T[]): T[] {
  const merged = new Map<string, T>();

  for (const line of lines) {
    const key = cartLineKey(line);
    const existing = merged.get(key);
    merged.set(
      key,
      existing ? { ...existing, quantity: existing.quantity + line.quantity } : { ...line },
    );
  }

  return Array.from(merged.values());
}

export function removeCartLineKeys<T extends CartLineIdentity>(
  lines: T[],
  keys: Iterable<string>,
): T[] {
  const removed = new Set(keys);
  return lines.filter((line) => !removed.has(cartLineKey(line)));
}

export function selectedCartLines<T extends CartLineIdentity>(
  lines: T[],
  keys: Iterable<string>,
): T[] {
  const selected = new Set(keys);
  return lines.filter((line) => selected.has(cartLineKey(line)));
}

export function cartQuantity<T extends CartLineIdentity>(lines: T[]): number {
  return lines.reduce(
    (total, line) =>
      total + (Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 0),
    0,
  );
}
