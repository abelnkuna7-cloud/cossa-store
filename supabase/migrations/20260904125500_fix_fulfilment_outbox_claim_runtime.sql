-- Fix runtime failure in the hardened fulfilment outbox claim RPC.
-- GREATEST/LEAST are PostgreSQL conditional expressions, not pg_catalog functions.
create or replace function public.claim_store_fulfilment_outbox_jobs(
  p_worker_id text,
  p_limit integer default 10
)
returns setof public.store_fulfilment_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select o.id
    from public.store_fulfilment_outbox o
    where o.status in ('pending','retry')
      and o.available_at <= pg_catalog.now()
      and o.attempts < o.max_attempts
    order by o.available_at, o.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 50))
  )
  update public.store_fulfilment_outbox o
  set status = 'processing',
      attempts = o.attempts + 1,
      locked_at = pg_catalog.now(),
      locked_by = pg_catalog.left(coalesce(p_worker_id, 'worker'), 160),
      updated_at = pg_catalog.now()
  from candidates c
  where o.id = c.id
  returning o.*;
end;
$$;

revoke all on function public.claim_store_fulfilment_outbox_jobs(text, integer) from public, anon, authenticated;
grant execute on function public.claim_store_fulfilment_outbox_jobs(text, integer) to service_role;
