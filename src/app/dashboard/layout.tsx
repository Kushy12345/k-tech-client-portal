import Link from 'next/link';
import { SignOutButton } from '@/components/dashboard/sign-out-button';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen">
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="font-bold tracking-tight">K-Tech <span className="text-blue-600">Client Portal</span></Link>
        <nav className="flex items-center gap-5"><Link href="/dashboard" className="text-sm font-semibold hover:text-blue-600">Dashboard</Link><Link href="/dashboard/profile" className="text-sm font-semibold hover:text-blue-600">Profile</Link><SignOutButton /></nav>
      </div>
    </header>
    {children}
  </div>;
}
