begin;

-- Server-side Astrum Smart Intake credential. The raw token never leaves Supabase Vault.
do $$
declare
  v_token text;
  v_secret_id uuid;
begin
  select id into v_secret_id
  from vault.secrets
  where name='cossa_astrum_smart_intake_token'
  order by created_at desc
  limit 1;

  if v_secret_id is null then
    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(
      v_token,
      'cossa_astrum_smart_intake_token',
      'Authenticates the server-side Astrum Smart Intake supervisor only.',
      null
    );
  else
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where id=v_secret_id;
  end if;

  update public.supplier_automation_tokens
  set active=false, updated_at=now()
  where provider='Astrum Smart Intake';

  if exists (select 1 from public.supplier_automation_tokens where provider='Astrum Smart Intake') then
    update public.supplier_automation_tokens
    set token_hash=encode(extensions.digest(v_token,'sha256'),'hex'), active=true, updated_at=now()
    where provider='Astrum Smart Intake';
  else
    insert into public.supplier_automation_tokens(provider,token_hash,active)
    values ('Astrum Smart Intake', encode(extensions.digest(v_token,'sha256'),'hex'), true);
  end if;
end $$;

create or replace function public.invoke_astrum_smart_intake_supervisor(
  p_refs text[] default null,
  p_dry_run boolean default false,
  p_max_items integer default 8
) returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  v_token text;
  v_market jsonb := '{}'::jsonb;
  v_body jsonb;
  v_request_id bigint;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name='cossa_astrum_smart_intake_token'
  order by created_at desc
  limit 1;

  if coalesce(v_token,'')='' then
    raise exception 'Astrum Smart Intake server credential is not configured';
  end if;

  select coalesce(jsonb_object_agg(e.supplier_product_ref, e.items), '{}'::jsonb)
  into v_market
  from (
    select c.supplier_product_ref,
           jsonb_agg(
             jsonb_build_object(
               'retailer', c.retailer,
               'price', c.price_zar,
               'url', c.source_url,
               'observedAt', c.observed_at,
               'exactMatch', c.exact_match
             ) order by c.price_zar asc
           ) as items
    from public.store_competitor_price_evidence c
    where c.organisation_id='00000000-0000-4000-8000-000000000001'::uuid
      and c.exact_match=true
      and c.availability in ('in_stock','unknown')
      and c.observed_at >= now() - interval '30 days'
      and (p_refs is null or c.supplier_product_ref = any(p_refs))
    group by c.supplier_product_ref
  ) e;

  v_body := jsonb_build_object(
    'dryRun', p_dry_run,
    'requireMarketEvidence', true,
    'maxItems', greatest(1,least(coalesce(p_max_items,8),25)),
    'marketEvidence', v_market
  );

  if p_refs is not null then
    v_body := v_body || jsonb_build_object('refs', to_jsonb(p_refs));
  end if;

  select net.http_post(
    url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/astrum-smart-intake-worker',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cossa-automation-token',v_token
    ),
    body := v_body,
    timeout_milliseconds := 120000
  ) into v_request_id;

  return v_request_id;
end $$;

revoke all on function public.invoke_astrum_smart_intake_supervisor(text[],boolean,integer) from public, anon, authenticated;
grant execute on function public.invoke_astrum_smart_intake_supervisor(text[],boolean,integer) to service_role;

-- Controlled server cadence: finish/refresh only pre-approved SAFE Astrum intakes.
do $$
declare
  v_job bigint;
begin
  select jobid into v_job from cron.job where jobname='cossa-astrum-smart-intake-supervisor' limit 1;
  if v_job is not null then perform cron.unschedule(v_job); end if;
  perform cron.schedule(
    'cossa-astrum-smart-intake-supervisor',
    '37 */4 * * *',
    $cron$select public.invoke_astrum_smart_intake_supervisor(null,false,8);$cron$
  );
end $$;

commit;
