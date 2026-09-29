'use client';

import { useState } from 'react';

export function EditSubmissionButton({ submissionId, slug }: { submissionId: string; slug?: string | null }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function reopen() {
    setSaving(true);
    setError(undefined);

    try {
      const response = await fetch(`/api/submissions/${submissionId}/reopen`, { method: 'POST' });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        setError(result.error ?? 'Unable to reopen this request.');
        return;
      }

      window.location.assign(`/intake/${slug ?? 'general-digital-discovery'}?draft=${submissionId}`);
    } catch {
      setError('Something went wrong while reopening this request. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button type="button" className="button primary inline-flex" disabled={saving} onClick={reopen}>
        {saving ? 'Opening editor...' : 'Edit request'}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
