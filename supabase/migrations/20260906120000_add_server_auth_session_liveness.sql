-- Server-only liveness check for SSR private-route guards.
-- This prevents a signed JWT from passing the Store registry check after
-- logout or password reset removed its underlying Supabase Auth session.
create or replace function public.is_live_store_auth_session(
  p_user_id uuid,
  p_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, auth
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.user_id = p_user_id
      and s.id = p_session_id
  );
$$;

revoke all on function public.is_live_store_auth_session(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.is_live_store_auth_session(uuid, uuid)
  to service_role;
