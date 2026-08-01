-- 1) Lock down internal SECURITY DEFINER helpers / trigger functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_public_product(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_product(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) Storage: only expose product media for published, public products
DROP POLICY IF EXISTS "Anyone can read product media files" ON storage.objects;

CREATE POLICY "Public can read published product media files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'product-media'
  AND EXISTS (
    SELECT 1
    FROM public.product_media pm
    JOIN public.products p ON p.id = pm.product_id
    WHERE pm.url = storage.objects.name
      AND pm.is_public = true
      AND p.status = 'active'
      AND p.visibility = 'public'
      AND p.publication_state = 'published'
  )
);

CREATE POLICY "Staff can read all product media files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-media'
  AND (
    public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.product_media pm
      JOIN public.products p ON p.id = pm.product_id
      WHERE pm.url = storage.objects.name
        AND p.created_by = auth.uid()
    )
  )
);