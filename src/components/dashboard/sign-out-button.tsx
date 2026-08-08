'use client';

import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Supabase sign-out error:', error);
    return;
  }

  window.location.assign('/login');
}

  return <button onClick={signOut} className="text-sm font-semibold text-slate-600 hover:text-slate-950">Sign out</button>;
}
