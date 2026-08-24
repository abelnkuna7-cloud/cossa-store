-- The pg_net extension exposes HTTP functions in the net schema. Re-register
-- the jobs created by the initial automation migration with that schema.
select cron.unschedule(jobid)
from cron.job
where jobname in ('cossa-cj-daily-availability', 'cossa-cj-daily-import', 'cossa-cj-daily-pricing');

select cron.schedule(
  'cossa-cj-daily-availability',
  '5 2 * * *',
  $$ select net.http_post(
    url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/cj-availability-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cossa-automation-token',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cossa_cj_daily_sync_token')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ); $$
);

select cron.schedule(
  'cossa-cj-daily-import',
  '10 2 * * *',
  $$ select net.http_post(
    url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/cj-product-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cossa-automation-token',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cossa_cj_daily_sync_token')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ); $$
);

select cron.schedule(
  'cossa-cj-daily-pricing',
  '20 2 * * *',
  $$ select net.http_post(
    url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/cj-commercial-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cossa-automation-token',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cossa_cj_daily_sync_token')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ); $$
);
