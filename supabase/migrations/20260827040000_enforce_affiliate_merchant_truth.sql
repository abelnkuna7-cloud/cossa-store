-- Affiliate products are merchant-owned partner offers. They never represent
-- Cossa-owned stock, Cossa fulfilment or a Cossa checkout inventory quantity.

create or replace function public.enforce_store_affiliate_merchant_truth()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.product_type = 'affiliate' or new.fulfilment_model = 'affiliate' then
    new.product_type := 'affiliate';
    new.fulfilment_model := 'affiliate';
    new.track_inventory := false;
    new.stock_quantity := 0;
    new.unlimited_stock := false;
    new.cost_price := 0;
    new.inventory_ownership := 'affiliate_merchant';

    if new.inventory_source_status is null
       or new.inventory_source_status in ('not_connected', 'manual') then
      new.inventory_source_status := 'unknown';
    end if;

    if new.status = 'active' then
      if nullif(trim(coalesce(new.supplier_name, '')), '') is null then
        raise exception 'Active affiliate products require a real merchant or affiliate partner name.';
      end if;

      if nullif(trim(coalesce(new.affiliate_url, '')), '') is null
         or new.affiliate_url !~* '^https://[^[:space:]]+$' then
        raise exception 'Active affiliate products require a valid HTTPS tracked affiliate URL.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_store_affiliate_merchant_truth() from public;

drop trigger if exists trg_enforce_store_affiliate_merchant_truth on public.store_products;

create trigger trg_enforce_store_affiliate_merchant_truth
before insert or update of product_type, fulfilment_model, status, supplier_name,
  affiliate_url, track_inventory, stock_quantity, unlimited_stock, cost_price,
  inventory_ownership, inventory_source_status
on public.store_products
for each row
execute function public.enforce_store_affiliate_merchant_truth();

-- Correct existing affiliate rows without changing their publication status,
-- merchant URLs, displayed prices or other merchandising content.
update public.store_products
set
  product_type = 'affiliate',
  fulfilment_model = 'affiliate',
  track_inventory = false,
  stock_quantity = 0,
  unlimited_stock = false,
  cost_price = 0,
  inventory_ownership = 'affiliate_merchant',
  inventory_source_status = case
    when inventory_source_status in ('not_connected', 'manual') then 'unknown'
    else inventory_source_status
  end
where product_type = 'affiliate'
   or fulfilment_model = 'affiliate';

comment on function public.enforce_store_affiliate_merchant_truth() is
  'Prevents affiliate partner offers from being represented as Cossa inventory or Cossa-fulfilled products.';
