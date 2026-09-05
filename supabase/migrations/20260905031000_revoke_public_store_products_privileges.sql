revoke all on public.store_products from public, anon, authenticated;
grant select, insert, update, delete on public.store_products to service_role;
