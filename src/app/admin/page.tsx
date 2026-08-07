import Link from 'next/link';
import { requireRole } from '@/lib/supabase/authorization';
import { PROJECT_STATUSES } from '@/components/admin/project-status-form';

export default async function AdminPage({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const { supabase } = await requireRole('admin');
  let query = supabase.from('form_submissions').select('id, business_name, contact_name, contact_email, project_status, created_at, submitted_at, template_id').order('created_at', { ascending: false });
  if (searchParams.q) query = query.or(`business_name.ilike.%${searchParams.q}%,contact_name.ilike.%${searchParams.q}%,contact_email.ilike.%${searchParams.q}%`);
  if (searchParams.status && PROJECT_STATUSES.includes(searchParams.status as typeof PROJECT_STATUSES[number])) query = query.eq('project_status', searchParams.status);
  const { data: submissions } = await query;

  return <main className="mx-auto max-w-7xl px-6 py-10">
    <div><p className="text-sm font-semibold text-blue-600">Internal workspace</p><h1 className="mt-2 text-3xl font-bold">Project overview</h1><p className="mt-2 text-slate-600">Review client requirements and keep every project moving.</p></div>
    <form className="mt-8 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_220px_auto]"><input name="q" defaultValue={searchParams.q} className="field" placeholder="Search client, business, or email" /><select name="status" defaultValue={searchParams.status ?? ''} className="field"><option value="">All statuses</option>{PROJECT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><button className="button primary">Filter</button></form>
    <section className="mt-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">All submissions</h2><span className="text-sm text-slate-500">{submissions?.length ?? 0} results</span></div>{submissions?.length ? <div className="overflow-hidden rounded-2xl border bg-white"><div className="divide-y">{submissions.map((submission) => <Link key={submission.id} href={`/admin/submissions/${submission.id}`} className="block p-5 transition hover:bg-slate-50"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><p className="font-semibold">{submission.business_name || 'Untitled project'}</p><p className="mt-1 text-sm text-slate-500">{submission.contact_name || 'No contact'} · {submission.contact_email || 'No email'}</p></div><div className="flex items-center gap-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{submission.project_status}</span><span className="text-xs text-slate-500">{new Date(submission.created_at).toLocaleDateString()}</span></div></div></Link>)}</div></div> : <div className="card text-center text-sm text-slate-600">No submissions match your filters.</div>}</section>
  </main>;
}
