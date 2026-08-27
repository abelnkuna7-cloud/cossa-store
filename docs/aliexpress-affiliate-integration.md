# AliExpress Affiliate Integration Contract

Status: preview design contract — no production credentials or automated API connection are claimed.

## Commercial model

AliExpress listings are affiliate products, not Cossa-owned inventory and not Cossa-fulfilled dropshipping orders.

Required Store truth:

- `product_type = affiliate`
- `fulfilment_model = affiliate_redirect`
- `supplier_name = AliExpress`
- `inventory_ownership = affiliate_merchant`
- `track_inventory = false`
- Cossa checkout must not collect payment for the AliExpress item.
- The customer must be sent through the approved tracked affiliate URL.
- Product price/availability shown by Cossa is informational and may change at the merchant; the merchant page remains authoritative at purchase time.
- Affiliate commission is not Store sales revenue until an attributable affiliate order/commission record is actually reported.

## Phase 1 — approved-link workflow

Works without an AliExpress developer AppKey.

An authorised Store administrator can stage a product with:

- AliExpress product URL or product ID
- Cossa-approved tracked affiliate URL
- product title
- category
- image(s)
- current displayed merchant price and currency, if verified
- optional merchant/product reference

All new records remain `draft` until reviewed. No invented stock quantity is stored.

## Phase 2 — Affiliate API automation

Configuration-required until all required AliExpress developer credentials are verified server-side.

Expected protected configuration:

- AliExpress AppKey
- AliExpress App Secret
- approved affiliate tracking ID / app signature as required by the current AliExpress affiliate API account

Potential authorised capabilities after credential verification:

- product discovery/query
- product-detail refresh
- tracked affiliate-link generation
- affiliate order/commission reporting

API secrets must remain server-side and must never be exposed to the browser or catalogue.

## Inventory semantics

Affiliate merchant availability is not Cossa inventory.

Use:

- `inventory_ownership = affiliate_merchant`
- `inventory_source_status = unknown` unless a current merchant/API availability check is recorded
- `stock_quantity = 0`
- `unlimited_stock = false`
- `track_inventory = false`

The Store UI should use wording such as "Check availability on AliExpress" rather than "In stock" unless current merchant evidence supports that statement.

## Revenue semantics

Do not count the AliExpress basket value as Cossa Store paid revenue.

Track separately:

- affiliate clicks
- attributed orders when reported by the affiliate network
- approved/pending commission
- paid commission

Only paid affiliate commission is cash revenue.
