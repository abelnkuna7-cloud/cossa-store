-- Durable treasury reservation layer for supplier production spend.
-- Money is never inferred from order status and concurrent orders cannot reserve the same float.

create table if not exists public.store_fulfilment_funding_accounts (
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null, provider text not null,
 currency text not null check(currency ~ '^[A-Z]{3}$'), reconciled_balance_minor bigint not null default 0 check(reconciled_balance_minor>=0),
 reserve_floor_minor bigint not null default 0 check(reserve_floor_minor>=0), balance_as_of timestamptz not null,
 source text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organisation_id,provider,currency)
);
create table if not exists public.store_fulfilment_funding_authorizations (
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null,
 fulfilment_order_id uuid not null references public.store_fulfilment_orders(id) on delete cascade,
 funding_account_id uuid not null references public.store_fulfilment_funding_accounts(id), provider text not null,
 currency text not null check(currency ~ '^[A-Z]{3}$'), liability_minor bigint not null check(liability_minor>0),
 state text not null default 'reserved' check(state in ('reserved','committed','released','reconcile_required','cancelled')),
 idempotency_key text not null, authorized_by uuid, reason text, reserved_at timestamptz not null default now(), committed_at timestamptz,
 released_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organisation_id,idempotency_key)
);
create index if not exists store_funding_auth_active_idx on public.store_fulfilment_funding_authorizations(funding_account_id,state) where state in ('reserved','reconcile_required','committed');
alter table public.store_fulfilment_funding_accounts enable row level security;
alter table public.store_fulfilment_funding_authorizations enable row level security;
revoke insert,update,delete on public.store_fulfilment_funding_accounts from anon,authenticated;
revoke insert,update,delete on public.store_fulfilment_funding_authorizations from anon,authenticated;
create policy "funding accounts admins read" on public.store_fulfilment_funding_accounts for select to authenticated using(exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin') or exists(select 1 from public.organisation_members om where om.organisation_id=store_fulfilment_funding_accounts.organisation_id and om.user_id=auth.uid() and om.status='active' and om.role in ('owner','admin')));
create policy "funding authorizations admins read" on public.store_fulfilment_funding_authorizations for select to authenticated using(exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin') or exists(select 1 from public.organisation_members om where om.organisation_id=store_fulfilment_funding_authorizations.organisation_id and om.user_id=auth.uid() and om.status='active' and om.role in ('owner','admin')));

create or replace function public.reserve_store_fulfilment_funding(p_fulfilment_order_id uuid,p_provider text,p_currency text,p_liability_minor bigint,p_idempotency_key text,p_actor uuid default null)
returns public.store_fulfilment_funding_authorizations language plpgsql security definer set search_path='' as $$
declare a public.store_fulfilment_funding_accounts%rowtype; existing public.store_fulfilment_funding_authorizations%rowtype; r public.store_fulfilment_funding_authorizations%rowtype; reserved bigint; org uuid; normalized_currency text;
begin
 if p_liability_minor<=0 then raise exception 'Supplier liability must be positive'; end if;
 if nullif(btrim(coalesce(p_provider,'')),'') is null or nullif(btrim(coalesce(p_idempotency_key,'')),'') is null then raise exception 'Provider and idempotency key are required'; end if;
 normalized_currency := upper(btrim(coalesce(p_currency,'')));
 if normalized_currency !~ '^[A-Z]{3}$' then raise exception 'Currency must be a three-letter ISO code'; end if;
 select organisation_id into org from public.store_fulfilment_orders where id=p_fulfilment_order_id for update;
 if org is null then raise exception 'Fulfilment order not found'; end if;
 select * into existing from public.store_fulfilment_funding_authorizations where organisation_id=org and idempotency_key=p_idempotency_key for update;
 if found then
   if existing.fulfilment_order_id<>p_fulfilment_order_id or existing.provider<>p_provider or existing.liability_minor<>p_liability_minor or existing.currency<>normalized_currency then raise exception 'Idempotency key conflicts with a different funding request'; end if;
   if existing.state='reserved' then return existing; end if;
   if existing.state='committed' then raise exception 'Funding authorization is already committed and cannot authorize another supplier charge'; end if;
   if existing.state='reconcile_required' then raise exception 'Funding authorization requires reconciliation before supplier execution'; end if;
   raise exception 'Funding authorization is terminal (%) and cannot be reused',existing.state;
 end if;
 select * into a from public.store_fulfilment_funding_accounts where organisation_id=org and provider=p_provider and currency=normalized_currency for update;
 if not found then raise exception 'No reconciled supplier funding account is configured'; end if;
 if a.balance_as_of < now()-interval '24 hours' then raise exception 'Supplier funding balance is stale and must be reconciled'; end if;
 select coalesce(sum(liability_minor),0) into reserved
 from public.store_fulfilment_funding_authorizations
 where funding_account_id=a.id
   and (
     state in ('reserved','reconcile_required')
     or (state='committed' and (committed_at is null or committed_at > a.balance_as_of))
   );
 if p_liability_minor > greatest(0,a.reconciled_balance_minor-a.reserve_floor_minor-reserved) then raise exception 'Insufficient reconciled fulfilment float'; end if;
 insert into public.store_fulfilment_funding_authorizations(organisation_id,fulfilment_order_id,funding_account_id,provider,currency,liability_minor,idempotency_key,authorized_by) values(org,p_fulfilment_order_id,a.id,p_provider,normalized_currency,p_liability_minor,p_idempotency_key,p_actor) returning * into r;
 return r;
end $$;
revoke all on function public.reserve_store_fulfilment_funding(uuid,text,text,bigint,text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_store_fulfilment_funding(uuid,text,text,bigint,text,uuid) to service_role;

create or replace function public.transition_store_fulfilment_funding(p_authorization_id uuid,p_state text,p_metadata jsonb default '{}'::jsonb)
returns public.store_fulfilment_funding_authorizations language plpgsql security definer set search_path='' as $$
declare r public.store_fulfilment_funding_authorizations%rowtype;
begin
 if p_state not in ('committed','released','reconcile_required','cancelled') then raise exception 'Invalid funding transition'; end if;
 select * into r from public.store_fulfilment_funding_authorizations where id=p_authorization_id for update;
 if not found then raise exception 'Funding authorization not found'; end if;
 if r.state in ('released','cancelled') then
   if p_state<>r.state then raise exception 'Terminal funding authorization cannot transition from % to %',r.state,p_state; end if;
   return r;
 end if;
 if r.state='committed' and p_state not in ('committed','reconcile_required') then raise exception 'Committed supplier funding cannot be released automatically'; end if;
 update public.store_fulfilment_funding_authorizations set state=p_state,committed_at=case when p_state='committed' then coalesce(committed_at,now()) else committed_at end,released_at=case when p_state in ('released','cancelled') then coalesce(released_at,now()) else released_at end,metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_metadata,'{}'::jsonb),updated_at=now() where id=p_authorization_id returning * into r;
 return r;
end $$;
revoke all on function public.transition_store_fulfilment_funding(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.transition_store_fulfilment_funding(uuid,text,jsonb) to service_role;
