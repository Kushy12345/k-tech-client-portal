-- Align private storage authorization with the database-backed application role.
DROP POLICY IF EXISTS submission_assets_select_owner_or_admin ON storage.objects;
DROP POLICY IF EXISTS submission_assets_delete_owner_or_admin ON storage.objects;

CREATE POLICY submission_assets_select_owner_or_admin
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submission-assets'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR public.is_admin()
  )
);

CREATE POLICY submission_assets_delete_owner_or_admin
ON storage.objects FOR DELETE
USING (
  bucket_id = 'submission-assets'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR public.is_admin()
  )
);
