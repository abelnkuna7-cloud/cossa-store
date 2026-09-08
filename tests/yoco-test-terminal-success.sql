-- Run against a database with an existing succeeded Yoco test attempt.
-- All mutations are rolled back.
begin;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

do $$
declare
  a public.store_yoco_test_payment_attempts%rowtype;
  r public.store_yoco_test_payment_attempts%rowtype;
  original_verified_at timestamptz;
  order_status text;
  order_paid_at timestamptz;
  event_count bigint;
  negative_event_id text;
  success_event_id text;
  state text;
begin
  select * into strict a
  from public.store_yoco_test_payment_attempts
  where status = 'succeeded'
  order by verified_at desc
  limit 1;
  original_verified_at := a.verified_at;

  foreach state in array array['failed', 'cancelled', 'expired'] loop
    select * into r from public.record_store_yoco_test_payment_event(
      'rollback-terminal-' || state || '-' || gen_random_uuid(),
      a.yoco_checkout_id, a.yoco_payment_id, a.amount_cents, a.currency,
      'test', 'payment.' || state, state, jsonb_build_object('rollback_test', state)
    );
    if r.status <> 'succeeded' or r.verified_at is distinct from original_verified_at then
      raise exception 'success was not terminal for %', state;
    end if;
  end loop;

  negative_event_id := 'rollback-terminal-duplicate-negative-' || gen_random_uuid();
  select * into r from public.record_store_yoco_test_payment_event(
    negative_event_id, a.yoco_checkout_id, a.yoco_payment_id,
    a.amount_cents, a.currency, 'test', 'payment.failed', 'failed',
    '{"rollback_test":"duplicate-negative"}'
  );
  select count(*) into event_count from public.store_yoco_test_webhook_events
  where payment_attempt_id = a.id;
  select * into r from public.record_store_yoco_test_payment_event(
    negative_event_id, a.yoco_checkout_id, a.yoco_payment_id,
    a.amount_cents, a.currency, 'test', 'payment.failed', 'failed',
    '{"rollback_test":"duplicate-negative-replay"}'
  );
  if (select count(*) from public.store_yoco_test_webhook_events where payment_attempt_id = a.id) <> event_count
    or r.status <> 'succeeded' or r.verified_at is distinct from original_verified_at then
    raise exception 'duplicate negative event was not idempotent';
  end if;

  success_event_id := 'rollback-terminal-success-' || gen_random_uuid();
  select * into r from public.record_store_yoco_test_payment_event(
    success_event_id,
    a.yoco_checkout_id, a.yoco_payment_id, a.amount_cents, a.currency,
    'test', 'payment.succeeded', 'succeeded', '{"rollback_test":"success"}'
  );
  if r.status <> 'succeeded' or r.verified_at is distinct from original_verified_at then
    raise exception 'duplicate success replaced verified state';
  end if;
  select count(*) into event_count from public.store_yoco_test_webhook_events
  where payment_attempt_id = a.id;
  select * into r from public.record_store_yoco_test_payment_event(
    success_event_id,
    a.yoco_checkout_id, a.yoco_payment_id, a.amount_cents, a.currency,
    'test', 'payment.succeeded', 'succeeded', '{"rollback_test":"success-replay"}'
  );
  if (select count(*) from public.store_yoco_test_webhook_events where payment_attempt_id = a.id) <> event_count
    or r.status <> 'succeeded' or r.verified_at is distinct from original_verified_at then
    raise exception 'duplicate success event was not idempotent';
  end if;

  begin
    perform public.record_store_yoco_test_payment_event(
      'rollback-wrong-amount-' || gen_random_uuid(), a.yoco_checkout_id,
      a.yoco_payment_id, a.amount_cents + 1, a.currency, 'test',
      'payment.succeeded', 'succeeded', '{}'
    );
    raise exception 'wrong amount accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.record_store_yoco_test_payment_event(
      'rollback-wrong-currency-' || gen_random_uuid(), a.yoco_checkout_id,
      a.yoco_payment_id, a.amount_cents, 'USD', 'test',
      'payment.succeeded', 'succeeded', '{}'
    );
    raise exception 'wrong currency accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.record_store_yoco_test_payment_event(
      'rollback-unknown-' || gen_random_uuid(), 'ch_rollback_unknown', null,
      a.amount_cents, a.currency, 'test', 'payment.succeeded', 'succeeded', '{}'
    );
    raise exception 'unknown checkout accepted';
  exception when sqlstate 'P0002' then null;
  end;

  select status, paid_at into order_status, order_paid_at
  from public.store_orders where id = a.store_order_id;
  if order_status <> 'pending' or order_paid_at is not null then
    raise exception 'test order payment safeguard failed';
  end if;
  if exists (
    select 1 from public.store_digital_entitlements d
    join public.store_order_items i on i.id = d.order_item_id
    where i.order_id = a.store_order_id
  ) or exists (
    select 1 from public.store_customer_fulfilments f where f.store_order_id = a.store_order_id
  ) then
    raise exception 'test payment released entitlement or fulfilment';
  end if;
end $$;

rollback;
