import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/dashboard/sign-out-button';

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  contacted: 'Contacted',
  converted: 'Converted',
  archived: 'Archived',
};

const statusStyles: Record<string, string> = {
  'New Inquiry': 'bg-amber-400/10 text-amber-300 border-amber-400/30',
  'Reviewing Requirements': 'bg-purple-500/10 text-purple-300 border-purple-400/30',
  'Proposal Sent': 'bg-blue-500/10 text-blue-300 border-blue-400/30',
  'Approved': 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30',
  'In Progress': 'bg-sky-500/10 text-sky-300 border-sky-400/30',
  'Completed': 'bg-slate-800 text-slate-300 border-slate-700',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: submissions } = await supabase
    .from('form_submissions')
    .select('id, business_name, status, project_status, created_at, submitted_at, template_id, is_draft')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const name = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : user.email?.split('@')[0] ?? 'there';

  const total = submissions?.length ?? 0;
  const active = submissions?.filter((item) => !['Completed'].includes(item.project_status ?? '')).length ?? 0;
  const completed = submissions?.filter((item) => item.project_status === 'Completed').length ?? 0;
  const latest = submissions?.[0];
  const projectTitle = (submission: { business_name: string | null; template_id: string | null }) => submission.business_name || 'Website & Digital Solution Discovery';

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-sm sm:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">Client workspace</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Keep your project requests, requirements, and progress in one place.
            </p>
          </div>
          <Link href="/intake/general-digital-discovery" className="button inline-flex w-fit bg-[#D4AF37] text-slate-950 hover:bg-[#B8941F]">
            Start a new request
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5 sm:p-6"><p className="text-sm text-slate-500">Total requests</p><p className="mt-2 text-3xl font-bold">{total}</p><p className="mt-1 text-xs text-slate-500">Everything you have started</p></div>
        <div className="card p-5 sm:p-6"><p className="text-sm text-slate-500">Active</p><p className="mt-2 text-3xl font-bold">{active}</p><p className="mt-1 text-xs text-slate-500">Requests still moving forward</p></div>
        <div className="card p-5 sm:p-6"><p className="text-sm text-slate-500">Completed</p><p className="mt-2 text-3xl font-bold">{completed}</p><p className="mt-1 text-xs text-slate-500">Projects marked complete</p></div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-[#7C3AED]">Your work</p><h2 className="mt-1 text-2xl font-bold">Project requests</h2></div>
            <span className="text-sm text-slate-500">{total} total</span>
          </div>

          {submissions?.length ? (
            <div className="grid gap-3">
              {submissions.map((submission) => {
                const status = submission.project_status ?? statusLabels[submission.status] ?? submission.status;
                return (
                  <Link key={submission.id} href={submission.is_draft ? `/intake/general-digital-discovery?draft=${submission.id}` : `/dashboard/submissions/${submission.id}`} className="group card block p-5 transition hover:-translate-y-0.5 hover:border-[#D4AF37] sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <p className="font-semibold group-hover:text-[#5B21B6]">{projectTitle(submission)}</p>
                        <p className="mt-1 text-sm text-slate-500">{submission.is_draft ? 'Last saved' : submission.submitted_at ? 'Submitted' : 'Started'} {new Date(submission.submitted_at ?? submission.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${submission.is_draft ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : statusStyles[status] ?? 'border-slate-700 bg-slate-800 text-slate-300'}`}>{submission.is_draft ? 'Draft' : status}</span>
                        {submission.is_draft && <span className="text-sm font-semibold text-[#D4AF37]">Continue →</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="card p-8 text-center sm:p-10">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF5D5] text-xl">+</div>
              <h3 className="mt-4 text-xl font-bold">Your next project starts here</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300">Tell us what you want to build. The guided discovery form helps us understand your goals before we talk through the next step.</p>
              <Link href="/intake/general-digital-discovery" className="button primary mt-6 inline-flex">Start discovery</Link>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-6 sm:p-7">
            <p className="text-sm font-semibold text-[#D4AF37]">Need to update something?</p>
            <h2 className="mt-2 text-xl font-bold">Keep your details current</h2>
            <p className="mt-2 text-slate-400">Update your profile so K-Tech Technologies can reach you with project questions and updates.</p>
            <Link href="/dashboard/profile" className="button secondary mt-5 inline-flex">View profile</Link>
          </div>
          {latest ? (
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-300">{latest.is_draft ? 'Continue your request' : 'Latest request'}</p>
              <p className="mt-2 font-semibold text-white">{projectTitle(latest)}</p>
              <p className="mt-1 text-sm text-slate-400">{latest.is_draft ? 'You have a saved request waiting for you.' : latest.project_status ?? statusLabels[latest.status] ?? latest.status}</p>
              <Link href={latest.is_draft ? `/intake/general-digital-discovery?draft=${latest.id}` : `/dashboard/submissions/${latest.id}`} className="mt-4 inline-flex text-sm font-semibold text-[#D4AF37] hover:underline">
                {latest.is_draft ? 'Continue / edit request →' : 'View request →'}
              </Link>
            </div>
          ) : null}
        </aside>
      </section>

      <div className="mt-8 flex justify-end"><SignOutButton /></div>
    </main>
  );
}
