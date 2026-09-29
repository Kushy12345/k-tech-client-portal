-- 0014_lock_completed_reopen.sql
-- Completed client requests must remain permanently non-editable at the database boundary.

CREATE OR REPLACE FUNCTION public.client_reopen_submission(p_submission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RAISE EXCEPTION 'Admin accounts cannot use the client reopen flow.';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  PERFORM 1
  FROM public.form_submissions
  WHERE id = p_submission_id
    AND user_id = auth.uid()
    AND is_draft = false
    AND status = 'submitted'
    AND project_status IS DISTINCT FROM 'Completed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This request cannot be reopened.';
  END IF;

  PERFORM set_config('k_tech.client_reopen', 'true', true);

  UPDATE public.form_submissions
  SET is_draft = true,
      status = 'draft',
      submitted_at = NULL,
      project_status = 'New Inquiry',
      last_status_changed_at = now()
  WHERE id = p_submission_id
    AND user_id = auth.uid()
    AND is_draft = false
    AND status = 'submitted'
    AND project_status IS DISTINCT FROM 'Completed';
END;
$$;

REVOKE ALL ON FUNCTION public.client_reopen_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_reopen_submission(uuid) TO authenticated;
