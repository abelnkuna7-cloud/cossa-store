-- A verified Yoco test success is terminal. Later provider events remain
-- auditable, but cannot downgrade the attempt or replace its verification time.
create or replace function public.record_store_yoco_test_payment_event(
  p_event_id text,
  p_checkout_id text,
  p_payment_id text,
  p_amount_cents bigint,
  p_currency text,
  p_mode text,
  p_event_type text,
  p_payment_status text,
  p_payload jsonb
)
returns public.store_yoco_test_payment_attempts
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_attempt public.store_yoco_test_payment_attempts%rowtype;
  v_inserted text;
  v_status text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the trusted payment service may process Yoco webhooks.' using errcode = '42501';
  end if;
  if coalesce(nullif(trim(p_event_id), ''), '') = ''
    or coalesce(nullif(trim(p_checkout_id), ''), '') = '' then
    raise exception 'The Yoco webhook identifiers are invalid.' using errcode = '22023';
  end if;

  select * into v_attempt
  from public.store_yoco_test_payment_attempts
  where yoco_checkout_id = p_checkout_id
  for update;
  if not found then
    raise exception 'No matching Yoco test payment attempt was found.' using errcode = 'P0002';
  end if;

  insert into public.store_yoco_test_webhook_events (event_id, payment_attempt_id, payload)
  values (p_event_id, v_attempt.id, coalesce(p_payload, '{}'::jsonb))
  on conflict (event_id) do nothing
  returning event_id into v_inserted;
  if v_inserted is null then return v_attempt; end if;

  if v_attempt.mode <> 'test'
    or p_mode <> 'test'
    or p_currency <> v_attempt.currency
    or p_amount_cents <> v_attempt.amount_cents then
    raise exception 'The Yoco event does not match this test checkout.' using errcode = '22023';
  end if;

  -- Success is authoritative and terminal. The new event remains recorded for
  -- audit/deduplication, while status, payment id and verified_at remain intact.
  if v_attempt.status = 'succeeded' then
    return v_attempt;
  end if;

  if p_event_type = 'payment.succeeded' and p_payment_status = 'succeeded' then
    v_status := 'succeeded';
  elsif p_event_type like 'payment.%' and p_payment_status in ('failed', 'cancelled', 'expired') then
    v_status := p_payment_status;
  else
    return v_attempt;
  end if;

  update public.store_yoco_test_payment_attempts
  set status = v_status,
      yoco_payment_id = case when v_status = 'succeeded' then nullif(trim(p_payment_id), '') else yoco_payment_id end,
      verified_at = case when v_status = 'succeeded' then now() else verified_at end,
      last_error = case when v_status = 'succeeded' then null else coalesce(nullif(trim(p_payment_status), ''), v_status) end,
      updated_at = now()
  where id = v_attempt.id
  returning * into v_attempt;

  -- Test payments never mark Store orders paid or release fulfilment.
  return v_attempt;
end;
$$;

revoke all on function public.record_store_yoco_test_payment_event(
  text, text, text, bigint, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_store_yoco_test_payment_event(
  text, text, text, bigint, text, text, text, text, jsonb
) to service_role;
