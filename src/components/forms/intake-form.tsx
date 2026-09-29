'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import type { FormQuestion, FormSection, FormTemplate, Json } from '@/types/forms.types';
import { SignOutButton } from '@/components/dashboard/sign-out-button';

type Answers = Record<string, string | string[]>;
const answerSchema = z.record(z.union([z.string(), z.array(z.string())]));
const allowedFiles = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function optionsFor(question: FormQuestion): string[] {
  return Array.isArray(question.options) && question.options.every((option): option is string => typeof option === 'string')
    ? question.options
    : [];
}

function Field({ question, register, value, onMultiChange, onFileChange }: {
  question: FormQuestion;
  register: UseFormRegister<Answers>;
  value: string | string[] | undefined;
  onMultiChange: (value: string, checked: boolean) => void;
  onFileChange: (file: File | undefined) => void;
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
  if (question.question_type === 'file') return <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" aria-label={question.label} className="field file:mr-4 file:rounded-lg file:border-0 file:bg-[#FBF5D5] file:px-4 file:py-2 file:text-[#B8941F]" onChange={(event) => { const file = event.target.files?.[0]; const valid = !file || (allowedFiles.includes(file.type) && file.size <= 10 * 1024 * 1024); event.target.setCustomValidity(valid ? '' : 'Use a JPG, PNG, WEBP, PDF, DOC, or DOCX file under 10 MB.'); onFileChange(valid ? file : undefined); }} />;
  const type = question.question_type === 'url' ? 'url' : question.question_type === 'number' ? 'number' : question.question_type === 'email' ? 'email' : question.question_type === 'date' ? 'date' : 'text';
  return <input {...common} type={type} placeholder={question.placeholder ?? ''} className="field" />;
}

export function IntakeForm({ template, sections, questions, initialSubmissionId, initialAnswers = {} }: { template: FormTemplate; sections: FormSection[]; questions: FormQuestion[]; initialSubmissionId?: string; initialAnswers?: Answers }) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [submissionId, setSubmissionId] = useState<string | undefined>(initialSubmissionId);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<Answers>({
    mode: 'onBlur',
    defaultValues: initialAnswers,
    shouldUnregister: false,
  });

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasChanges || status === 'saving' || status === 'success') return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasChanges, status]);
  const currentSection = sections[step];
  const currentQuestions = useMemo(() => questions.filter((question) => question.section_id === currentSection?.id), [currentSection?.id, questions]);
  const values = watch();
  const hasAnswerValues = Object.values(values).some((value) => Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim().length > 0 : Boolean(value));
  const hasDraftContent = hasAnswerValues || Object.keys(files).length > 0;

  const save = async (answers: Answers, draft: boolean): Promise<boolean> => {
    setStatus('saving');
    const normalizedAnswers = Object.fromEntries(
      Object.entries(answers).filter(([, answer]) => answer !== undefined),
    ) as Answers;
    const parsed = answerSchema.safeParse(normalizedAnswers);
    if (!parsed.success) { setStatus('error'); return false; }
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { window.location.href = `/login?redirect=/intake/${template.slug}`; return false; }
    const summary = { business_name: normalizedAnswers.business_name ?? '', contact_name: normalizedAnswers.contact_name ?? '', contact_email: normalizedAnswers.contact_email ?? '' } as unknown as Json;
    const { data: submission, error } = await supabase.from('form_submissions').upsert({
      id: submissionId,
      template_id: template.id,
      user_id: userData.user.id,
      business_name: typeof normalizedAnswers.business_name === 'string' ? normalizedAnswers.business_name : null,
      contact_name: typeof normalizedAnswers.contact_name === 'string' ? normalizedAnswers.contact_name : null,
      contact_email: typeof normalizedAnswers.contact_email === 'string' ? normalizedAnswers.contact_email : null,
      summary,
      status: draft ? 'draft' : 'submitted',
      is_draft: draft,
      submitted_at: draft ? null : new Date().toISOString(),
    }).select('id').single();
    if (error || !submission) { setStatus('error'); return false; }
    setSubmissionId(submission.id);
    const answerRows = Object.entries(normalizedAnswers).map(([key, answer]) => {
      const question = questions.find((candidate) => candidate.key === key);
      return { submission_id: submission.id, question_id: question?.id ?? null, answer_text: typeof answer === 'string' ? answer : null, answer_json: Array.isArray(answer) ? answer : null };
    });
    await supabase.from('form_answers').delete().eq('submission_id', submission.id);
    const { error: answerError } = await supabase.from('form_answers').insert(answerRows);
    if (answerError) { setStatus('error'); return false; }
    for (const [key, file] of Object.entries(files)) {
      const question = questions.find((candidate) => candidate.key === key);
      if (!question) continue;
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const path = `${userData.user.id}/${submission.id}/${question.id}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('submission-assets').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) { setStatus('error'); return false; }
      const { error: fileError } = await supabase.from('submission_files').insert({ submission_id: submission.id, question_id: question.id, storage_path: path, filename: file.name, mime_type: file.type, size_bytes: file.size });
      if (fileError) { setStatus('error'); return false; }
    }

    if (!draft) {
      try {
        const notificationResponse = await fetch('/api/notifications/new-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: submission.id }),
        });
        if (!notificationResponse.ok) {
          console.error('New request notification was not sent:', notificationResponse.status);
        }
      } catch (notificationError) {
        console.error('New request notification failed:', notificationError);
      }
    }

    setHasChanges(false);
    setStatus(draft ? 'idle' : 'success');
    return true;
  };

  if (status === 'success') return <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16"><div className="card w-full text-center"><div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-400">✓</div><h1 className="text-3xl font-bold text-white">Thanks, we have your requirements.</h1><p className="mt-3 text-slate-300">Our team will review your discovery submission and be in touch shortly.</p><p className="mt-6 text-xs text-slate-400">Reference: {submissionId}</p><div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"><a href="/dashboard" className="button primary inline-flex">Go to dashboard</a><span className="button secondary inline-flex"><SignOutButton /></span></div></div></main>;
  const onInvalid = (formErrors: FieldErrors<Answers>) => { if (Object.keys(formErrors).length) setStatus('error'); };
  const validateCurrentSection = async () => {
    const fieldNames = currentQuestions.map((question) => question.key ?? question.id);
    return fieldNames.length === 0 || trigger(fieldNames);
  };
  const submitFinal = () => {
    void handleSubmit((answers) => save(answers, false), onInvalid)();
  };
  const saveDraftAndExit = () => {
    if (!hasDraftContent) {
      window.location.assign('/dashboard');
      return;
    }
    void save(values, true).then((saved) => {
      if (saved) window.location.assign('/dashboard');
    });
  };
  const leaveForm = () => {
    if (hasChanges && !window.confirm('Leave this form? Your unsaved changes will be lost.')) return;
    window.location.assign('/dashboard');
  };

  return <main className="min-h-screen px-4 py-8 sm:px-6 lg:py-14">
    <div className="mx-auto max-w-5xl">
      <header className="mb-8"><div className="mb-6 flex items-center justify-between gap-4"><button type="button" onClick={leaveForm} className="text-sm font-semibold text-slate-300 transition hover:text-white">← Back to dashboard</button><button type="button" onClick={saveDraftAndExit} disabled={status === 'saving'} className="button secondary">{status === 'saving' ? 'Saving...' : 'Save & exit'}</button></div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">K-Tech Technologies</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{template.name}</h1><p className="mt-3 max-w-2xl text-slate-300">{template.description}</p></header>
      <div className="mb-8"><div className="mb-3 flex items-center justify-between text-sm font-medium"><span>Step {step + 1} of {sections.length}</span><span>{Math.round(((step + 1) / sections.length) * 100)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-[#D4AF37] transition-all" style={{ width: `${((step + 1) / sections.length) * 100}%` }} /></div></div>
      <form onChange={() => setHasChanges(true)} onSubmit={(event) => event.preventDefault()} className="card">
        <div className="mb-8 border-b pb-6"><p className="text-sm font-semibold text-[#D4AF37]">Section {step + 1}</p><h2 className="mt-1 text-2xl font-bold">{currentSection?.title}</h2><p className="mt-2 text-slate-300">{currentSection?.description}</p></div>
        <div className="space-y-7">{currentQuestions.map((question) => <div key={question.id}><label htmlFor={question.key ?? question.id} className="mb-2 block font-semibold">{question.label}{question.required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}</label>{question.help_text && <p className="mb-2 text-sm text-slate-400">{question.help_text}</p>}<Field question={question} register={register} value={values[question.key ?? question.id]} onFileChange={(file) => { const key = question.key ?? question.id; setFiles((current) => { const next = { ...current }; if (file) next[key] = file; else delete next[key]; return next; }); }} onMultiChange={(option, checked) => { const key = question.key ?? question.id; const current = Array.isArray(values[key]) ? values[key] : []; setValue(key, checked ? [...current, option] : current.filter((item) => item !== option), { shouldValidate: true }); }} />{errors[question.key ?? question.id] && <p role="alert" className="mt-2 text-sm text-red-600">Please complete this field.</p>}</div>)}</div>
        {status === 'error' && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">Please check the highlighted fields and try again.</p>}
        <div className="mt-10 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"><button type="button" className="button secondary" disabled={step === 0 || status === 'saving'} onClick={() => setStep((current) => current - 1)}>Previous</button><div className="flex flex-col gap-3 sm:flex-row"><button type="button" className="button secondary" disabled={status === 'saving'} onClick={() => { if (hasDraftContent) void save(values, true); }}>{status === 'saving' ? 'Saving...' : 'Save draft'}</button>{step < sections.length - 1 ? <button type="button" className="button primary" onClick={async () => { const valid = await validateCurrentSection(); if (valid) setStep((current) => current + 1); }}>Next section</button> : <button type="button" className="button primary" disabled={status === 'saving'} onClick={submitFinal}>Submit requirements</button>}</div></div>
      </form>
    </div>
  </main>;
}
