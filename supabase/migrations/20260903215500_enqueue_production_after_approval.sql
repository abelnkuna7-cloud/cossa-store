-- Automatically continue fulfilment after an audited human production approval.
-- The approval transaction only records durable work; supplier APIs remain outside DB transactions.

create or replace function public.enqueue_store_production_after_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.action is distinct from 'approve_production' then
    return new;
  end if;

  insert into public.store_fulfilment_outbox (
    organisation_id,
    store_order_id,
    payment_request_id,
    provider,
    event_type,
    status,
    idempotency_key,
    payload
  )
  select
    new.organisation_id,
    new.store_order_id,
    epr.id,
    'Printify',
    'production_approved',
    'pending',
    'printify:production-approved:' || new.id::text,
    jsonb_build_object(
      'actionId', new.id,
      'storeOrderId', new.store_order_id,
      'approvedBy', new.actor_user_id,
      'approvedAt', new.created_at,
      'source', 'audited_fulfilment_action'
    )
  from public.eft_payment_requests epr
  where epr.organisation_id = new.organisation_id
    and epr.store_order_id = new.store_order_id
    and epr.purpose = 'store_order'
    and epr.status = 'approved'
  order by epr.updated_at desc nulls last, epr.created_at desc
  limit 1
  on conflict (organisation_id, idempotency_key) do nothing;

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
