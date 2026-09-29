'use client';

import { useRef, useState } from 'react';

type SubmissionFile = {
  id: string;
  filename: string;
  question_id: string | null;
};

type FileQuestion = {
  id: string;
  label: string;
};

const accept = '.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx';
const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function FileItem({
  submissionId,
  question,
  current,
  busy,
  onUpload,
}: {
  submissionId: string;
  question: FileQuestion;
  current?: SubmissionFile;
  busy: boolean;
  onUpload: (questionId: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{question.label}</p>
          {current ? (
            <a
              href={`/api/submissions/${submissionId}/files/${current.id}`}
              className="mt-1 block truncate text-sm text-purple-300 hover:text-white hover:underline"
            >
              {current.filename}
            </a>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No file uploaded yet.</p>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(question.id, file);
            event.target.value = '';
          }}
        />

        <button
          type="button"
          className="button secondary shrink-0"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Uploading...' : current ? 'Replace file' : 'Add file'}
        </button>
      </div>
    </div>
  );
}

export function SubmittedFileManager({
  submissionId,
  questions,
  files,
}: {
  submissionId: string;
  questions: FileQuestion[];
  files: SubmissionFile[];
}) {
  const [busyQuestion, setBusyQuestion] = useState<string>();
  const [message, setMessage] = useState<string>();

  async function upload(questionId: string, file: File) {
    setMessage(undefined);

    if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
      setMessage('Use a JPG, PNG, WEBP, PDF, DOC, or DOCX file under 10 MB.');
      return;
    }

    setBusyQuestion(questionId);

    try {
      const body = new FormData();
      body.set('questionId', questionId);
      body.set('file', file);

      const response = await fetch(`/api/submissions/${submissionId}/files`, {
        method: 'POST',
        body,
      });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        setMessage(result.error ?? 'Unable to update the file.');
        return;
      }

      window.location.reload();
    } catch {
      setMessage('Something went wrong while updating the file. Please try again.');
    } finally {
      setBusyQuestion(undefined);
    }
  }

  return (
    <section className="mt-8 border-t border-slate-800 pt-6">
      <div>
        <h3 className="font-semibold">Supporting files</h3>
        <p className="mt-1 text-sm text-slate-400">
          Add a missing file or replace an existing one without changing your submitted requirements.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {questions.map((question) => (
          <FileItem
            key={question.id}
            submissionId={submissionId}
            question={question}
            current={files.find((file) => file.question_id === question.id)}
            busy={busyQuestion === question.id}
            onUpload={upload}
          />
        ))}
      </div>

      {message && (
        <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
          {message}
        </p>
      )}
    </section>
  );
}
