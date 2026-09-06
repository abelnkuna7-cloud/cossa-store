-- Rollback-safe production verification for Phase 5B correction.
-- Execute as service_role; every fixture is rolled back.
begin;
do $$
declare
  org uuid := '00000000-0000-4000-8000-000000000001';
  actor uuid;
  order_id uuid := gen_random_uuid();
  attempt_id uuid := gen_random_uuid();
  success_order uuid := gen_random_uuid();
  success_attempt uuid := gen_random_uuid();
  result public.store_payment_attempts%rowtype;
  claimed integer;
begin
  select id into actor from auth.users order by created_at limit 1;
  if actor is null then raise exception 'fixture requires an auth user'; end if;
  insert into public.store_orders(id,organisation_id,order_number,customer_user_id,customer_name,customer_email,status,total)
    values(order_id,org,'PHASE5B-ROLLBACK-MISMATCH',actor,'Phase 5B fixture','phase5b-fixture@example.invalid','pending',10);
  insert into public.store_payment_attempts(id,organisation_id,store_order_id,payer_user_id,provider,environment,status,amount_cents,currency,client_request_id)
    values(attempt_id,org,order_id,actor,'yoco','live','created',1000,'ZAR',gen_random_uuid());
  select * into result from public.record_store_yoco_live_payment_event('phase5b-mismatch-'||attempt_id,attempt_id,'co_fixture','pay_fixture',999,'ZAR','payment.succeeded','succeeded','{}');
  if result.status <> 'investigation' or result.failure_code <> 'AMOUNT_MISMATCH' then raise exception 'amount mismatch did not persist'; end if;
  if (select status from public.store_orders where id=order_id) <> 'pending' then raise exception 'mismatch marked order paid'; end if;
  if (select processing_status from public.store_payment_provider_events where payment_attempt_id=attempt_id) <> 'investigation' then raise exception 'mismatch event not persisted'; end if;
  insert into public.store_orders(id,organisation_id,order_number,customer_user_id,customer_name,customer_email,status,total)
    values(success_order,org,'PHASE5B-ROLLBACK-SUCCESS',actor,'Phase 5B fixture','phase5b-fixture@example.invalid','pending',10);
  insert into public.store_payment_attempts(id,organisation_id,store_order_id,payer_user_id,provider,environment,status,amount_cents,currency,client_request_id,provider_checkout_id)
    values(success_attempt,org,success_order,actor,'yoco','live','created',1000,'ZAR',gen_random_uuid(),'co_success');
  select * into result from public.record_store_yoco_live_payment_event('phase5b-success-'||success_attempt,success_attempt,'co_success','pay_success',1000,'ZAR','payment.succeeded','succeeded','{}');
  if result.status <> 'succeeded' then raise exception 'success did not succeed'; end if;
  if (select status from public.store_orders where id=success_order) <> 'paid' then raise exception 'success did not mark order paid'; end if;
  if (select count(*) from public.store_fulfilment_outbox where store_order_id=success_order and status='held') <> 1 then raise exception 'success did not create one held outbox row'; end if;
  select count(*) into claimed from public.claim_store_fulfilment_outbox_jobs('phase5b-db-test',50) where store_order_id=success_order;
  if claimed <> 0 then raise exception 'held outbox row was claimable'; end if;
  select * into result from public.record_store_yoco_live_payment_event('phase5b-already-paid-'||success_attempt,success_attempt,'co_success','pay_success_2',1000,'ZAR','payment.succeeded','succeeded','{}');
  if result.status <> 'investigation' or result.failure_code <> 'DUPLICATE_SUCCESS' then raise exception 'already-paid event not investigated'; end if;
end $$;
rollback;

