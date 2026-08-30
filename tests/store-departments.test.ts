import assert from "node:assert/strict";
import test from "node:test";

import { storeDepartmentSlugFor } from "../src/config/store-departments.ts";

test("Travel & Tech is routed to the approved Travel & Luggage department", () => {
  assert.equal(storeDepartmentSlugFor("Travel & Tech"), "travel-luggage");
});

test("an existing Store category remains unchanged", () => {
  assert.equal(storeDepartmentSlugFor("technology-electronics"), "technology-electronics");
});
