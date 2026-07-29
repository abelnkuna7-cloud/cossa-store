
-- ============ ENUMS ============
CREATE TYPE public.product_publication_state AS ENUM (
  'draft', 'pending_review', 'approved', 'published', 'unpublished', 'archived'
);
CREATE TYPE public.collection_status AS ENUM ('draft', 'active', 'inactive', 'archived');
CREATE TYPE public.pod_provider AS ENUM ('printify', 'gelato', 'printful', 'other');

-- ============ COLLECTIONS ============
CREATE TABLE public.commerce_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  hero_image_url text,
  campaign_name text,
  status public.collection_status NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commerce_collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commerce_collections TO authenticated;
GRANT ALL ON public.commerce_collections TO service_role;
ALTER TABLE public.commerce_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active collections" ON public.commerce_collections
  FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "Staff can view all collections" ON public.commerce_collections
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can create collections" ON public.commerce_collections
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update collections" ON public.commerce_collections
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admins can delete collections" ON public.commerce_collections
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_commerce_collections_updated_at BEFORE UPDATE ON public.commerce_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRODUCTS: merchandising + workflow ============
ALTER TABLE public.products
  ADD COLUMN collection_id uuid REFERENCES public.commerce_collections(id) ON DELETE SET NULL,
  ADD COLUMN item_type text,
  ADD COLUMN publication_state public.product_publication_state NOT NULL DEFAULT 'draft',
  ADD COLUMN is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN requires_shipping boolean NOT NULL DEFAULT true,
  ADD COLUMN requires_quote boolean NOT NULL DEFAULT false,
  ADD COLUMN is_customisable boolean NOT NULL DEFAULT false,
  ADD COLUMN sourcing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN campaign_name text,
  ADD COLUMN design_name text,
  ADD COLUMN slogan text,
  ADD COLUMN product_story text,
  ADD COLUMN audience text,
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN care_instructions text,
  ADD COLUMN approved_by uuid,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN created_by uuid;

CREATE INDEX products_collection_idx ON public.products(collection_id);
CREATE INDEX products_publication_state_idx ON public.products(publication_state);

-- published products only for the public
CREATE OR REPLACE FUNCTION public.is_public_product(_product_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products
    WHERE id = _product_id
      AND status = 'active'
      AND visibility = 'public'
      AND publication_state = 'published'
  );
$$;

DROP POLICY "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND visibility = 'public' AND publication_state = 'published');

CREATE POLICY "Staff can create draft products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND publication_state IN ('draft', 'pending_review'));
CREATE POLICY "Staff can edit unpublished products" ON public.products
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) AND publication_state IN ('draft', 'pending_review'))
  WITH CHECK (public.is_staff(auth.uid()) AND publication_state IN ('draft', 'pending_review'));

-- ============ PRINT-ON-DEMAND DETAILS (staff only) ============
CREATE TABLE public.product_pod_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  provider public.pod_provider NOT NULL DEFAULT 'printify',
  external_product_id text,
  external_blueprint_id text,
  external_print_provider_id text,
  provider_product_url text,
  provider_dashboard_url text,
  production_region text,
  production_time_estimate text,
  shipping_estimate text,
  fulfilment_notes text,
  manual_fulfilment_required boolean NOT NULL DEFAULT true,
  api_integration_status text NOT NULL DEFAULT 'manual',
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_pod_details TO authenticated;
GRANT ALL ON public.product_pod_details TO service_role;
ALTER TABLE public.product_pod_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view pod details" ON public.product_pod_details
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert pod details" ON public.product_pod_details
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update pod details" ON public.product_pod_details
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admins can delete pod details" ON public.product_pod_details
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_product_pod_details_updated_at BEFORE UPDATE ON public.product_pod_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ VARIANTS: public-safe merchandising fields ============
ALTER TABLE public.product_variants
  ADD COLUMN colour text,
  ADD COLUMN size text,
  ADD COLUMN finish text,
  ADD COLUMN phone_model text,
  ADD COLUMN material text,
  ADD COLUMN shipping_estimate text,
  ADD COLUMN retail_price numeric(12,2) CHECK (retail_price IS NULL OR retail_price >= 0),
  ADD COLUMN compare_at_price numeric(12,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  ADD COLUMN currency text NOT NULL DEFAULT 'ZAR';

CREATE POLICY "Staff can create variants" ON public.product_variants
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update variants" ON public.product_variants
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ VARIANT PROVIDER DETAILS (staff only) ============
CREATE TABLE public.product_variant_provider_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL UNIQUE REFERENCES public.product_variants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  provider public.pod_provider NOT NULL DEFAULT 'printify',
  external_variant_id text,
  provider_sku text,
  production_cost numeric(12,2) CHECK (production_cost IS NULL OR production_cost >= 0),
  provider_currency text NOT NULL DEFAULT 'USD',
  manual_order_instructions text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variant_provider_details TO authenticated;
GRANT ALL ON public.product_variant_provider_details TO service_role;
ALTER TABLE public.product_variant_provider_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view variant provider details" ON public.product_variant_provider_details
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert variant provider details" ON public.product_variant_provider_details
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update variant provider details" ON public.product_variant_provider_details
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admins can delete variant provider details" ON public.product_variant_provider_details
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_variant_provider_details_updated_at BEFORE UPDATE ON public.product_variant_provider_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MEDIA: public flag + staff writes ============
ALTER TABLE public.product_media ADD COLUMN is_public boolean NOT NULL DEFAULT true;

DROP POLICY "Public can view media of published products" ON public.product_media;
CREATE POLICY "Public can view media of published products" ON public.product_media
  FOR SELECT TO anon, authenticated USING (is_public = true AND public.is_public_product(product_id));

CREATE POLICY "Staff can insert media" ON public.product_media
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update media" ON public.product_media
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete media" ON public.product_media
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- ============ PRICES: staff writes + non-negative ============
ALTER TABLE public.product_prices ADD CONSTRAINT product_prices_amount_non_negative CHECK (amount >= 0);

CREATE POLICY "Staff can insert prices" ON public.product_prices
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update prices" ON public.product_prices
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete prices" ON public.product_prices
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- ============ PUBLICATION VALIDATION ============
CREATE OR REPLACE FUNCTION public.validate_product_publication()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_variants int;
  v_active_variants int;
  v_images int;
  v_prices int;
BEGIN
  IF NEW.publication_state IN ('approved', 'published', 'unpublished', 'archived')
     AND (TG_OP = 'INSERT' OR NEW.publication_state IS DISTINCT FROM OLD.publication_state)
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only an administrator may approve, publish, unpublish or archive a product';
  END IF;

  IF NEW.publication_state = 'published' THEN
    IF coalesce(trim(NEW.name), '') = '' THEN RAISE EXCEPTION 'Product name is required to publish'; END IF;
    IF coalesce(trim(NEW.sku), '') = '' THEN RAISE EXCEPTION 'Product code is required to publish'; END IF;
    IF coalesce(trim(NEW.slug), '') = '' THEN RAISE EXCEPTION 'Slug is required to publish'; END IF;
    IF coalesce(trim(NEW.item_type), '') = '' THEN RAISE EXCEPTION 'Item type is required to publish'; END IF;
    IF coalesce(trim(NEW.short_description), '') = '' THEN RAISE EXCEPTION 'Short description is required to publish'; END IF;

    SELECT count(*) INTO v_images FROM public.product_media
      WHERE product_id = NEW.id AND is_public = true AND media_type = 'image';
    IF v_images = 0 THEN RAISE EXCEPTION 'At least one public product image is required to publish'; END IF;

    SELECT count(*) INTO v_variants FROM public.product_variants WHERE product_id = NEW.id;
    SELECT count(*) INTO v_active_variants FROM public.product_variants WHERE product_id = NEW.id AND is_active = true;
    IF v_variants > 0 AND v_active_variants = 0 THEN
      RAISE EXCEPTION 'At least one active variant is required to publish';
    END IF;

    IF NEW.requires_quote IS NOT TRUE THEN
      SELECT count(*) INTO v_prices FROM public.product_prices
        WHERE product_id = NEW.id AND is_active = true
          AND price_type IN ('retail', 'promotional') AND amount > 0;
      IF v_prices = 0 AND NOT EXISTS (
        SELECT 1 FROM public.product_variants
        WHERE product_id = NEW.id AND is_active = true AND retail_price IS NOT NULL AND retail_price > 0
      ) THEN
        RAISE EXCEPTION 'A public price is required to publish, unless the product is quote-only';
      END IF;
    END IF;

    IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_product_publication_trg
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_publication();
