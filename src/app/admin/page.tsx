import Link from 'next/link';
import { requireRole } from '@/lib/supabase/authorization';
import { PROJECT_STATUSES } from '@/lib/constants';

export default async function AdminPage({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const { supabase } = await requireRole('admin');

  let query = supabase
    .from('form_submissions')
    .select('id, business_name, contact_name, contact_email, project_status, created_at, submitted_at, template_id')
    .order('created_at', { ascending: false });

  if (searchParams.q) query = query.or(`business_name.ilike.%${searchParams.q}%,contact_name.ilike.%${searchParams.q}%,contact_email.ilike.%${searchParams.q}%`);
  if (searchParams.status && PROJECT_STATUSES.includes(searchParams.status as typeof PROJECT_STATUSES[number])) query = query.eq('project_status', searchParams.status);

  const [{ data: submissions }, { count: clientCount }, { count: requestCount }, { count: newCount }, { count: completedCount }] = await Promise.all([
    query,
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('form_submissions').select('*', { count: 'exact', head: true }),
    supabase.from('form_submissions').select('*', { count: 'exact', head: true }).eq('project_status', 'New Inquiry'),
    supabase.from('form_submissions').select('*', { count: 'exact', head: true }).eq('project_status', 'Completed'),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="rounded-3xl bg-slate-950 px-6 py-8 text-white sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">K-Tech Technologies</p>
        <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Operations dashboard</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">See new client activity, manage requests, and keep projects moving.</p></div>
          <Link href="/admin/clients" className="button inline-flex w-fit border border-white/20 bg-white/10 text-white hover:bg-white/15">View clients</Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/clients"
          className="card group flex min-h-32 flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:border-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] sm:p-6"
        >
          <div>
            <p className="text-sm text-slate-400">Registered clients</p>
            <p className="mt-2 text-3xl font-bold">{clientCount ?? 0}</p>
          </div>
          <span className="mt-4 text-xs font-semibold text-[#D4AF37] opacity-80 transition group-hover:opacity-100">View clients →</span>
        </Link>

        <Link
          href="/admin"
          className="card group flex min-h-32 flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:border-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] sm:p-6"
        >
          <div>
            <p className="text-sm text-slate-400">Project requests</p>
            <p className="mt-2 text-3xl font-bold">{requestCount ?? 0}</p>
          </div>
          <span className="mt-4 text-xs font-semibold text-[#D4AF37] opacity-80 transition group-hover:opacity-100">View all requests →</span>
        </Link>

        <Link
          href="/admin?status=New%20Inquiry"
          className="group flex min-h-32 flex-col justify-between rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:border-amber-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 sm:p-6"
        >
          <div>
            <p className="text-sm text-amber-300">New inquiries</p>
            <p className="mt-2 text-3xl font-bold text-amber-200">{newCount ?? 0}</p>
          </div>
          <span className="mt-4 text-xs font-semibold text-amber-200 opacity-80 transition group-hover:opacity-100">View new inquiries →</span>
        </Link>

        <Link
          href="/admin?status=Completed"
          className="card group flex min-h-32 flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:border-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] sm:p-6"
        >
          <div>
            <p className="text-sm text-slate-400">Completed</p>
            <p className="mt-2 text-3xl font-bold">{completedCount ?? 0}</p>
          </div>
          <span className="mt-4 text-xs font-semibold text-[#D4AF37] opacity-80 transition group-hover:opacity-100">View completed →</span>
        </Link>
      </section>

      <section className="mt-8">
        <div className="mb-4"><p className="text-sm font-semibold text-[#7C3AED]">Pipeline</p><h2 className="mt-1 text-2xl font-bold">Project requests</h2></div>
        <form className="grid gap-3 portal-panel p-4 sm:grid-cols-[1fr_220px_auto]">
          <input name="q" defaultValue={searchParams.q} className="field" placeholder="Search client, business, or email" />
          <select name="status" defaultValue={searchParams.status ?? ''} className="field"><option value="">All statuses</option>{PROJECT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
          <button className="button primary">Filter</button>
        </form>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between"><p className="text-sm text-slate-500">{submissions?.length ?? 0} matching requests</p></div>
        {submissions?.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10"><div className="divide-y divide-slate-800">
            {submissions.map((submission) => (
              <Link key={submission.id} href={`/admin/submissions/${submission.id}`} className="block p-5 transition hover:bg-slate-800/60 sm:p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div><p className="font-semibold">{submission.business_name || 'Website & Digital Solution Discovery'}</p><p className="mt-1 text-sm text-slate-500">{submission.contact_name || 'No contact'} · {submission.contact_email || 'No email'}</p></div>
                  <div className="flex items-center gap-3"><span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">{submission.project_status}</span><span className="text-xs text-slate-500">{new Date(submission.submitted_at ?? submission.created_at).toLocaleDateString()}</span></div>
                </div>
              </Link>
            ))}
          </div></div>
        ) : <div className="card text-center text-sm text-slate-300">No submissions match your filters.</div>}
      </section>

      <p className="mt-6 text-xs leading-5 text-slate-400">Visitor traffic is tracked separately through Vercel Web Analytics. The counters above reflect authenticated portal activity and project requests stored in Supabase.</p>
    </main>
  );
}
