'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ProfileForm({ email, initialName }: { email: string; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setMessage(error ? error.message : 'Profile updated.');
    setSaving(false);
  }

  return <form onSubmit={save} className="card space-y-5">
    <div><h2 className="text-xl font-bold">Your profile</h2><p className="mt-1 text-sm text-slate-600">Keep your contact details current for project communication.</p></div>
    <label className="block text-sm font-semibold">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className="field mt-2" /></label>
    <label className="block text-sm font-semibold">Email address<input value={email} disabled className="field mt-2 bg-slate-50 text-slate-500" /></label>
    {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
    <button className="button primary" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
  </form>;
}
