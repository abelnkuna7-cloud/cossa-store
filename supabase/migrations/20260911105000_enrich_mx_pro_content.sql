begin;

update public.store_products set
  customer_features='["Hybrid Active Noise Cancellation","Bluetooth 5.1 wireless connectivity","Qualcomm aptX and aptX Low Latency codec support","Touch controls on the right earcup","Wear/proximity detection with automatic playback control","3.5 mm AUX wired mode","USB-C charging","Up to 30 hours ANC-only use","Up to 25 hours Bluetooth-only use","Comfortable over-ear protein-leather ear cushions"]'::jsonb,
  customer_specifications='Bluetooth: 5.1\nCodecs: SBC, aptX, aptX Low Latency\nWireless range: up to 10 m\nDriver: 40 mm\nFrequency response: 20Hz–20kHz\nCharging: USB-C\nWired input: 3.5 mm AUX\nBattery: up to 30 h ANC-only / 25 h Bluetooth-only / 15 h ANC + Bluetooth\nWeight: approximately 284 g\nDimensions: approximately 153 x 88 x 27 mm',
  seo_description='Astrum MX Pro black over-ear Bluetooth headphones with Hybrid ANC, Qualcomm aptX, touch controls, wear detection, USB-C charging and AUX connectivity.',
  updated_at=now()
where supplier_name='Astrum' and supplier_product_ref='A11561-B';

update public.store_inventory_intakes i
set features=p.customer_features,
    specifications=p.customer_specifications,
    category=p.category,
    brand=p.brand,
    additional_categories=p.additional_categories,
    operational_notes=coalesce(i.operational_notes,'') || E'\nMX Pro content enriched from verified manufacturer evidence 2026-09-11.'
from public.store_products p
where i.publication_store_product_id=p.id
  and p.supplier_name='Astrum'
  and p.supplier_product_ref='A11561-B';

commit;
