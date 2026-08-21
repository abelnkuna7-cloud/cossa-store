alter table public.store_product_variants
  drop constraint if exists store_product_variants_provider_provider_variant_id_key;

drop index if exists public.idx_store_product_variants_provider_variant_unique;

create unique index if not exists idx_store_product_variants_product_provider_variant_unique
  on public.store_product_variants(product_id, provider, provider_variant_id);
