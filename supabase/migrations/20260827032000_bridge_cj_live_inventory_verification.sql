-- Bridge successful CJ variant-level availability checks into truthful product-level inventory provenance.
--
-- The CJ availability Edge Function already writes raw_provider_data.availability_checked_at
-- and raw_provider_data.availability_source for each checked variant. Growth reads product-level
-- verification fields, so this migration records that existing supplier evidence without inventing it.

create or replace function public.bridge_cj_live_inventory_verification()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  checked_at timestamptz;
  availability_source text;
  supplier_ref text;
begin
  if new.provider is distinct from 'CJ Dropshipping' then
    return new;
  end if;

  checked_at := nullif(new.raw_provider_data->>'availability_checked_at', '')::timestamptz;
  if checked_at is null then
    return new;
  end if;

  availability_source := nullif(trim(coalesce(new.raw_provider_data->>'availability_source', '')), '');

  select nullif(trim(coalesce(p.supplier_product_ref, '')), '')
    into supplier_ref
  from public.store_products p
  where p.id = new.product_id
    and p.organisation_id = '00000000-0000-4000-8000-000000000001'
    and p.product_type = 'dropshipping'
    and p.fulfilment_model = 'international_dropshipping'
    and p.supplier_name = 'CJ Dropshipping';

  if supplier_ref is null then
    return new;
  end if;

  update public.store_products p
  set
    inventory_ownership = 'supplier_managed',
    inventory_source_status = 'verified',
    inventory_source_reference = coalesce(
      nullif(trim(p.inventory_source_reference), ''),
      'CJ Dropshipping:' || supplier_ref
    ),
    inventory_last_verified_at = greatest(
      coalesce(p.inventory_last_verified_at, checked_at),
      checked_at
    ),
    inventory_evidence = jsonb_build_object(
      'provider', 'CJ Dropshipping',
      'supplier_product_ref', supplier_ref,
      'availability_checked_at', checked_at,
      'availability_source', coalesce(availability_source, 'cj_live_availability'),
      'variant_provider_id', new.provider_variant_id,
      'source', 'store_product_variants.raw_provider_data'
    )
  where p.id = new.product_id
    and (
      p.inventory_last_verified_at is null
      or checked_at >= p.inventory_last_verified_at
      or p.inventory_source_status is distinct from 'verified'
    );

  return new;
exception
  when invalid_datetime_format then
    -- Malformed supplier metadata must not create a false verification state.
    return new;
end;
$$;

revoke all on function public.bridge_cj_live_inventory_verification() from public;

drop trigger if exists trg_bridge_cj_live_inventory_verification on public.store_product_variants;

create trigger trg_bridge_cj_live_inventory_verification
after insert or update of raw_provider_data, is_available
on public.store_product_variants
for each row
when (new.provider = 'CJ Dropshipping')
execute function public.bridge_cj_live_inventory_verification();

-- Backfill only products that already have real CJ availability_checked_at evidence.
with latest as (
  select distinct on (v.product_id)
    v.product_id,
    v.provider_variant_id,
    nullif(v.raw_provider_data->>'availability_checked_at', '')::timestamptz as checked_at,
    nullif(trim(coalesce(v.raw_provider_data->>'availability_source', '')), '') as availability_source
  from public.store_product_variants v
  join public.store_products p on p.id = v.product_id
  where p.organisation_id = '00000000-0000-4000-8000-000000000001'
    and p.product_type = 'dropshipping'
    and p.fulfilment_model = 'international_dropshipping'
    and p.supplier_name = 'CJ Dropshipping'
    and v.provider = 'CJ Dropshipping'
    and nullif(v.raw_provider_data->>'availability_checked_at', '') is not null
  order by v.product_id, (v.raw_provider_data->>'availability_checked_at')::timestamptz desc
)
update public.store_products p
set
  inventory_ownership = 'supplier_managed',
  inventory_source_status = 'verified',
  inventory_source_reference = coalesce(
    nullif(trim(p.inventory_source_reference), ''),
    'CJ Dropshipping:' || trim(p.supplier_product_ref)
  ),
  inventory_last_verified_at = latest.checked_at,
  inventory_evidence = jsonb_build_object(
    'provider', 'CJ Dropshipping',
    'supplier_product_ref', trim(p.supplier_product_ref),
    'availability_checked_at', latest.checked_at,
    'availability_source', coalesce(latest.availability_source, 'cj_live_availability'),
    'variant_provider_id', latest.provider_variant_id,
    'source', 'store_product_variants.raw_provider_data'
  )
from latest
where p.id = latest.product_id
  and latest.checked_at is not null;

comment on function public.bridge_cj_live_inventory_verification() is
  'Promotes CJ product inventory to verified only from a successful variant-level CJ availability check with an availability_checked_at timestamp.';
