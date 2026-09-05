-- Phase 3B: bind customer-private Data API reads to the current Store session.
-- The helper returns only a boolean; session rows remain service-role-only.
create or replace function public.is_active_store_session()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.store_customer_sessions s
    where s.user_id = (select auth.uid())
      and s.session_id::text = (select auth.jwt() ->> 'session_id')
      and s.revoked_at is null
      and s.last_seen_at > (now() - interval '30 minutes')
      and s.absolute_expires_at > now()
  )
  or exists (
    select 1
    from public.store_admin_sessions s
    where s.user_id = (select auth.uid())
      and s.session_id::text = (select auth.jwt() ->> 'session_id')
      and s.revoked_at is null
      and s.last_seen_at > (now() - interval '15 minutes')
      and s.absolute_expires_at > now()
  );
$$;

revoke all on function public.is_active_store_session() from public, anon, authenticated;
grant execute on function public.is_active_store_session() to authenticated;

-- Restrictive policies preserve the existing ownership/admin policies while
-- requiring a current Store session at the Data API boundary.
drop policy if exists "active Store session required for orders" on public.store_orders;
create policy "active Store session required for orders"
  on public.store_orders as restrictive for all to authenticated
  using ((select public.is_active_store_session()))
  with check ((select public.is_active_store_session()));

drop policy if exists "active Store session required for order items" on public.store_order_items;
create policy "active Store session required for order items"
  on public.store_order_items as restrictive for all to authenticated
  using ((select public.is_active_store_session()))
  with check ((select public.is_active_store_session()));

drop policy if exists "active Store session required for digital entitlements" on public.store_digital_entitlements;
create policy "active Store session required for digital entitlements"
  on public.store_digital_entitlements as restrictive for all to authenticated
  using ((select public.is_active_store_session()))
  with check ((select public.is_active_store_session()));

drop policy if exists "active Store session required for customer fulfilments" on public.store_customer_fulfilments;
create policy "active Store session required for customer fulfilments"
  on public.store_customer_fulfilments as restrictive for all to authenticated
  using ((select public.is_active_store_session()))
  with check ((select public.is_active_store_session()));
