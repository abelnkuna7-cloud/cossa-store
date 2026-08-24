-- Controlled CJ catalogue-fill mode. While a supported department is below
-- its Active target, the three safe existing CJ stages run every two hours.
-- Once targets are met, only the existing daily maintenance jobs continue.

create or replace function public.cj_catalogue_fill_required()
returns boolean
language sql
stable
set search_path = public
as $$
  with priority(category) as (
    values
      ('construction-diy'), ('home-living'), ('cleaning-household'),
      ('technology-electronics'), ('office-business'), ('tools-industrial'),
      ('security-smart-home'), ('mobile-accessories'), ('automotive'),
      ('health-personal-care'), ('beauty-grooming'), ('pet-supplies'),
      ('outdoor-garden'), ('sports-fitness'), ('women'), ('men'),
      ('kids-baby'), ('travel-luggage'), ('gaming-entertainment'),
      ('school-education')
  ), current as (
    select category, count(*)::int as active_count
    from public.store_products
    where organisation_id = '00000000-0000-4000-8000-000000000001'
      and supplier_name = 'CJ Dropshipping'
      and status = 'active'
    group by category
  )
  select exists (
    select 1
    from priority
    left join current using (category)
    where coalesce(current.active_count, 0) < 12
  );
$$;

revoke all on function public.cj_catalogue_fill_required() from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname in (
  'cossa-cj-catalogue-fill-availability',
  'cossa-cj-catalogue-fill-import',
  'cossa-cj-catalogue-fill-pricing'
);

-- South Africa is UTC+2: every two hours from 06:05 to 20:35 SAST. Stagger
-- each phase so stock checks finish before import and freight/pricing begins.
select cron.schedule(
  'cossa-cj-catalogue-fill-availability', '5 4-18/2 * * *',
  $$ select net.http_post(
    url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/cj-availability-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cossa-automation-token',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cossa_cj_daily_sync_token')),
    body := '{}'::jsonb, timeout_milliseconds := 120000
  ) where public.cj_catalogue_fill_required(); $$
);

select cron.schedule(
  'cossa-cj-catalogue-fill-import', '15 4-18/2 * * *',
  $$ select net.http_post(
    url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/cj-product-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cossa-automation-token',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cossa_cj_daily_sync_token')),
    body := '{}'::jsonb, timeout_milliseconds := 120000
  ) where public.cj_catalogue_fill_required(); $$
);

select cron.schedule(
  'cossa-cj-catalogue-fill-pricing', '35 4-18/2 * * *',
  $$ select net.http_post(
    url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/cj-commercial-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cossa-automation-token',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cossa_cj_daily_sync_token')),
    body := '{}'::jsonb, timeout_milliseconds := 120000
  ) where public.cj_catalogue_fill_required()
    or exists (
      select 1 from public.store_products
      where organisation_id = '00000000-0000-4000-8000-000000000001'
        and supplier_name = 'CJ Dropshipping'
        and status = 'draft' and stock_quantity > 0
    ); $$
);
