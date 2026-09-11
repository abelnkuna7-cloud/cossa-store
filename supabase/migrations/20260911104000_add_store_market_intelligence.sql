begin;

create table if not exists public.store_competitor_price_evidence (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  intake_id uuid not null references public.store_inventory_intakes(id) on delete cascade,
  store_product_id uuid null references public.store_products(id) on delete cascade,
  supplier_product_ref text null,
  retailer text not null,
  retailer_product_title text null,
  price_zar numeric(12,2) not null check (price_zar > 0),
  evidence_kind text not null default 'normal' check (evidence_kind in ('normal','sale','marketplace','supplier_retail')),
  availability text not null default 'unknown' check (availability in ('in_stock','out_of_stock','unknown')),
  exact_match boolean not null default false,
  confidence numeric(5,4) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  source_url text not null,
  observed_at timestamptz not null default now(),
  evidence_note text null,
  created_at timestamptz not null default now(),
  unique (intake_id, retailer, source_url, observed_at)
);

create index if not exists store_competitor_price_evidence_intake_observed_idx
  on public.store_competitor_price_evidence(intake_id, observed_at desc);
create index if not exists store_competitor_price_evidence_product_observed_idx
  on public.store_competitor_price_evidence(store_product_id, observed_at desc)
  where store_product_id is not null;

alter table public.store_competitor_price_evidence enable row level security;
revoke all on public.store_competitor_price_evidence from public, anon, authenticated;
grant select, insert, update, delete on public.store_competitor_price_evidence to service_role;

create or replace view public.store_inventory_commercial_health as
with recent as (
  select e.*
  from public.store_competitor_price_evidence e
  where e.exact_match = true
    and e.confidence >= 0.80
    and e.observed_at >= now() - interval '72 hours'
    and e.availability <> 'out_of_stock'
), market as (
  select
    intake_id,
    min(price_zar) as market_low_zar,
    percentile_cont(0.5) within group (order by price_zar)::numeric(12,2) as market_median_zar,
    count(*)::integer as comparable_count,
    max(observed_at) as market_checked_at
  from recent
  group by intake_id
), base as (
  select
    i.id as intake_id,
    i.organisation_id,
    i.supplier_id,
    i.publication_store_product_id as store_product_id,
    i.supplier_product_ref,
    i.name,
    i.supplier_cost,
    i.selling_price_override,
    case
      when i.supplier_id = '3b625ee7-25d4-4604-afd5-2a0909ac04b6'::uuid
        then round(coalesce(i.supplier_cost,0) * 1.15, 2)
      else round(coalesce(i.supplier_cost,0), 2)
    end as effective_acquisition_zar
  from public.store_inventory_intakes i
)
select
  b.*,
  m.market_low_zar,
  m.market_median_zar,
  m.comparable_count,
  m.market_checked_at,
  case when b.effective_acquisition_zar > 0
    then round(b.effective_acquisition_zar / 0.85, 2)
    else null end as minimum_price_for_15pct_gross_margin_zar,
  case when m.market_low_zar > 0
    then round(m.market_low_zar * 0.95, 2)
    else null end as five_pct_below_market_low_zar,
  case
    when m.market_low_zar is null or b.effective_acquisition_zar <= 0 then null
    else round(greatest(m.market_low_zar * 0.95, b.effective_acquisition_zar / 0.85), 2)
  end as recommended_price_zar,
  case
    when b.selling_price_override is null or b.selling_price_override <= 0 then 'missing_cossa_price'
    when b.effective_acquisition_zar <= 0 then 'missing_cost_evidence'
    when m.market_low_zar is null then 'missing_market_evidence'
    when b.selling_price_override < b.effective_acquisition_zar then 'below_acquisition_cost'
    when b.selling_price_override < b.effective_acquisition_zar / 0.85 then 'margin_risk'
    when ((b.selling_price_override - m.market_low_zar) / m.market_low_zar) * 100 > 15 then 'overpriced_blocked'
    when ((b.selling_price_override - m.market_low_zar) / m.market_low_zar) * 100 > 5 then 'price_review'
    else 'competitive'
  end as commercial_status,
  case
    when m.market_low_zar > 0 and b.selling_price_override > 0
      then round(((b.selling_price_override - m.market_low_zar) / m.market_low_zar) * 100, 2)
    else null
  end as cossa_vs_market_low_pct,
  case
    when b.selling_price_override > 0 and b.effective_acquisition_zar > 0
      then round(((b.selling_price_override - b.effective_acquisition_zar) / b.selling_price_override) * 100, 2)
    else null
  end as estimated_gross_margin_pct
from base b
left join market m on m.intake_id = b.intake_id;

revoke all on public.store_inventory_commercial_health from public, anon, authenticated;
grant select on public.store_inventory_commercial_health to service_role;

comment on table public.store_competitor_price_evidence is
  'Internal evidence ledger for exact-match competitor pricing. Never exposed to storefront customers.';
comment on view public.store_inventory_commercial_health is
  'Internal commercial recommendation view. Recommendations never change live prices automatically.';

commit;
