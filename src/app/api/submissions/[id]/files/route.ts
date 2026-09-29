import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const allowedFiles = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  const questionId = formData.get('questionId');

  if (!(file instanceof File) || typeof questionId !== 'string') {
    return NextResponse.json({ error: 'File and question are required.' }, { status: 400 });
  }

  if (!allowedFiles.has(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Use a JPG, PNG, WEBP, PDF, DOC, or DOCX file under 10 MB.' }, { status: 400 });
  }

  const { data: submission } = await supabase
    .from('form_submissions')
    .select('id, user_id, template_id, is_draft')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!submission || submission.is_draft) {
    return NextResponse.json({ error: 'Submitted request not found.' }, { status: 404 });
  }

  const { data: question } = await supabase
    .from('form_questions')
    .select('id, template_id, question_type')
    .eq('id', questionId)
    .eq('template_id', submission.template_id)
    .eq('question_type', 'file')
    .maybeSingle();

  if (!question) {
    return NextResponse.json({ error: 'Invalid file field.' }, { status: 400 });
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `${user.id}/${submission.id}/${question.id}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('submission-assets')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: 'Unable to upload the file.' }, { status: 500 });
  }

  const { data: fileRow, error: fileError } = await supabase
    .from('submission_files')
    .insert({
      submission_id: submission.id,
      question_id: question.id,
      storage_path: path,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select('id')
    .single();

  if (fileError || !fileRow) {
    await supabase.storage.from('submission-assets').remove([path]);
    return NextResponse.json({ error: 'Unable to save the file record.' }, { status: 500 });
  }

  const { data: previousFiles } = await supabase
    .from('submission_files')
    .select('id, storage_path')
    .eq('submission_id', submission.id)
    .eq('question_id', question.id)
    .neq('id', fileRow.id);

  if (previousFiles?.length) {
    const oldPaths = previousFiles.map((item) => item.storage_path);
    await supabase.storage.from('submission-assets').remove(oldPaths);
    await supabase.from('submission_files').delete().in('id', previousFiles.map((item) => item.id));
  }

  return NextResponse.json({ ok: true, fileId: fileRow.id });
}
