-- Manual-funded Printify commissioning layer.
-- This adds durable human funding/production approvals without calling a supplier API.
-- Actual supplier spend remains gated inside printify-send-to-production.

create table if not exists public.store_fulfilment_actions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  outbox_job_id uuid references public.store_fulfilment_outbox(id) on delete set null,
  store_order_id uuid not null references public.store_orders(id) on delete cascade,
  action text not null check (action in ('funding_confirmed','approve_production','hold','cancel','investigate')),
  reason text not null check (length(btrim(reason)) >= 3),
  actor_user_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists store_fulfilment_actions_order_idx
  on public.store_fulfilment_actions(store_order_id, created_at desc);
create index if not exists store_fulfilment_actions_job_idx
  on public.store_fulfilment_actions(outbox_job_id, created_at desc)
  where outbox_job_id is not null;

alter table public.store_fulfilment_actions enable row level security;

create policy "fulfilment actions admins can read"
on public.store_fulfilment_actions for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
  or exists (
    select 1 from public.organisation_members om
    where om.organisation_id = store_fulfilment_actions.organisation_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner','admin')
  )
);

revoke insert, update, delete on public.store_fulfilment_actions from anon, authenticated;

create or replace function public.reconcile_store_fulfilment_funding_account(
  p_provider text,
  p_currency text,
  p_balance_minor bigint,
  p_reserve_floor_minor bigint default 0,
  p_source text default 'manual_reconciliation',
  p_reason text default 'Manual supplier balance reconciliation'
)
returns public.store_fulfilment_funding_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
  v_actor uuid := auth.uid();
  v_currency text := upper(btrim(coalesce(p_currency,'')));
  v_provider text := btrim(coalesce(p_provider,''));
  v_row public.store_fulfilment_funding_accounts%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if not (
    exists (select 1 from public.user_roles ur where ur.user_id=v_actor and ur.role='admin')
    or exists (select 1 from public.organisation_members om where om.organisation_id=v_org and om.user_id=v_actor and om.status='active' and om.role in ('owner','admin'))
  ) then raise exception 'Administrator authority required'; end if;
  if v_provider = '' then raise exception 'Provider is required'; end if;
  if v_currency !~ '^[A-Z]{3}$' then raise exception 'Currency must be a 3-letter ISO code'; end if;
  if p_balance_minor < 0 then raise exception 'Supplier balance cannot be negative'; end if;
  if p_reserve_floor_minor < 0 then raise exception 'Reserve floor cannot be negative'; end if;
  if p_reserve_floor_minor > p_balance_minor then raise exception 'Reserve floor cannot exceed reconciled balance'; end if;
  if length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'A reconciliation reason is required'; end if;

  insert into public.store_fulfilment_funding_accounts(
    organisation_id, provider, currency, reconciled_balance_minor,
    reserve_floor_minor, balance_as_of, source, metadata
  ) values (
    v_org, v_provider, v_currency, p_balance_minor,
    p_reserve_floor_minor, pg_catalog.now(), nullif(btrim(coalesce(p_source,'')),''),
    pg_catalog.jsonb_build_object('reconciled_by',v_actor,'reason',btrim(p_reason),'mode','manual_funded')
  )
  on conflict (organisation_id, provider, currency)
  do update set
    reconciled_balance_minor = excluded.reconciled_balance_minor,
    reserve_floor_minor = excluded.reserve_floor_minor,
    balance_as_of = excluded.balance_as_of,
    source = excluded.source,
    metadata = coalesce(public.store_fulfilment_funding_accounts.metadata,'{}'::jsonb) || excluded.metadata,
    updated_at = pg_catalog.now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.reconcile_store_fulfilment_funding_account(text,text,bigint,bigint,text,text) from public, anon;
grant execute on function public.reconcile_store_fulfilment_funding_account(text,text,bigint,bigint,text,text) to authenticated;

create or replace function public.record_store_fulfilment_action(
  p_store_order_id uuid,
  p_action text,
  p_reason text,
  p_outbox_job_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
  v_actor uuid := auth.uid();
  v_id uuid;
  v_funding_count integer;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_action not in ('funding_confirmed','approve_production','hold','cancel','investigate') then raise exception 'Unsupported action'; end if;
  if length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'A reason is required'; end if;
  if not exists (select 1 from public.store_orders o where o.id=p_store_order_id and o.organisation_id=v_org) then raise exception 'Store order not found'; end if;
  if not (
    exists (select 1 from public.user_roles ur where ur.user_id=v_actor and ur.role='admin')
    or exists (select 1 from public.organisation_members om where om.organisation_id=v_org and om.user_id=v_actor and om.status='active' and om.role in ('owner','admin'))
  ) then raise exception 'Administrator authority required'; end if;

  if p_outbox_job_id is not null and not exists (
    select 1 from public.store_fulfilment_outbox j
    where j.id=p_outbox_job_id and j.organisation_id=v_org and j.store_order_id=p_store_order_id
  ) then raise exception 'Outbox job does not belong to this order'; end if;

  if p_action = 'approve_production' then
    if not exists (
      select 1 from public.store_fulfilment_orders f
      where f.organisation_id=v_org and f.store_order_id=p_store_order_id
        and f.provider='Printify' and f.provider_order_id is not null
        and f.status <> 'reconcile_required'
    ) then raise exception 'Production approval requires a persisted non-reconciliation Printify order'; end if;

    select count(*) into v_funding_count
    from public.store_fulfilment_funding_accounts a
    where a.organisation_id=v_org
      and a.provider='Printify'
      and a.reconciled_balance_minor > a.reserve_floor_minor
      and a.balance_as_of >= pg_catalog.now() - interval '24 hours';
    if v_funding_count = 0 then raise exception 'Production approval requires a fresh positive reconciled Printify funding balance'; end if;
  end if;

  insert into public.store_fulfilment_actions(
    organisation_id,outbox_job_id,store_order_id,action,reason,actor_user_id,metadata
  ) values (
    v_org,p_outbox_job_id,p_store_order_id,p_action,btrim(p_reason),v_actor,coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_store_fulfilment_action(uuid,text,text,uuid,jsonb) from public, anon;
grant execute on function public.record_store_fulfilment_action(uuid,text,text,uuid,jsonb) to authenticated;

create or replace function public.enqueue_store_production_after_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.action is distinct from 'approve_production' then return new; end if;

  insert into public.store_fulfilment_outbox(
    organisation_id,store_order_id,payment_request_id,provider,event_type,status,idempotency_key,payload
  )
  select
    new.organisation_id,new.store_order_id,epr.id,'Printify','production_approved','pending',
    'printify:production-approved:' || new.id::text,
    pg_catalog.jsonb_build_object(
      'actionId',new.id,'storeOrderId',new.store_order_id,
      'approvedBy',new.actor_user_id,'approvedAt',new.created_at,
      'source','manual_funded_approval'
    )
  from public.eft_payment_requests epr
  where epr.organisation_id=new.organisation_id
    and epr.store_order_id=new.store_order_id
    and epr.purpose='store_order'
    and epr.status='approved'
  order by epr.updated_at desc nulls last,epr.created_at desc
  limit 1
  on conflict (organisation_id,idempotency_key) do nothing;

  return new;
end;
$$;

revoke all on function public.enqueue_store_production_after_approval() from public, anon, authenticated;

drop trigger if exists enqueue_store_production_after_approval on public.store_fulfilment_actions;
create trigger enqueue_store_production_after_approval
after insert on public.store_fulfilment_actions
for each row
when (new.action = 'approve_production')
execute function public.enqueue_store_production_after_approval();
