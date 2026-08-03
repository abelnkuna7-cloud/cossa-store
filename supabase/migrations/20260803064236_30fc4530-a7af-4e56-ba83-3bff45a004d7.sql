-- 1. Revoke EXECUTE on internal-only SECURITY DEFINER / trigger functions
REVOKE ALL ON FUNCTION public.record_lead(text, text, text, text, enquiry_type, text, contact_method, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_product_publication() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_reference(text) FROM PUBLIC, anon, authenticated;

-- 2. Prevent members from self-approving catalogue access
CREATE OR REPLACE FUNCTION public.protect_profile_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    NEW.catalogue_status := OLD.catalogue_status;
    NEW.catalogue_reviewed_at := OLD.catalogue_reviewed_at;
    NEW.catalogue_reviewed_by := OLD.catalogue_reviewed_by;
    NEW.catalogue_review_notes := OLD.catalogue_review_notes;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_review_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_review_fields ON public.profiles;
CREATE TRIGGER protect_profile_review_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_review_fields();