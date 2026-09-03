-- Autonomous supervisor for the durable Store fulfilment outbox.
-- Additive only: recovers abandoned worker leases, promotes exhausted jobs to
-- dead-letter, records operational health, and schedules the Edge worker.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table if not exists public.store_fulfilment_supervisor_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  recovered_jobs integer not null default 0,
  dead_lettered_jobs integer not null default 0,
  pending_jobs integer not null default 0,
  retry_jobs integer not null default 0,
  processing_jobs integer not null default 0,
  dead_letter_jobs integer not null default 0,
  oldest_actionable_job_at timestamptz,
  worker_request_id bigint,
  status text not null default 'running' check (status in ('running','healthy','attention','failed')),
  details jsonb not null default '{}'::jsonb
);

alter table public.store_fulfilment_supervisor_runs enable row level security;

drop policy if exists "store fulfilment supervisor admins can read" on public.store_fulfilment_supervisor_runs;
create policy "store fulfilment supervisor admins can read"
on public.store_fulfilment_supervisor_runs for select
to authenticated
using (
  exists (
    select 1 from public.organisation_members om
    where om.organisation_id = '00000000-0000-4000-8000-000000000001'::uuid
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner','admin')
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);

create or replace function public.supervise_store_fulfilment_outbox(
  p_stale_after interval default interval '10 minutes'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_recovered integer := 0;
  v_dead_lettered integer := 0;
  v_pending integer := 0;
  v_retry integer := 0;
  v_processing integer := 0;
  v_dead integer := 0;
  v_oldest timestamptz;
  v_run uuid;
  v_status text;
begin
  insert into public.store_fulfilment_supervisor_runs default values returning id into v_run;

  -- A processing job is a lease, not a permanent state. If an Edge worker dies,
  -- release the lease so another worker can safely retry. Provider-level
  -- reconciliation/idempotency remains responsible for preventing duplicate orders.
  update public.store_fulfilment_outbox o
  set status = case when o.attempts >= o.max_attempts then 'dead_letter' else 'retry' end,
      available_at = case when o.attempts >= o.max_attempts then o.available_at else now() end,
      locked_at = null,
      locked_by = null,
      last_error = left(coalesce(o.last_error || E'\n','') || 'Supervisor recovered an abandoned processing lease at ' || now()::text, 2000),
      updated_at = now()
  where o.status = 'processing'
    and o.locked_at is not null
    and o.locked_at < now() - greatest(p_stale_after, interval '2 minutes');
  get diagnostics v_recovered = row_count;

  -- Defensive convergence for jobs whose retry budget was exhausted between runs.
  update public.store_fulfilment_outbox o
  set status = 'dead_letter',
      locked_at = null,
      locked_by = null,
      updated_at = now()
  where o.status in ('pending','retry')
    and o.attempts >= o.max_attempts;
  get diagnostics v_dead_lettered = row_count;

  select
    count(*) filter (where status = 'pending'),
    count(*) filter (where status = 'retry'),
    count(*) filter (where status = 'processing'),
    count(*) filter (where status = 'dead_letter'),
    min(created_at) filter (where status in ('pending','retry') and available_at <= now())
  into v_pending, v_retry, v_processing, v_dead, v_oldest
  from public.store_fulfilment_outbox;

  v_status := case
    when v_dead > 0 then 'attention'
    when v_oldest is not null and v_oldest < now() - interval '15 minutes' then 'attention'
    else 'healthy'
  end;

  update public.store_fulfilment_supervisor_runs
  set finished_at = now(),
      recovered_jobs = v_recovered,
      dead_lettered_jobs = v_dead_lettered,
      pending_jobs = v_pending,
      retry_jobs = v_retry,
      processing_jobs = v_processing,
      dead_letter_jobs = v_dead,
      oldest_actionable_job_at = v_oldest,
      status = v_status,
      details = jsonb_build_object(
        'staleAfterSeconds', extract(epoch from greatest(p_stale_after, interval '2 minutes'))::integer,
        'requiresAttention', v_status = 'attention'
      )
  where id = v_run;

  return jsonb_build_object(
    'runId', v_run,
    'status', v_status,
    'recovered', v_recovered,
    'deadLettered', v_dead_lettered,
    'pending', v_pending,
    'retry', v_retry,
    'processing', v_processing,
    'deadLetter', v_dead,
    'oldestActionableJobAt', v_oldest
  );
exception when others then
  if v_run is not null then
    update public.store_fulfilment_supervisor_runs
    set finished_at = now(), status = 'failed', details = jsonb_build_object('error', left(sqlerrm, 1000))
    where id = v_run;
  end if;
  raise;
end;
$$;

revoke all on function public.supervise_store_fulfilment_outbox(interval) from public, anon, authenticated;

-- The scheduler intentionally reads the worker URL and secret from Supabase Vault.
-- Deployment must create these two Vault secrets before enabling this cron:
--   store_fulfilment_worker_url = https://<project-ref>.supabase.co/functions/v1/store-fulfilment-worker
--   store_fulfilment_worker_secret = <same value as STORE_FULFILMENT_WORKER_SECRET>
-- No secret is committed to source control.
create or replace function public.invoke_store_fulfilment_worker_from_scheduler()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_url text;
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'store_fulfilment_worker_url' limit 1;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'store_fulfilment_worker_secret' limit 1;
  if coalesce(v_url,'') = '' or coalesce(v_secret,'') = '' then
    raise exception 'Store fulfilment scheduler Vault secrets are not configured.';
  end if;

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','x-cossa-worker-secret',v_secret),
    body := jsonb_build_object('source','pg_cron','scheduledAt',now()),
    timeout_milliseconds := 10000
  ) into v_request_id;
  return v_request_id;
end;
$$;

revoke all on function public.invoke_store_fulfilment_worker_from_scheduler() from public, anon, authenticated;

-- Safe idempotent cron installation: replace only Cossa's named jobs.
do $$
declare v_job bigint;
begin
  for v_job in select jobid from cron.job where jobname in ('cossa-store-fulfilment-worker','cossa-store-fulfilment-supervisor') loop
    perform cron.unschedule(v_job);
  end loop;

  perform cron.schedule(
    'cossa-store-fulfilment-worker',
    '* * * * *',
    'select public.invoke_store_fulfilment_worker_from_scheduler();'
  );

  perform cron.schedule(
    'cossa-store-fulfilment-supervisor',
    '*/5 * * * *',
    'select public.supervise_store_fulfilment_outbox(interval ''10 minutes'');'
  );
end $$;
