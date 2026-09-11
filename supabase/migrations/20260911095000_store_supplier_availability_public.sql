begin;

create or replace view public.store_supplier_availability_public as
select distinct on (i.publication_store_product_id)
  i.publication_store_product_id as product_id,
  case
    when i.last_stock_checked_at is null then 'unknown'::text
    when i.last_stock_checked_at < now() - interval '24 hours' then 'stale'::text
    when coalesce(i.supplier_available_stock, 0) <= 0
      or lower(coalesce(i.stock_status, '')) in ('out_of_stock', 'out-of-stock', 'unavailable', 'sold_out', 'sold-out')
      then 'out_of_stock'::text
    else 'in_stock'::text
  end as supplier_stock_state,
  (
    i.last_stock_checked_at is not null
    and i.last_stock_checked_at >= now() - interval '24 hours'
  ) as is_fresh,
  (
    coalesce(i.supplier_available_stock, 0) > 0
    and lower(coalesce(i.stock_status, '')) not in ('out_of_stock', 'out-of-stock', 'unavailable', 'sold_out', 'sold-out')
  ) as supplier_available,
  i.last_stock_checked_at
from public.store_inventory_intakes i
where i.publication_store_product_id is not null
  and i.approval_status = 'published'
order by i.publication_store_product_id, i.last_stock_checked_at desc nulls last, i.created_at desc;

revoke all on public.store_supplier_availability_public from public;
grant select on public.store_supplier_availability_public to anon, authenticated;

comment on view public.store_supplier_availability_public is
  'Customer-safe supplier availability projection. Exposes no supplier quantities, costs or internal sourcing details.';

commit;
