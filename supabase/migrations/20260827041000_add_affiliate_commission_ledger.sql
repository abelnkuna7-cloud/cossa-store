-- Affiliate orders occur on the partner merchant's checkout, not Cossa Store.
-- Keep merchant order value and Cossa commission separate from normal Store orders.

create table if not exists public.store_affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  product_id uuid null references public.store_products(id) on delete set null,
  partner_name text not null,
  external_order_ref text not null,
  tracking_id text null,
  status text not null default 'pending'
    check (status in ('pending','approved','paid','rejected','cancelled')),
  order_currency text null,
  merchant_order_value numeric(14,2) null check (merchant_order_value is null or merchant_order_value >= 0),
  commission_currency text not null default 'ZAR',
  commission_amount numeric(14,2) not null default 0 check (commission_amount >= 0),
  ordered_at timestamptz null,
  approved_at timestamptz null,
  paid_at timestamptz null,
  source text not null default 'manual',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, partner_name, external_order_ref)
);

create index if not exists idx_store_affiliate_commissions_org_status
  on public.store_affiliate_commissions (organisation_id, status, created_at desc);

create index if not exists idx_store_affiliate_commissions_product
  on public.store_affiliate_commissions (product_id, created_at desc)
  where product_id is not null;

alter table public.store_affiliate_commissions enable row level security;

-- Internal owner/admin reads only. Server-side integrations can use the service role.
drop policy if exists store_affiliate_commissions_admin_read
  on public.store_affiliate_commissions;

create policy store_affiliate_commissions_admin_read
on public.store_affiliate_commissions
for select
to authenticated
using (
  exists (
    select 1
    from public.organisation_members om
    where om.organisation_id = store_affiliate_commissions.organisation_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner','admin')
  )
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

-- No browser insert/update/delete policies are granted. Affiliate-network imports
-- and reconciliations must run through an authorised server-side path.

create or replace view public.store_affiliate_revenue_summary
with (security_invoker = true)
as
select
  organisation_id,
  partner_name,
  count(*) filter (where status = 'pending') as pending_orders,
  count(*) filter (where status = 'approved') as approved_orders,
  count(*) filter (where status = 'paid') as paid_orders,
  coalesce(sum(merchant_order_value) filter (where status in ('pending','approved','paid')), 0) as attributed_merchant_order_value,
  coalesce(sum(commission_amount) filter (where status = 'approved'), 0) as approved_commission,
  coalesce(sum(commission_amount) filter (where status = 'paid' and paid_at is not null), 0) as paid_commission_cash
from public.store_affiliate_commissions
group by organisation_id, partner_name;

comment on column public.store_affiliate_commissions.merchant_order_value is
  'Merchant checkout value for attribution only. This is not Cossa Store sales revenue.';

comment on column public.store_affiliate_commissions.commission_amount is
  'Affiliate commission attributable to Cossa. Only status=paid with paid_at is cash revenue.';
