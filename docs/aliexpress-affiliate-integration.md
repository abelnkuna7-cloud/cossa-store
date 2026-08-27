# AliExpress Affiliate Integration Contract

Status: preview implementation contract. Affiliate approval is recognised, but automated AliExpress API access is not claimed until the required developer credentials are verified server-side.

## Commercial model

AliExpress listings are affiliate partner offers, not Cossa-owned inventory and not Cossa-fulfilled orders.

Store truth:

- `product_type = affiliate`
- `fulfilment_model = affiliate`
- `supplier_name = AliExpress`
- `inventory_ownership = affiliate_merchant`
- `track_inventory = false`
- `stock_quantity = 0`
- `unlimited_stock = false`
- customer checkout happens on AliExpress through the approved tracked affiliate URL
- Cossa Store does not collect payment for the AliExpress item
- merchant price and availability can change; AliExpress remains authoritative at purchase time
- gross AliExpress basket/order value is not Cossa Store cash revenue
- only actual paid affiliate commission is cash revenue

## Phase 1 — approved tracked-link workflow

Available without an AliExpress developer AppKey.

An authorised Store administrator may stage an AliExpress affiliate product with:

- AliExpress product URL or product ID/reference
- approved tracked affiliate URL
- product title
- department/category
- real product image(s)
- current merchant price and currency when verified
- merchant/product reference where available

All new products remain `draft` until reviewed. Stock is never represented as Cossa inventory.

## Phase 2 — Affiliate API automation

Configuration-required until the current AliExpress Open Platform credentials are verified server-side.

Expected protected configuration may include:

- AliExpress AppKey
- AliExpress App Secret
- affiliate tracking ID / app signature required by the approved account

After verification, authorised capabilities can include product discovery, product-detail refresh, tracked-link generation and affiliate order/commission reporting.

Secrets must remain server-side.

## Revenue and analytics

Track separately from ordinary Store orders:

- affiliate link clicks
- attributed merchant orders when reported
- pending commission
- approved commission
- paid commission

Only paid commission is recognised as Cossa affiliate cash revenue.
