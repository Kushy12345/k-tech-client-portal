-- Database-backed roles and internal project management.
CREATE TYPE public.app_role AS ENUM ('client', 'admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role public.app_role NOT NULL DEFAULT 'client',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_role_idx ON public.profiles (role);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, NULLIF(raw_user_meta_data ->> 'full_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE
  USING (id = auth.uid() AND role = 'client')
  WITH CHECK (id = auth.uid() AND role = 'client');

ALTER TABLE public.form_submissions
  ADD COLUMN project_status text NOT NULL DEFAULT 'New Inquiry'
  CHECK (project_status IN (
    'New Inquiry',
    'Reviewing Requirements',
    'Proposal Sent',
    'Approved',
    'In Progress',
    'Completed'
  ));

ALTER TABLE public.form_submissions
  ADD COLUMN last_status_changed_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX form_submissions_project_status_idx
  ON public.form_submissions (project_status, created_at DESC);

CREATE TABLE public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  content text NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_notes_submission_idx
  ON public.project_notes (submission_id, created_at DESC);

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_notes_admin_select ON public.project_notes
  FOR SELECT USING (public.is_admin());

CREATE POLICY project_notes_admin_insert ON public.project_notes
  FOR INSERT WITH CHECK (public.is_admin() AND author_id = auth.uid());

CREATE POLICY project_notes_admin_delete ON public.project_notes
  FOR DELETE USING (public.is_admin());

CREATE POLICY submissions_admin_select_profile_role ON public.form_submissions
  FOR SELECT USING (public.is_admin());

CREATE POLICY submissions_admin_update_profile_role ON public.form_submissions
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY answers_admin_select_profile_role ON public.form_answers
  FOR SELECT USING (public.is_admin());

CREATE POLICY files_admin_select_profile_role ON public.submission_files
  FOR SELECT USING (public.is_admin());

CREATE POLICY files_admin_insert_profile_role ON public.submission_files
  FOR INSERT WITH CHECK (public.is_admin());
