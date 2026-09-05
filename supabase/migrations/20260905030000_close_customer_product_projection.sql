create table if not exists public.store_customer_products (
  id uuid primary key,
  name text not null,
  slug text not null,
  sku text,
  product_type text not null,
  status text not null,
  short_description text,
  description text,
  category text,
  brand text,
  affiliate_url text,
  currency text not null,
  price numeric not null,
  compare_at_price numeric,
  track_inventory boolean not null,
  stock_quantity integer not null,
  unlimited_stock boolean not null,
  featured boolean not null,
  image_urls jsonb not null default '[]'::jsonb,
  seo_title text,
  seo_description text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  customer_features jsonb not null default '[]'::jsonb,
  customer_specifications jsonb not null default '[]'::jsonb,
  customer_delivery_notice text,
  customer_returns_notice text,
  customer_warranty_notice text
);

alter table public.store_customer_products enable row level security;
revoke all on public.store_customer_products from public, anon, authenticated;
grant select on public.store_customer_products to anon, authenticated;
drop policy if exists "customers read active customer products" on public.store_customer_products;
create policy "customers read active customer products"
  on public.store_customer_products for select to anon, authenticated
  using (status = 'active');

create or replace function private.sync_store_customer_product()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.store_customer_products where id = old.id;
    return old;
  end if;
  insert into public.store_customer_products (
    id,name,slug,sku,product_type,status,short_description,description,category,brand,
    affiliate_url,currency,price,compare_at_price,track_inventory,stock_quantity,
    unlimited_stock,featured,image_urls,seo_title,seo_description,created_at,updated_at,
    customer_features,customer_specifications,customer_delivery_notice,customer_returns_notice,
    customer_warranty_notice
  ) values (
    new.id,new.name,new.slug,new.sku,new.product_type,new.status,new.short_description,new.description,
    new.category,new.brand,new.affiliate_url,new.currency,new.price,new.compare_at_price,
    new.track_inventory,new.stock_quantity,new.unlimited_stock,new.featured,to_jsonb(new.image_urls),
    new.seo_title,new.seo_description,new.created_at,new.updated_at,coalesce(to_jsonb(new.customer_features),'[]'::jsonb),
    coalesce(to_jsonb(new.customer_specifications),'[]'::jsonb),new.customer_delivery_notice,new.customer_returns_notice,
    new.customer_warranty_notice
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
    customer_warranty_notice=excluded.customer_warranty_notice;
  return new;
end; $$;
revoke all on function private.sync_store_customer_product() from public, anon, authenticated;
drop trigger if exists sync_store_customer_product on public.store_public_products;
create trigger sync_store_customer_product
after insert or update or delete on public.store_public_products
for each row execute function private.sync_store_customer_product();

insert into public.store_customer_products
select id,name,slug,sku,product_type,status,short_description,description,category,brand,affiliate_url,
  currency,price,compare_at_price,track_inventory,stock_quantity,unlimited_stock,featured,to_jsonb(image_urls),
  seo_title,seo_description,created_at,updated_at,coalesce(to_jsonb(customer_features),'[]'::jsonb),coalesce(to_jsonb(customer_specifications),'[]'::jsonb),
  customer_delivery_notice,customer_returns_notice,customer_warranty_notice
from public.store_public_products
on conflict (id) do nothing;

revoke all on public.store_public_products from public, anon, authenticated;
grant select on public.store_public_products to service_role;
