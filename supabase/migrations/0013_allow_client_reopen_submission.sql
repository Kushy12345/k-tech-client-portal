-- 0013_allow_client_reopen_submission.sql
-- Allow a client to reopen their own submitted request as a draft through a controlled RPC.
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
    AND is_draft = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submitted request not found.';
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
    AND is_draft = false;
END;
$$;

REVOKE ALL ON FUNCTION public.client_reopen_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_reopen_submission(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_client_submission_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You are not allowed to update this request.';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.template_id IS DISTINCT FROM OLD.template_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Protected request fields cannot be changed by clients.';
  END IF;

  IF current_setting('k_tech.client_reopen', true) = 'true' THEN
    IF OLD.is_draft
       OR NEW.is_draft IS DISTINCT FROM true
       OR OLD.status IS DISTINCT FROM 'submitted'
       OR NEW.status IS DISTINCT FROM 'draft'
       OR OLD.submitted_at IS NULL
       OR NEW.submitted_at IS NOT NULL
       OR NEW.project_status IS DISTINCT FROM 'New Inquiry' THEN
      RAISE EXCEPTION 'Invalid client reopen transition.';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.project_status IS DISTINCT FROM OLD.project_status
     OR NEW.last_status_changed_at IS DISTINCT FROM OLD.last_status_changed_at THEN
    RAISE EXCEPTION 'Protected request fields cannot be changed by clients.';
  END IF;

  IF NOT OLD.is_draft THEN
    RAISE EXCEPTION 'Submitted requests cannot be edited.';
  END IF;

  IF NEW.status NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'Invalid request status.';
  END IF;

  IF NEW.is_draft AND NEW.status <> 'draft' THEN
    RAISE EXCEPTION 'Draft requests must use draft status.';
  END IF;

  IF NOT NEW.is_draft AND NEW.status <> 'submitted' THEN
    RAISE EXCEPTION 'Submitted requests must use submitted status.';
  END IF;

  RETURN NEW;
END;
$$;
