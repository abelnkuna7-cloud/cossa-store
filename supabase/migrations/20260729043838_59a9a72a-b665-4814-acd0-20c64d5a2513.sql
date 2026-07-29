
CREATE POLICY "Anyone can read product media files" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'product-media');

CREATE POLICY "Staff can upload product media files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-media' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can update product media files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-media' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'product-media' AND public.is_staff(auth.uid()));

CREATE POLICY "Admins can delete product media files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-media' AND public.has_role(auth.uid(), 'admin'));
