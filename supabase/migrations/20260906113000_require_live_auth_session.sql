-- Close the logout/password-reset gap at the Data API boundary.
-- A Store registry row is not sufficient by itself: Supabase Auth must still
-- have the matching session. This keeps stale JWTs and stale registry rows
-- from authorising customer or admin private data.
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
      and exists (
        select 1
        from auth.sessions a
        where a.id = s.session_id
          and a.user_id = s.user_id
      )
  )
  or exists (
    select 1
    from public.store_admin_sessions s
    where s.user_id = (select auth.uid())
      and s.session_id::text = (select auth.jwt() ->> 'session_id')
      and s.revoked_at is null
      and s.last_seen_at > (now() - interval '15 minutes')
      and s.absolute_expires_at > now()
      and exists (
        select 1
        from auth.sessions a
        where a.id = s.session_id
          and a.user_id = s.user_id
      )
  );
$$;

revoke all on function public.is_active_store_session() from public, anon, authenticated;
grant execute on function public.is_active_store_session() to authenticated;

-- Mark registry rows whose underlying Auth session is already gone as
-- revoked. No customer, order, cart, or fulfilment data is deleted.
update public.store_customer_sessions s
set revoked_at = coalesce(s.revoked_at, now()),
    updated_at = now()
where s.revoked_at is null
  and not exists (
    select 1
    from auth.sessions a
    where a.id = s.session_id
      and a.user_id = s.user_id
  );
