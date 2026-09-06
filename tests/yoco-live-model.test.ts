import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasCossaLiveWebhookDuplicate, parseYocoWebhookSubscriptions } from "../supabase/functions/store-eft-checkout/yoco-webhook-reconciliation.ts";

const migration = readFileSync("supabase/migrations/20260906190000_add_yoco_live_payment_model.sql", "utf8");
const checkout = readFileSync("supabase/functions/store-eft-checkout/index.ts", "utf8");
const webhook = readFileSync("supabase/functions/yoco-live-webhook/index.ts", "utf8");

test("commissioning is admin/AAL2-only while active remains separately gated", () => {
  assert.match(checkout, /action === "yoco_live_register_webhook"/);
  assert.match(checkout, /requireCossaStoreAdminAal2\(admin, authClient, token, userData\.user\.id\)/);
  assert.match(checkout, /control\.yoco_live_state === "commissioning"/);
  assert.match(checkout, /\["commissioning", "active"\]\.includes/);
});

test("live commissioning never accepts a browser-supplied secret and stores Vault secret only", () => {
  assert.match(checkout, /Deno\.env\.get\("YOCO_LIVE_SECRET_KEY"\)/);
  assert.match(checkout, /get_yoco_live_webhook_secret/);
  assert.match(checkout, /store_yoco_live_webhook_secret/);
  assert.doesNotMatch(checkout, /body\.liveSecret|body\.yocoLiveSecret|body\.webhookSecret/);
  assert.doesNotMatch(checkout, /return json\(request, \{[^}]*webhookSecret/);
});

test("official subscriptions response detects duplicate name and URL", () => {
  const url = "https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/yoco-live-webhook";
  const subscriptions = parseYocoWebhookSubscriptions({ subscriptions: [{ name: "cossa-store-yoco-live", url: "https://other" }] });
  assert.equal(hasCossaLiveWebhookDuplicate(subscriptions, url), true);
  assert.equal(hasCossaLiveWebhookDuplicate(parseYocoWebhookSubscriptions({ subscriptions: [{ name: "other", url }] }), url), true);
});

test("empty subscriptions permits registration, malformed responses fail closed", () => {
  assert.deepEqual(parseYocoWebhookSubscriptions({ subscriptions: [] }), []);
  assert.throws(() => parseYocoWebhookSubscriptions({}), /Unexpected Yoco webhook list response/);
  assert.throws(() => parseYocoWebhookSubscriptions({ subscriptions: null }), /Unexpected Yoco webhook list response/);
  assert.throws(() => parseYocoWebhookSubscriptions({ subscriptions: [{ name: "broken" }, null] }), /Unexpected Yoco webhook list response/);
});

test("live webhook registration reconciles before creating and prevents duplicates", () => {
  const registration = checkout.slice(checkout.indexOf('action === "yoco_live_register_webhook"'));
  assert.match(registration, /alreadyConfigured/);
  assert.match(registration, /payments\.yoco\.com\/api\/webhooks/);
  assert.match(checkout, /hasCossaLiveWebhookDuplicate/);
  assert.match(registration, /method: "POST"/);
  assert.match(registration, /parseYocoWebhookSubscriptions/);
  assert.match(checkout, /nptyyzyokzgnwnyteeyi\.supabase\.co\/functions\/v1\/yoco-live-webhook/);
});

test("commissioning requires AAL2 unconditionally", () => {
  const helper = checkout.slice(checkout.indexOf("async function requireCossaStoreAdminAal2"), checkout.indexOf("async function deliveryConfirmationTargets"));
  assert.match(helper, /aal !== "aal2"/);
  assert.doesNotMatch(helper, /mfaRequired === true/);
});

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
