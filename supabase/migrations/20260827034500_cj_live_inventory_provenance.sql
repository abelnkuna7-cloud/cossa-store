-- Record CJ inventory provenance only after the live availability worker has
-- written supplier-check evidence to a CJ variant. Catalogue import by itself
-- must never be treated as verified inventory.

create or replace function public.cossa_stamp_cj_inventory_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  checked_at timestamptz;
  source_name text;
  supplier_ref text;
  live_qty integer;
begin
  if new.provider is distinct from 'CJ Dropshipping' then
    return new;
  end if;

  if new.raw_provider_data is null
     or jsonb_typeof(new.raw_provider_data) <> 'object'
     or nullif(new.raw_provider_data->>'availability_checked_at', '') is null then
    return new;
  end if;

  begin
    checked_at := (new.raw_provider_data->>'availability_checked_at')::timestamptz;
  exception when others then
    return new;
  end;

  source_name := coalesce(
    nullif(new.raw_provider_data->>'availability_source', ''),
    'cj_live_availability_check'
  );

  live_qty := case
    when (new.raw_provider_data->>'live_inventory') ~ '^\d+$'
      then (new.raw_provider_data->>'live_inventory')::integer
    else null
  end;

  select p.supplier_product_ref
    into supplier_ref
    from public.store_products p
   where p.id = new.product_id
     and p.organisation_id = '00000000-0000-4000-8000-000000000001'::uuid
     and p.supplier_name = 'CJ Dropshipping'
   limit 1;

  if supplier_ref is null then
    return new;
  end if;

  update public.store_products p
     set inventory_ownership = 'supplier_managed',
         inventory_source_status = 'verified',
         inventory_source_reference = 'cj:' || supplier_ref,
         inventory_last_verified_at = greatest(
           coalesce(p.inventory_last_verified_at, '-infinity'::timestamptz),
           checked_at
         ),
         inventory_evidence = jsonb_build_array(
           jsonb_strip_nulls(
             jsonb_build_object(
               'provider', 'CJ Dropshipping',
               'supplier_product_ref', supplier_ref,
               'provider_variant_id', new.provider_variant_id,
               'checked_at', checked_at,
               'availability_source', source_name,
               'is_available', new.is_available,
               'live_inventory', live_qty,
               'evidence_type', 'live_supplier_availability_check'
             )
           )
         ),
         updated_at = greatest(p.updated_at, checked_at)
   where p.id = new.product_id
     and (
       p.inventory_last_verified_at is null
       or checked_at >= p.inventory_last_verified_at
     );

  return new;
end;
$$;

revoke all on function public.cossa_stamp_cj_inventory_verification() from public;

drop trigger if exists trg_cossa_stamp_cj_inventory_verification
  on public.store_product_variants;

create trigger trg_cossa_stamp_cj_inventory_verification
after insert or update of raw_provider_data, is_available
on public.store_product_variants
for each row
execute function public.cossa_stamp_cj_inventory_verification();
