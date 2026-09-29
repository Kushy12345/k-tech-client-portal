-- 0012_allow_client_submission_file_replacement.sql
-- Clients may delete their own submitted-file metadata so a file can be replaced.
DROP POLICY IF EXISTS submission_files_delete_owner ON public.submission_files;

CREATE POLICY submission_files_delete_owner
ON public.submission_files
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.form_submissions fs
    WHERE fs.id = submission_id
      AND fs.user_id = (SELECT auth.uid())
  )
);
