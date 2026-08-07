import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const statusLabels: Record<string, string> = { draft: 'Draft', submitted: 'Submitted', under_review: 'Under review', contacted: 'Contacted', converted: 'Converted', archived: 'Archived' };

export default async function SubmissionPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: submission } = await supabase.from('form_submissions').select('id, business_name, contact_name, contact_email, contact_phone, status, created_at, submitted_at, template_id').eq('id', params.id).eq('user_id', user.id).maybeSingle();
  if (!submission) notFound();
  const [{ data: answers }, { data: template }] = await Promise.all([
    supabase.from('form_answers').select('id, answer_text, answer_json, question_id').eq('submission_id', submission.id),
    submission.template_id ? supabase.from('form_templates').select('name').eq('id', submission.template_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const questions = answers?.map((answer) => answer.question_id).filter((id): id is string => Boolean(id)) ?? [];
  const { data: questionRows } = questions.length ? await supabase.from('form_questions').select('id, label').in('id', questions) : { data: [] };
  const labels = new Map((questionRows ?? []).map((question) => [question.id, question.label]));

  return <main className="mx-auto max-w-4xl px-6 py-10">
    <Link href="/dashboard" className="text-sm font-semibold text-blue-600 hover:underline">← Back to dashboard</Link>
    <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-sm font-semibold text-blue-600">{template?.name ?? 'Project request'}</p><h1 className="mt-2 text-3xl font-bold">{submission.business_name || 'Untitled project request'}</h1><p className="mt-2 text-sm text-slate-500">Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : 'as a draft'}</p></div><span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{statusLabels[submission.status] ?? submission.status}</span></div>
    <section className="mt-8 card"><h2 className="text-xl font-bold">Contact details</h2><dl className="mt-5 grid gap-5 sm:grid-cols-3"><div><dt className="text-xs font-semibold uppercase text-slate-500">Contact</dt><dd className="mt-1">{submission.contact_name || '—'}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-500">Email</dt><dd className="mt-1 break-all">{submission.contact_email || '—'}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-500">Phone</dt><dd className="mt-1">{submission.contact_phone || '—'}</dd></div></dl></section>
    <section className="mt-6 card"><h2 className="text-xl font-bold">Your requirements</h2><div className="mt-6 divide-y">{answers?.length ? answers.map((answer) => <div key={answer.id} className="py-4 first:pt-0"><p className="text-sm font-semibold text-slate-600">{labels.get(answer.question_id ?? '') ?? 'Requirement'}</p><p className="mt-1 whitespace-pre-wrap text-sm">{Array.isArray(answer.answer_json) ? answer.answer_json.join(', ') : answer.answer_text || '—'}</p></div>) : <p className="mt-4 text-sm text-slate-600">No answers have been saved yet.</p>}</div></section>
  </main>;
}
