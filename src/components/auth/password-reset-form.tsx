'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function PasswordResetForm({ recovery = false }: { recovery?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const supabase = createClient();
    const result = recovery
      ? await supabase.auth.updateUser({ password })
      : await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
    if (result.error) setError(result.error.message);
    else {
      setMessage(recovery ? 'Your password has been updated. You can now sign in.' : 'Check your email for a secure password reset link.');
      if (recovery) window.setTimeout(() => window.location.assign('/login'), 1200);
    }
    setLoading(false);
  }

  return <form onSubmit={submit} className="card w-full max-w-md space-y-5">
    <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">K-Tech Technologies</p><h1 className="mt-3 text-3xl font-bold">{recovery ? 'Set a new password' : 'Reset your password'}</h1><p className="mt-2 text-sm text-slate-300">{recovery ? 'Choose a strong password for your client account.' : 'We will email you a secure link to continue.'}</p></div>
    {recovery ? <label className="block text-sm font-semibold">New password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field mt-2" autoComplete="new-password" /></label> : <label className="block text-sm font-semibold">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field mt-2" autoComplete="email" /></label>}
    {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
    <button className="button primary w-full" disabled={loading}>{loading ? 'Please wait...' : recovery ? 'Update password' : 'Send reset link'}</button>
    {!recovery && <a href="/login" className="block text-center text-sm font-semibold text-[#7C3AED] hover:text-[#5B21B6] hover:underline">Back to sign in</a>}
  </form>;
}
