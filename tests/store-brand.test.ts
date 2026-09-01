import assert from "node:assert/strict";
import test from "node:test";

import { STORE_SLOGAN } from "../src/config/store-brand.ts";

test("Store slogan exposes three independently styled phrases", () => {
  assert.deepEqual(STORE_SLOGAN, [
    { text: "SHOP SMARTER.", tone: "gold" },
    { text: "LIVE BETTER.", tone: "ivory" },
    { text: "BUILD MORE.", tone: "teal" },
  ]);
});
