-- Server-only helper used by the Store admin gate. It reveals only whether the
-- approved user has a verified factor; it never returns a factor secret.
create or replace function public.store_admin_mfa_required(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = pg_catalog, auth, public
as $$
  select exists (
    select 1
    from auth.mfa_factors
    where user_id = p_user_id
      and status = 'verified'
  );
$$;

revoke all on function public.store_admin_mfa_required(uuid) from public, anon, authenticated;
grant execute on function public.store_admin_mfa_required(uuid) to service_role;
