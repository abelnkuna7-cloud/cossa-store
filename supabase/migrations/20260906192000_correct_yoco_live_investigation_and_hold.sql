-- Phase 5B correction: persist webhook investigations instead of raising after
-- the state update, and make verified Yoco fulfilment work explicitly held.

alter table public.store_fulfilment_outbox
  drop constraint if exists store_fulfilment_outbox_status_check;
alter table public.store_fulfilment_outbox
  add constraint store_fulfilment_outbox_status_check
  check (status in ('pending','processing','retry','held','completed','dead_letter','cancelled'));

create or replace function public.record_store_yoco_live_payment_event(
  p_event_id text,p_attempt_id uuid,p_checkout_id text,p_payment_id text,p_amount_cents bigint,
  p_currency text,p_event_type text,p_payment_status text,p_safe_payload jsonb
) returns public.store_payment_attempts
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  a public.store_payment_attempts%rowtype;
  o public.store_orders%rowtype;
  inserted text;
  mismatch_code text;
begin
  if auth.role()<>'service_role' then raise exception 'Trusted payment service required' using errcode='42501'; end if;
  if nullif(trim(coalesce(p_event_id,'')),'') is null then raise exception 'Provider event ID is required' using errcode='22023'; end if;
  select * into a from public.store_payment_attempts
    where id=p_attempt_id and provider='yoco' and environment='live' for update;
  if not found then raise exception 'Live payment attempt not found' using errcode='P0002'; end if;
  select * into o from public.store_orders where id=a.store_order_id for update;

  -- Record the provider event before validation so investigation evidence and
  -- the state transition survive a bad amount/currency/identifier.
  insert into public.store_payment_provider_events(
    provider,environment,provider_event_id,payment_attempt_id,event_type,
    provider_checkout_id,provider_payment_id,amount_cents,currency,safe_payload,
    processing_status,processed_at
  ) values (
    'yoco','live',p_event_id,a.id,p_event_type,p_checkout_id,p_payment_id,
    p_amount_cents,p_currency,coalesce(p_safe_payload,'{}'::jsonb),'received',now()
  ) on conflict(provider,environment,provider_event_id) do nothing
    returning provider_event_id into inserted;
  if inserted is null then return a; end if;

  if p_currency is distinct from a.currency then mismatch_code := 'CURRENCY_MISMATCH';
  elsif p_amount_cents is distinct from a.amount_cents then mismatch_code := 'AMOUNT_MISMATCH';
  elsif p_checkout_id is not null and a.provider_checkout_id is not null and p_checkout_id <> a.provider_checkout_id then mismatch_code := 'IDENTIFIER_MISMATCH';
  end if;
  if mismatch_code is not null then
    update public.store_payment_attempts
      set status='investigation', failure_code=mismatch_code,
          failure_message_safe='Provider event did not match the stored payment attempt.', updated_at=now()
      where id=a.id returning * into a;
    update public.store_payment_provider_events
      set processing_status='investigation', processed_at=now()
      where provider='yoco' and environment='live' and provider_event_id=p_event_id;
    return a;
  end if;

  if p_event_type='payment.succeeded' and p_payment_status='succeeded' then
    if o.status='paid' or a.status='succeeded' then
      update public.store_payment_attempts set status='investigation',failure_code='DUPLICATE_SUCCESS',updated_at=now() where id=a.id returning * into a;
      update public.store_payment_provider_events set processing_status='investigation',processed_at=now() where provider='yoco' and environment='live' and provider_event_id=p_event_id;
      return a;
    end if;
    update public.store_payment_attempts set status='succeeded',provider_checkout_id=coalesce(a.provider_checkout_id,p_checkout_id),provider_payment_id=coalesce(a.provider_payment_id,p_payment_id),verified_at=now(),updated_at=now(),failure_code=null,failure_message_safe=null where id=a.id returning * into a;
    update public.store_orders set status='paid',payment_provider='yoco',payment_reference=coalesce(p_payment_id,p_checkout_id,p_event_id),paid_at=now(),updated_at=now() where id=o.id;
    insert into public.store_fulfilment_outbox(organisation_id,store_order_id,provider,event_type,status,idempotency_key,payload,result)
      values(o.organisation_id,o.id,'Cossa','payment_verified','held','yoco:payment-verified:'||o.id,jsonb_build_object('paymentAttemptId',a.id,'provider','yoco','environment','live'),jsonb_build_object('human_hold',true,'commissioning_required',true))
      on conflict(organisation_id,idempotency_key) do nothing;
  else
    update public.store_payment_attempts set status=case when p_payment_status in ('failed','cancelled','expired') then p_payment_status else 'processing' end,updated_at=now() where id=a.id returning * into a;
  end if;
  update public.store_payment_provider_events set processing_status='processed',processed_at=now() where provider='yoco' and environment='live' and provider_event_id=p_event_id;
  return a;
end $$;
revoke all on function public.record_store_yoco_live_payment_event(text,uuid,text,text,bigint,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_store_yoco_live_payment_event(text,uuid,text,text,bigint,text,text,text,jsonb) to service_role;
