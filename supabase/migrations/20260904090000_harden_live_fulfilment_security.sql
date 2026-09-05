-- Harden already-deployed Cossa Lifestyle / Store fulfilment functions.
-- ADDITIVE ONLY: do not rewrite prior production migration history.
-- No supplier API calls, orders, or financial liabilities are created here.

create or replace function public.enforce_cossa_lifestyle_production_readiness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_variant_count integer;
  unready_variant_count integer;
begin
  if new.status is distinct from 'active'
     or lower(btrim(coalesce(new.brand, ''))) <> 'cossa lifestyle'
     or coalesce(new.product_type, '') <> 'pod'
     or coalesce(new.fulfilment_model, '') <> 'print_on_demand' then
    return new;
  end if;

  if nullif(btrim(coalesce(new.sku, '')), '') is null then
    raise exception using errcode = 'check_violation', message = 'COSSA_LIFESTYLE_NOT_PRODUCTION_READY: product SKU is required before publication.';
  end if;

  if coalesce(new.price, 0) <= 0 then
    raise exception using errcode = 'check_violation', message = 'COSSA_LIFESTYLE_NOT_PRODUCTION_READY: a positive retail price is required before publication.';
  end if;

  select count(*) into active_variant_count
  from public.store_product_variants v
  where v.product_id = new.id and v.is_available = true;

  if active_variant_count = 0 then
    raise exception using errcode = 'check_violation', message = 'COSSA_LIFESTYLE_NOT_PRODUCTION_READY: at least one available variant is required before publication.';
  end if;

  select count(*) into unready_variant_count
  from public.store_product_variants v
  where v.product_id = new.id
    and v.is_available = true
    and not exists (
      select 1
      from public.store_product_fulfilment_mappings m
      where m.organisation_id = new.organisation_id
        and m.store_product_id = new.id
        and m.store_variant_id = v.id
        and m.provider = 'Printify'
        and m.fulfilment_status = 'active'
        and m.sync_status = 'synced'
        and nullif(btrim(coalesce(m.provider_variant_id, '')), '') is not null
        and (
          (
            nullif(btrim(coalesce(m.provider_product_id, '')), '') is not null
            and lower(btrim(coalesce(m.metadata ->> 'cossa_owned_configured_product', 'false'))) = 'true'
          )
          or
          (
            nullif(btrim(coalesce(m.blueprint_id, '')), '') is not null
            and nullif(btrim(coalesce(m.print_provider_id, '')), '') is not null
            and nullif(btrim(coalesce(m.artwork_asset_ref, '')), '') is not null
          )
        )
    );

  if unready_variant_count > 0 then
    raise exception using
      errcode = 'check_violation',
      message = format(
        'COSSA_LIFESTYLE_NOT_PRODUCTION_READY: %s available variant(s) lack an exact synced Cossa-owned configured Printify mapping or valid compatibility route.',
        unready_variant_count
      );
  end if;

  return new;
end;
$$;

-- Trigger functions do not need direct client execution privileges.
revoke all on function public.enforce_cossa_lifestyle_production_readiness() from public, anon, authenticated;

create or replace function public.enqueue_store_fulfilment_after_payment_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
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
      pg_catalog.jsonb_build_object('paymentId', new.id, 'storeOrderId', new.store_order_id, 'source', 'eft_payment_approval')
    ) on conflict (organisation_id, idempotency_key) do nothing;
  end loop;

  return new;
end;
$$;

revoke all on function public.enqueue_store_fulfilment_after_payment_approval() from public, anon, authenticated;

create or replace function public.claim_store_fulfilment_outbox_jobs(
  p_worker_id text,
  p_limit integer default 10
)
returns setof public.store_fulfilment_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select o.id
    from public.store_fulfilment_outbox o
    where o.status in ('pending','retry')
      and o.available_at <= pg_catalog.now()
      and o.attempts < o.max_attempts
    order by o.available_at, o.created_at
    for update skip locked
    limit pg_catalog.greatest(1, pg_catalog.least(coalesce(p_limit,10),50))
  )
  update public.store_fulfilment_outbox o
  set status = 'processing',
      attempts = o.attempts + 1,
      locked_at = pg_catalog.now(),
      locked_by = pg_catalog.left(coalesce(p_worker_id,'worker'),160),
      updated_at = pg_catalog.now()
  from candidates c
  where o.id = c.id
  returning o.*;
end;
$$;

revoke all on function public.claim_store_fulfilment_outbox_jobs(text,integer) from public, anon, authenticated;
grant execute on function public.claim_store_fulfilment_outbox_jobs(text,integer) to service_role;
