-- COSSA LIFESTYLE / PRODUCTION READINESS PUBLICATION GUARD
-- ADDITIVE ONLY. This migration is intentionally not deployed by this commit.
-- Purpose: prevent any browser, agent, RPC, or admin workflow from activating a
-- Cossa Lifestyle POD product before every available variant has a valid synced
-- hidden Printify production route.

create or replace function public.enforce_cossa_lifestyle_production_readiness()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_variant_count integer;
  unready_variant_count integer;
begin
  -- Only guard publication/activation of Cossa Lifestyle POD products.
  if new.status is distinct from 'active'
     or lower(btrim(coalesce(new.brand, ''))) <> 'cossa lifestyle'
     or coalesce(new.product_type, '') <> 'pod'
     or coalesce(new.fulfilment_model, '') <> 'print_on_demand' then
    return new;
  end if;

  if nullif(btrim(coalesce(new.sku, '')), '') is null then
    raise exception using
      errcode = 'check_violation',
      message = 'COSSA_LIFESTYLE_NOT_PRODUCTION_READY: product SKU is required before publication.';
  end if;

  if coalesce(new.price, 0) <= 0 then
    raise exception using
      errcode = 'check_violation',
      message = 'COSSA_LIFESTYLE_NOT_PRODUCTION_READY: a positive retail price is required before publication.';
  end if;

  select count(*)
    into active_variant_count
  from public.store_product_variants v
  where v.product_id = new.id
    and v.is_available = true;

  if active_variant_count = 0 then
    raise exception using
      errcode = 'check_violation',
      message = 'COSSA_LIFESTYLE_NOT_PRODUCTION_READY: at least one available variant is required before publication.';
  end if;

  -- Every available Cossa variant must have its own exact production mapping.
  -- Product-level/default mappings are intentionally not accepted here because
  -- size/colour variants can map to different Printify variant IDs.
  select count(*)
    into unready_variant_count
  from public.store_product_variants v
  where v.product_id = new.id
    and v.is_available = true
    and not exists (
      select 1
      from public.store_product_fulfilment_mappings m
      where m.organisation_id = new.organisation_id
        and m.store_product_id = new.id
        and m.store_variant_id = v.id
        and m.provider = 'Printify'
        and m.fulfilment_status = 'active'
        and m.sync_status = 'synced'
        and nullif(btrim(coalesce(m.provider_variant_id, '')), '') is not null
        and (
          nullif(btrim(coalesce(m.provider_product_id, '')), '') is not null
          or (
            nullif(btrim(coalesce(m.blueprint_id, '')), '') is not null
            and nullif(btrim(coalesce(m.print_provider_id, '')), '') is not null
            and nullif(btrim(coalesce(m.artwork_asset_ref, '')), '') is not null
          )
        )
    );

  if unready_variant_count > 0 then
    raise exception using
      errcode = 'check_violation',
      message = format(
        'COSSA_LIFESTYLE_NOT_PRODUCTION_READY: %s available variant(s) do not have an exact synced Printify production mapping.',
        unready_variant_count
      );
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_cossa_lifestyle_production_readiness() from public;

-- A BEFORE trigger makes the database the final authority. Even a direct status
-- update is rejected when the production gate is incomplete.
drop trigger if exists trg_enforce_cossa_lifestyle_production_readiness
  on public.store_products;

create trigger trg_enforce_cossa_lifestyle_production_readiness
before insert or update of status, brand, product_type, fulfilment_model, sku, price
on public.store_products
for each row
execute function public.enforce_cossa_lifestyle_production_readiness();
