-- Production-applied Printify POD variant foundation.
-- Keeps provider/source currency data server-side while exposing only active-product variants through RLS.

alter table public.store_products
  add column if not exists source_currency text,
  add column if not exists source_price numeric,
  add column if not exists source_cost numeric,
  add column if not exists fx_rate_to_zar numeric,
  add column if not exists fx_rate_updated_at timestamptz;

create table if not exists public.store_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  provider text not null,
  provider_product_id text,
  provider_variant_id text not null,
  sku text,
  title text not null,
  option_values jsonb not null default '[]'::jsonb,
  source_currency text not null default 'USD',
  source_price numeric not null default 0,
  source_cost numeric,
  fx_rate_to_zar numeric not null default 1,
  price_zar numeric not null default 0,
  cost_zar numeric,
  is_default boolean not null default false,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  raw_provider_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_variant_id)
);

alter table public.store_product_variants enable row level security;
grant select on public.store_product_variants to anon, authenticated;

create index if not exists idx_store_product_variants_product_id on public.store_product_variants(product_id);
create index if not exists idx_store_product_variants_provider_product on public.store_product_variants(provider, provider_product_id);
create index if not exists idx_store_product_variants_public_lookup on public.store_product_variants(product_id, is_available, sort_order);

create policy "public can read variants for active products"
on public.store_product_variants for select to anon, authenticated
using (exists (select 1 from public.store_products p where p.id = store_product_variants.product_id and p.status = 'active'));

create policy "cossa admins can manage product variants"
on public.store_product_variants for all to authenticated
using (exists (
  select 1 from public.organisation_members om
  join public.store_products p on p.id = store_product_variants.product_id
  where om.organisation_id = p.organisation_id
    and om.user_id = auth.uid()
    and om.status = 'active'
    and om.role in ('owner','admin')
))
with check (exists (
  select 1 from public.organisation_members om
  join public.store_products p on p.id = store_product_variants.product_id
  where om.organisation_id = p.organisation_id
    and om.user_id = auth.uid()
    and om.status = 'active'
    and om.role in ('owner','admin')
));
