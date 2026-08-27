-- Ensure every CJ dropshipping product is classified as supplier-managed.
--
-- This migration deliberately does NOT mark CJ inventory as verified. Supplier
-- ownership is known from the fulfilment model/provider identity, while live
-- inventory verification must come from a successful CJ availability check.

create or replace function public.enforce_cj_inventory_ownership()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.product_type = 'dropshipping'
     and new.fulfilment_model = 'international_dropshipping'
     and new.supplier_name = 'CJ Dropshipping'
     and nullif(trim(coalesce(new.supplier_product_ref, '')), '') is not null then
    new.inventory_ownership := 'supplier_managed';

    if nullif(trim(coalesce(new.inventory_source_reference, '')), '') is null then
      new.inventory_source_reference := 'CJ Dropshipping:' || trim(new.supplier_product_ref);
    end if;

    -- Never invent verification merely because the supplier/product identity is known.
    if new.inventory_source_status is null then
      new.inventory_source_status := 'unknown';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_cj_inventory_ownership() from public;

-- Backfill only deterministic ownership/reference fields for existing CJ rows.
-- Verification fields and timestamps are intentionally left untouched.
update public.store_products
set
  inventory_ownership = 'supplier_managed',
  inventory_source_reference = coalesce(
    nullif(trim(inventory_source_reference), ''),
    'CJ Dropshipping:' || trim(supplier_product_ref)
  ),
  updated_at = updated_at
where organisation_id = '00000000-0000-4000-8000-000000000001'
  and product_type = 'dropshipping'
  and fulfilment_model = 'international_dropshipping'
  and supplier_name = 'CJ Dropshipping'
  and nullif(trim(coalesce(supplier_product_ref, '')), '') is not null
  and (
    inventory_ownership is distinct from 'supplier_managed'
    or nullif(trim(coalesce(inventory_source_reference, '')), '') is null
  );

drop trigger if exists trg_enforce_cj_inventory_ownership on public.store_products;

create trigger trg_enforce_cj_inventory_ownership
before insert or update of
  product_type,
  fulfilment_model,
  supplier_name,
  supplier_product_ref,
  inventory_ownership,
  inventory_source_reference
on public.store_products
for each row
execute function public.enforce_cj_inventory_ownership();

comment on function public.enforce_cj_inventory_ownership() is
  'Classifies identifiable CJ international dropshipping products as supplier-managed without asserting live inventory verification.';
