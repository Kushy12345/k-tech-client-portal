import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: submission } = await supabase
    .from('form_submissions')
    .select('id, is_draft, project_status, template_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!submission) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (submission.is_draft) return NextResponse.json({ ok: true, alreadyDraft: true });
  if (submission.project_status === 'Completed') {
    return NextResponse.json({ error: 'Completed requests cannot be reopened. Please contact K-Tech Technologies if something needs to be corrected.' }, { status: 409 });
  }

  const { error } = await supabase.rpc('client_reopen_submission', {
    p_submission_id: submission.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, templateId: submission.template_id });
}
