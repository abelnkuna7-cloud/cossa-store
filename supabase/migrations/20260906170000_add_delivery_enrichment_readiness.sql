-- Phase 4 continuation: extend the existing Store inventory intake path so
-- the Growth enrichment workforce can queue and record delivery evidence.
-- This does not create a second agent system and never invents measurements.

alter table public.store_product_delivery_attributes
  add column if not exists dimension_evidence_state text not null default 'MISSING',
  add column if not exists weight_evidence_state text not null default 'MISSING',
  add column if not exists readiness_status text not null default 'MISSING_BOTH',
  add column if not exists enrichment_requested_at timestamptz,
  add column if not exists enrichment_last_attempt_at timestamptz,
  add column if not exists enrichment_agent text,
  add column if not exists enrichment_result jsonb not null default '{}'::jsonb,
  add column if not exists conflict_evidence text;

alter table public.store_product_delivery_attributes
  drop constraint if exists store_product_delivery_attributes_dimension_evidence_state_check,
  drop constraint if exists store_product_delivery_attributes_weight_evidence_state_check,
  drop constraint if exists store_product_delivery_attributes_readiness_status_check;

alter table public.store_product_delivery_attributes
  add constraint store_product_delivery_attributes_dimension_evidence_state_check
    check (dimension_evidence_state in ('PROVIDER_VERIFIED','SUPPLIER_VERIFIED','MANUFACTURER_VERIFIED','PARTIAL','MISSING','CONFLICTING','STALE')),
  add constraint store_product_delivery_attributes_weight_evidence_state_check
    check (weight_evidence_state in ('PROVIDER_VERIFIED','SUPPLIER_VERIFIED','MANUFACTURER_VERIFIED','PARTIAL','MISSING','CONFLICTING','STALE')),
  add constraint store_product_delivery_attributes_readiness_status_check
    check (readiness_status in ('DELIVERY_READY','PARCEL_READY_DESTINATION_PENDING','MISSING_WEIGHT','MISSING_DIMENSIONS','MISSING_BOTH','CONFLICTING_EVIDENCE','RATE_STALE','DESTINATION_PROVIDER_REQUIRED','OVERSIZED','UNSUPPORTED'));

alter table public.store_inventory_intakes
  add column if not exists delivery_enrichment_status text not null default 'NOT_REQUESTED',
  add column if not exists delivery_enrichment_requested_at timestamptz,
  add column if not exists delivery_enrichment_last_attempt_at timestamptz,
  add column if not exists delivery_enrichment_result jsonb not null default '{}'::jsonb;

alter table public.store_inventory_intakes
  drop constraint if exists store_inventory_intakes_delivery_enrichment_status_check;

alter table public.store_inventory_intakes
  add constraint store_inventory_intakes_delivery_enrichment_status_check
    check (delivery_enrichment_status in ('NOT_REQUESTED','QUEUED','PROCESSING','SUCCEEDED','PARTIAL','CONFLICTING','FAILED'));

create index if not exists store_inventory_intakes_delivery_enrichment_queue_idx
  on public.store_inventory_intakes (delivery_enrichment_status, delivery_enrichment_requested_at)
  where delivery_enrichment_status in ('QUEUED','PROCESSING');

create index if not exists store_product_delivery_attributes_readiness_idx
  on public.store_product_delivery_attributes (readiness_status, enrichment_requested_at);

create or replace function public.derive_store_delivery_readiness()
returns trigger
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
begin
  if new.dimension_evidence_state = 'CONFLICTING'
     or new.weight_evidence_state = 'CONFLICTING'
     or new.conflict_evidence is not null then
    new.readiness_status := 'CONFLICTING_EVIDENCE';
  elsif new.length_cm is null or new.width_cm is null or new.height_cm is null
     or new.dimension_kind is null
     or new.dimensions_verified_at is null
     or new.dimension_evidence_state in ('MISSING','PARTIAL','STALE') then
    if new.weight_kg is null or new.weight_verified_at is null
       or new.weight_evidence_state in ('MISSING','PARTIAL','STALE') then
      new.readiness_status := 'MISSING_BOTH';
    else
      new.readiness_status := 'MISSING_DIMENSIONS';
    end if;
  elsif new.weight_kg is null
     or new.weight_verified_at is null
     or new.weight_evidence_state in ('MISSING','PARTIAL','STALE') then
    new.readiness_status := 'MISSING_WEIGHT';
  elsif new.weight_kg >= 20
     or greatest(new.length_cm, new.width_cm, new.height_cm) > 69
     or (new.length_cm + new.width_cm + new.height_cm - greatest(new.length_cm, new.width_cm, new.height_cm) - least(new.length_cm, new.width_cm, new.height_cm)) > 60
     or least(new.length_cm, new.width_cm, new.height_cm) > 41 then
    new.readiness_status := 'OVERSIZED';
  else
    -- Destination eligibility is deliberately separate. Until a trusted
    -- provider/address adapter is configured, parcel-ready data cannot cause
    -- an automatic customer charge by itself.
    new.readiness_status := 'PARCEL_READY_DESTINATION_PENDING';
  end if;
  return new;
end;
$function$;

drop trigger if exists store_delivery_readiness_derive on public.store_product_delivery_attributes;
create trigger store_delivery_readiness_derive
before insert or update on public.store_product_delivery_attributes
for each row execute function public.derive_store_delivery_readiness();

-- Backfill only evidence already present; no values are invented.
update public.store_product_delivery_attributes
set dimension_evidence_state = case
      when dimensions_verified_at is not null and dimensions_source_url is not null then 'SUPPLIER_VERIFIED'
      else 'MISSING'
    end,
    weight_evidence_state = case
      when weight_verified_at is not null and weight_source_url is not null then 'SUPPLIER_VERIFIED'
      else 'MISSING'
    end,
    enrichment_result = jsonb_build_object('backfilled_at', now(), 'source', 'existing_delivery_attributes'),
    enrichment_agent = coalesce(enrichment_agent, 'phase4-readiness-backfill')
where true;

-- Seed controlled Growth work from the existing DMC intake pipeline. These
-- rows contain no guessed dimensions or weights; they only request research.
insert into public.store_product_delivery_attributes (store_product_id, enrichment_requested_at, enrichment_agent)
select i.publication_store_product_id, now(), 'growth-delivery-enrichment'
from public.store_inventory_intakes i
join public.store_suppliers s on s.id = i.supplier_id
join public.store_products p on p.id = i.publication_store_product_id
where i.publication_store_product_id is not null
  and s.name = 'DMC Wholesale'
  and s.status = 'active'
  and p.product_type not in ('digital','affiliate')
on conflict (store_product_id) do update
set enrichment_requested_at = coalesce(public.store_product_delivery_attributes.enrichment_requested_at, now());

update public.store_inventory_intakes
set delivery_enrichment_status = 'QUEUED',
    delivery_enrichment_requested_at = coalesce(delivery_enrichment_requested_at, now())
where publication_store_product_id is not null
  and supplier_id = (select id from public.store_suppliers where name = 'DMC Wholesale' and status = 'active' limit 1)
  and delivery_enrichment_status = 'NOT_REQUESTED';

-- Growth/server workers use this service-only operation to enqueue one
-- product through the existing intake pipeline. Browser roles cannot call it.
create or replace function public.queue_store_delivery_enrichment(p_store_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_intake public.store_inventory_intakes%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Delivery enrichment is service-only.' using errcode = '42501';
  end if;
  select * into v_intake from public.store_inventory_intakes
  where publication_store_product_id = p_store_product_id
  order by created_at desc limit 1;
  if v_intake.id is null then
    raise exception 'Product is not present in the Store intake pipeline.' using errcode = '22023';
  end if;
  insert into public.store_product_delivery_attributes (store_product_id, enrichment_requested_at, enrichment_agent)
  values (p_store_product_id, now(), 'growth-delivery-enrichment')
  on conflict (store_product_id) do update
    set enrichment_requested_at = now(), enrichment_agent = 'growth-delivery-enrichment';
  update public.store_inventory_intakes
  set delivery_enrichment_status = 'QUEUED', delivery_enrichment_requested_at = now()
  where id = v_intake.id;
  return true;
end;
$function$;

revoke all on function public.queue_store_delivery_enrichment(uuid) from public, anon, authenticated;
grant execute on function public.queue_store_delivery_enrichment(uuid) to service_role;

revoke all on function public.derive_store_delivery_readiness() from public, anon, authenticated;
grant execute on function public.derive_store_delivery_readiness() to service_role;
