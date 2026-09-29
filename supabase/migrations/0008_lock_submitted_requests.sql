-- 0008_lock_submitted_requests.sql
-- Prevent clients from changing protected lifecycle fields or editing submitted requests.
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
     OR NEW.project_status IS DISTINCT FROM OLD.project_status
     OR NEW.last_status_changed_at IS DISTINCT FROM OLD.last_status_changed_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
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

DROP TRIGGER IF EXISTS trg_protect_client_submission_updates ON public.form_submissions;

CREATE TRIGGER trg_protect_client_submission_updates
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_client_submission_updates();
