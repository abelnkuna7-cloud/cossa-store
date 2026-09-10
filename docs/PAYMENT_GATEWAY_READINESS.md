# Payment Gateway Readiness Report

**Scope:** Cossa Store production readiness for PayFast and Ozow  
**Audit date:** 23 August 2026  
**Current production commit assessed:** `51552f70b2f543c8466bdbda477b6168f2ab0650`

## Executive status

Cossa Store is a real, transaction-capable catalogue with a secure **manual EFT** payment-request flow. It is **not yet ready to claim PayFast or Ozow as live payment methods**. This report deliberately distinguishes the existing EFT route from gateway approval and from verified automated fulfilment.

No fake orders, payment attempts, reviews, stock, customers, or provider credentials were used in this audit.

## Evidence checked

- 54 public products: 37 digital, 14 Printify POD, 3 Temu affiliate offers.
- All 37 active digital products have a configured delivery path, filename, access period and download limit; all 37 referenced objects exist in the private `store-digital-products` bucket.
- All 14 active POD products have Printify source product IDs, source prices/costs, images, ZAR prices and SEO metadata.
- A live POD mug was checked through product page, variant selection and Add to Cart. The checkout page loaded its address and Printify shipping-quote workflow, but no payment request or paid order was submitted.
- A live Temu affiliate product was checked. It has disclosure and a `nofollow sponsored` external partner link; it does not offer Add to Cart.
- Terms, privacy, returns, delivery, contact and order-help routes load on production.
- Current direct checkout uses a signed-in, server-validated EFT payment request and proof-review process.

## Readiness matrix

| Requirement | PayFast | Ozow | Evidence / action |
| --- | --- | --- | --- |
| Real catalogue and public product pages | READY | READY | Direct-sale digital and POD products are live; affiliate offers route externally. |
| Customer cart and checkout route | PARTIAL | PARTIAL | Working EFT checkout exists, but no gateway-specific initiation exists. |
| ZAR pricing | READY | READY | Store currency is ZAR; Ozow documents require ZAR. |
| Delivery address and POD shipping calculation | PARTIAL | PARTIAL | Printify delivery quoting exists at EFT checkout; successful payment to Printify order workflow is not automated yet. |
| Server-side payment initiation | MISSING | MISSING | No PayFast/Ozow server function, form/signature handler or callback handler exists. |
| Verified callback / webhook processing | MISSING | MISSING | No provider signature verification or idempotent payment-status implementation exists. |
| Secure secrets | PARTIAL | PARTIAL | Gateway names/required keys are documented but no merchant credentials were found or exposed. Add them only as server-side secrets after approval. |
| Merchant account and KYC | OWNER ACTION REQUIRED | OWNER ACTION REQUIRED | Cossa must apply and satisfy each provider's current onboarding requirements. |
| Provider approval | PROVIDER APPROVAL REQUIRED | PROVIDER APPROVAL REQUIRED | Do not enable a payment button until approval and live credentials are confirmed. |
| Gateway sandbox test | BLOCKED | BLOCKED | Requires provider-issued test access/credentials. |
| Production transaction test | BLOCKED | BLOCKED | Requires approved merchant credentials and owner authorisation for a real payment. |

## Current checkout and fulfilment limits

1. **Manual EFT is live; PayFast and Ozow are not.** The public copy now says this explicitly.
2. The EFT checkout validates active product and selected Printify variant server-side and asks Printify for shipping. It then creates an EFT payment request.
3. Payment-proof approval does not yet create a Printify production order. This must remain manually controlled until an explicit, safeguarded fulfilment workflow is built and approved; sending a Printify order may incur Cossa cost.
4. Affiliate products are correctly excluded from the Cossa cart path, but two published Temu offers still lack a permanent external product ID. Bulk Temu expansion must remain blocked until those source IDs and Temu affiliate approval are verified.
5. The current product schema labels storefront prices as VAT-inclusive but does not keep a separate per-product VAT-treatment field. Confirm the current VAT treatment with Cossa's tax records before presenting it as gateway evidence.

## Required technical work before enabling either gateway

1. Add a server-side `create-payment` action per provider that creates the Cossa order first and calculates its amount from server-side catalogue data.
2. Implement provider-specific signed initiation and callback/webhook verification. Never trust a browser return URL as proof of payment.
3. Make callback processing idempotent: verify merchant reference, amount, currency and signature; record provider transaction ID; transition the order once only.
4. Create fulfilment only after verified payment. For POD, use an explicit approval/automation setting so no Printify charge is made accidentally.
5. Release a digital entitlement only after verified paid status.
6. Preserve affiliate exclusion from cart and payment.
7. Add a secured payment operations audit trail and admin review screen.
8. Test provider sandbox notification/callback paths before a small owner-approved real transaction.

## Owner actions

### PayFast

1. Go to [PayFast registration](https://registration.payfast.io/) and apply as **Cossa Nexus Holdings (Pty) Ltd**.
2. Use the same legal company identity, South African support contact, business address, Store URL and policies that are live on Cossa Store. Do not alter business details merely to fit the application.
3. Complete the KYC steps and upload the exact current documents requested in the PayFast dashboard. PayFast states that verification is required before an account can transact.
4. Once PayFast confirms the merchant account is ready, in the PayFast dashboard obtain the Merchant ID and Merchant Key, set a passphrase, and request/enable the intended payment methods.
5. Return only: **“PayFast approved; sandbox/live credentials are in the approved secret manager.”** Do not paste keys into chat or source control.

### Ozow

1. Apply through Ozow's merchant onboarding using the same verified Cossa legal identity and Store URL.
2. Complete the provider's requested verification/approval process.
3. In Ozow Merchant Admin, add the Cossa Store domain. Ozow generates a SiteCode for a configured site.
4. Return only: **“Ozow approved; SiteCode and integration credentials are in the approved secret manager.”** Do not paste them into chat or source control.

## Official provider references

- [PayFast KYC guidance](https://payfast.io/blog/kyc-explained-for-smes-how-to-get-verified-faster-with-payfast/)
- [PayFast merchant credential guidance](https://payfast.io/faq/merchant-faqs/)
- [Ozow integration requirements](https://ozow.com/integrations)

## Security findings outside payment integration

Supabase's security advisor currently flags:
- several publicly executable `SECURITY DEFINER` CRM/lead functions;
- a mutable search path on the Store variant timestamp trigger;
- leaked-password protection not enabled in Supabase Auth.

These are tracked as Phase 0 security work and must be resolved carefully with regression tests; they are not changed by this copy-only branch.

## Decision

**Do not submit a PayFast or Ozow application claiming a live gateway.** The Store can truthfully present a real catalogue, real support and a manual EFT process today. Gateway approval should follow the missing technical integration, provider approval and a verified sandbox test.
