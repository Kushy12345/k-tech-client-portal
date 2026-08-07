'use client';

import { useState } from 'react';
import type { ProjectStatus } from '@/types/forms.types';

export const PROJECT_STATUSES: ProjectStatus[] = [
  'New Inquiry',
  'Reviewing Requirements',
  'Proposal Sent',
  'Approved',
  'In Progress',
  'Completed',
];

export function ProjectStatusForm({ id, initialStatus }: { id: string; initialStatus: ProjectStatus }) {
  const [status, setStatus] = useState<ProjectStatus>(initialStatus);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(undefined);
    const response = await fetch(`/api/admin/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectStatus: status, note }),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? 'Project updated.' : result.error ?? 'Unable to update project.');
    if (response.ok) setNote('');
    setSaving(false);
  }

  return <form onSubmit={save} className="card space-y-5">
    <div><h2 className="text-xl font-bold">Project management</h2><p className="mt-1 text-sm text-slate-600">Update lifecycle status and leave an internal note for the team.</p></div>
    <label className="block text-sm font-semibold">Project status<select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="field mt-2">{PROJECT_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="block text-sm font-semibold">Internal note<span className="ml-1 font-normal text-slate-500">(optional)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className="field mt-2" placeholder="Add context for the K-Tech team..." /></label>
    {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
    <button className="button primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
  </form>;
}
