import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260906190000_add_yoco_live_payment_model.sql", "utf8");
const checkout = readFileSync("supabase/functions/store-eft-checkout/index.ts", "utf8");
const webhook = readFileSync("supabase/functions/yoco-live-webhook/index.ts", "utf8");

test("live payment control defaults to disabled", () => {
  assert.match(migration, /values\s*\(\s*true,\s*'disabled'\)/);
  assert.match(checkout, /Yoco live payments are not currently available/);
});
test("live model is separate from test records", () => {
  assert.match(migration, /store_payment_attempts/);
  assert.match(migration, /environment text not null check \(environment = 'live'\)/);
  assert.doesNotMatch(migration, /store_yoco_test_payment_attempts/);
});
test("live writes are service-role-only and customer reads are owned", () => {
  assert.match(migration, /grant execute on function public\.create_store_yoco_live_payment_attempt.*to service_role/);
  assert.match(migration, /payer_user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /live payment attempts deny client inserts/);
});
test("live checkout uses server amount and stable idempotency", () => {
  assert.match(checkout, /Idempotency-Key.*String\(attempt\.id\)/);
  assert.match(checkout, /amount: Number\(attempt\.amount_cents\)/);
  assert.match(checkout, /cossaPaymentAttemptId/);
});
test("live checkout never exposes supplier metadata", () => {
  const liveRequest = checkout.slice(checkout.indexOf('metadata: { cossaPaymentAttemptId'));
  assert.doesNotMatch(liveRequest.slice(0, 500), /supplierSku|wholesale|margin|agentId|DMC|Printify|CJ/);
});
test("live webhook has separate Vault secret and signature gate", () => {
  assert.match(webhook, /get_yoco_live_webhook_secret/);
  assert.match(webhook, /Invalid webhook signature/);
  assert.match(webhook, /MAX_WEBHOOK_AGE_MS/);
});
test("live webhook rejects non-live payloads", () => {
  assert.match(webhook, /mode !== "live"/);
  assert.match(migration, /environment='live'/);
});
test("live success transition is exactly-once and idempotent", () => {
  assert.match(migration, /unique \(provider, environment, provider_event_id\)/);
  assert.match(migration, /for update/);
  assert.match(migration, /on conflict\(organisation_id,idempotency_key\) do nothing/);
});
test("live transition verifies amount and currency", () => {
  assert.match(migration, /p_currency <> a\.currency or p_amount_cents <> a\.amount_cents/);
  assert.match(migration, /status='investigation'/);
});
test("live transition holds fulfilment for separate commissioning", () => {
  assert.match(migration, /human_hold/);
  assert.match(migration, /commissioning_required/);
  assert.match(migration, /event_type,idempotency_key/);
});
