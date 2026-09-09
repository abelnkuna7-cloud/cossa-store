import assert from "node:assert/strict";
import test from "node:test";

import { shouldRejectAdminSessionRotation } from "../src/lib/store-admin-session.ts";

test("a strictly newer authenticated session may replace an expired registry row", () => {
  assert.equal(
    shouldRejectAdminSessionRotation({
      hasActiveSession: true,
      sameSession: false,
      timedOut: true,
      incomingIssuedAt: 200,
      existingIssuedAt: 100,
    }),
    false,
  );
});

test("an expired current session and stale or replayed rotations remain rejected", () => {
  assert.equal(
    shouldRejectAdminSessionRotation({
      hasActiveSession: true,
      sameSession: true,
      timedOut: true,
      incomingIssuedAt: 100,
      existingIssuedAt: 100,
    }),
    true,
  );
  assert.equal(
    shouldRejectAdminSessionRotation({
      hasActiveSession: true,
      sameSession: false,
      timedOut: true,
      incomingIssuedAt: 100,
      existingIssuedAt: 100,
    }),
    true,
  );
});
