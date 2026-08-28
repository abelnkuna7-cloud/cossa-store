-- No-code Cossa group services directory used by the Store homepage and admin.
-- The production schema was introduced during the protected Store upgrade;
-- this migration keeps repository schema history aligned and is idempotent.

create table if not exists public.store_services (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  name text not null,
  eyebrow text,
  description text not null,
  image_url text,
  destination_url text not null,
  cta_label text not null default 'Learn more',
  status text not null default 'draft' check (status in ('draft','active','archived')),
  sort_order integer not null default 0,
  featured boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_services enable row level security;

drop policy if exists "public_read_active_store_services" on public.store_services;
create policy "public_read_active_store_services"
on public.store_services for select
to anon, authenticated
using (status = 'active');

drop policy if exists "owners_admins_manage_store_services" on public.store_services;
create policy "owners_admins_manage_store_services"
on public.store_services for all
to authenticated
using (
  exists (
    select 1
    from public.organisation_members om
    where om.organisation_id = store_services.organisation_id
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and om.role = any (array['owner'::text,'admin'::text,'manager'::text])
  )
)
with check (
  exists (
    select 1
    from public.organisation_members om
    where om.organisation_id = store_services.organisation_id
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and om.role = any (array['owner'::text,'admin'::text,'manager'::text])
  )
);

create index if not exists store_services_public_order_idx
on public.store_services (status, featured desc, sort_order, created_at);
