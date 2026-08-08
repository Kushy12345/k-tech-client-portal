import { requireRole } from '@/lib/supabase/authorization';

export default async function AdminClientsPage() {
  const { supabase } = await requireRole('admin');
  const { data: clients } = await supabase.from('profiles').select('id, email, full_name, role, created_at').eq('role', 'client').order('created_at', { ascending: false });
  return <main className="mx-auto max-w-7xl px-6 py-10"><p className="text-sm font-semibold text-[#D4AF37]">Internal workspace</p><h1 className="mt-2 text-3xl font-bold">Registered clients</h1><p className="mt-2 text-slate-600">Review the client accounts connected to this portal.</p><div className="mt-8 overflow-hidden rounded-2xl border bg-white"><div className="divide-y">{clients?.length ? clients.map((client) => <div key={client.id} className="flex flex-col justify-between gap-2 p-5 sm:flex-row sm:items-center"><div><p className="font-semibold">{client.full_name || 'Unnamed client'}</p><p className="mt-1 text-sm text-slate-500">{client.email}</p><p className="mt-1 text-xs text-slate-400">{client.id}</p></div><div className="text-sm text-slate-500">Joined {new Date(client.created_at).toLocaleDateString()}</div></div>) : <p className="p-6 text-sm text-slate-600">No registered clients found.</p>}</div></div></main>;
}
