-- Scheduled CJ catalogue automation: all raw credentials remain encrypted in
-- Vault, while Edge Functions receive only a short-lived request header that
-- is verified against a one-way digest held server-side.
create table if not exists public.supplier_automation_tokens (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  token_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_automation_tokens_hash_check check (token_hash ~ '^[a-f0-9]{64}$')
);

alter table public.supplier_automation_tokens enable row level security;
revoke all on table public.supplier_automation_tokens from anon, authenticated;

do $$
declare
  automation_token text;
begin
  if not exists (
    select 1 from public.supplier_automation_tokens where provider = 'CJ Dropshipping'
  ) then
    automation_token := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.supplier_automation_tokens (provider, token_hash)
    values ('CJ Dropshipping', encode(extensions.digest(automation_token, 'sha256'), 'hex'));
    perform vault.create_secret(
      automation_token,
      'cossa_cj_daily_sync_token',
      'Authenticates the scheduled Cossa CJ catalogue automation only.'
    );
  end if;
end
$$;

create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
from cron.job
where jobname in ('cossa-cj-daily-availability', 'cossa-cj-daily-import', 'cossa-cj-daily-pricing');

-- Times are UTC: 04:05, 04:10 and 04:20 in South Africa. The jobs are
-- separated so stock refresh completes before import, then commercial review.
select cron.schedule(
  'cossa-cj-daily-availability',
  '5 2 * * *',
  $$
    select net.http_post(
      url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/cj-availability-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cossa-automation-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cossa_cj_daily_sync_token'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $$
);

select cron.schedule(
  'cossa-cj-daily-import',
  '10 2 * * *',
  $$
    select net.http_post(
      url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/cj-product-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cossa-automation-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cossa_cj_daily_sync_token'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $$
);

select cron.schedule(
  'cossa-cj-daily-pricing',
  '20 2 * * *',
  $$
    select net.http_post(
      url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/cj-commercial-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cossa-automation-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cossa_cj_daily_sync_token'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $$
);
