-- Account-linked shopping carts. Anonymous carts remain browser-local; this
-- table stores only product/variant IDs and quantities for signed-in users.
create table if not exists public.store_customer_carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cart jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint store_customer_carts_cart_is_array check (jsonb_typeof(cart) = 'array')
);

create index if not exists store_customer_carts_updated_at_idx
  on public.store_customer_carts(updated_at desc);

alter table public.store_customer_carts enable row level security;
revoke all on public.store_customer_carts from anon;
grant select, insert, update, delete on public.store_customer_carts to authenticated;
grant all on public.store_customer_carts to service_role;

drop policy if exists "customers read own cart" on public.store_customer_carts;
create policy "customers read own cart"
  on public.store_customer_carts for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "customers create own cart" on public.store_customer_carts;
create policy "customers create own cart"
  on public.store_customer_carts for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "customers update own cart" on public.store_customer_carts;
create policy "customers update own cart"
  on public.store_customer_carts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "customers delete own cart" on public.store_customer_carts;
create policy "customers delete own cart"
  on public.store_customer_carts for delete to authenticated
  using ((select auth.uid()) = user_id);
