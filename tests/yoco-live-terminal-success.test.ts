import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260909120000_make_yoco_live_success_terminal.sql",
  "utf8",
);

test("verified live success is terminal before later state transitions", () => {
  const terminalGuard = migration.indexOf("if a.status='succeeded' then");
  const negativeTransition = migration.indexOf(
    "p_payment_status in ('failed','cancelled','expired')",
  );
  assert.ok(terminalGuard > 0);
  assert.ok(negativeTransition > terminalGuard);
  assert.match(migration, /processing_status='ignored'/);
});

test("duplicate success is an idempotent no-op", () => {
  assert.doesNotMatch(migration, /failure_code='DUPLICATE_SUCCESS'/);
  assert.match(migration, /if a\.status='succeeded' then/);
});

test("mismatched events cannot erase verified success", () => {
  assert.match(migration, /if a\.status <> 'succeeded' then/);
  assert.match(migration, /processing_status='investigation'/);
});

test("verified_at is written only by authoritative success", () => {
  assert.match(migration, /status='succeeded'.*verified_at=now\(\)/s);
  assert.doesNotMatch(migration, /verified_at=null/);
});

test("existing live security grants and commissioning hold remain", () => {
  assert.match(migration, /auth\.role\(\)<>'service_role'/);
  assert.match(migration, /revoke all on function .* from public,anon,authenticated/s);
  assert.match(migration, /grant execute on function .* to service_role/s);
  assert.match(migration, /'human_hold',true,'commissioning_required',true/);
});
