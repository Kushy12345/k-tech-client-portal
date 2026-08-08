import Link from 'next/link';
import { SignOutButton } from '@/components/dashboard/sign-out-button';
import { requireRole } from '@/lib/supabase/authorization';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRole('admin');
  return <div className="min-h-screen">
    <header className="border-b bg-[#111111] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/admin" className="font-bold tracking-tight">K-Tech <span className="text-[#D4AF37]">Operations</span></Link>
        <nav className="flex items-center gap-5"><Link href="/admin" className="text-sm font-semibold hover:text-[#D4AF37]">Overview</Link><Link href="/admin/clients" className="text-sm font-semibold hover:text-[#D4AF37]">Clients</Link><SignOutButton /></nav>
      </div>
    </header>
    {children}
  </div>;
}
