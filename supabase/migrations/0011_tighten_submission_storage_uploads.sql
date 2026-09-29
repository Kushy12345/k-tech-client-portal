-- 0011_tighten_submission_storage_uploads.sql
-- A client may upload only into a submission they own.
DROP POLICY IF EXISTS submission_assets_insert_owner ON storage.objects;

CREATE POLICY submission_assets_insert_owner
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.form_submissions fs
    WHERE fs.id::text = (storage.foldername(name))[2]
      AND fs.user_id = auth.uid()
  )
);

-- Keep the metadata row consistent with the same ownership/path boundary.
CREATE OR REPLACE FUNCTION public.validate_submission_file_path()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id
  FROM public.form_submissions
  WHERE id = NEW.submission_id;

  IF owner_id IS NULL OR owner_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'You are not allowed to attach this file to the submission.';
  END IF;

  IF split_part(NEW.storage_path, '/', 1) <> owner_id::text
     OR split_part(NEW.storage_path, '/', 2) <> NEW.submission_id::text THEN
    RAISE EXCEPTION 'Invalid submission file path.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_submission_file_path ON public.submission_files;

CREATE TRIGGER trg_validate_submission_file_path
  BEFORE INSERT OR UPDATE ON public.submission_files
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_submission_file_path();
