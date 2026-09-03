-- COSSA LIFESTYLE / PRINTIFY FULFILMENT FOUNDATION
-- ADDITIVE ONLY. This migration is intentionally not deployed by this commit.
-- Printify remains a private fulfilment provider; customer-facing Cossa product data stays separate.

create table if not exists public.store_product_fulfilment_mappings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  store_product_id uuid not null references public.store_products(id) on delete restrict,
  store_variant_id uuid references public.store_product_variants(id) on delete restrict,
  provider text not null,
  -- Existing-product fulfilment may use provider_product_id. Cossa-owned artwork may
  -- instead be submitted as a custom Printify order using blueprint/provider/artwork.
  provider_product_id text,
  provider_variant_id text,
  blueprint_id text,
  print_provider_id text,
  artwork_asset_ref text,
  fulfilment_status text not null default 'active',
  sync_status text not null default 'pending',
  fallback_provider text,
  fallback_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_product_fulfilment_provider_check
    check (provider in ('Printify')),
  constraint store_product_fulfilment_status_check
    check (fulfilment_status in ('active','paused','disabled')),
  constraint store_product_fulfilment_sync_status_check
    check (sync_status in ('pending','synced','stale','error')),
  constraint store_product_fulfilment_target_check
    check (
      nullif(btrim(coalesce(provider_product_id, '')), '') is not null
      or (
        nullif(btrim(coalesce(blueprint_id, '')), '') is not null
        and nullif(btrim(coalesce(print_provider_id, '')), '') is not null
        and nullif(btrim(coalesce(artwork_asset_ref, '')), '') is not null
      )
    )
);

create unique index if not exists uq_store_product_fulfilment_mapping_variant
  on public.store_product_fulfilment_mappings (
    store_product_id,
    coalesce(store_variant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    provider
  );

create index if not exists idx_store_product_fulfilment_provider_lookup
  on public.store_product_fulfilment_mappings(provider, provider_product_id, provider_variant_id);

create table if not exists public.store_fulfilment_orders (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  store_order_id uuid not null references public.store_orders(id) on delete restrict,
  provider text not null,
  provider_order_id text,
  idempotency_key text not null,
  status text not null default 'pending',
  request_payload jsonb,
  provider_response jsonb,
  tracking_number text,
  tracking_url text,
  last_error text,
  submitted_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_fulfilment_order_provider_check
    check (provider in ('Printify')),
  constraint store_fulfilment_order_status_check
    check (status in ('pending','submitting','submitted','in_production','shipped','delivered','failed','cancelled'))
);

-- Exactly one provider fulfilment record per Cossa Store order/provider.
-- This is the database-level duplicate-order guard.
create unique index if not exists uq_store_fulfilment_order_provider
  on public.store_fulfilment_orders(store_order_id, provider);

create unique index if not exists uq_store_fulfilment_order_idempotency
  on public.store_fulfilment_orders(idempotency_key);

create index if not exists idx_store_fulfilment_provider_order
  on public.store_fulfilment_orders(provider, provider_order_id);

alter table public.store_product_fulfilment_mappings enable row level security;
alter table public.store_fulfilment_orders enable row level security;

-- No anon/authenticated public grants are added. Provider IDs, supplier costs,
-- artwork references and fulfilment payloads remain server/admin-only.

create policy "cossa admins can read fulfilment mappings"
on public.store_product_fulfilment_mappings
for select to authenticated
using (
  exists (
    select 1
    from public.organisation_members om
    where om.organisation_id = store_product_fulfilment_mappings.organisation_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner','admin')
  )
);

create policy "cossa admins can manage fulfilment mappings"
on public.store_product_fulfilment_mappings
for all to authenticated
using (
  exists (
    select 1
    from public.organisation_members om
    where om.organisation_id = store_product_fulfilment_mappings.organisation_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from public.organisation_members om
    where om.organisation_id = store_product_fulfilment_mappings.organisation_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner','admin')
  )
);

create policy "cossa admins can read fulfilment orders"
on public.store_fulfilment_orders
for select to authenticated
using (
  exists (
    select 1
    from public.organisation_members om
    where om.organisation_id = store_fulfilment_orders.organisation_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner','admin')
  )
);

-- Writes to store_fulfilment_orders are deliberately service-role only.
-- There is no authenticated INSERT/UPDATE/DELETE policy. This prevents the
-- browser from creating or changing fulfilment orders directly.
