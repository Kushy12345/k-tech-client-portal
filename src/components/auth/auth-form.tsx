'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface AuthFormProps {
  mode: 'login' | 'register';
  initialError?: string;
  redirectPath?: string;
}

function getSafeRedirectPath(path: string | undefined) {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return undefined;

  try {
    const url = new URL(path, window.location.origin);
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}`
      : undefined;
  } catch {
    return undefined;
  }
}

export function AuthForm({ mode, initialError, redirectPath }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string>(initialError ?? '');
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const supabase = createClient();
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: name },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

      if (result.error) {
        setError(result.error.message.includes('Invalid login credentials')
          ? 'The email or password is incorrect.'
          : result.error.message);
        return;
      }

      if (mode === 'register' && !result.data.session) {
        setMessage('Check your email to confirm your account, then return here to sign in.');
        return;
      }

      if (mode === 'register') {
        window.location.assign('/dashboard');
        return;
      }

      const safeRedirectPath = getSafeRedirectPath(redirectPath);
      if (safeRedirectPath) {
        window.location.assign(safeRedirectPath);
        return;
      }

      if (!result.data.user) {
        setError('We could not complete your sign-in. Please try again.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', result.data.user.id)
        .maybeSingle();

      if (profileError) {
        setError('We could not verify your account permissions. Please try again.');
        return;
      }

      window.location.assign(profile?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      setError(message === 'Failed to fetch'
        ? 'We could not reach the sign-in service. The portal may need its Supabase connection configured correctly.'
        : 'Something went wrong while signing you in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">K-Tech Technologies</p>
        <h1 className="mt-3 text-3xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your client account'}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {mode === 'login' ? 'Continue managing your project discovery and requests.' : 'Save your progress and keep project conversations in one place.'}
        </p>
      </div>
      {mode === 'register' && <label className="block text-sm font-semibold">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className="field mt-2" autoComplete="name" /></label>}
      <label className="block text-sm font-semibold">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field mt-2" autoComplete="email" /></label>
      <label className="block text-sm font-semibold">Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field mt-2" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <button className="button primary w-full" disabled={loading}>{loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <p className="text-center text-sm text-slate-600">
        {mode === 'login' ? 'New to K-Tech? ' : 'Already have an account? '}
        <a href={mode === 'login' ? '/register' : '/login'} className="font-semibold text-[#7C3AED] hover:text-[#5B21B6] hover:underline">{mode === 'login' ? 'Create an account' : 'Sign in'}</a>
      </p>
      {mode === 'login' && <Link href="/forgot-password" className="block text-center text-sm font-semibold text-[#7C3AED] hover:text-[#5B21B6] hover:underline">Forgot your password?</Link>}
    </form>
  );
}
