-- Phase 4: refresh the authoritative DMC customer-delivery configuration.
-- Historical migrations remain immutable. This migration only changes the
-- active configuration used by the server-side delivery resolver.

update public.store_delivery_rate_configurations
set is_active = false,
    customer_selectable = false,
    is_default = false,
    updated_at = now()
where method_code = 'dmc_locker_to_door_xl'
  and price = 179.00;

insert into public.store_delivery_rate_configurations (
  organisation_id,
  supplier_id,
  fulfilment_profile_id,
  method_code,
  customer_label,
  price,
  currency,
  is_active,
  customer_selectable,
  is_default,
  classification,
  eligibility_requirements,
  source_url,
  source_evidence,
  verified_at,
  operational_notes
)
select
  f.organisation_id,
  s.id,
  f.id,
  'dmc_locker_to_door_xl',
  'Door delivery',
  219.00,
  'ZAR',
  true,
  true,
  true,
  'standard',
  jsonb_build_object(
    'requires_dimensions', true,
    'requires_weight', true,
    'allowed_dimension_kinds', jsonb_build_array('product', 'packed_parcel'),
    'max_length_cm', 69,
    'max_width_cm', 60,
    'max_height_cm', 41,
    'max_weight_kg_exclusive', 20,
    'max_rate_age_days', 30,
    'requires_address_eligibility', true,
    'parcel_eligibility', 'PUDO XL-compatible parcel under 20 kg',
    'surcharge_condition', 'Larger parcels or remote/plot destinations require a verified exception quote'
  ),
  'https://dmcwholesale.co.za/pages/how-does-the-discount-work-1',
  'DMC official shipping page verified 2026-09-06: Locker-to-Door R219, based on standard XL box; larger items must be quoted separately and rural/plot surcharges may apply. PUDO official FAQ: XL 60 x 41 x 69 cm and packages must remain under 20 kg.',
  now(),
  'Customer-safe door delivery label. Supplier identity and internal rate evidence remain server-only. A trusted destination eligibility resolver is not configured, so unknown, remote or surcharge destinations remain genuine manual exceptions.'
from public.store_fulfilment_profiles f
join public.store_suppliers s on s.id = f.supplier_id
where f.profile_code = 'dmc-sa-customer-paid'
  and s.name = 'DMC Wholesale'
on conflict (fulfilment_profile_id, method_code) do update
set supplier_id = excluded.supplier_id,
    customer_label = excluded.customer_label,
    price = excluded.price,
    currency = excluded.currency,
    is_active = excluded.is_active,
    customer_selectable = excluded.customer_selectable,
    is_default = excluded.is_default,
    classification = excluded.classification,
    eligibility_requirements = excluded.eligibility_requirements,
    source_url = excluded.source_url,
    source_evidence = excluded.source_evidence,
    verified_at = excluded.verified_at,
    operational_notes = excluded.operational_notes,
    updated_at = now();

-- The standard DMC route is the only customer-selectable method. Locker,
-- kiosk, pickup and Bundle-Up are operational supplier choices until Cossa
-- has a destination-selection flow and a trusted provider integration.
