begin;

create or replace view public.store_supplier_availability_public as
select distinct on (i.publication_store_product_id)
  i.publication_store_product_id as product_id,
  case
    when i.last_stock_checked_at is null then 'unknown'::text
    when lower(coalesce(i.stock_status, '')) in ('unknown', 'needs_check', 'needs-check') then 'unknown'::text
    when i.last_stock_checked_at < now() - interval '24 hours' then 'stale'::text
    when lower(coalesce(i.stock_status, '')) in ('out_of_stock', 'out-of-stock', 'unavailable', 'sold_out', 'sold-out')
      then 'out_of_stock'::text
    when lower(coalesce(i.stock_status, '')) in ('available', 'in_stock', 'in-stock')
      then 'in_stock'::text
    when coalesce(i.supplier_available_stock, 0) <= 0 then 'out_of_stock'::text
    else 'in_stock'::text
  end as supplier_stock_state,
  (
    i.last_stock_checked_at is not null
    and i.last_stock_checked_at >= now() - interval '24 hours'
    and lower(coalesce(i.stock_status, '')) not in ('unknown', 'needs_check', 'needs-check')
  ) as is_fresh,
  (
    i.last_stock_checked_at is not null
    and i.last_stock_checked_at >= now() - interval '24 hours'
    and (
      lower(coalesce(i.stock_status, '')) in ('available', 'in_stock', 'in-stock')
      or (
        coalesce(i.supplier_available_stock, 0) > 0
        and lower(coalesce(i.stock_status, '')) not in (
          'out_of_stock', 'out-of-stock', 'unavailable', 'sold_out', 'sold-out',
          'unknown', 'needs_check', 'needs-check'
        )
      )
    )
  ) as supplier_available,
  i.last_stock_checked_at
from public.store_inventory_intakes i
where i.publication_store_product_id is not null
  and i.approval_status = 'published'
order by i.publication_store_product_id, i.last_stock_checked_at desc nulls last, i.created_at desc;

create or replace function private.enforce_supplier_stock_before_store_order_item()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_product public.store_products%rowtype;
  v_intake public.store_inventory_intakes%rowtype;
  v_status text;
begin
  if new.product_id is null then return new; end if;

  select * into v_product from public.store_products where id = new.product_id;
  if not found then
    raise exception 'The selected product no longer exists.' using errcode = '22023';
  end if;

  if coalesce(v_product.fulfilment_model, '') not in (
    'local_supplier', 'local_dropshipping', 'international_dropshipping'
  ) then
    return new;
  end if;

  select * into v_intake
  from public.store_inventory_intakes
  where publication_store_product_id = v_product.id
    and approval_status = 'published'
  order by last_stock_checked_at desc nulls last, created_at desc
  limit 1;

  if not found then return new; end if;

  v_status := lower(coalesce(v_intake.stock_status, 'unknown'));

  if v_intake.last_stock_checked_at is null
    or v_intake.last_stock_checked_at < now() - interval '24 hours'
    or v_status in ('unknown', 'needs_check', 'needs-check') then
    raise exception '%: supplier stock must be refreshed before payment can be accepted.', v_product.name
      using errcode = '55000';
  end if;

  if v_status in ('out_of_stock', 'out-of-stock', 'unavailable', 'sold_out', 'sold-out')
    or (
      v_status not in ('available', 'in_stock', 'in-stock')
      and coalesce(v_intake.supplier_available_stock, 0) <= 0
    ) then
    raise exception '% is currently out of stock at the supplier.', v_product.name
      using errcode = '22023';
  end if;

  return new;
end;
$function$;

commit;
