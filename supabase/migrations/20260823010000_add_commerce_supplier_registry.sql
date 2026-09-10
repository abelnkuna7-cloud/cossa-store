-- Supplier Registry foundation for the existing Cossa master catalogue.
-- This migration deliberately extends public.store_products; it does not create a
-- second catalogue or store raw provider credentials in the database.
--
-- Apply only after an isolated Supabase/local test has passed.

create table if not exists public.commerce_suppliers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  supplier_code text not null,
  supplier_name text not null,
  legal_name text,
  supplier_type text not null default 'other',
  commerce_model text not null default 'other',
  network text,
  country_code text,
  website_url text,
  integration_type text not null default 'manual',
  api_base_url text,
  credential_reference text,
  authentication_type text,
  affiliate_account_id text,
  tracking_link_template text,
  commission_model text,
  commission_rate numeric,
  commission_currency text,
  attribution_window_days integer,
  payout_method text,
  minimum_payout numeric,
  south_africa_eligible boolean,
  order_routing_method text,
  fulfilment_model text,
  returns_responsibility text,
  shipping_responsibility text,
  allowed_promotional_channels jsonb not null default '[]'::jsonb,
  prohibited_promotions jsonb not null default '[]'::jsonb,
  disclosure_requirements text,
  terms_url text,
  terms_version text,
  terms_reviewed_at timestamptz,
  application_status text not null default 'draft',
  approval_status text not null default 'pending',
  integration_status text not null default 'not_configured',
  last_successful_sync_at timestamptz,
  last_failed_sync_at timestamptz,
  last_sync_error text,
  health_status text not null default 'unknown',
  is_active boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_suppliers_code_format_check
    check (supplier_code ~ '^[A-Z][A-Z0-9_-]{1,39}$'),
  constraint commerce_suppliers_commission_rate_check
    check (commission_rate is null or commission_rate >= 0),
  constraint commerce_suppliers_attribution_window_check
    check (attribution_window_days is null or attribution_window_days >= 0),
  constraint commerce_suppliers_minimum_payout_check
    check (minimum_payout is null or minimum_payout >= 0),
  constraint commerce_suppliers_allowed_channels_array_check
    check (jsonb_typeof(allowed_promotional_channels) = 'array'),
  constraint commerce_suppliers_prohibited_promotions_array_check
    check (jsonb_typeof(prohibited_promotions) = 'array'),
  constraint commerce_suppliers_org_code_key unique (organisation_id, supplier_code),
  constraint commerce_suppliers_id_organisation_key unique (id, organisation_id)
);

create index if not exists commerce_suppliers_organisation_status_idx
  on public.commerce_suppliers (organisation_id, is_active, integration_status);

create index if not exists commerce_suppliers_organisation_health_idx
  on public.commerce_suppliers (organisation_id, health_status, updated_at desc);

create or replace function public.touch_commerce_supplier_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_commerce_supplier_updated_at on public.commerce_suppliers;
create trigger trg_touch_commerce_supplier_updated_at
before update on public.commerce_suppliers
for each row
execute function public.touch_commerce_supplier_updated_at();

alter table public.commerce_suppliers enable row level security;
revoke all on table public.commerce_suppliers from anon;
grant select, insert, update, delete on table public.commerce_suppliers to authenticated;

drop policy if exists "cossa catalogue admins manage supplier registry" on public.commerce_suppliers;
create policy "cossa catalogue admins manage supplier registry"
on public.commerce_suppliers
for all
to authenticated
using (
  exists (
    select 1
    from public.organisation_members member
    where member.organisation_id = commerce_suppliers.organisation_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organisation_members member
    where member.organisation_id = commerce_suppliers.organisation_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
);

create table if not exists public.commerce_supplier_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  supplier_id uuid not null,
  run_kind text not null,
  trigger_source text not null default 'manual',
  idempotency_key text,
  status text not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  retry_count integer not null default 0,
  records_received integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  records_archived integer not null default 0,
  source_updated_at timestamptz,
  error_code text,
  error_message text,
  result_summary jsonb not null default '{}'::jsonb,
  triggered_by_user_id uuid,
  created_at timestamptz not null default now(),
  constraint commerce_supplier_sync_runs_retry_count_check
    check (retry_count >= 0),
  constraint commerce_supplier_sync_runs_counts_check
    check (
      records_received >= 0
      and records_created >= 0
      and records_updated >= 0
      and records_skipped >= 0
      and records_archived >= 0
    ),
  constraint commerce_supplier_sync_runs_result_summary_object_check
    check (jsonb_typeof(result_summary) = 'object'),
  constraint commerce_supplier_sync_runs_supplier_org_fkey
    foreign key (supplier_id, organisation_id)
    references public.commerce_suppliers (id, organisation_id)
    on delete restrict,
  constraint commerce_supplier_sync_runs_idempotency_key
    unique (supplier_id, idempotency_key)
);

create index if not exists commerce_supplier_sync_runs_supplier_created_idx
  on public.commerce_supplier_sync_runs (supplier_id, created_at desc);

create index if not exists commerce_supplier_sync_runs_organisation_status_idx
  on public.commerce_supplier_sync_runs (organisation_id, status, created_at desc);

alter table public.commerce_supplier_sync_runs enable row level security;
revoke all on table public.commerce_supplier_sync_runs from anon;
grant select, insert, update, delete on table public.commerce_supplier_sync_runs to authenticated;

drop policy if exists "cossa catalogue admins manage supplier sync runs" on public.commerce_supplier_sync_runs;
create policy "cossa catalogue admins manage supplier sync runs"
on public.commerce_supplier_sync_runs
for all
to authenticated
using (
  exists (
    select 1
    from public.organisation_members member
    where member.organisation_id = commerce_supplier_sync_runs.organisation_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organisation_members member
    where member.organisation_id = commerce_supplier_sync_runs.organisation_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
);

alter table public.store_products
  add column if not exists supplier_id uuid,
  add column if not exists source_code text,
  add column if not exists source_updated_at timestamptz,
  add column if not exists last_supplier_sync_at timestamptz,
  add column if not exists product_health_status text not null default 'unknown';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_products_supplier_organisation_fkey'
      and conrelid = 'public.store_products'::regclass
  ) then
    alter table public.store_products
      add constraint store_products_supplier_organisation_fkey
      foreign key (supplier_id, organisation_id)
      references public.commerce_suppliers (id, organisation_id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_products_source_code_format_check'
      and conrelid = 'public.store_products'::regclass
  ) then
    alter table public.store_products
      add constraint store_products_source_code_format_check
      check (source_code is null or source_code ~ '^[A-Z][A-Z0-9_-]{2,159}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_products_product_health_status_check'
      and conrelid = 'public.store_products'::regclass
  ) then
    alter table public.store_products
      add constraint store_products_product_health_status_check
      check (product_health_status in ('unknown', 'healthy', 'review', 'stale', 'blocked', 'out_of_stock', 'archived'));
  end if;
end;
$$;

-- Seed only the records already represented in the current Cossa catalogue.
-- credential_reference is a label only; never place an API key, token, password
-- or OAuth secret in this table.
insert into public.commerce_suppliers (
  organisation_id,
  supplier_code,
  supplier_name,
  supplier_type,
  commerce_model,
  network,
  country_code,
  website_url,
  integration_type,
  credential_reference,
  authentication_type,
  order_routing_method,
  fulfilment_model,
  returns_responsibility,
  shipping_responsibility,
  application_status,
  approval_status,
  integration_status,
  health_status,
  is_active
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'COSSA',
    'Cossa Nexus Holdings',
    'internal',
    'cossa_owned',
    'Cossa',
    'ZA',
    'https://cossanexusholdings.co.za',
    'internal',
    null,
    null,
    'cossa',
    'digital',
    'Cossa Store policy',
    'Cossa Store policy',
    'approved',
    'approved',
    'connected',
    'unknown',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    'PRT',
    'Printify',
    'print_on_demand',
    'print_on_demand',
    'Printify',
    null,
    'https://printify.com',
    'api',
    'Supabase Edge Function secret reference: PRINTIFY_API_TOKEN',
    'bearer_token',
    'controlled_post_payment',
    'print_on_demand',
    'Cossa Store policy',
    'Printify production and shipping workflow',
    'approved',
    'approved',
    'connected',
    'unknown',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    'TMU',
    'Temu',
    'affiliate_network',
    'affiliate',
    'Temu Affiliate',
    'ZA',
    'https://www.temu.com',
    'affiliate_link',
    null,
    null,
    'external_affiliate_redirect',
    'affiliate',
    'Temu policy',
    'Temu policy',
    'pending',
    'pending',
    'approval_pending',
    'unknown',
    true
  )
on conflict (organisation_id, supplier_code) do nothing;

update public.store_products product
set supplier_id = supplier.id
from public.commerce_suppliers supplier
where product.organisation_id = supplier.organisation_id
  and product.supplier_id is null
  and (
    (product.product_type = 'digital' and supplier.supplier_code = 'COSSA')
    or (lower(coalesce(product.supplier_name, '')) = 'printify' and supplier.supplier_code = 'PRT')
    or (lower(coalesce(product.supplier_name, '')) = 'temu' and supplier.supplier_code = 'TMU')
  );

update public.store_products product
set source_code = 'POD-PRT-' || upper(regexp_replace(trim(product.supplier_product_ref), '[^A-Za-z0-9]+', '-', 'g'))
from public.commerce_suppliers supplier
where product.supplier_id = supplier.id
  and supplier.supplier_code = 'PRT'
  and product.source_code is null
  and nullif(trim(coalesce(product.supplier_product_ref, '')), '') is not null;

update public.store_products product
set source_code = 'AFF-TMU-' || upper(regexp_replace(trim(product.supplier_product_ref), '[^A-Za-z0-9]+', '-', 'g'))
from public.commerce_suppliers supplier
where product.supplier_id = supplier.id
  and supplier.supplier_code = 'TMU'
  and product.source_code is null
  and nullif(trim(coalesce(product.supplier_product_ref, '')), '') is not null;

update public.store_products product
set source_code = 'DIG-COS-' || upper(regexp_replace(trim(product.sku), '[^A-Za-z0-9]+', '-', 'g'))
from public.commerce_suppliers supplier
where product.supplier_id = supplier.id
  and supplier.supplier_code = 'COSSA'
  and product.product_type = 'digital'
  and product.source_code is null
  and nullif(trim(coalesce(product.sku, '')), '') is not null;

alter table public.store_products
  validate constraint store_products_supplier_organisation_fkey;

create unique index if not exists store_products_org_source_code_key
  on public.store_products (organisation_id, source_code)
  where source_code is not null;

create unique index if not exists store_products_supplier_source_identity_key
  on public.store_products (organisation_id, supplier_id, (trim(supplier_product_ref)))
  where supplier_id is not null
    and nullif(trim(coalesce(supplier_product_ref, '')), '') is not null;

create index if not exists store_products_supplier_health_idx
  on public.store_products (organisation_id, supplier_id, product_health_status, updated_at desc);
