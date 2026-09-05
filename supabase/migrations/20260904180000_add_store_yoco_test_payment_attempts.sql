-- Yoco Checkout is deliberately separate from EFT. In test mode a verified
-- Yoco payment proves the integration only: it never changes a Store order to
-- paid and therefore cannot allocate stock, release digital goods, or queue
-- supplier fulfilment.
create table public.store_yoco_test_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default '00000000-0000-4000-8000-000000000001'::uuid references public.organisations(id) on delete restrict,
  store_order_id uuid not null unique references public.store_orders(id) on delete restrict,
  payer_user_id uuid not null references auth.users(id) on delete restrict,
  client_request_id uuid not null,
  mode text not null default 'test' check (mode = 'test'),
  yoco_checkout_id text unique,
  yoco_payment_id text unique,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  status text not null default 'created' check (status in ('created', 'succeeded', 'failed', 'cancelled', 'expired')),
  return_state text check (return_state in ('success', 'cancelled', 'failed')),
  return_recorded_at timestamptz,
  verified_at timestamptz,
  yoco_response jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payer_user_id, client_request_id)
);

create index store_yoco_test_payment_attempts_payer_created_idx
  on public.store_yoco_test_payment_attempts (payer_user_id, created_at desc);

create table public.store_yoco_test_webhook_events (
  event_id text primary key,
  payment_attempt_id uuid not null references public.store_yoco_test_payment_attempts(id) on delete restrict,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz not null default now()
);

alter table public.store_yoco_test_payment_attempts enable row level security;
alter table public.store_yoco_test_webhook_events enable row level security;

create policy "Store Yoco test payment attempts deny direct client access"
  on public.store_yoco_test_payment_attempts for all using (false) with check (false);
create policy "Store Yoco test webhook events deny direct client access"
  on public.store_yoco_test_webhook_events for all using (false) with check (false);

-- This database-level guard means that a test Yoco checkout cannot ever
-- become a paid Store order, even if a future application change calls an
-- order-update API incorrectly. Existing fulfilment triggers only react to
-- paid orders, so this also protects stock and supplier dispatches.
create function public.prevent_yoco_test_order_payment()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.payment_provider = 'yoco_test' and new.status = 'paid' then
    raise exception 'Yoco test orders cannot be marked paid or fulfilled.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger prevent_yoco_test_order_payment
before insert or update of status, payment_provider on public.store_orders
for each row execute function public.prevent_yoco_test_order_payment();

create function public.create_store_yoco_test_payment_attempt_with_delivery(
  p_payer_user_id uuid,
  p_payer_email text,
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_client_request_id uuid,
  p_shipping_total numeric,
  p_shipping_address jsonb,
  p_shipping_method text,
  p_shipping_provider text,
  p_shipping_quote_metadata jsonb default '{}'::jsonb
)
returns public.store_yoco_test_payment_attempts
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_attempt public.store_yoco_test_payment_attempts%rowtype;
  v_order public.store_orders%rowtype;
  v_product public.store_products%rowtype;
  v_variant public.store_product_variants%rowtype;
  v_item record;
  v_unit_price numeric;
  v_total numeric := 0;
  v_order_number text;
  v_reference text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Yoco checkout can only be created by the trusted checkout service.' using errcode = '42501';
  end if;

  if p_payer_user_id is null
    or coalesce(nullif(trim(p_payer_email), ''), '') = ''
    or char_length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'A signed-in customer name and email are required.' using errcode = '22023';
  end if;
  if p_shipping_total is null or p_shipping_total < 0 or p_shipping_total > 100000 then
    raise exception 'The shipping total is invalid.' using errcode = '22023';
  end if;
  if p_shipping_total > 0 and (p_shipping_address is null or jsonb_typeof(p_shipping_address) is distinct from 'object') then
    raise exception 'A delivery address is required for shipped products.' using errcode = '22023';
  end if;
  if p_shipping_quote_metadata is null or jsonb_typeof(p_shipping_quote_metadata) <> 'object' then
    raise exception 'The delivery quote metadata is invalid.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) = 0
    or jsonb_array_length(p_items) > 20 then
    raise exception 'Your cart must contain between one and twenty products.' using errcode = '22023';
  end if;

  select * into v_attempt
  from public.store_yoco_test_payment_attempts
  where payer_user_id = p_payer_user_id
    and client_request_id = p_client_request_id;
  if found then return v_attempt; end if;

  for v_item in
    select
      (value ->> 'product_id')::uuid as product_id,
      nullif(value ->> 'variant_id', '')::uuid as variant_id,
      (value ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_items)
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 25 then
      raise exception 'One or more cart items are invalid.' using errcode = '22023';
    end if;

    select * into v_product from public.store_products where id = v_item.product_id for share;
    if not found or v_product.status <> 'active' or v_product.product_type = 'affiliate' or v_product.fulfilment_model = 'affiliate' then
      raise exception 'One or more products are no longer available for Cossa checkout.' using errcode = '22023';
    end if;

    v_unit_price := v_product.price;
    if v_item.variant_id is not null then
      select * into v_variant from public.store_product_variants
      where id = v_item.variant_id and product_id = v_product.id and is_available = true
      for share;
      if not found then raise exception 'One or more selected product options are no longer available.' using errcode = '22023'; end if;
      if v_variant.price_zar <= 0 then raise exception 'One or more selected product options do not have a valid price.' using errcode = '22023'; end if;
      v_unit_price := v_variant.price_zar;
    elsif exists (select 1 from public.store_product_variants pv where pv.product_id = v_product.id and pv.is_available = true) then
      raise exception 'Please select a valid product option before checkout.' using errcode = '22023';
    end if;

    if v_product.track_inventory and not v_product.unlimited_stock and v_product.stock_quantity < v_item.quantity then
      raise exception 'One or more products no longer have the requested stock.' using errcode = '22023';
    end if;
    v_total := v_total + (v_unit_price * v_item.quantity);
  end loop;

  v_order_number := format('CS-YT-%s-%s', to_char(clock_timestamp(), 'YYYYMMDD'), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));
  v_reference := format('CSYOC-%s-%s', to_char(clock_timestamp(), 'YYMMDD'), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));
  v_total := v_total + p_shipping_total;

  insert into public.store_orders (
    order_number, customer_user_id, customer_name, customer_email, customer_phone,
    status, payment_provider, payment_reference, subtotal, shipping_total, total, metadata
  ) values (
    v_order_number, p_payer_user_id, trim(p_customer_name), lower(trim(p_payer_email)),
    nullif(trim(coalesce(p_customer_phone, '')), ''), 'pending', 'yoco_test', v_reference,
    v_total - p_shipping_total, p_shipping_total, v_total,
    jsonb_build_object(
      'payment_method', 'yoco',
      'payment_mode', 'test',
      'shipping_address', coalesce(p_shipping_address, '{}'::jsonb),
      'shipping_provider', case when p_shipping_total > 0 then nullif(trim(p_shipping_provider), '') else null end,
      'shipping_method', case when p_shipping_total > 0 then nullif(trim(p_shipping_method), '') else null end,
      'shipping_quote', case when p_shipping_total > 0 then p_shipping_quote_metadata else null end
    )
  ) returning * into v_order;

  for v_item in
    select
      (value ->> 'product_id')::uuid as product_id,
      nullif(value ->> 'variant_id', '')::uuid as variant_id,
      (value ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.store_products where id = v_item.product_id;
    v_unit_price := v_product.price;
    v_variant := null;
    if v_item.variant_id is not null then
      select * into v_variant from public.store_product_variants
      where id = v_item.variant_id and product_id = v_product.id and is_available = true;
      v_unit_price := v_variant.price_zar;
    end if;

    insert into public.store_order_items (
      order_id, product_id, product_name, sku, product_type, quantity, unit_price, line_total, metadata
    ) values (
      v_order.id, v_product.id, v_product.name,
      coalesce(v_variant.sku, v_product.sku), v_product.product_type, v_item.quantity,
      v_unit_price, v_unit_price * v_item.quantity,
      jsonb_build_object(
        'fulfilment_model', v_product.fulfilment_model,
        'variant_id', v_item.variant_id,
        'variant_title', case when v_item.variant_id is not null then v_variant.title else null end,
        'provider', case when v_item.variant_id is not null then v_variant.provider else null end,
        'provider_variant_id', case when v_item.variant_id is not null then v_variant.provider_variant_id else null end
      )
    );
  end loop;

  insert into public.store_yoco_test_payment_attempts (
    organisation_id, store_order_id, payer_user_id, client_request_id, amount_cents, currency, mode
  ) values (
    v_order.organisation_id, v_order.id, p_payer_user_id, p_client_request_id,
    round(v_order.total * 100)::bigint, 'ZAR', 'test'
  ) returning * into v_attempt;

  return v_attempt;
end;
$$;

revoke all on function public.create_store_yoco_test_payment_attempt_with_delivery(
  uuid, text, text, text, jsonb, uuid, numeric, jsonb, text, text, jsonb
) from public;
grant execute on function public.create_store_yoco_test_payment_attempt_with_delivery(
  uuid, text, text, text, jsonb, uuid, numeric, jsonb, text, text, jsonb
) to service_role;

create function public.record_store_yoco_test_payment_event(
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

  -- Deliberately do not set store_orders.status = 'paid' here. Test payments
  -- are never eligible for inventory allocation or fulfilment.
  return v_attempt;
end;
$$;

revoke all on function public.record_store_yoco_test_payment_event(
  text, text, text, bigint, text, text, text, text, jsonb
) from public;
grant execute on function public.record_store_yoco_test_payment_event(
  text, text, text, bigint, text, text, text, text, jsonb
) to service_role;
