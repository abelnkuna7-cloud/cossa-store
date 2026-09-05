-- COSSA LIFESTYLE first-product seed
-- PREVIEW / TEST ONLY. This file is intentionally not a migration and is not applied automatically.
-- It creates the first customer-facing Cossa Lifestyle product as Draft, without publishing it
-- and without creating any Printify order or fulfilment mapping.

DO $$
DECLARE
  v_org uuid := '00000000-0000-4000-8000-000000000001'::uuid;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.store_products
    WHERE organisation_id = v_org
      AND sku = 'COS-LIFE-TS-001'
  ) THEN
    RAISE NOTICE 'COS-LIFE-TS-001 already exists; starter seed skipped.';
    RETURN;
  END IF;

  INSERT INTO public.store_products (
    organisation_id,
    name,
    slug,
    sku,
    product_type,
    fulfilment_model,
    status,
    short_description,
    description,
    category,
    brand,
    supplier_name,
    supplier_product_ref,
    supplier_url,
    currency,
    cost_price,
    price,
    compare_at_price,
    track_inventory,
    stock_quantity,
    unlimited_stock,
    featured,
    image_urls,
    seo_title,
    seo_description
  ) VALUES (
    v_org,
    'COSSA LIFESTYLE — Leave Your Mark Signature T-Shirt',
    'cossa-lifestyle-leave-your-mark-signature-t-shirt',
    'COS-LIFE-TS-001',
    'pod',
    'print_on_demand',
    'draft',
    'A premium Cossa Lifestyle signature T-shirt built around the Leave Your Mark identity.',
    'COSSA LIFESTYLE — Leave Your Mark Signature T-Shirt is the first controlled product in the Cossa Lifestyle private-label collection. The customer-facing product, branding, retail price, artwork and presentation remain owned by Cossa Lifestyle. Production is connected separately through the hidden fulfilment mapping layer after the exact Printify blank, print provider and variants have been validated. This starter listing must remain Draft until final production artwork, mockups, landed cost and variant mappings are approved.',
    'men',
    'Cossa Lifestyle',
    NULL,
    NULL,
    NULL,
    'ZAR',
    0,
    299,
    NULL,
    false,
    0,
    true,
    false,
    ARRAY[]::text[],
    'Cossa Lifestyle Leave Your Mark Signature T-Shirt',
    'Premium Cossa Lifestyle signature T-shirt from the Leave Your Mark collection. Draft until production mapping and artwork are approved.'
  );

  RAISE NOTICE 'Created Draft COS-LIFE-TS-001 for isolated Cossa Lifestyle testing.';
END $$;
