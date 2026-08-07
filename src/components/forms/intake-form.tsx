'use client';

import { useMemo, useState } from 'react';
import { useForm, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import type { FormQuestion, FormSection, FormTemplate, Json } from '@/types/forms.types';

type Answers = Record<string, string | string[]>;
const answerSchema = z.record(z.union([z.string(), z.array(z.string())]));
const allowedFiles = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function optionsFor(question: FormQuestion): string[] {
  return Array.isArray(question.options) && question.options.every((option): option is string => typeof option === 'string')
    ? question.options
    : [];
}

function Field({ question, register, value, onMultiChange }: {
  question: FormQuestion;
  register: UseFormRegister<Answers>;
  value: string | string[] | undefined;
  onMultiChange: (value: string, checked: boolean) => void;
}) {
  const errorMessage = question.required ? 'This field is required.' : undefined;
  const common = { ...register(question.key ?? question.id, { required: question.required ? errorMessage : false }) };
  if (question.question_type === 'textarea') return <textarea {...common} placeholder={question.placeholder ?? ''} rows={5} className="field" />;
  if (question.question_type === 'select') return <select {...common} className="field"><option value="">Select an option</option>{optionsFor(question).map((option) => <option key={option}>{option}</option>)}</select>;
  if (question.question_type === 'radio') return <div className="grid gap-3 sm:grid-cols-2">{optionsFor(question).map((option) => <label key={option} className="choice"><input type="radio" value={option} {...common} />{option}</label>)}</div>;
  if (question.question_type === 'multi-select') {
    const selected = Array.isArray(value) ? value : [];
    return <div className="grid gap-3 sm:grid-cols-2">{optionsFor(question).map((option) => <label key={option} className="choice"><input type="checkbox" checked={selected.includes(option)} onChange={(event) => onMultiChange(option, event.target.checked)} />{option}</label>)}</div>;
  }
  if (question.question_type === 'file') return <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" className="field file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700" onChange={(event) => { const file = event.target.files?.[0]; if (file && (!allowedFiles.includes(file.type) || file.size > 10 * 1024 * 1024)) event.target.setCustomValidity('Use a JPG, PNG, WEBP, PDF, DOC, or DOCX file under 10 MB.'); else event.target.setCustomValidity(''); }} />;
  const type = question.question_type === 'url' ? 'url' : question.question_type === 'number' ? 'number' : question.question_type === 'email' ? 'email' : question.question_type === 'date' ? 'date' : 'text';
  return <input {...common} type={type} placeholder={question.placeholder ?? ''} className="field" />;
}

export function IntakeForm({ template, sections, questions }: { template: FormTemplate; sections: FormSection[]; questions: FormQuestion[] }) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [submissionId, setSubmissionId] = useState<string>();
  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<Answers>({ mode: 'onBlur' });
  const currentSection = sections[step];
  const currentQuestions = useMemo(() => questions.filter((question) => question.section_id === currentSection?.id), [currentSection?.id, questions]);
  const values = watch();

  const save = async (answers: Answers, draft: boolean) => {
    setStatus('saving');
    const parsed = answerSchema.safeParse(answers);
    if (!parsed.success) { setStatus('error'); return; }
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { window.location.href = `/login?redirect=/intake/${template.slug}`; return; }
    const summary = { business_name: answers.business_name ?? '', contact_name: answers.contact_name ?? '', contact_email: answers.contact_email ?? '' } as unknown as Json;
    const { data: submission, error } = await supabase.from('form_submissions').upsert({
      id: submissionId,
      template_id: template.id,
      user_id: userData.user.id,
      business_name: typeof answers.business_name === 'string' ? answers.business_name : null,
      contact_name: typeof answers.contact_name === 'string' ? answers.contact_name : null,
      contact_email: typeof answers.contact_email === 'string' ? answers.contact_email : null,
      summary,
      status: draft ? 'draft' : 'submitted',
      is_draft: draft,
      submitted_at: draft ? null : new Date().toISOString(),
    }).select('id').single();
    if (error || !submission) { setStatus('error'); return; }
    setSubmissionId(submission.id);
    const answerRows = Object.entries(answers).map(([key, answer]) => {
      const question = questions.find((candidate) => candidate.key === key);
      return { submission_id: submission.id, question_id: question?.id ?? null, answer_text: typeof answer === 'string' ? answer : null, answer_json: Array.isArray(answer) ? answer : null };
    });
    await supabase.from('form_answers').delete().eq('submission_id', submission.id);
    const { error: answerError } = await supabase.from('form_answers').insert(answerRows);
    if (answerError) { setStatus('error'); return; }
    setStatus(draft ? 'idle' : 'success');
  };

  if (status === 'success') return <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16"><div className="card w-full text-center"><div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div><h1 className="text-3xl font-bold">Thanks, we have your requirements.</h1><p className="mt-3 text-slate-600">Our team will review your discovery submission and be in touch shortly.</p><p className="mt-6 text-xs text-slate-500">Reference: {submissionId}</p></div></main>;
  const onInvalid = (formErrors: FieldErrors<Answers>) => { if (Object.keys(formErrors).length) setStatus('error'); };

  return <main className="min-h-screen px-4 py-8 sm:px-6 lg:py-14">
    <div className="mx-auto max-w-5xl">
      <header className="mb-8"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">K-Tech Solutions</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{template.name}</h1><p className="mt-3 max-w-2xl text-slate-600">{template.description}</p></header>
      <div className="mb-8"><div className="mb-3 flex items-center justify-between text-sm font-medium"><span>Step {step + 1} of {sections.length}</span><span>{Math.round(((step + 1) / sections.length) * 100)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${((step + 1) / sections.length) * 100}%` }} /></div></div>
      <form onSubmit={handleSubmit((answers) => save(answers, false), onInvalid)} className="card">
        <div className="mb-8 border-b pb-6"><p className="text-sm font-semibold text-blue-600">Section {step + 1}</p><h2 className="mt-1 text-2xl font-bold">{currentSection?.title}</h2><p className="mt-2 text-slate-600">{currentSection?.description}</p></div>
        <div className="space-y-7">{currentQuestions.map((question) => <div key={question.id}><label htmlFor={question.key ?? question.id} className="mb-2 block font-semibold">{question.label}{question.required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}</label><Field question={question} register={register} value={values[question.key ?? question.id]} onMultiChange={(option, checked) => { const key = question.key ?? question.id; const current = Array.isArray(values[key]) ? values[key] : []; setValue(key, checked ? [...current, option] : current.filter((item) => item !== option), { shouldValidate: true }); }} />{errors[question.key ?? question.id] && <p role="alert" className="mt-2 text-sm text-red-600">Please complete this field.</p>}</div>)}</div>
        {status === 'error' && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">Please check the highlighted fields and try again.</p>}
        <div className="mt-10 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"><button type="button" className="button secondary" disabled={step === 0 || status === 'saving'} onClick={() => setStep((current) => current - 1)}>Previous</button><div className="flex flex-col gap-3 sm:flex-row"><button type="button" className="button secondary" disabled={status === 'saving'} onClick={handleSubmit((answers) => save(answers, true), onInvalid)}>{status === 'saving' ? 'Saving...' : 'Save draft'}</button>{step < sections.length - 1 ? <button type="button" className="button primary" onClick={async () => { const valid = await trigger(currentQuestions.map((question) => question.key ?? question.id)); if (valid) setStep((current) => current + 1); }}>Next section</button> : <button type="submit" className="button primary" disabled={status === 'saving'}>Review and submit</button>}</div></div>
      </form>
    </div>
  </main>;
}
