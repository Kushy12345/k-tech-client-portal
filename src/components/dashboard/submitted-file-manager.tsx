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

function FileAction({
  label,
  submissionId,
  questionId,
  replaceFileId,
  busy,
  onUpload,
}: {
  label: string;
  submissionId: string;
  questionId: string;
  replaceFileId?: string;
  busy: boolean;
  onUpload: (questionId: string, file: File, replaceFileId?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(questionId, file, replaceFileId);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        className="button secondary shrink-0"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Uploading...' : label}
      </button>
    </>
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
  const [busyFileId, setBusyFileId] = useState<string>();
  const [busyQuestionId, setBusyQuestionId] = useState<string>();
  const [message, setMessage] = useState<string>();

  async function upload(questionId: string, file: File, replaceFileId?: string) {
    setMessage(undefined);

    if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
      setMessage('Use a JPG, PNG, WEBP, PDF, DOC, or DOCX file under 10 MB.');
      return;
    }

    if (replaceFileId) setBusyFileId(replaceFileId);
    else setBusyQuestionId(questionId);

    try {
      const body = new FormData();
      body.set('questionId', questionId);
      body.set('file', file);
      if (replaceFileId) body.set('replaceFileId', replaceFileId);

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
      setBusyFileId(undefined);
      setBusyQuestionId(undefined);
    }
  }

  return (
    <section className="mt-8 border-t border-slate-800 pt-6">
      <div>
        <h3 className="font-semibold">Supporting files</h3>
        <p className="mt-1 text-sm text-slate-400">
          Keep your existing files, add more when needed, or replace one specific file.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {questions.map((question) => {
          const currentFiles = files.filter((file) => file.question_id === question.id);

          return (
            <div key={question.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{question.label}</p>
                  {!currentFiles.length && (
                    <p className="mt-1 text-sm text-slate-500">No file uploaded yet.</p>
                  )}

                  {currentFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {currentFiles.map((file) => (
                        <div key={file.id} className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <a
                            href={`/api/submissions/${submissionId}/files/${file.id}`}
                            className="min-w-0 truncate text-sm text-purple-300 hover:text-white hover:underline"
                          >
                            {file.filename}
                          </a>
                          <FileAction
                            label="Replace"
                            submissionId={submissionId}
                            questionId={question.id}
                            replaceFileId={file.id}
                            busy={busyFileId === file.id}
                            onUpload={upload}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <FileAction
                  label={currentFiles.length ? 'Add another' : 'Add file'}
                  submissionId={submissionId}
                  questionId={question.id}
                  busy={busyQuestionId === question.id}
                  onUpload={upload}
                />
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
          {message}
        </p>
      )}
    </section>
  );
}
