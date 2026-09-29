import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { IntakeForm } from '@/components/forms/intake-form';
import type { FormQuestion, FormSection, FormTemplate } from '@/types/forms.types';

export default async function IntakePage({ params, searchParams }: { params: { slug: string }; searchParams: { draft?: string } }) {
  const supabase = await createClient();
  const { data: template } = await supabase
    .from('form_templates')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!template) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: sections }, { data: questions }] = await Promise.all([
    supabase.from('form_sections').select('*').eq('template_id', template.id).order('position'),
    supabase.from('form_questions').select('*').eq('template_id', template.id).order('position'),
  ]);

  const draftQuery = user
    ? supabase.from('form_submissions').select('id, summary').eq('template_id', template.id).eq('user_id', user.id).eq('is_draft', true)
    : null;
  const { data: draft } = draftQuery
    ? searchParams.draft
      ? await draftQuery.eq('id', searchParams.draft).maybeSingle()
      : await draftQuery.order('updated_at', { ascending: false }).limit(1).maybeSingle()
    : { data: null };

  const [{ data: draftAnswers }, { data: draftFiles }] = draft
    ? await Promise.all([
        supabase.from('form_answers').select('question_id, answer_text, answer_json').eq('submission_id', draft.id),
        supabase.from('submission_files').select('question_id, filename').eq('submission_id', draft.id).order('uploaded_at', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const questionKeys = new Map((questions ?? []).map((question) => [question.id, question.key ?? question.id]));
  const initialAnswers = Object.fromEntries((draftAnswers ?? []).flatMap((answer) => {
    const key = answer.question_id ? questionKeys.get(answer.question_id) : undefined;
    return key ? [[key, Array.isArray(answer.answer_json) ? answer.answer_json.filter((item): item is string => typeof item === 'string') : answer.answer_text ?? '']] : [];
  }));

  const storedStep =
    draft?.summary &&
    typeof draft.summary === 'object' &&
    !Array.isArray(draft.summary) &&
    typeof draft.summary.resume_step === 'number'
      ? draft.summary.resume_step
      : 0;
  const initialStep = Math.min(Math.max(storedStep, 0), Math.max((sections?.length ?? 1) - 1, 0));
  const initialFiles = Array.from(
    new Map(
      (draftFiles ?? [])
        .filter((file) => file.question_id && file.filename)
        .map((file) => [file.question_id as string, file.filename as string]),
    ).entries(),
  ).map(([questionId, filename]) => ({ questionId: questionKeys.get(questionId) ?? questionId, filename }));

  return (
    <IntakeForm
      template={template as FormTemplate}
      sections={(sections ?? []) as FormSection[]}
      questions={(questions ?? []) as unknown as FormQuestion[]}
      initialSubmissionId={draft?.id ?? undefined}
      initialAnswers={initialAnswers}
      initialStep={initialStep}
      initialFiles={initialFiles}
    />
  );
}
