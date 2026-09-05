-- Store product creation and supplier operations are administrator-only.
-- A customer (or a legacy catalogue applicant) may not browse, create, edit,
-- publish, or upload commercial catalogue material.

drop policy if exists "owners_admins_manage_store_products" on public.store_products;
create policy "cossa_store_admins_manage_store_products"
on public.store_products
for all
to authenticated
using (
  exists (
    select 1
    from public.organisation_members as member
    where member.organisation_id = store_products.organisation_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organisation_members as member
    where member.organisation_id = store_products.organisation_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
);

-- Public copies contain only customer-safe fields. Source tables keep their
-- administrator permissions; triggers keep the copies current atomically.
create table public.store_public_product_variants (
  id uuid primary key references public.store_product_variants(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete cascade,
  sku text,
  title text not null,
  price_zar numeric not null,
  is_default boolean not null,
  is_available boolean not null,
  sort_order integer not null
);
create index store_public_product_variants_product_idx
  on public.store_public_product_variants(product_id, sort_order);
alter table public.store_public_product_variants enable row level security;
revoke all on public.store_public_product_variants from public, anon, authenticated;
grant select on public.store_public_product_variants to anon, authenticated;
grant select, insert, update, delete on public.store_public_product_variants to service_role;
create policy "shoppers read available published variants"
  on public.store_public_product_variants for select to anon, authenticated
  using (is_available and exists (
    select 1 from public.store_public_products p
    where p.id = store_public_product_variants.product_id and p.status = 'active'
  ));

create function private.sync_store_public_product_variant()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    delete from public.store_public_product_variants where id = old.id;
    return old;
  end if;
  insert into public.store_public_product_variants
    (id, product_id, sku, title, price_zar, is_default, is_available, sort_order)
  values (new.id, new.product_id, new.sku, new.title, new.price_zar,
          new.is_default, new.is_available, new.sort_order)
  on conflict (id) do update set
    product_id=excluded.product_id, sku=excluded.sku, title=excluded.title,
    price_zar=excluded.price_zar, is_default=excluded.is_default,
    is_available=excluded.is_available, sort_order=excluded.sort_order;
  return new;
end;
$function$;
-- Trigger-only function: never exposed as an RPC.
revoke all on function private.sync_store_public_product_variant() from public, anon, authenticated;
create trigger sync_store_public_product_variant
after insert or update or delete on public.store_product_variants
for each row execute function private.sync_store_public_product_variant();
insert into public.store_public_product_variants
  (id, product_id, sku, title, price_zar, is_default, is_available, sort_order)
select id, product_id, sku, title, price_zar, is_default, is_available, sort_order
from public.store_product_variants;

create table public.store_customer_fulfilments (
  id uuid primary key references public.supplier_fulfilment_orders(id) on delete cascade,
  store_order_id uuid not null references public.store_orders(id) on delete cascade,
  status text not null,
  tracking_number text,
  updated_at timestamptz not null
);
create index store_customer_fulfilments_order_idx
  on public.store_customer_fulfilments(store_order_id);
alter table public.store_customer_fulfilments enable row level security;
revoke all on public.store_customer_fulfilments from public, anon, authenticated;
grant select on public.store_customer_fulfilments to authenticated;
grant select, insert, update, delete on public.store_customer_fulfilments to service_role;
create policy "customers read only their own shipment progress"
  on public.store_customer_fulfilments for select to authenticated
  using (exists (
    select 1 from public.store_orders o
    where o.id = store_customer_fulfilments.store_order_id
      and o.customer_user_id = (select auth.uid())
  ));

create function private.sync_store_customer_fulfilment()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  insert into public.store_customer_fulfilments
    (id, store_order_id, status, tracking_number, updated_at)
  values (new.id, new.store_order_id, new.status, new.tracking_number, new.updated_at)
  on conflict (id) do update set
    store_order_id=excluded.store_order_id, status=excluded.status,
    tracking_number=excluded.tracking_number, updated_at=excluded.updated_at;
  return new;
end;
$function$;
revoke all on function private.sync_store_customer_fulfilment() from public, anon, authenticated;
create trigger sync_store_customer_fulfilment
after insert or update on public.supplier_fulfilment_orders
for each row execute function private.sync_store_customer_fulfilment();
insert into public.store_customer_fulfilments (id, store_order_id, status, tracking_number, updated_at)
select id, store_order_id, status, tracking_number, updated_at
from public.supplier_fulfilment_orders;

-- Supplier records, sourcing maps, inventory intake data and fulfilment
-- profiles are back-office commercial data. Active Store owners/admins only.
drop policy if exists "members read store suppliers" on public.store_suppliers;
drop policy if exists "store leaders manage suppliers" on public.store_suppliers;
create policy "cossa_store_admins_read_store_suppliers"
on public.store_suppliers for select to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));
create policy "cossa_store_admins_manage_store_suppliers"
on public.store_suppliers for all to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])))
with check ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));

drop policy if exists "members read supplier category mappings" on public.store_supplier_category_mappings;
drop policy if exists "store leaders manage supplier category mappings" on public.store_supplier_category_mappings;
create policy "cossa_store_admins_read_supplier_category_mappings"
on public.store_supplier_category_mappings for select to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));
create policy "cossa_store_admins_manage_supplier_category_mappings"
on public.store_supplier_category_mappings for all to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])))
with check ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));

drop policy if exists "members read fulfilment profiles" on public.store_fulfilment_profiles;
drop policy if exists "store leaders manage fulfilment profiles" on public.store_fulfilment_profiles;
create policy "cossa_store_admins_read_fulfilment_profiles"
on public.store_fulfilment_profiles for select to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));
create policy "cossa_store_admins_manage_fulfilment_profiles"
on public.store_fulfilment_profiles for all to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])))
with check ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));

drop policy if exists "members read inventory intakes" on public.store_inventory_intakes;
drop policy if exists "store leaders manage inventory intakes" on public.store_inventory_intakes;
create policy "cossa_store_admins_read_inventory_intakes"
on public.store_inventory_intakes for select to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));
create policy "cossa_store_admins_manage_inventory_intakes"
on public.store_inventory_intakes for all to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])))
with check ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));

drop policy if exists "store leaders read inventory intake lifecycle history" on public.store_inventory_intake_lifecycle_history;
create policy "cossa_store_admins_read_inventory_intake_lifecycle_history"
on public.store_inventory_intake_lifecycle_history for select to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));

drop policy if exists "store leaders read inventory publication history" on public.store_inventory_publication_history;
create policy "cossa_store_admins_read_inventory_publication_history"
on public.store_inventory_publication_history for select to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));

drop policy if exists "store leaders read catalogue snapshots" on public.store_catalogue_snapshots;
create policy "cossa_store_admins_read_catalogue_snapshots"
on public.store_catalogue_snapshots for select to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));

drop policy if exists "store leaders read catalogue snapshot items" on public.store_catalogue_snapshot_items;
create policy "cossa_store_admins_read_catalogue_snapshot_items"
on public.store_catalogue_snapshot_items for select to authenticated
using (
  exists (
    select 1
    from public.store_catalogue_snapshots as snapshot
    where snapshot.id = store_catalogue_snapshot_items.snapshot_id
      and (select private.has_organisation_role(snapshot.organisation_id, array['owner', 'admin']))
  )
);

-- Require active membership of the actual Cossa Store organisation for uploads.
-- This also removes the legacy permission for managers or other organisations.
do $migration$
declare
  policy_record record;
  predicate text;
begin
  for policy_record in
    select policyname, cmd, qual, with_check from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname in (
        'store_admins_upload_product_images', 'store_admins_update_product_images',
        'store_admins_delete_product_images', 'store_admins_upload_digital_products',
        'store_admins_read_digital_products', 'store_admins_update_digital_products',
        'store_admins_delete_digital_products'
      )
  loop
    predicate := format(
      'bucket_id = %L and (select private.has_organisation_role(%L::uuid, array[%L,%L]))',
      case when policy_record.policyname like '%digital_products' then 'store-digital-products' else 'store-product-images' end,
      '00000000-0000-4000-8000-000000000001', 'owner', 'admin'
    );
    if policy_record.cmd='INSERT' then
      execute format('alter policy %I on storage.objects to authenticated with check (%s)', policy_record.policyname, predicate);
    elsif policy_record.cmd='UPDATE' then
      execute format('alter policy %I on storage.objects to authenticated using (%s) with check (%s)', policy_record.policyname, predicate, predicate);
    else
      execute format('alter policy %I on storage.objects to authenticated using (%s)', policy_record.policyname, predicate);
    end if;
  end loop;
end;
$migration$;
-- Supplier fulfilment records stay server-side. Customers use the safe
-- store_customer_fulfilments projection created above.
drop policy if exists "customers_can_read_own_supplier_fulfilment" on public.supplier_fulfilment_orders;
revoke all on table public.supplier_fulfilment_orders from public, anon, authenticated;
grant select, insert, update, delete on table public.supplier_fulfilment_orders to service_role;

-- Services are storefront content, but only Store administrators can manage
-- the private source records.
drop policy if exists "owners_admins_manage_store_services" on public.store_services;
create policy "cossa_store_admins_manage_store_services"
on public.store_services for all to authenticated
using ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])))
with check ((select private.has_organisation_role(organisation_id, array['owner', 'admin'])));

-- Restrictive policies also constrain legacy global-admin policies. They leave
-- trusted background service operations and existing customer-own-order rules intact.
do $migration$
declare
  table_name text;
begin
  foreach table_name in array array[
    'store_fulfilment_actions', 'store_fulfilment_funding_accounts',
    'store_fulfilment_funding_authorizations', 'store_fulfilment_operations',
    'store_fulfilment_outbox'
  ] loop
    execute format(
      'create policy store_membership_required on public.%I as restrictive for all to authenticated using ((select private.has_organisation_role(organisation_id, array[''owner'',''admin'']))) with check ((select private.has_organisation_role(organisation_id, array[''owner'',''admin''])))',
      table_name
    );
  end loop;
end;
$migration$;

-- These existing RPCs run with elevated privileges and therefore require their
-- own membership check before any read or write, independently of table RLS.
do $migration$
declare
  routine record;
  definition text;
  guarded text;
begin
  for routine in
    select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'create_store_catalogue_snapshot',
      'reconcile_store_fulfilment_funding_account',
      'record_store_fulfilment_action'
    )
  loop
    definition := pg_get_functiondef(routine.oid);
    guarded := regexp_replace(definition, E'\\mbegin\\M', $guard$begin
  if not private.has_organisation_role(
    '00000000-0000-4000-8000-000000000001'::uuid, array['owner','admin']
  ) then
    raise exception 'Cossa Store administrator access required' using errcode='42501';
  end if;
$guard$, 'i');
    if guarded = definition then
      raise exception 'Could not guard routine %', routine.proname;
    end if;
    execute guarded;
  end loop;
end;
$migration$;
