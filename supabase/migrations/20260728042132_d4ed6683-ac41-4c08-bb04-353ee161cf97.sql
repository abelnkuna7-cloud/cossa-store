-- =========================================================
-- Cossa Commerce Core: multi-model catalogue foundation
-- =========================================================

CREATE TYPE public.product_type AS ENUM (
  'physical', 'digital', 'service', 'bundle', 'affiliate'
);

CREATE TYPE public.catalogue_status AS ENUM ('draft', 'active', 'archived');

CREATE TYPE public.product_visibility AS ENUM ('public', 'business_only', 'hidden');

CREATE TYPE public.sourcing_model AS ENUM (
  'own_stock',
  'local_supplier',
  'local_dropshipping',
  'international_dropshipping',
  'print_on_demand',
  'affiliate',
  'digital',
  'service'
);

CREATE TYPE public.tax_class AS ENUM ('standard', 'zero_rated', 'exempt');

CREATE TYPE public.media_type AS ENUM ('image', 'video', 'document', 'model_3d');

CREATE TYPE public.price_type AS ENUM ('cost', 'retail', 'business', 'promotional');

CREATE TYPE public.booking_type AS ENUM ('quote_only', 'fixed_booking', 'consultation');

CREATE TYPE public.service_pricing_model AS ENUM (
  'fixed', 'hourly', 'per_square_metre', 'per_visit', 'quote_based'
);

-- ---------------------------------------------------------
-- 1. commerce_categories
-- ---------------------------------------------------------
CREATE TABLE public.commerce_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.commerce_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  seo_title text,
  seo_description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commerce_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commerce_categories TO authenticated;
GRANT ALL ON public.commerce_categories TO service_role;
ALTER TABLE public.commerce_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active categories" ON public.commerce_categories
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins manage categories" ON public.commerce_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 2. brands
-- ---------------------------------------------------------
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active brands" ON public.brands
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins manage brands" ON public.brands
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 3. suppliers (operational — staff only)
-- ---------------------------------------------------------
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.supplier_applications(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  contact_person text,
  email text,
  phone text,
  website text,
  country text NOT NULL DEFAULT 'South Africa',
  supplier_type public.sourcing_model NOT NULL DEFAULT 'local_supplier',
  payment_terms text,
  minimum_order text,
  average_lead_time_days integer,
  delivery_areas text,
  reliability_rating numeric(3,2) CHECK (reliability_rating IS NULL OR (reliability_rating >= 0 AND reliability_rating <= 5)),
  internal_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 4. products
-- ---------------------------------------------------------
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  full_description text,
  category_id uuid REFERENCES public.commerce_categories(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  product_type public.product_type NOT NULL DEFAULT 'physical',
  sourcing_model public.sourcing_model NOT NULL DEFAULT 'own_stock',
  status public.catalogue_status NOT NULL DEFAULT 'draft',
  visibility public.product_visibility NOT NULL DEFAULT 'public',
  tax_class public.tax_class NOT NULL DEFAULT 'standard',
  warranty text,
  return_policy text,
  seo_title text,
  seo_description text,
  search_keywords text[] NOT NULL DEFAULT '{}',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products(category_id);
CREATE INDEX products_brand_idx ON public.products(brand_id);
CREATE INDEX products_status_idx ON public.products(status, visibility);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND visibility = 'public');
CREATE POLICY "Staff can view all products" ON public.products
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: is a product publicly visible?
CREATE OR REPLACE FUNCTION public.is_public_product(_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products
    WHERE id = _product_id AND status = 'active' AND visibility = 'public'
  );
$$;

-- ---------------------------------------------------------
-- 5. product_variants
-- ---------------------------------------------------------
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_sku text NOT NULL UNIQUE,
  name text NOT NULL,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  barcode text,
  weight_kg numeric(10,3),
  length_cm numeric(10,2),
  width_cm numeric(10,2),
  height_cm numeric(10,2),
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_variants_product_idx ON public.product_variants(product_id);
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view variants of published products" ON public.product_variants
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND public.is_public_product(product_id));
CREATE POLICY "Staff can view all variants" ON public.product_variants
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage variants" ON public.product_variants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 6. product_media
-- ---------------------------------------------------------
CREATE TABLE public.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  media_type public.media_type NOT NULL DEFAULT 'image',
  url text NOT NULL,
  alt_text text,
  display_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_media_product_idx ON public.product_media(product_id);
GRANT SELECT ON public.product_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_media TO authenticated;
GRANT ALL ON public.product_media TO service_role;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view media of published products" ON public.product_media
  FOR SELECT TO anon, authenticated USING (public.is_public_product(product_id));
CREATE POLICY "Staff can view all media" ON public.product_media
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage media" ON public.product_media
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 7. product_attributes
-- ---------------------------------------------------------
CREATE TABLE public.product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  attribute_group text,
  display_order integer NOT NULL DEFAULT 0,
  is_filterable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_attributes_product_idx ON public.product_attributes(product_id);
GRANT SELECT ON public.product_attributes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_attributes TO authenticated;
GRANT ALL ON public.product_attributes TO service_role;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view attributes of published products" ON public.product_attributes
  FOR SELECT TO anon, authenticated USING (public.is_public_product(product_id));
CREATE POLICY "Staff can view all attributes" ON public.product_attributes
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage attributes" ON public.product_attributes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 8. supplier_products (staff only — contains cost data)
-- ---------------------------------------------------------
CREATE TABLE public.supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  supplier_sku text,
  supplier_cost numeric(12,2),
  currency text NOT NULL DEFAULT 'ZAR',
  supplier_stock integer,
  supplier_lead_time_days integer,
  minimum_order_quantity integer,
  is_preferred boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, product_id, variant_id)
);
CREATE INDEX supplier_products_product_idx ON public.supplier_products(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_products TO authenticated;
GRANT ALL ON public.supplier_products TO service_role;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view supplier products" ON public.supplier_products
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage supplier products" ON public.supplier_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 9. product_prices (cost rows are staff-only)
-- ---------------------------------------------------------
CREATE TABLE public.product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  price_type public.price_type NOT NULL DEFAULT 'retail',
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'ZAR',
  vat_inclusive boolean NOT NULL DEFAULT true,
  minimum_quantity integer NOT NULL DEFAULT 1,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_prices_product_idx ON public.product_prices(product_id, price_type);
GRANT SELECT ON public.product_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;
GRANT ALL ON public.product_prices TO service_role;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view customer facing prices" ON public.product_prices
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND price_type IN ('retail', 'promotional')
    AND public.is_public_product(product_id)
  );
CREATE POLICY "Staff can view all prices" ON public.product_prices
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage prices" ON public.product_prices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 10. product_fulfilment_options
-- ---------------------------------------------------------
CREATE TABLE public.product_fulfilment_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  fulfilment_model public.sourcing_model NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  delivery_estimate text,
  delivery_areas text,
  shipping_cost numeric(12,2),
  handling_time_days integer,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_fulfilment_product_idx ON public.product_fulfilment_options(product_id);
GRANT SELECT ON public.product_fulfilment_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_fulfilment_options TO authenticated;
GRANT ALL ON public.product_fulfilment_options TO service_role;
ALTER TABLE public.product_fulfilment_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view fulfilment options of published products"
  ON public.product_fulfilment_options
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND public.is_public_product(product_id));
CREATE POLICY "Staff can view all fulfilment options" ON public.product_fulfilment_options
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage fulfilment options" ON public.product_fulfilment_options
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 11. product_bundles
-- ---------------------------------------------------------
CREATE TABLE public.product_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  component_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  component_variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  display_order integer NOT NULL DEFAULT 0,
  is_optional boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (bundle_product_id <> component_product_id),
  UNIQUE (bundle_product_id, component_product_id, component_variant_id)
);
GRANT SELECT ON public.product_bundles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_bundles TO authenticated;
GRANT ALL ON public.product_bundles TO service_role;
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view bundles of published products" ON public.product_bundles
  FOR SELECT TO anon, authenticated
  USING (public.is_public_product(bundle_product_id) AND public.is_public_product(component_product_id));
CREATE POLICY "Staff can view all bundles" ON public.product_bundles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage bundles" ON public.product_bundles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 12. digital_assets (staff only — file paths are private)
-- ---------------------------------------------------------
CREATE TABLE public.digital_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  version text,
  download_limit integer,
  licence_terms text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX digital_assets_product_idx ON public.digital_assets(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_assets TO authenticated;
GRANT ALL ON public.digital_assets TO service_role;
ALTER TABLE public.digital_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view digital assets" ON public.digital_assets
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage digital assets" ON public.digital_assets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 13. service_offerings
-- ---------------------------------------------------------
CREATE TABLE public.service_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  category_id uuid REFERENCES public.commerce_categories(id) ON DELETE SET NULL,
  booking_type public.booking_type NOT NULL DEFAULT 'quote_only',
  pricing_model public.service_pricing_model NOT NULL DEFAULT 'quote_based',
  base_price numeric(12,2),
  currency text NOT NULL DEFAULT 'ZAR',
  duration_minutes integer,
  service_areas text[] NOT NULL DEFAULT '{}',
  requirements text,
  status public.catalogue_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_offerings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_offerings TO authenticated;
GRANT ALL ON public.service_offerings TO service_role;
ALTER TABLE public.service_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active services" ON public.service_offerings
  FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "Staff can view all services" ON public.service_offerings
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage services" ON public.service_offerings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 14. affiliate_offers
-- ---------------------------------------------------------
CREATE TABLE public.affiliate_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  partner_name text NOT NULL,
  partner_network text,
  tracking_url text NOT NULL,
  commission_rate numeric(5,2),
  commission_type text NOT NULL DEFAULT 'percentage',
  disclosure_text text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX affiliate_offers_product_idx ON public.affiliate_offers(product_id);
GRANT SELECT ON public.affiliate_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_offers TO authenticated;
GRANT ALL ON public.affiliate_offers TO service_role;
ALTER TABLE public.affiliate_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active affiliate offers" ON public.affiliate_offers
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND public.is_public_product(product_id));
CREATE POLICY "Staff can view all affiliate offers" ON public.affiliate_offers
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage affiliate offers" ON public.affiliate_offers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------
CREATE TRIGGER set_commerce_categories_updated_at BEFORE UPDATE ON public.commerce_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_product_variants_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_product_media_updated_at BEFORE UPDATE ON public.product_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_product_attributes_updated_at BEFORE UPDATE ON public.product_attributes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_supplier_products_updated_at BEFORE UPDATE ON public.supplier_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_product_prices_updated_at BEFORE UPDATE ON public.product_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_product_fulfilment_options_updated_at BEFORE UPDATE ON public.product_fulfilment_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_product_bundles_updated_at BEFORE UPDATE ON public.product_bundles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_digital_assets_updated_at BEFORE UPDATE ON public.digital_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_service_offerings_updated_at BEFORE UPDATE ON public.service_offerings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_affiliate_offers_updated_at BEFORE UPDATE ON public.affiliate_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();