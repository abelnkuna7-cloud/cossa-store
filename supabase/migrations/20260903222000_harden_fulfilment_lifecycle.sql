-- Additive lifecycle hardening for the permanent supplier-neutral fulfilment engine.
-- Keep supplier execution state separate from customer order state.

do $$
declare c record;
begin
  -- Remove only CHECK constraints attached to store_fulfilment_orders.status so the
  -- permanent lifecycle can be installed without assuming a historical constraint name.
  for c in
    select conname
    from pg_constraint
    where conrelid='public.store_fulfilment_orders'::regclass
      and contype='c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.store_fulfilment_orders drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.store_fulfilment_orders
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.store_fulfilment_orders
  add constraint store_fulfilment_orders_status_lifecycle_check
  check (status in (
    'pending','submitting','submitted','reconcile_required','production_authorizing',
    'production_requested','in_production','partially_fulfilled','shipped','fulfilled',
    'delivered','cancelled','exception','failed','failed_safe'
  )) not valid;

-- Do not rewrite historical rows. Validate only after existing data is confirmed compatible.
-- New/updated rows are still checked by PostgreSQL while the constraint is NOT VALID.

create index if not exists store_fulfilment_orders_provider_order_idx
  on public.store_fulfilment_orders(provider, provider_order_id)
  where provider_order_id is not null;

-- Durable provider webhook inbox. Provider callbacks are acknowledged only after they
-- have a local durable record, allowing replay/reconciliation after crashes or races.
create table if not exists public.store_fulfilment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  topic text not null,
  resource_type text,
  provider_resource_id text,
  payload jsonb not null,
  status text not null default 'received' check(status in ('received','processing','processed','reconcile_required','failed_safe')),
  attempts integer not null default 0,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);
create index if not exists store_fulfilment_webhook_events_reconcile_idx
  on public.store_fulfilment_webhook_events(status, received_at)
  where status in ('received','reconcile_required');
alter table public.store_fulfilment_webhook_events enable row level security;

-- Supplier-neutral operation journal for external side effects. The unique idempotency
-- key is the local authority for whether an operation may be attempted again.
create table if not exists public.store_fulfilment_operations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  fulfilment_order_id uuid not null references public.store_fulfilment_orders(id) on delete cascade,
  provider text not null,
  operation_type text not null,
  idempotency_key text not null,
  state text not null default 'reserved' check(state in ('reserved','in_progress','succeeded','reconcile_required','failed_safe','cancelled')),
  attempt_count integer not null default 0,
  locked_at timestamptz,
  provider_operation_id text,
  request_payload jsonb,
  response_payload jsonb,
  last_error text,
  actor_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organisation_id,idempotency_key)
);
create index if not exists store_fulfilment_operations_order_idx on public.store_fulfilment_operations(fulfilment_order_id,created_at desc);
alter table public.store_fulfilment_operations enable row level security;

create policy "fulfilment operations admins can read" on public.store_fulfilment_operations
for select to authenticated using (
  exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin')
  or exists(select 1 from public.organisation_members om where om.organisation_id=store_fulfilment_operations.organisation_id and om.user_id=auth.uid() and om.status='active' and om.role in ('owner','admin'))
);
