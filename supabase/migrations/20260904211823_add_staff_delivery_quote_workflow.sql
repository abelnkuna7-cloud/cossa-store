-- A staff-approved quote is a separate workflow from a configured carrier
-- rate. Customers may request one for an exact cart and address, but only the
-- trusted checkout service can persist it and only an authorised administrator
-- can approve or reject it. The table is deliberately private from the Data
-- API because it contains delivery-address and contact information.
create table if not exists public.store_delivery_quote_requests (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  requester_user_id uuid not null references auth.users(id) on delete restrict,
  client_request_id uuid not null,
  customer_name text not null check (length(trim(customer_name)) between 2 and 140),
  customer_phone text check (customer_phone is null or length(trim(customer_phone)) between 3 and 40),
  requester_email text not null check (length(trim(requester_email)) between 3 and 320),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  shipping_address jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  cart_fingerprint text not null check (cart_fingerprint ~ '^[a-f0-9]{64}$'),
  address_fingerprint text not null check (address_fingerprint ~ '^[a-f0-9]{64}$'),
  supplier_id uuid not null references public.store_suppliers(id) on delete restrict,
  fulfilment_profile_id uuid not null references public.store_fulfilment_profiles(id) on delete restrict,
  status text not null default 'requested' check (status in ('requested', 'quoted', 'rejected', 'cancelled')),
  delivery_method text,
  delivery_amount numeric(12,2),
  currency text check (currency is null or currency = 'ZAR'),
  evidence_note text,
  staff_note text,
  quoted_by uuid references auth.users(id) on delete restrict,
  quoted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_user_id, client_request_id),
  check (
    (status = 'quoted'
      and length(trim(coalesce(delivery_method, ''))) between 2 and 160
      and delivery_amount is not null and delivery_amount > 0 and delivery_amount <= 100000
      and currency = 'ZAR'
      and length(trim(coalesce(evidence_note, ''))) between 3 and 2000
      and quoted_by is not null and quoted_at is not null and expires_at is not null)
    or
    (status <> 'quoted'
      and delivery_method is null and delivery_amount is null and currency is null
      and evidence_note is null and quoted_by is null and quoted_at is null and expires_at is null)
  )
);

create index if not exists store_delivery_quote_requests_review_idx
  on public.store_delivery_quote_requests (status, created_at asc);

create index if not exists store_delivery_quote_requests_requester_idx
  on public.store_delivery_quote_requests (requester_user_id, created_at desc);

create unique index if not exists store_delivery_quote_requests_one_open_scope_idx
  on public.store_delivery_quote_requests (requester_user_id, cart_fingerprint, address_fingerprint)
  where status = 'requested';

alter table public.store_delivery_quote_requests enable row level security;
revoke all on table public.store_delivery_quote_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.store_delivery_quote_requests to service_role;

-- A manually-approved amount is valid only for an exact cart/address pair and
-- must carry an audit note, a method and a 24-hour expiry. Existing configured
-- standard-rate confirmations retain their stricter configuration requirement.
alter table public.store_delivery_quote_confirmations
  drop constraint if exists store_delivery_quote_confirmations_check;

alter table public.store_delivery_quote_confirmations
  add constraint store_delivery_quote_confirmations_check
  check (
    (
      eligibility_classification = 'STANDARD_RATE_ELIGIBLE'
      and rate_configuration_id is not null
      and delivery_method is not null
      and delivery_amount is not null
      and currency = 'ZAR'
    )
    or (
      eligibility_classification = 'MANUAL_DELIVERY_QUOTE_REQUIRED'
      and rate_configuration_id is null
      and length(trim(coalesce(delivery_method, ''))) between 2 and 160
      and delivery_amount is not null and delivery_amount > 0 and delivery_amount <= 100000
      and currency = 'ZAR'
    )
    or (
      eligibility_classification = 'OVERSIZED_OR_SURCHARGE_REQUIRED'
      and delivery_amount is null
    )
  );

create or replace function public.approve_store_delivery_quote_request(
  p_request_id uuid,
  p_staff_user_id uuid,
  p_delivery_amount numeric,
  p_delivery_method text,
  p_evidence_note text,
  p_staff_note text default null
)
returns public.store_delivery_quote_requests
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_request public.store_delivery_quote_requests%rowtype;
  v_delivery_method text := nullif(trim(p_delivery_method), '');
  v_evidence_note text := nullif(trim(p_evidence_note), '');
  v_staff_note text := nullif(trim(p_staff_note), '');
  v_now timestamptz := now();
  v_expires_at timestamptz := now() + interval '24 hours';
begin
  if auth.role() <> 'service_role' then
    raise exception 'Delivery quotes can only be approved by the trusted checkout service.' using errcode = '42501';
  end if;

  if p_staff_user_id is null then
    raise exception 'An authorised administrator is required.' using errcode = '22023';
  end if;
  if p_delivery_amount is null or p_delivery_amount <= 0 or p_delivery_amount > 100000 then
    raise exception 'The verified delivery amount must be between R0.01 and R100,000.' using errcode = '22023';
  end if;
  if v_delivery_method is null or length(v_delivery_method) not between 2 and 160 then
    raise exception 'Provide the verified delivery method.' using errcode = '22023';
  end if;
  if v_evidence_note is null or length(v_evidence_note) not between 3 and 2000 then
    raise exception 'Provide the carrier or supplier quote evidence.' using errcode = '22023';
  end if;
  if v_staff_note is not null and length(v_staff_note) > 1000 then
    raise exception 'The staff note is too long.' using errcode = '22023';
  end if;

  select * into v_request
  from public.store_delivery_quote_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'The delivery quote request was not found.' using errcode = 'P0002';
  end if;
  if v_request.status <> 'requested' then
    raise exception 'This delivery quote request has already been handled.' using errcode = '55000';
  end if;

  update public.store_delivery_quote_confirmations
  set is_active = false
  where supplier_id = v_request.supplier_id
    and fulfilment_profile_id = v_request.fulfilment_profile_id
    and cart_fingerprint = v_request.cart_fingerprint
    and address_fingerprint = v_request.address_fingerprint
    and is_active = true;

  insert into public.store_delivery_quote_confirmations (
    organisation_id,
    supplier_id,
    fulfilment_profile_id,
    rate_configuration_id,
    cart_fingerprint,
    address_fingerprint,
    eligibility_classification,
    delivery_method,
    delivery_amount,
    currency,
    evidence_note,
    verified_by,
    verified_at,
    expires_at,
    is_active
  ) values (
    v_request.organisation_id,
    v_request.supplier_id,
    v_request.fulfilment_profile_id,
    null,
    v_request.cart_fingerprint,
    v_request.address_fingerprint,
    'MANUAL_DELIVERY_QUOTE_REQUIRED',
    v_delivery_method,
    p_delivery_amount,
    'ZAR',
    v_evidence_note,
    p_staff_user_id,
    v_now,
    v_expires_at,
    true
  );

  update public.store_delivery_quote_requests
  set status = 'quoted',
      delivery_method = v_delivery_method,
      delivery_amount = p_delivery_amount,
      currency = 'ZAR',
      evidence_note = v_evidence_note,
      staff_note = v_staff_note,
      quoted_by = p_staff_user_id,
      quoted_at = v_now,
      expires_at = v_expires_at,
      updated_at = v_now
  where id = v_request.id
  returning * into v_request;

  return v_request;
end;
$function$;

create or replace function public.reject_store_delivery_quote_request(
  p_request_id uuid,
  p_staff_user_id uuid,
  p_staff_note text
)
returns public.store_delivery_quote_requests
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_request public.store_delivery_quote_requests%rowtype;
  v_staff_note text := nullif(trim(p_staff_note), '');
begin
  if auth.role() <> 'service_role' then
    raise exception 'Delivery quotes can only be rejected by the trusted checkout service.' using errcode = '42501';
  end if;
  if p_staff_user_id is null then
    raise exception 'An authorised administrator is required.' using errcode = '22023';
  end if;
  if v_staff_note is null or length(v_staff_note) not between 3 and 1000 then
    raise exception 'Provide a short reason for the customer.' using errcode = '22023';
  end if;

  select * into v_request
  from public.store_delivery_quote_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'The delivery quote request was not found.' using errcode = 'P0002';
  end if;
  if v_request.status <> 'requested' then
    raise exception 'This delivery quote request has already been handled.' using errcode = '55000';
  end if;

  update public.store_delivery_quote_requests
  set status = 'rejected',
      staff_note = v_staff_note,
      updated_at = now()
  where id = v_request.id
  returning * into v_request;

  return v_request;
end;
$function$;

revoke all on function public.approve_store_delivery_quote_request(uuid,uuid,numeric,text,text,text)
  from public, anon, authenticated;
revoke all on function public.reject_store_delivery_quote_request(uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.approve_store_delivery_quote_request(uuid,uuid,numeric,text,text,text)
  to service_role;
grant execute on function public.reject_store_delivery_quote_request(uuid,uuid,text)
  to service_role;
