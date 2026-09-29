-- 0009_allow_owner_draft_answer_replace.sql
-- Let clients replace answers only on their own draft submissions.
DROP POLICY IF EXISTS answers_delete_owner_draft ON public.form_answers;

CREATE POLICY answers_delete_owner_draft
ON public.form_answers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.form_submissions fs
    WHERE fs.id = submission_id
      AND fs.user_id = (SELECT auth.uid())
      AND fs.is_draft = true
  )
);
