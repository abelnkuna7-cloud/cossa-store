-- Configuration-only delivery architecture. This migration is intentionally
-- additive: it neither changes catalogue visibility nor publishes products.
-- It must be applied to a reviewed environment through the normal migration
-- process; it is not run by the application or deployment.

create table if not exists public.store_delivery_rate_configurations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  supplier_id uuid not null references public.store_suppliers(id) on delete restrict,
  fulfilment_profile_id uuid not null references public.store_fulfilment_profiles(id) on delete restrict,
  method_code text not null check (length(trim(method_code)) > 0),
  customer_label text not null check (length(trim(customer_label)) > 0),
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  is_active boolean not null default false,
  customer_selectable boolean not null default false,
  is_default boolean not null default false,
  classification text not null check (classification in ('standard', 'oversized')),
  eligibility_requirements jsonb not null default '{}'::jsonb
    check (jsonb_typeof(eligibility_requirements) = 'object'),
  source_url text,
  source_evidence text,
  verified_at timestamptz,
  operational_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fulfilment_profile_id, method_code)
);

create index if not exists store_delivery_rate_configurations_profile_idx
  on public.store_delivery_rate_configurations (fulfilment_profile_id, is_active, customer_selectable);

create unique index if not exists store_delivery_rate_configurations_one_standard_default_idx
  on public.store_delivery_rate_configurations (fulfilment_profile_id)
  where is_default and classification = 'standard';

create unique index if not exists store_delivery_rate_configurations_one_oversized_default_idx
  on public.store_delivery_rate_configurations (fulfilment_profile_id)
  where is_default and classification = 'oversized';

-- Product measurements are private operational evidence, not customer-facing
-- copy. A measurement only becomes usable when its corresponding source and
-- verification timestamp have been recorded.
create table if not exists public.store_product_delivery_attributes (
  store_product_id uuid primary key references public.store_products(id) on delete cascade,
  length_cm numeric(10,2) check (length_cm > 0),
  width_cm numeric(10,2) check (width_cm > 0),
  height_cm numeric(10,2) check (height_cm > 0),
  weight_kg numeric(10,3) check (weight_kg > 0),
  dimension_kind text check (dimension_kind in ('product', 'packed_parcel')),
  dimensions_source_url text,
  dimensions_source_evidence text,
  dimensions_verified_at timestamptz,
  weight_source_url text,
  weight_source_evidence text,
  weight_verified_at timestamptz,
  operational_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (length_cm is null and width_cm is null and height_cm is null and dimension_kind is null)
    or (length_cm is not null and width_cm is not null and height_cm is not null and dimension_kind is not null)
  )
);

alter table public.store_delivery_rate_configurations enable row level security;
alter table public.store_product_delivery_attributes enable row level security;

revoke all on table public.store_delivery_rate_configurations from public, anon, authenticated;
revoke all on table public.store_product_delivery_attributes from public, anon, authenticated;
grant select, insert, update, delete on table public.store_delivery_rate_configurations to service_role;
grant select, insert, update, delete on table public.store_product_delivery_attributes to service_role;

-- Only the verified base DMC Locker-to-Door XL charge is configured. DMC/PUDO
-- evidence requires a parcel to fit a PUDO locker and weigh *under* 20 kg.
-- DMC also warns that larger parcels and remote destinations can incur a
-- surcharge, so a trusted address check must pass before this rate is quoted.
-- Locker-to-Locker, kiosk delivery and Bundle-Up are deliberately not
-- seeded/customer-selectable.
insert into public.store_delivery_rate_configurations (
  organisation_id,
  supplier_id,
  fulfilment_profile_id,
  method_code,
  customer_label,
  price,
  currency,
  is_active,
  customer_selectable,
  is_default,
  classification,
  eligibility_requirements,
  source_url,
  source_evidence,
  verified_at,
  operational_notes
)
select
  f.organisation_id,
  s.id,
  f.id,
  'dmc_locker_to_door_xl',
  'Locker-to-Door',
  179.00,
  'ZAR',
  true,
  true,
  true,
  'standard',
  jsonb_build_object(
    'requires_dimensions', true,
    'requires_weight', true,
    'allowed_dimension_kinds', jsonb_build_array('product', 'packed_parcel'),
    'max_length_cm', 60,
    'max_width_cm', 41,
    'max_height_cm', 69,
    'max_weight_kg_exclusive', 20,
    'max_rate_age_days', 90,
    'requires_address_eligibility', true,
    'parcel_eligibility', 'XL PUDO-box eligible parcel that fits a PUDO locker',
    'base_rate_scope', 'Locker-to-Door base rate only',
    'surcharge_condition', 'Larger parcels or remote destinations may incur a surcharge'
  ),
  'https://dmcwholesale.co.za/pages/wholesale-customer-terms-conditions',
  'Current DMC delivery policy: Locker-to-Door base rate is R179 for an XL PUDO box; larger boxes and remote destinations may incur a surcharge. Current PUDO policy: parcel must fit a PUDO locker and weigh under 20 kg. Supporting policy: https://mail.pudo.co.za/faq.php',
  now(),
  'Customer-paid DMC base rate. Quote only after verified dimensions, packed weight and destination eligibility. No oversized rate is configured; a larger parcel, surcharge-required destination, or missing weight/destination evidence requires a manual delivery quote.'
from public.store_fulfilment_profiles f
join public.store_suppliers s on s.id = f.supplier_id
where f.profile_code = 'dmc-sa-customer-paid'
  and s.name = 'DMC Wholesale'
on conflict (fulfilment_profile_id, method_code) do update
set supplier_id = excluded.supplier_id,
    customer_label = excluded.customer_label,
    price = excluded.price,
    currency = excluded.currency,
    is_active = excluded.is_active,
    customer_selectable = excluded.customer_selectable,
    is_default = excluded.is_default,
    classification = excluded.classification,
    eligibility_requirements = excluded.eligibility_requirements,
    source_url = excluded.source_url,
    source_evidence = excluded.source_evidence,
    verified_at = excluded.verified_at,
    operational_notes = excluded.operational_notes,
    updated_at = now();

-- DM8363's supplier page documents dimensions but not a parcel weight. Record
-- only that verified fact; the missing weight intentionally keeps the product
-- in "Delivery quote required" state rather than inventing an R179 quote.
insert into public.store_product_delivery_attributes (
  store_product_id,
  length_cm,
  width_cm,
  height_cm,
  dimension_kind,
  dimensions_source_url,
  dimensions_source_evidence,
  dimensions_verified_at,
  operational_notes
)
select
  p.id,
  28,
  21,
  9,
  'product',
  'https://dmcwholesale.co.za/products/portable-small-gadget-bag',
  'Supplier page lists Size: 28 x 21 x 9 cm.',
  now(),
  'Supplier page does not provide a verified packed weight. Do not apply the R179 base delivery charge until packed weight (under 20 kg) and destination eligibility are verified.'
from public.store_products p
where p.supplier_product_ref = 'DM8363'
on conflict (store_product_id) do update
set length_cm = excluded.length_cm,
    width_cm = excluded.width_cm,
    height_cm = excluded.height_cm,
    dimension_kind = excluded.dimension_kind,
    dimensions_source_url = excluded.dimensions_source_url,
    dimensions_source_evidence = excluded.dimensions_source_evidence,
    dimensions_verified_at = excluded.dimensions_verified_at,
    operational_notes = excluded.operational_notes,
    updated_at = now();

-- New RPC keeps existing Printify callers backward-compatible while allowing
-- the trusted checkout service to persist the internally-auditable source of a
-- configured delivery quote. Browser input never reaches these fields.
create or replace function public.create_store_eft_payment_request_with_delivery(
  p_payer_user_id uuid,
  p_payer_email text,
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_client_request_id uuid,
  p_shipping_total numeric,
  p_shipping_address jsonb,
  p_shipping_method text,
  p_shipping_provider text,
  p_shipping_quote_metadata jsonb default '{}'::jsonb
)
returns public.eft_payment_requests
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_payment public.eft_payment_requests%rowtype;
  v_order public.store_orders%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Store shipping can only be applied by the trusted checkout service.' using errcode = '42501';
  end if;

  if p_shipping_total is null or p_shipping_total < 0 or p_shipping_total > 100000 then
    raise exception 'The shipping total is invalid.' using errcode = '22023';
  end if;

  if p_shipping_total > 0 and (p_shipping_address is null or jsonb_typeof(p_shipping_address) is distinct from 'object') then
    raise exception 'A delivery address is required for shipped products.' using errcode = '22023';
  end if;

  if p_shipping_quote_metadata is null or jsonb_typeof(p_shipping_quote_metadata) <> 'object' then
    raise exception 'The delivery quote metadata is invalid.' using errcode = '22023';
  end if;

  v_payment := public.create_store_eft_payment_request(
    p_payer_user_id,
    p_payer_email,
    p_customer_name,
    p_customer_phone,
    p_items,
    p_client_request_id
  );

  update public.store_orders
  set shipping_total = p_shipping_total,
      total = subtotal - discount_total + p_shipping_total + tax_total,
      metadata = metadata || jsonb_build_object(
        'shipping_address', coalesce(p_shipping_address, '{}'::jsonb),
        'shipping_provider', case when p_shipping_total > 0 then nullif(trim(p_shipping_provider), '') else null end,
        'shipping_method', case when p_shipping_total > 0 then nullif(trim(p_shipping_method), '') else null end,
        'shipping_quote', case when p_shipping_total > 0 then p_shipping_quote_metadata else null end
      ),
      updated_at = now()
  where id = v_payment.store_order_id
    and status = 'pending'
  returning * into v_order;

  if not found then
    raise exception 'The pending Store order could not be updated with delivery.' using errcode = '55000';
  end if;

  update public.eft_payment_requests
  set amount = v_order.total,
      updated_at = now()
  where id = v_payment.id
  returning * into v_payment;

  return v_payment;
end;
$function$;

revoke all on function public.create_store_eft_payment_request_with_delivery(uuid,text,text,text,jsonb,uuid,numeric,jsonb,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_store_eft_payment_request_with_delivery(uuid,text,text,text,jsonb,uuid,numeric,jsonb,text,text,jsonb) to service_role;
