import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: { id: string; fileId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';
  const submissionQuery = supabase.from('form_submissions').select('id').eq('id', params.id);
  const { data: submission } = isAdmin
    ? await submissionQuery.maybeSingle()
    : await submissionQuery.eq('user_id', user.id).maybeSingle();
  if (!submission) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

  const { data: file } = await supabase.from('submission_files').select('storage_path, filename').eq('id', params.fileId).eq('submission_id', submission.id).maybeSingle();
  if (!file) return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  const { data: signed, error } = await supabase.storage.from('submission-assets').createSignedUrl(file.storage_path, 300);
  if (error || !signed?.signedUrl) return NextResponse.json({ error: 'Unable to access file.' }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
