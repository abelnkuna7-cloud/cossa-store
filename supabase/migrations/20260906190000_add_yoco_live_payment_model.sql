-- Phase 5B: provider-neutral live payment model.  Live remains disabled until
-- commissioning explicitly enables it and server-only secrets are present.

create table if not exists public.store_payment_provider_controls (
  id boolean primary key default true check (id),
  yoco_live_state text not null default 'disabled'
    check (yoco_live_state in ('disabled','commissioning','active')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.store_payment_provider_controls (id, yoco_live_state)
values (true, 'disabled') on conflict (id) do nothing;
alter table public.store_payment_provider_controls enable row level security;
create policy "payment controls are not client readable"
  on public.store_payment_provider_controls for all to anon, authenticated
  using (false) with check (false);

create table if not exists public.store_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  store_order_id uuid not null references public.store_orders(id) on delete restrict,
  payer_user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null check (provider = 'yoco'),
  environment text not null check (environment = 'live'),
  status text not null default 'created' check (status in ('created','pending','processing','succeeded','failed','cancelled','expired','investigation','refunded','partially_refunded')),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  client_request_id uuid not null,
  provider_checkout_id text unique,
  provider_payment_id text unique,
  provider_reference text,
  failure_code text,
  failure_message_safe text,
  cart_fingerprint text,
  address_fingerprint text,
  delivery_fingerprint text,
  price_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payer_user_id, client_request_id)
);
create index if not exists store_payment_attempts_customer_idx
  on public.store_payment_attempts (payer_user_id, created_at desc);
create index if not exists store_payment_attempts_order_idx
  on public.store_payment_attempts (store_order_id, created_at desc);

create table if not exists public.store_payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'yoco'),
  environment text not null check (environment = 'live'),
  provider_event_id text not null,
  payment_attempt_id uuid references public.store_payment_attempts(id) on delete restrict,
  event_type text not null,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','investigation')),
  provider_checkout_id text,
  provider_payment_id text,
  amount_cents bigint,
  currency text,
  safe_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, environment, provider_event_id)
);
create index if not exists store_payment_provider_events_attempt_idx
  on public.store_payment_provider_events (payment_attempt_id, received_at desc);

alter table public.store_payment_attempts enable row level security;
alter table public.store_payment_provider_events enable row level security;
create policy "customers read their own live payment status"
  on public.store_payment_attempts for select to authenticated
  using (
    payer_user_id = (select auth.uid())
    and (select public.is_active_store_session())
  );
create policy "live payment events are server only"
  on public.store_payment_provider_events for all to anon, authenticated
  using (false) with check (false);
create policy "live payment attempts deny client inserts"
  on public.store_payment_attempts for insert to anon, authenticated
  with check (false);
create policy "live payment attempts deny client updates"
  on public.store_payment_attempts for update to anon, authenticated
  using (false) with check (false);
create policy "live payment attempts deny client deletes"
  on public.store_payment_attempts for delete to anon, authenticated
  using (false);

-- Vault access is service-role-only; no live secret is inserted by this migration.
create or replace function public.store_yoco_live_webhook_secret(p_secret text)
returns void language plpgsql security definer set search_path to 'vault','public','pg_temp' as $$
declare v_secret_id uuid;
begin
  if auth.role() <> 'service_role' or coalesce(nullif(trim(p_secret),''),'') !~ '^whsec_' then
    raise exception 'Only the trusted payment service may store the live webhook secret.' using errcode = '42501';
  end if;
  select id into v_secret_id from vault.secrets where name='yoco_live_webhook_secret' order by created_at desc limit 1;
  if v_secret_id is null then
    perform vault.create_secret(trim(p_secret),'yoco_live_webhook_secret','Cossa Store live Yoco webhook secret',null);
  else
    perform vault.update_secret(v_secret_id,trim(p_secret),'yoco_live_webhook_secret','Cossa Store live Yoco webhook secret',null);
  end if;
end $$;
create or replace function public.get_yoco_live_webhook_secret()
returns text language plpgsql security definer stable set search_path to 'vault','public','pg_temp' as $$
declare v_secret text;
begin
  if auth.role() <> 'service_role' then raise exception 'Only the trusted payment service may read the live Yoco webhook secret.' using errcode='42501'; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='yoco_live_webhook_secret' order by created_at desc limit 1;
  return nullif(trim(coalesce(v_secret,'')),'');
end
$$;
revoke all on function public.store_yoco_live_webhook_secret(text) from public,anon,authenticated;
grant execute on function public.store_yoco_live_webhook_secret(text) to service_role;
revoke all on function public.get_yoco_live_webhook_secret() from public,anon,authenticated;
grant execute on function public.get_yoco_live_webhook_secret() to service_role;

-- Creates the authoritative Store order and live attempt.  The caller is the
-- trusted checkout service; browser totals are never accepted as authority.
create or replace function public.create_store_yoco_live_payment_attempt(
  p_payer_user_id uuid, p_payer_email text, p_customer_name text, p_customer_phone text,
  p_items jsonb, p_client_request_id uuid, p_shipping_total numeric,
  p_shipping_address jsonb, p_shipping_method text, p_shipping_provider text,
  p_shipping_quote_metadata jsonb default '{}'::jsonb,
  p_cart_fingerprint text default null, p_address_fingerprint text default null,
  p_delivery_fingerprint text default null
) returns public.store_payment_attempts
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_attempt public.store_payment_attempts%rowtype; v_order public.store_orders%rowtype;
  v_product public.store_products%rowtype; v_variant public.store_product_variants%rowtype;
  v_item record; v_unit numeric; v_total numeric := 0; v_number text; v_ref text;
begin
  if auth.role() <> 'service_role' then raise exception 'Trusted checkout service required' using errcode='42501'; end if;
  if p_payer_user_id is null or nullif(trim(p_payer_email),'') is null or length(trim(coalesce(p_customer_name,''))) < 2 then
    raise exception 'A signed-in customer is required' using errcode='22023';
  end if;
  if p_shipping_total is null or p_shipping_total < 0 or p_shipping_total > 100000 then raise exception 'Invalid delivery total' using errcode='22023'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then raise exception 'Invalid cart' using errcode='22023'; end if;
  select * into v_attempt from public.store_payment_attempts where payer_user_id=p_payer_user_id and client_request_id=p_client_request_id;
  if found then return v_attempt; end if;
  for v_item in select (value->>'product_id')::uuid product_id, nullif(value->>'variant_id','')::uuid variant_id, (value->>'quantity')::integer quantity from jsonb_array_elements(p_items) loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 25 then raise exception 'Invalid cart item' using errcode='22023'; end if;
    select * into v_product from public.store_products where id=v_item.product_id for share;
    if not found or v_product.status <> 'active' or v_product.product_type='affiliate' or v_product.fulfilment_model='affiliate' then raise exception 'Product unavailable' using errcode='22023'; end if;
    v_unit := v_product.price;
    if v_item.variant_id is not null then
      select * into v_variant from public.store_product_variants where id=v_item.variant_id and product_id=v_product.id and is_available=true for share;
      if not found or v_variant.price_zar <= 0 then raise exception 'Product option unavailable' using errcode='22023'; end if;
      v_unit := v_variant.price_zar;
    elsif exists(select 1 from public.store_product_variants where product_id=v_product.id and is_available=true) then raise exception 'Product option required' using errcode='22023'; end if;
    if v_product.track_inventory and not v_product.unlimited_stock and v_product.stock_quantity < v_item.quantity then raise exception 'Insufficient stock' using errcode='22023'; end if;
    v_total := v_total + v_unit*v_item.quantity;
  end loop;
  v_total := v_total + p_shipping_total;
  v_number := format('CS-YL-%s-%s',to_char(clock_timestamp(),'YYYYMMDD'),upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));
  v_ref := format('CSYOL-%s-%s',to_char(clock_timestamp(),'YYMMDD'),upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));
  insert into public.store_orders(order_number,customer_user_id,customer_name,customer_email,customer_phone,status,payment_provider,payment_reference,subtotal,shipping_total,total,metadata)
  values(v_number,p_payer_user_id,trim(p_customer_name),lower(trim(p_payer_email)),nullif(trim(coalesce(p_customer_phone,'')),''),'pending','yoco',v_ref,v_total-p_shipping_total,p_shipping_total,v_total,jsonb_build_object('payment_method','yoco','payment_mode','live','shipping_address',coalesce(p_shipping_address,'{}'::jsonb),'shipping_provider',nullif(trim(coalesce(p_shipping_provider,'')),''),'shipping_method',nullif(trim(coalesce(p_shipping_method,'')),''),'shipping_quote',coalesce(p_shipping_quote_metadata,'{}'::jsonb))) returning * into v_order;
  for v_item in select (value->>'product_id')::uuid product_id, nullif(value->>'variant_id','')::uuid variant_id, (value->>'quantity')::integer quantity from jsonb_array_elements(p_items) loop
    select * into v_product from public.store_products where id=v_item.product_id; v_unit:=v_product.price; v_variant:=null;
    if v_item.variant_id is not null then select * into v_variant from public.store_product_variants where id=v_item.variant_id and product_id=v_product.id and is_available=true; v_unit:=v_variant.price_zar; end if;
    insert into public.store_order_items(order_id,product_id,product_name,sku,product_type,quantity,unit_price,line_total,metadata) values(v_order.id,v_product.id,v_product.name,coalesce(v_variant.sku,v_product.sku),v_product.product_type,v_item.quantity,v_unit,v_unit*v_item.quantity,jsonb_build_object('fulfilment_model',v_product.fulfilment_model,'variant_id',v_item.variant_id,'variant_title',case when v_item.variant_id is not null then v_variant.title else null end,'provider',case when v_item.variant_id is not null then v_variant.provider else null end,'provider_variant_id',case when v_item.variant_id is not null then v_variant.provider_variant_id else null end));
  end loop;
  insert into public.store_payment_attempts(organisation_id,store_order_id,payer_user_id,provider,environment,amount_cents,currency,client_request_id,cart_fingerprint,address_fingerprint,delivery_fingerprint,price_snapshot,metadata) values(v_order.organisation_id,v_order.id,p_payer_user_id,'yoco','live',round(v_order.total*100)::bigint,'ZAR',p_client_request_id,p_cart_fingerprint,p_address_fingerprint,p_delivery_fingerprint,jsonb_build_object('subtotal',v_order.subtotal,'shipping_total',v_order.shipping_total,'total',v_order.total,'currency','ZAR'),jsonb_build_object('order_number',v_order.order_number)) returning * into v_attempt;
  return v_attempt;
end $$;
revoke all on function public.create_store_yoco_live_payment_attempt(uuid,text,text,text,jsonb,uuid,numeric,jsonb,text,text,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.create_store_yoco_live_payment_attempt(uuid,text,text,text,jsonb,uuid,numeric,jsonb,text,text,jsonb,text,text,text) to service_role;

-- Exactly-once verified transition. Supplier work is represented only by the
-- existing outbox and is held for separate fulfilment commissioning.
create or replace function public.record_store_yoco_live_payment_event(
  p_event_id text,p_attempt_id uuid,p_checkout_id text,p_payment_id text,p_amount_cents bigint,p_currency text,p_event_type text,p_payment_status text,p_safe_payload jsonb
) returns public.store_payment_attempts
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare a public.store_payment_attempts%rowtype; o public.store_orders%rowtype; inserted text;
begin
  if auth.role()<>'service_role' then raise exception 'Trusted payment service required' using errcode='42501'; end if;
  select * into a from public.store_payment_attempts where id=p_attempt_id and provider='yoco' and environment='live' for update;
  if not found then raise exception 'Live payment attempt not found' using errcode='P0002'; end if;
  select * into o from public.store_orders where id=a.store_order_id for update;
  if p_currency <> a.currency or p_amount_cents <> a.amount_cents or (p_checkout_id is not null and a.provider_checkout_id is not null and p_checkout_id<>a.provider_checkout_id) then
    update public.store_payment_attempts set status='investigation',failure_code='IDENTIFIER_OR_AMOUNT_MISMATCH',updated_at=now() where id=a.id returning * into a;
    raise exception 'Live payment does not match the stored attempt' using errcode='22023';
  end if;
  insert into public.store_payment_provider_events(provider,environment,provider_event_id,payment_attempt_id,event_type,provider_checkout_id,provider_payment_id,amount_cents,currency,safe_payload,processing_status,processed_at)
  values('yoco','live',p_event_id,a.id,p_event_type,p_checkout_id,p_payment_id,p_amount_cents,p_currency,coalesce(p_safe_payload,'{}'::jsonb),'received',now()) on conflict(provider,environment,provider_event_id) do nothing returning provider_event_id into inserted;
  if inserted is null then return a; end if;
  if p_event_type='payment.succeeded' and p_payment_status='succeeded' then
    if o.status='paid' or a.status='succeeded' then update public.store_payment_attempts set status='investigation',failure_code='DUPLICATE_SUCCESS',updated_at=now() where id=a.id returning * into a; return a; end if;
    update public.store_payment_attempts set status='succeeded',provider_checkout_id=coalesce(a.provider_checkout_id,p_checkout_id),provider_payment_id=coalesce(a.provider_payment_id,p_payment_id),verified_at=now(),updated_at=now(),failure_code=null,failure_message_safe=null where id=a.id returning * into a;
    update public.store_orders set status='paid',payment_provider='yoco',payment_reference=coalesce(p_payment_id,p_checkout_id,p_event_id),paid_at=now(),updated_at=now() where id=o.id;
    insert into public.store_fulfilment_outbox(organisation_id,store_order_id,provider,event_type,idempotency_key,payload,result) values(o.organisation_id,o.id,'Cossa','payment_verified','yoco:payment-verified:'||o.id,jsonb_build_object('paymentAttemptId',a.id,'provider','yoco','environment','live'),jsonb_build_object('human_hold',true,'commissioning_required',true)) on conflict(organisation_id,idempotency_key) do nothing;
  else update public.store_payment_attempts set status=case when p_payment_status in ('failed','cancelled','expired') then p_payment_status else 'processing' end,updated_at=now() where id=a.id returning * into a; end if;
  update public.store_payment_provider_events set processing_status='processed',processed_at=now() where provider='yoco' and environment='live' and provider_event_id=p_event_id;
  return a;
end $$;
revoke all on function public.record_store_yoco_live_payment_event(text,uuid,text,text,bigint,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_store_yoco_live_payment_event(text,uuid,text,text,bigint,text,text,text,jsonb) to service_role;
