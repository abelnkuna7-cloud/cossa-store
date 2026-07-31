
-- Profiles ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  business_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Staff can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, business_name, phone)
  VALUES (
    NEW.id,
    nullif(NEW.raw_user_meta_data ->> 'full_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'business_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seller ownership ----------------------------------------------------------
ALTER TABLE public.products ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.owns_product(_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products
    WHERE id = _product_id AND created_by = auth.uid()
  );
$$;

CREATE POLICY "Members can create their own products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members can view their own products" ON public.products
  FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Members can update their own products" ON public.products
  FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members can delete their own draft products" ON public.products
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND publication_state IN ('draft', 'pending_review'));

CREATE POLICY "Members manage their own product variants" ON public.product_variants
  FOR ALL TO authenticated
  USING (public.owns_product(product_id)) WITH CHECK (public.owns_product(product_id));
CREATE POLICY "Members manage their own product media" ON public.product_media
  FOR ALL TO authenticated
  USING (public.owns_product(product_id)) WITH CHECK (public.owns_product(product_id));
CREATE POLICY "Members manage their own product prices" ON public.product_prices
  FOR ALL TO authenticated
  USING (public.owns_product(product_id)) WITH CHECK (public.owns_product(product_id));
CREATE POLICY "Members manage their own product attributes" ON public.product_attributes
  FOR ALL TO authenticated
  USING (public.owns_product(product_id)) WITH CHECK (public.owns_product(product_id));
CREATE POLICY "Members manage their own pod details" ON public.product_pod_details
  FOR ALL TO authenticated
  USING (public.owns_product(product_id)) WITH CHECK (public.owns_product(product_id));
CREATE POLICY "Members manage their own fulfilment options" ON public.product_fulfilment_options
  FOR ALL TO authenticated
  USING (public.owns_product(product_id)) WITH CHECK (public.owns_product(product_id));
CREATE POLICY "Members manage their own variant provider details" ON public.product_variant_provider_details
  FOR ALL TO authenticated
  USING (public.owns_product(product_id)) WITH CHECK (public.owns_product(product_id));
