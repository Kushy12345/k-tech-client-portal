import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { IntakeForm } from '@/components/forms/intake-form';
import type { FormQuestion, FormSection, FormTemplate } from '@/types/forms.types';

export default async function IntakePage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data: template } = await supabase
    .from('form_templates')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!template) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: sections }, { data: questions }, { data: draft }] = await Promise.all([
    supabase.from('form_sections').select('*').eq('template_id', template.id).order('position'),
    supabase.from('form_questions').select('*').eq('template_id', template.id).order('position'),
    user
      ? supabase.from('form_submissions').select('id').eq('template_id', template.id).eq('user_id', user.id).eq('is_draft', true).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const { data: draftAnswers } = draft
    ? await supabase.from('form_answers').select('question_id, answer_text, answer_json').eq('submission_id', draft.id)
    : { data: [] };
  const questionKeys = new Map((questions ?? []).map((question) => [question.id, question.key ?? question.id]));
  const initialAnswers = Object.fromEntries((draftAnswers ?? []).flatMap((answer) => {
    const key = answer.question_id ? questionKeys.get(answer.question_id) : undefined;
    return key ? [[key, Array.isArray(answer.answer_json) ? answer.answer_json.filter((item): item is string => typeof item === 'string') : answer.answer_text ?? '']] : [];
  }));

  return (
    <IntakeForm
      template={template as FormTemplate}
      sections={(sections ?? []) as FormSection[]}
      questions={(questions ?? []) as unknown as FormQuestion[]}
      initialSubmissionId={draft?.id ?? undefined}
      initialAnswers={initialAnswers}
    />
  );
}
