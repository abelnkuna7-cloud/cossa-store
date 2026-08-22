-- A Printify product may only be customer-visible when its current provider data
-- contains a valid POD configuration, an image and at least one purchasable option.
create or replace function public.enforce_active_printify_product_validity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.supplier_name, '')) = 'printify'
    and new.status = 'active' then
    if new.product_type <> 'pod'
      or new.fulfilment_model <> 'print_on_demand'
      or nullif(trim(coalesce(new.supplier_product_ref, '')), '') is null
      or coalesce(array_length(new.image_urls, 1), 0) = 0
      or not exists (
        select 1
        from public.store_product_variants variant
        where variant.product_id = new.id
          and variant.provider = 'Printify'
          and variant.provider_product_id = new.supplier_product_ref
          and variant.is_available
          and variant.source_price > 0
          and variant.price_zar > 0
      ) then
      raise exception using
        errcode = '23514',
        message = 'A Printify product needs valid images, POD fulfilment data and an available priced variant before it can be published.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_active_printify_product_validity on public.store_products;
create trigger enforce_active_printify_product_validity
before insert or update of status, supplier_name, supplier_product_ref, product_type, fulfilment_model, image_urls
on public.store_products
for each row
execute function public.enforce_active_printify_product_validity();

create or replace function public.enforce_active_printify_variant_validity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_product_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_product_id := old.product_id;
  else
    affected_product_id := new.product_id;
  end if;

  if exists (
    select 1
    from public.store_products product
    where product.id = affected_product_id
      and lower(coalesce(product.supplier_name, '')) = 'printify'
      and product.status = 'active'
      and not exists (
        select 1
        from public.store_product_variants variant
        where variant.product_id = product.id
          and variant.provider = 'Printify'
          and variant.provider_product_id = product.supplier_product_ref
          and variant.is_available
          and variant.source_price > 0
          and variant.price_zar > 0
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'An active Printify product must retain at least one available priced variant.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_active_printify_variant_validity on public.store_product_variants;
create trigger enforce_active_printify_variant_validity
after insert or update or delete
on public.store_product_variants
for each row
execute function public.enforce_active_printify_variant_validity();

revoke all on function public.enforce_active_printify_product_validity() from public;
revoke all on function public.enforce_active_printify_variant_validity() from public;
