# Commerce + Growth implementation map

_Audit date: 23 August 2026. This is an evidence-based starting point for the Supplier AI and Cossa Growth work. It does not authorise production migrations or external transactions._

## Scope verified

- **Cossa Store:** `store.cossanexusholdings.co.za`, repository `abelnkuna7-cloud/cossa-store`
- **Cossa Growth:** `growth.cossanexusholdings.co.za`, served by the `cossa-ai-os` Vercel project
- **Shared data plane:** Supabase project `cossa-growth`
- **Master catalogue:** the existing `public.store_products` and `public.store_product_variants` tables. This remains the one catalogue; a second product system must not be created.

## Implementation map

| Area | State | Evidence / constraint |
| --- | --- | --- |
| Store master catalogue | **WORKING** | Active catalogue entries, public product projection, product pages, variants and admin-only catalogue writes are already present. |
| Catalogue publication guard | **WORKING** | Database checks prevent an active product without required core fields. Product-type checks cover digital, affiliate, POD, dropship and physical fulfilment. |
| Product-source identity | **PARTIAL** | Printify items have provider IDs and variants. Some active affiliate items still lack a durable source product reference; do not invent or infer those IDs. |
| Printify catalogue sync | **WORKING** | Server-only API token, protected admin preview/reconcile, stable Printify product/variant IDs, USD source prices/costs and ZAR store prices. New or invalid items stay Draft. |
| Printify event webhook | **BLOCKED BY SECRET CONFIGURATION** | The receiver is deployed, but production reports no usable `PRINTIFY_WEBHOOK_SECRET` Edge Function secret. This must be fixed in Supabase before webhook subscriptions are enabled. |
| Printify fulfilment after payment | **NOT IMPLEMENTED** | Checkout can obtain a shipping quote, but no trusted post-payment path creates a Printify order. Do not add automatic order creation without explicit owner controls and a confirmed Printify billing/fulfilment policy. |
| Digital-product delivery | **WORKING** | Active products have private objects; the server function releases a short-lived URL only for paid, valid entitlements. |
| Affiliate checkout separation | **WORKING** | Affiliate product pages disclose the partner relationship and use external, sponsored/no-follow links instead of Cossa cart/checkout. |
| Temu expansion | **BLOCKED BY EXTERNAL APPROVAL / DATA COMPLETENESS** | Existing affiliate products are disclosed, but bulk publishing remains blocked until traffic-source approval and permanent source IDs / valid tracking links are confirmed. |
| Payment gateway | **PARTIAL** | Secure manual EFT request flow is live. PayFast and Ozow are not live payment methods, callback handlers or merchant integrations. |
| Payment-provider readiness copy | **FIXED IN REVIEW** | PR #21 corrects an inaccurate public statement that implied PayFast/Ozow availability and adds a readiness report. It is not merged by this audit. |
| Supplier Registry | **NOT IMPLEMENTED** | Supplier information remains partly embedded in product fields. A central, permission-scoped registry is the correct next addition. |
| Supplier adapters | **PARTIAL** | A real Printify integration exists. There is no common capability-declared adapter contract for other suppliers. |
| Supplier sync / health logs | **PARTIAL** | Printify reconciliation is idempotent at the product/variant identity level, but there is no central supplier-health/sync-run command centre. |
| Store to Growth commerce events | **NOT IMPLEMENTED** | Growth lead-capture triggers exist, but Store cart, affiliate-click, order and payment events do not yet feed a privacy-governed Growth event pipeline. |
| Growth CRM / pipeline | **PARTIAL** | Real leads, opportunities, assignments, events and CRM pages exist. The current lead data contains inconsistent stage/status pairs, which must be corrected through reviewed business data work—not a blind bulk update. |
| Growth Lead Hunter | **PARTIAL** | The route uses authenticated, evidence-oriented provider searches and a persisted cache; it is not a fabricated lead generator. Actual capability depends on configured/approved Tavily or SerpAPI access and permitted use. |
| Growth social/content | **PARTIAL** | Calendar and social-post records exist. External publishing integrations are correctly represented as unconnected; no publisher should claim a post was sent without a recorded provider result. |
| Company Brain | **PARTIAL** | Verified knowledge documents exist and authenticated Cossa managers can maintain them. A governed review/provenance workflow needs strengthening before it becomes a broad multi-agent source of truth. |
| Cossa / CEO AI | **PARTIAL** | Real provider gateway and authenticated organisation checks exist. Recent runtime errors show provider model-access, rate-limit and oversized-request failures; reliability must be retested after configuration verification. |
| Growth public website | **WORKING** | The public site clearly labels visual dashboard examples as illustrative rather than live customer results. |
| Growth tenant / free-plan foundation | **DRAFT** | PR #13 is unmerged and its migration has not been applied. It must not be marketed as live multi-tenant access. |

## Security and data-integrity findings

1. **Do not activate public multi-tenant workspaces yet.** Several legacy Growth tables (`customers`, `opportunities`, `content_calendar`, `social_accounts`, `social_posts`) currently allow all authenticated users without organisation scoping. Their schema and RLS need a staged migration, backfill, policy test and preview verification before free/public tenant signup can be enabled.

2. **Keep existing Store administration restricted.** Store product management already requires active Cossa owner/admin/manager membership. No public signup must be given catalogue-management authority.

3. **Review, do not blindly revoke, public lead-intake RPCs.** Supabase flags public security-definer functions for lead/quote intake. Lead intake includes validation and rate limiting, while the notification function and quote function need their caller/secret checks reviewed before privileges are changed. A blind revoke could break current public enquiries.

4. **Fix the mutable function search path.** The `touch_store_product_variant_updated_at` trigger function needs an explicit safe search path in a tested migration.

5. **Enable leaked-password protection.** Supabase Auth currently reports this security feature disabled. This is a dashboard action and should be enabled after the owner confirms the setting.

6. **Preserve real data.** No lead, customer, order, product, review, social result, supplier status, price or stock value should be manufactured to improve reports or gateway applications.

## Dependencies requiring Abel / external action

| Dependency | Exact action | Why |
| --- | --- | --- |
| Printify webhook secret | In Supabase for project `cossa-growth`: **Edge Functions → Secrets → Add/replace**, name `PRINTIFY_WEBHOOK_SECRET`, enter a private random value, then save. Do not place it in Vercel or source control and do not send its value in chat. | Enables HMAC validation for real Printify product-event webhooks. |
| Temu affiliate approval | In the authorised Temu Affiliate account, confirm the traffic source / account approval and obtain valid permitted share/deep links. Return the approval status and three source product URLs/IDs. | Required before controlled link validation and any expansion. |
| PayFast | Complete merchant/KYC approval and create/verify the Cossa merchant account. Provide confirmation that production credentials are stored only in the secure provider/environment manager; never paste them into chat. | Required before technical callback/ITN integration can be enabled. |
| Ozow | Complete merchant onboarding/site approval and obtain the authorised SiteCode/production access configuration through the merchant dashboard. Keep credentials in secure configuration only. | Required before payment initiation and notify-url validation can be enabled. |
| AI provider reliability | Confirm the intended paid/free provider and model budget in the provider dashboard, then update only the protected deployment setting and redeploy. | Current runtime history includes unavailable-model and quota/request-size failures. |

## Safe delivery order

1. Merge and deploy the reviewed payment-readiness wording/report only after approval.
2. Build a tested Supplier Registry and adapter contract that references the current `store_products` catalogue rather than replacing it.
3. Add source-code and supplier-reference migration/backfill in an isolated environment, with Printify seeded from its existing real mappings and Temu kept blocked.
4. Add supplier sync-run/audit records, then make the Printify adapter use that standard contract without exposing credentials.
5. Implement post-payment Printify fulfilment only as an explicitly controlled workflow; no automatic live purchase.
6. Build a privacy-governed Store-to-Growth event outbox and consumer.
7. Repair Growth multi-tenancy/RLS before merging the free-workspace branch.
8. Retest CRM CRUD, Lead Hunter, AI, Company Brain and external integrations with real authorised accounts.

## Testing recorded during this audit

- Active POD product → product page → variant → cart → checkout route was verified without submitting a payment or placing a Printify order.
- Active affiliate product rendered a disclosure and external Temu link; it did not enter Cossa cart/checkout.
- Store legal/contact/policy pages and secure EFT route loaded.
- Printify sync records showed real provider product/variant/cost/price data for active POD entries.
- Growth production landing page loaded and marked examples as illustrative.
- Vercel production deployment for `cossa-ai-os` is READY. Current runtime history still requires AI provider follow-up above.

## Deliberately not done

- No paid Printify order or supplier order was created.
- No payment-provider account, contract or KYC step was accepted on behalf of Cossa.
- No Temu approval was bypassed.
- No fake product, stock, customer, order, review, social post, lead or AI output was created.
- No production migration or RLS policy was applied by this audit.
