-- Keep public variant reads aligned with the customer-safe product projection.
-- The previous policy referenced the internal store_public_products table,
-- which is intentionally unavailable to browser roles.
drop policy if exists "shoppers read available published variants"
  on public.store_public_product_variants;

create policy "shoppers read available published variants"
  on public.store_public_product_variants
  for select to anon, authenticated
  using (
    is_available
    and exists (
      select 1
      from public.store_customer_products p
      where p.id = store_public_product_variants.product_id
        and p.status = 'active'
    )
  );

notify pgrst, 'reload schema';
