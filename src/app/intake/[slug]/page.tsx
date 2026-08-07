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

  const [{ data: sections }, { data: questions }] = await Promise.all([
    supabase.from('form_sections').select('*').eq('template_id', template.id).order('position'),
    supabase.from('form_questions').select('*').eq('template_id', template.id).order('position'),
  ]);

  return (
    <IntakeForm
      template={template as FormTemplate}
      sections={(sections ?? []) as FormSection[]}
      questions={(questions ?? []) as unknown as FormQuestion[]}
    />
  );
}
