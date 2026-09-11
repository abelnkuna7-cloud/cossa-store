create table if not exists public.astrum_intake_v13_queue (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null unique references public.store_inventory_intakes(id),
  supplier_product_ref text not null,
  status text not null default 'pending' check (status in ('pending','processing','prepared','hold','retry','failed','hard_hold')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_error text,
  last_error_class text check (last_error_class is null or last_error_class in ('temporary','permanent','safety')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists astrum_intake_v13_queue_runnable_idx
  on public.astrum_intake_v13_queue (status, next_attempt_at, attempts, created_at);

alter table public.astrum_intake_v13_queue enable row level security;

create or replace function public.claim_astrum_intake_v13_queue(p_limit integer default 4)
returns table(queue_id uuid, intake_id uuid, supplier_product_ref text)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.astrum_intake_v13_queue q
     set status = 'retry',
         next_attempt_at = now() + interval '5 minutes',
         locked_at = null,
         last_error = coalesce(q.last_error, 'Recovered stale processing lease'),
         last_error_class = 'temporary',
         updated_at = now()
   where q.status = 'processing'
     and q.locked_at < now() - interval '30 minutes';

  return query
  with candidates as (
    select q.id
      from public.astrum_intake_v13_queue q
      join public.store_inventory_intakes i on i.id = q.intake_id
     where q.status in ('pending','retry')
       and q.next_attempt_at <= now()
       and q.attempts < q.max_attempts
       and i.organisation_id = '00000000-0000-4000-8000-000000000001'::uuid
       and i.supplier_id = '3b625ee7-25d4-4604-afd5-2a0909ac04b6'::uuid
       and i.approval_status = 'review'
       and i.publication_store_product_id is null
       and i.published_at is null
       and i.supplier_available_stock > 0
       and i.supplier_cost > 0
       and i.fulfilment_profile_id is not null
       and i.supplier_product_ref not in ('ASPKSM510B','APB20PB','ALCP156B','ALCP172B','A32305-A','A14521-B','AENP4310B','ASB100NB')
       and coalesce(i.operational_notes,'') not like 'Smart Intake v13 prepared %'
     order by q.next_attempt_at asc, q.attempts asc, q.created_at asc
     for update of q skip locked
     limit greatest(1, least(coalesce(p_limit,4),12))
  ), claimed as (
    update public.astrum_intake_v13_queue q
       set status = 'processing',
           attempts = q.attempts + 1,
           locked_at = now(),
           last_started_at = now(),
           updated_at = now()
      from candidates c
     where q.id = c.id
     returning q.id, q.intake_id, q.supplier_product_ref
  )
  select c.id, c.intake_id, c.supplier_product_ref from claimed c;
end;
$$;

revoke all on function public.claim_astrum_intake_v13_queue(integer) from public, anon, authenticated;
grant execute on function public.claim_astrum_intake_v13_queue(integer) to service_role;

insert into public.astrum_intake_v13_queue (intake_id, supplier_product_ref, status, last_completed_at, last_error, last_error_class)
select i.id,
       i.supplier_product_ref,
       case
         when coalesce(i.operational_notes,'') like 'Smart Intake v13 prepared %' then 'prepared'
         when i.supplier_product_ref in ('ASPKSM510B','APB20PB','ALCP156B','ALCP172B','A32305-A','A14521-B','AENP4310B','ASB100NB') then 'hard_hold'
         else 'pending'
       end,
       case when coalesce(i.operational_notes,'') like 'Smart Intake v13 prepared %' then now() else null end,
       case when i.supplier_product_ref in ('ASPKSM510B','APB20PB','ALCP156B','ALCP172B','A32305-A','A14521-B','AENP4310B','ASB100NB') then 'Protected safety hold' else null end,
       case when i.supplier_product_ref in ('ASPKSM510B','APB20PB','ALCP156B','ALCP172B','A32305-A','A14521-B','AENP4310B','ASB100NB') then 'safety' else null end
  from public.store_inventory_intakes i
 where i.organisation_id = '00000000-0000-4000-8000-000000000001'::uuid
   and i.supplier_id = '3b625ee7-25d4-4604-afd5-2a0909ac04b6'::uuid
   and i.approval_status = 'review'
   and i.publication_store_product_id is null
   and i.published_at is null
   and i.supplier_available_stock > 0
   and i.supplier_cost > 0
   and i.fulfilment_profile_id is not null
on conflict (intake_id) do nothing;

update public.supplier_automation_tokens
   set token_hash = encode(digest((select decrypted_secret from vault.decrypted_secrets where name='cossa_astrum_smart_intake_token' order by created_at desc limit 1),'sha256'),'hex'),
       active = true,
       updated_at = now()
 where provider = 'Astrum Smart Intake'
   and exists (select 1 from vault.decrypted_secrets where name='cossa_astrum_smart_intake_token');

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cossa-astrum-smart-intake-v13-queue') then
    perform cron.unschedule('cossa-astrum-smart-intake-v13-queue');
  end if;
end $$;

select cron.schedule(
  'cossa-astrum-smart-intake-v13-queue',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://nptyyzyokzgnwnyteeyi.supabase.co/functions/v1/astrum-smart-intake-v13-queue',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cossa-automation-token',
      (select decrypted_secret from vault.decrypted_secrets where name='cossa_astrum_smart_intake_token' order by created_at desc limit 1)
    ),
    body := '{"maxItems":4}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);