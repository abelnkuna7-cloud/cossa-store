-- Smart Intake 2.0 supplier-stock projection.
-- Additive only: keep customer product pages public while allowing supplier-managed
-- products to become non-purchasable when fresh supplier evidence says unavailable.

alter table public.store_customer_products
  add column if not exists supplier_stock_available boolean,
  add column if not exists supplier_stock_checked_at timestamptz;

create or replace function private.sync_store_customer_product()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_supplier_stock_available boolean;
  v_supplier_stock_checked_at timestamptz;
begin
  if tg_op = 'DELETE' then
    delete from public.store_customer_products where id = old.id;
    return old;
  end if;

  select
    case
      when i.id is null then null
      when i.stock_status = 'available' then true
      when i.stock_status = 'unavailable' then false
      else null
    end,
    i.last_stock_checked_at
  into v_supplier_stock_available, v_supplier_stock_checked_at
  from public.store_inventory_intakes i
  where i.publication_store_product_id = new.id
  order by i.updated_at desc nulls last, i.created_at desc
  limit 1;

  insert into public.store_customer_products (
    id,name,slug,sku,product_type,status,short_description,description,category,brand,
    affiliate_url,currency,price,compare_at_price,track_inventory,stock_quantity,
    unlimited_stock,featured,image_urls,seo_title,seo_description,created_at,updated_at,
    customer_features,customer_specifications,customer_delivery_notice,customer_returns_notice,
    customer_warranty_notice,supplier_stock_available,supplier_stock_checked_at
  ) values (
    new.id,new.name,new.slug,new.sku,new.product_type,new.status,new.short_description,new.description,
    new.category,new.brand,new.affiliate_url,new.currency,new.price,new.compare_at_price,
    new.track_inventory,new.stock_quantity,new.unlimited_stock,new.featured,to_jsonb(new.image_urls),
    new.seo_title,new.seo_description,new.created_at,new.updated_at,coalesce(to_jsonb(new.customer_features),'[]'::jsonb),
    coalesce(to_jsonb(new.customer_specifications),'[]'::jsonb),new.customer_delivery_notice,new.customer_returns_notice,
    new.customer_warranty_notice,v_supplier_stock_available,v_supplier_stock_checked_at
  ) on conflict (id) do update set
    name=excluded.name,slug=excluded.slug,sku=excluded.sku,product_type=excluded.product_type,
    status=excluded.status,short_description=excluded.short_description,description=excluded.description,
    category=excluded.category,brand=excluded.brand,affiliate_url=excluded.affiliate_url,
    currency=excluded.currency,price=excluded.price,compare_at_price=excluded.compare_at_price,
    track_inventory=excluded.track_inventory,stock_quantity=excluded.stock_quantity,
    unlimited_stock=excluded.unlimited_stock,featured=excluded.featured,image_urls=excluded.image_urls,
    seo_title=excluded.seo_title,seo_description=excluded.seo_description,updated_at=excluded.updated_at,
    customer_features=excluded.customer_features,customer_specifications=excluded.customer_specifications,
    customer_delivery_notice=excluded.customer_delivery_notice,customer_returns_notice=excluded.customer_returns_notice,
    customer_warranty_notice=excluded.customer_warranty_notice,
    supplier_stock_available=excluded.supplier_stock_available,
    supplier_stock_checked_at=excluded.supplier_stock_checked_at;
  return new;
end; $$;

revoke all on function private.sync_store_customer_product() from public, anon, authenticated;

create or replace function private.sync_store_customer_supplier_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.publication_store_product_id is not null then
    update public.store_customer_products
    set
      supplier_stock_available = case
        when new.stock_status = 'available' then true
        when new.stock_status = 'unavailable' then false
        else null
      end,
      supplier_stock_checked_at = new.last_stock_checked_at,
      updated_at = greatest(updated_at, now())
    where id = new.publication_store_product_id;
  end if;
  return new;
end; $$;

revoke all on function private.sync_store_customer_supplier_stock() from public, anon, authenticated;

drop trigger if exists sync_store_customer_supplier_stock on public.store_inventory_intakes;
create trigger sync_store_customer_supplier_stock
after update of stock_status, supplier_available_stock, last_stock_checked_at
on public.store_inventory_intakes
for each row execute function private.sync_store_customer_supplier_stock();

update public.store_customer_products cp
set
  supplier_stock_available = case
    when i.stock_status = 'available' then true
    when i.stock_status = 'unavailable' then false
    else null
  end,
  supplier_stock_checked_at = i.last_stock_checked_at
from public.store_inventory_intakes i
where i.publication_store_product_id = cp.id;
