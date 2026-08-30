import assert from "node:assert/strict";
import test from "node:test";

import {
  cartLineKey,
  cartQuantity,
  mergeCartLines,
  removeCartLineKeys,
  selectedCartLineKeys,
  selectedCartLines,
} from "../src/lib/cart-lines.ts";

const lines = [
  { product_id: "bag", variant_id: null, quantity: 1 },
  { product_id: "shirt", variant_id: "blue", quantity: 2 },
  { product_id: "lamp", variant_id: null, quantity: 1 },
];

test("existing carts default every valid line to selected", () => {
  assert.deepEqual(selectedCartLineKeys(lines, undefined), lines.map(cartLineKey));
});

test("selected checkout includes only the customer-selected cart lines", () => {
  const keys = [cartLineKey(lines[0]), cartLineKey(lines[2]), "removed::base"];
  const persisted = selectedCartLineKeys(lines, keys);
  assert.deepEqual(selectedCartLines(lines, persisted), [lines[0], lines[2]]);
});

test("ordered selected lines are removed without touching unselected lines", () => {
  const remaining = removeCartLineKeys(lines, [cartLineKey(lines[0]), cartLineKey(lines[2])]);
  assert.deepEqual(remaining, [lines[1]]);
});

test("save-for-later restore merges the identical variant line safely", () => {
  const restored = mergeCartLines([
    lines[1],
    { product_id: "shirt", variant_id: "blue", quantity: 1 },
  ]);
  assert.deepEqual(restored, [{ product_id: "shirt", variant_id: "blue", quantity: 3 }]);
});

test("cart badge quantity is based only on active cart lines", () => {
  assert.equal(cartQuantity([lines[0], lines[2]]), 2);
  assert.equal(cartQuantity([{ ...lines[0], quantity: 0 }]), 0);
});
