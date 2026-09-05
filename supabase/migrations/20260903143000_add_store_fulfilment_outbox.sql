-- Durable Store fulfilment outbox.
-- The payment transaction only records work. External supplier APIs are never called
-- from the payment transaction itself. A server worker claims and processes jobs.

create table if not exists public.store_fulfilment_outbox (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  store_order_id uuid not null references public.store_orders(id) on delete cascade,
  payment_request_id uuid references public.eft_payment_requests(id) on delete set null,
  provider text not null,
  event_type text not null default 'payment_approved',
  status text not null default 'pending' check (status in ('pending','processing','retry','completed','dead_letter','cancelled')),
  idempotency_key text not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 12 check (max_attempts between 1 and 100),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, idempotency_key)
);

create index if not exists store_fulfilment_outbox_ready_idx
  on public.store_fulfilment_outbox (status, available_at, created_at)
  where status in ('pending','retry');

alter table public.store_fulfilment_outbox enable row level security;

-- Service-role workers use the table. Admins get read-only visibility for operations.
drop policy if exists "store fulfilment outbox admins can read" on public.store_fulfilment_outbox;
create policy "store fulfilment outbox admins can read"
on public.store_fulfilment_outbox for select
to authenticated
using (
  exists (
    select 1 from public.organisation_members om
    where om.organisation_id = store_fulfilment_outbox.organisation_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner','admin')
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);

create or replace function public.enqueue_store_fulfilment_after_payment_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text;
begin
  if new.purpose is distinct from 'store_order'
     or new.store_order_id is null
     or new.status is distinct from 'approved'
     or old.status is not distinct from 'approved' then
    return new;
  end if;

  -- Enqueue only providers actually represented by this order. Provider-specific
  -- workers perform exact mapping validation again before any external side effect.
  for v_provider in
    select distinct case
      when lower(coalesce(soi.metadata->>'provider','')) = 'printify' then 'Printify'
      when exists (
        select 1
        from public.store_product_fulfilment_mappings m
        where m.organisation_id = new.organisation_id
          and m.store_product_id = soi.product_id
          and m.provider = 'Printify'
          and m.fulfilment_status = 'active'
      ) then 'Printify'
      else null
    end
    from public.store_order_items soi
    where soi.store_order_id = new.store_order_id
  loop
    if v_provider is null then continue; end if;
    insert into public.store_fulfilment_outbox (
      organisation_id, store_order_id, payment_request_id, provider,
      idempotency_key, payload
    ) values (
      new.organisation_id, new.store_order_id, new.id, v_provider,
      lower(v_provider) || ':payment-approved:' || new.store_order_id::text,
      jsonb_build_object('paymentId', new.id, 'storeOrderId', new.store_order_id, 'source', 'eft_payment_approval')
    ) on conflict (organisation_id, idempotency_key) do nothing;
  end loop;

  return new;
end;
$$;

-- Trigger is additive and fires only on the transition into approved.
drop trigger if exists enqueue_store_fulfilment_after_payment_approval on public.eft_payment_requests;
create trigger enqueue_store_fulfilment_after_payment_approval
after update of status on public.eft_payment_requests
for each row
execute function public.enqueue_store_fulfilment_after_payment_approval();

create or replace function public.claim_store_fulfilment_outbox_jobs(
  p_worker_id text,
  p_limit integer default 10
)
returns setof public.store_fulfilment_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select o.id
    from public.store_fulfilment_outbox o
    where o.status in ('pending','retry')
      and o.available_at <= now()
      and o.attempts < o.max_attempts
    order by o.available_at, o.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,10),50))
  )
  update public.store_fulfilment_outbox o
  set status = 'processing',
      attempts = o.attempts + 1,
      locked_at = now(),
      locked_by = left(coalesce(p_worker_id,'worker'),160),
      updated_at = now()
  from candidates c
  where o.id = c.id
  returning o.*;
end;
$$;

revoke all on function public.claim_store_fulfilment_outbox_jobs(text,integer) from public, anon, authenticated;
