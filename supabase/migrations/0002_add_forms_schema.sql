-- 0002_add_forms_schema.sql
-- Adds a reusable form engine schema: templates, sections, questions, submissions, answers, options, files

-- Use pgcrypto for gen_random_uuid() if available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum for submission status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
        CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'under_review', 'contacted', 'converted', 'archived');
    END IF;
END$$;

-- Table: form_templates
CREATE TABLE IF NOT EXISTS public.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid, -- optional reference to profiles.id (managed by application)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON public.form_templates (slug);

-- Table: form_sections
CREATE TABLE IF NOT EXISTS public.form_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_sections_template_id ON public.form_sections (template_id);

-- Table: form_questions
CREATE TABLE IF NOT EXISTS public.form_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.form_sections(id) ON DELETE CASCADE,
  key text, -- machine key (optional)
  label text NOT NULL,
  placeholder text,
  help_text text,
  question_type text NOT NULL, -- e.g. text, textarea, email, phone, number, select, multi-select, radio, checkbox, date, url, file
  required boolean NOT NULL DEFAULT false,
  options jsonb, -- free-form options / validation rules (for select lists, etc.)
  meta jsonb, -- future extensibility
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_questions_template_id ON public.form_questions (template_id);
CREATE INDEX IF NOT EXISTS idx_form_questions_section_id ON public.form_questions (section_id);

-- Table: question_options (normalized options)
CREATE TABLE IF NOT EXISTS public.question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.form_questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  position integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON public.question_options (question_id);

-- Table: form_submissions
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.form_templates(id) ON DELETE SET NULL,
  user_id uuid, -- owner (auth.uid()) — may be null for anonymous submissions if desired
  contact_name text,
  contact_email text,
  contact_phone text,
  business_name text,
  summary jsonb, -- denormalized key/value summary for quick access
  status submission_status NOT NULL DEFAULT 'draft',
  is_draft boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_template_id ON public.form_submissions (template_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON public.form_submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status_created ON public.form_submissions (status, created_at DESC);

-- Table: form_answers
CREATE TABLE IF NOT EXISTS public.form_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.form_questions(id) ON DELETE SET NULL,
  answer_text text, -- human-readable / short answers
  answer_json jsonb, -- structured answers (arrays, objects)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_answers_submission_id ON public.form_answers (submission_id);
CREATE INDEX IF NOT EXISTS idx_form_answers_question_id ON public.form_answers (question_id);

-- Table: submission_files
CREATE TABLE IF NOT EXISTS public.submission_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.form_questions(id) ON DELETE SET NULL,
  storage_path text NOT NULL, -- path inside Supabase Storage (bucket/path)
  filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_files_submission_id ON public.submission_files (submission_id);

-- Table: form_admins — explicit list of admin user IDs allowed to view/manage submissions
CREATE TABLE IF NOT EXISTS public.form_admins (
  admin_id uuid PRIMARY KEY,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row-Level Security on tables that contain submission data
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;

-- Policies for form_submissions

-- Allow owners (user_id = auth.uid()) to SELECT their own submissions
CREATE POLICY "submissions_select_owner_or_admin" ON public.form_submissions
  FOR SELECT
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
  );

-- Allow owners to INSERT (must set user_id = auth.uid() or be an admin)
CREATE POLICY "submissions_insert_owner_or_admin" ON public.form_submissions
  FOR INSERT
  WITH CHECK (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
  );

-- Allow owners and admins to UPDATE (owners can update their drafts)
CREATE POLICY "submissions_update_owner_or_admin" ON public.form_submissions
  FOR UPDATE
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
  )
  WITH CHECK (
    -- Owners can only update their own rows; admins may update freely
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
  );

-- Allow admins to DELETE submissions
CREATE POLICY "submissions_delete_admins" ON public.form_submissions
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid()));

-- Policies for form_answers (tied to submission permissions)
CREATE POLICY "answers_select_owner_or_admin" ON public.form_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.form_submissions fs
      WHERE fs.id = submission_id
      AND (
        (fs.user_id IS NOT NULL AND fs.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
      )
    )
  );

CREATE POLICY "answers_insert_owner_or_admin" ON public.form_answers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_submissions fs
      WHERE fs.id = submission_id
      AND (
        (fs.user_id IS NOT NULL AND fs.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
      )
    )
  );

CREATE POLICY "answers_update_owner_or_admin" ON public.form_answers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.form_submissions fs
      WHERE fs.id = submission_id
      AND (
        (fs.user_id IS NOT NULL AND fs.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_submissions fs
      WHERE fs.id = submission_id
      AND (
        (fs.user_id IS NOT NULL AND fs.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
      )
    )
  );

CREATE POLICY "answers_delete_admins" ON public.form_answers
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid()));

-- Policies for submission_files (same pattern)
CREATE POLICY "files_select_owner_or_admin" ON public.submission_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.form_submissions fs
      WHERE fs.id = submission_id
      AND (
        (fs.user_id IS NOT NULL AND fs.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
      )
    )
  );

CREATE POLICY "files_insert_owner_or_admin" ON public.submission_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_submissions fs
      WHERE fs.id = submission_id
      AND (
        (fs.user_id IS NOT NULL AND fs.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
      )
    )
  );

CREATE POLICY "files_delete_admins" ON public.submission_files
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid()));

-- Make form_templates, sections and questions readable by authenticated users
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_public_read" ON public.form_templates
  FOR SELECT
  USING (true);

-- Sections and questions: allow SELECT for everyone (they drive the form UI)
ALTER TABLE public.form_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections_public_read" ON public.form_sections
  FOR SELECT
  USING (true);

ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_public_read" ON public.form_questions
  FOR SELECT
  USING (true);

-- For question_options (used by UI)
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "options_public_read" ON public.question_options
  FOR SELECT
  USING (true);

-- Keep uploaded client assets private. The object name must start with the
-- authenticated user's id, matching the submission ownership boundary.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-assets',
  'submission-assets',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "submission_assets_select_owner_or_admin"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submission-assets'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
  )
);

CREATE POLICY "submission_assets_insert_owner"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submission-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "submission_assets_delete_owner_or_admin"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'submission-assets'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.form_admins fa WHERE fa.admin_id = auth.uid())
  )
);

-- Refresh updated_at trigger convenience (optional)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_form_templates_updated_at
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_form_sections_updated_at
  BEFORE UPDATE ON public.form_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_form_questions_updated_at
  BEFORE UPDATE ON public.form_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_form_submissions_updated_at
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- End of migration
