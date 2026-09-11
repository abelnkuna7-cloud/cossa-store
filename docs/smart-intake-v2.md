# Cossa Store Smart Intake 2.0

## Purpose

Smart Intake is the reusable supplier-to-store operating pipeline for Cossa Store. It must turn supplier CSV, XML, API, manual feed, or catalogue evidence into safe, searchable, commercially viable, customer-ready products with minimal CEO involvement.

The system exists to generate revenue, save time, reduce avoidable cost, and automate repetitive Store operations 24/7 while preserving Cossa approval, audit, security, pricing, delivery, and publication controls.

## Core pipeline

Supplier source -> Normalise -> Deduplicate -> Evidence -> Stock -> Commercial intelligence -> Product intelligence -> Image custody -> SEO/discovery -> Delivery intelligence -> Quality score -> Publish/Hold -> Continuous monitoring.

## Supported source formats

Smart Intake adapters must converge into one canonical product model regardless of source:

- CSV upload/export
- XML product feeds
- JSON/API feeds
- Supplier websites/catalogues
- Manual single-product intake
- Webhook or scheduled supplier synchronisation

Every adapter must preserve the original supplier SKU/product ID, source URL, source filename/feed reference, observed time, source hash, raw cost/RRP, raw availability and import trace.

## Canonical intake capabilities

### Identity and duplicate protection

- Match supplier + supplier SKU as the primary identity.
- Detect duplicate URLs, names, EAN/GTIN/MPN where available.
- Never create a second public product for the same canonical intake unless explicitly approved as a real variant.
- Preserve source history and previous publication links.

### Supplier evidence

- Resolve the official supplier/manufacturer product page when available.
- Prefer manufacturer/supplier evidence over third-party marketplaces.
- Capture specifications, features, dimensions, weight, colour, compatibility, warranty language and box contents only when supported by evidence.
- Never invent missing measurements, warranty periods, certifications or stock quantities.
- Maintain evidence timestamp, source URL and confidence/state.

### Stock intelligence

Stock is a live commercial gate, not a one-time import value.

- Preserve supplier-reported quantity when a trusted feed provides it.
- Maintain a separate availability state: available, unavailable, unknown/stale.
- Periodically re-check published supplier-managed products.
- If strong supplier evidence says out of stock, immediately block direct purchase while keeping the product page indexable where commercially useful.
- Re-enable direct purchase only after fresh positive supplier evidence.
- Do not convert a generic “in stock” web signal into an invented numerical quantity.
- Record last checked time, source and evidence.
- Checkout must perform a fresh/still-valid availability gate for supplier-managed products before creating payment requests.

### Commercial intelligence

For each candidate product:

- Calculate effective landed acquisition cost including non-recoverable VAT and known supplier charges.
- Search credible South African competitors when possible.
- Classify competitor observations as NORMAL, SPECIAL, CLEARANCE, MARKETPLACE or OUTLIER.
- Do not force a loss to beat the cheapest listing.
- Recommend a sustainable Cossa normal selling price and show gross margin and margin percentage.
- Preserve CEO-approved price overrides.
- Alert when supplier cost changes materially, margin drops below policy, or competitor positioning becomes uncompetitive.
- Never auto-raise/lower a CEO-locked price without the configured pricing approval policy.

### Product intelligence and customer page quality

Generate and maintain:

- Customer-readable product title
- Short description
- Full description
- Feature bullets
- Technical specifications
- Correct primary Store department/category
- Additional relevant categories
- Brand/manufacturer only when supported by evidence
- Variant relationships where real variants exist
- Compatibility/use-case information
- Customer delivery notice
- Returns/warranty treatment using Cossa policy plus supplier evidence
- Related-product and cross-sell hints when reliable

The product page should answer the customer’s buying questions rather than copy a supplier feed verbatim.

### Image intelligence and Cossa custody

- Prefer official supplier/manufacturer product images.
- Reject logos, favicons, placeholders, headers, generic brand graphics, tiny icons and unrelated images.
- Validate MIME/magic bytes and size.
- Copy accepted catalogue images into Cossa-controlled Store storage with immutable hashed paths and cache headers.
- Deduplicate identical images.
- Generate useful alt text from the verified product title and image role.
- Keep supplier image/source references internally for traceability.
- Do not publish when the main image cannot be safely identified.

### SEO and discovery intelligence

Smart Intake must prepare each public product for organic discovery across Google and other search/discovery surfaces.

Per product:

- Natural SEO title, normally <= 60–70 characters where practical.
- Useful meta description, normally about 140–160 characters.
- Canonical customer URL/slug.
- Search-oriented but non-spammy merchandising tags.
- Supplier model/SKU, brand, category, use-case and South African intent terms when natural.
- Clear image alt text.
- Rich product descriptions that answer feature, compatibility and use-case queries.
- Avoid duplicate/thin descriptions across variants/products.

Store-level discovery already includes product structured data, sitemap and merchant-feed infrastructure. Smart Intake must feed those systems clean, complete and truthful product data instead of creating a separate SEO stack.

Future discovery adapters should support:

- Google Merchant Center feed quality checks
- Google Search Console/indexing diagnostics
- Bing/Microsoft discovery feeds where commercially useful
- Social catalogue/feed exports for Meta, Pinterest, TikTok or other approved channels
- Schema validation for Product, Offer, Breadcrumb and future ProductGroup/variant markup
- Search performance feedback loops: impressions, clicks, CTR, queries and conversion where available

### Delivery intelligence

Before direct publication of physical products:

- Supplier and fulfilment profile must be active.
- Delivery payer and method must be known.
- Destination pricing must be server-owned.
- Weight/dimensions must satisfy supplier-specific rules.
- Missing/ambiguous high-risk parcel data must route to HOLD/manual quote, never guessed shipping.
- Payment path must show final subtotal + delivery + total before EFT/payment.

### Quality score and hard gates

AI/completeness scoring never overrides hard safety gates.

Recommended score bands:

- 90–100: eligible for automatic publication only when every hard gate passes and policy permits it.
- 85–89: prepared draft/CEO review.
- <85: HOLD with exact blockers.

Hard blockers include at minimum:

- duplicate canonical SKU/product
- inactive/unverified supplier
- unavailable/unknown stock beyond freshness policy
- missing approved selling price or unacceptable margin
- missing/unsafe main image
- missing customer copy/category
- delivery/parcel/payment readiness failure
- unresolved evidence conflict
- destructive or security-sensitive change requiring approval

## Continuous monitoring after publication

Published products remain managed assets. Smart Intake should continue checking:

- supplier stock/availability
- supplier cost/RRP changes
- discontinued/removed supplier listings
- material specification changes
- image/link health
- delivery evidence freshness
- pricing margin erosion
- competitor positioning
- SEO metadata quality
- sitemap/merchant-feed inclusion
- product page HTTP/indexability
- search performance when Search Console/analytics data is connected

Safe housekeeping may auto-run. Financial, destructive, security-sensitive, supplier identity, and unusual publication actions remain controlled by Cossa approval policy.

## Supplier adapter contract

Every supplier adapter should implement the same logical outputs:

- supplier_id
- supplier_product_ref
- title/name
- supplier category
- cost and currency
- RRP/sale price where supplied
- available/unavailable and optional trusted quantity
- source URL
- image candidates
- specifications/features/evidence
- observed_at/source hash

CSV/XML/API differences stop at the adapter. Downstream commercial, SEO, delivery, image and publication logic stays shared.

## Astrum first rollout

Astrum is the proving supplier for Smart Intake 2.0.

1. Use the existing imported Astrum intakes; never re-import the same batch merely to enrich them.
2. Published/CEO-approved SAFE products move through automated evidence, image custody, SEO, delivery and publication gates.
3. HOLD SKUs remain blocked until their specific evidence problem is resolved.
4. Build stock monitoring before expanding automatic publication to the wider Astrum catalogue.
5. Once Astrum is stable, reuse the same pipeline for DMC and future CSV/XML/API suppliers.

## Operating principle

The CEO should spend time on suppliers, customers, partnerships, tenders, marketing, negotiation and expansion—not repetitive product entry. Smart Intake should carry the repeatable work, surface exceptions and decisions, and prove why every product was published, held, repriced, paused or restored.
