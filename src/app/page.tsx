import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20 lg:px-12">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">K-Tech Solutions</p>
          <nav aria-label="Account navigation" className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/login" className="text-slate-200 transition hover:text-white">Login</Link>
            <Link href="/register" className="rounded-lg border border-slate-600 px-4 py-2 text-white transition hover:border-slate-400">Create account</Link>
          </nav>
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Build a website that moves your business forward.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Share your goals, audience, content, and ideas with our team through a guided discovery experience.
        </p>
        <Link href="/register" className="mt-10 w-fit rounded-xl bg-blue-500 px-6 py-3 font-semibold transition hover:bg-blue-400">
          Start your discovery
        </Link>
      </section>
    </main>
  );
}
