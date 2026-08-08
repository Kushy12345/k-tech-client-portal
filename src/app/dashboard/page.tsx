import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/dashboard/sign-out-button';

const statusLabels: Record<string, string> = { draft: 'Draft', submitted: 'Submitted', under_review: 'Under review', contacted: 'Contacted', converted: 'Converted', archived: 'Archived' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: submissions } = await supabase.from('form_submissions').select('id, business_name, status, project_status, created_at, submitted_at, template_id').eq('user_id', user.id).order('created_at', { ascending: false });
  const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : user.email?.split('@')[0] ?? 'there';

  return <main className="mx-auto max-w-6xl px-6 py-10">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-[#D4AF37]">Client workspace</p><h1 className="mt-2 text-3xl font-bold">Welcome, {name}</h1><p className="mt-2 text-slate-600">Track your discovery requests and keep your project information close.</p></div><div className="flex items-center gap-4"><Link href="/intake/general-digital-discovery" className="button primary">Start a request</Link><SignOutButton /></div></div>
    <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Your project requests</h2><span className="text-sm text-slate-500">{submissions?.length ?? 0} total</span></div>
      {submissions?.length ? <div className="grid gap-4">{submissions.map((submission) => <Link key={submission.id} href={`/dashboard/submissions/${submission.id}`} className="card block transition hover:-translate-y-0.5 hover:border-[#D4AF37]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="font-semibold">{submission.business_name || 'Untitled project request'}</p><p className="mt-1 text-sm text-slate-500">Started {new Date(submission.created_at).toLocaleDateString()}</p></div><span className="w-fit rounded-full bg-[#FBF5D5] px-3 py-1 text-xs font-semibold text-[#5B21B6]">{submission.project_status ?? statusLabels[submission.status] ?? submission.status}</span></div></Link>)}</div> : <div className="card text-center"><h3 className="text-lg font-bold">No project requests yet</h3><p className="mt-2 text-sm text-slate-600">Start with a discovery form and we’ll help shape the next step.</p><Link href="/intake/general-digital-discovery" className="button primary mt-5 inline-block">Start discovery</Link></div>}
    </section>
  </main>;
}
