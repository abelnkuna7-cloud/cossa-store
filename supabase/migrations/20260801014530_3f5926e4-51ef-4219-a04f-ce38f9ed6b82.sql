-- 1. Restore EXECUTE on RLS helper functions (RLS policies run as the calling role)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_product(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owns_product(uuid) TO anon, authenticated;

-- 2. Catalogue approval state on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS catalogue_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS catalogue_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS catalogue_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS catalogue_review_notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_catalogue_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_catalogue_status_check
      CHECK (catalogue_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- 3. Product review metadata
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

-- 4. Access helper
CREATE OR REPLACE FUNCTION public.can_manage_catalogue(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.is_staff(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _user_id AND catalogue_status = 'approved'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_catalogue(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_catalogue(uuid) TO authenticated, service_role;

-- 5. Only approved members may create listings
DROP POLICY IF EXISTS "Members can create their own products" ON public.products;
CREATE POLICY "Members can create their own products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_manage_catalogue(auth.uid())
    AND publication_state IN ('draft', 'pending_review')
  );

-- 6. Admins manage member profiles (approve / reject catalogue access)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Owner bootstrap: cossa@cossanexusholdings.co.za is always admin + approved
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, business_name, phone, catalogue_status)
  VALUES (
    NEW.id,
    nullif(NEW.raw_user_meta_data ->> 'full_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'business_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'phone', ''),
    CASE WHEN lower(NEW.email) = 'cossa@cossanexusholdings.co.za' THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (id) DO NOTHING;

  IF lower(coalesce(NEW.email, '')) = 'cossa@cossanexusholdings.co.za' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill for an already-registered owner account
UPDATE public.profiles p
SET catalogue_status = 'approved'
FROM auth.users u
WHERE u.id = p.id AND lower(u.email) = 'cossa@cossanexusholdings.co.za';

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin' FROM auth.users u
WHERE lower(u.email) = 'cossa@cossanexusholdings.co.za'
ON CONFLICT (user_id, role) DO NOTHING;