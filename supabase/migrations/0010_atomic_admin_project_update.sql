-- 0010_atomic_admin_project_update.sql
-- Update a project status and optional internal note atomically.
CREATE OR REPLACE FUNCTION public.admin_update_project(
  p_submission_id uuid,
  p_project_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  IF p_project_status NOT IN (
    'New Inquiry',
    'Reviewing Requirements',
    'Proposal Sent',
    'Approved',
    'In Progress',
    'Completed'
  ) THEN
    RAISE EXCEPTION 'Invalid project status.';
  END IF;

  UPDATE public.form_submissions
  SET project_status = p_project_status,
      last_status_changed_at = now()
  WHERE id = p_submission_id
    AND is_draft = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submitted request not found.';
  END IF;

  IF NULLIF(trim(COALESCE(p_note, '')), '') IS NOT NULL THEN
    INSERT INTO public.project_notes (submission_id, author_id, content)
    VALUES (p_submission_id, auth.uid(), trim(p_note));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_project(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_project(uuid, text, text) TO authenticated;
