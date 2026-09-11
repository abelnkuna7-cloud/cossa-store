begin;

create or replace function public.invoke_astrum_stock_monitor_from_scheduler()
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_token text;
  v_request_id bigint;
begin
  select decrypted_secret
  into v_token
  from vault.decrypted_secrets
  where name = 'cossa_astrum_stock_monitor_token'
  limit 1;

  if coalesce(v_token, '') = '' then
    raise warning 'Astrum stock monitor scheduler secret is missing.';
    return null;
  end if;

  select net.http_post(
    url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/astrum-stock-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cossa-automation-token', v_token
    ),
    body := jsonb_build_object(
      'dryRun', false,
      'limit', 100,
      'source', 'pg_cron'
    ),
    timeout_milliseconds := 120000
  )
  into v_request_id;

  return v_request_id;
end;
$function$;

revoke all on function public.invoke_astrum_stock_monitor_from_scheduler() from public, anon, authenticated;
grant execute on function public.invoke_astrum_stock_monitor_from_scheduler() to service_role;

do $schedule$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'cossa-astrum-stock-monitor'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'cossa-astrum-stock-monitor',
    '17 */4 * * *',
    'select public.invoke_astrum_stock_monitor_from_scheduler();'
  );
end;
$schedule$;

comment on function public.invoke_astrum_stock_monitor_from_scheduler() is
  'Invokes the authenticated Astrum stock monitor using a Vault-backed token. Scheduled every four hours.';

commit;
