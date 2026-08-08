import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PROJECT_STATUSES } from '@/lib/constants';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  const payload = await request.json() as { projectStatus?: string; note?: string };
  if (!payload.projectStatus || !PROJECT_STATUSES.includes(payload.projectStatus as typeof PROJECT_STATUSES[number])) return NextResponse.json({ error: 'Invalid project status.' }, { status: 400 });
  const { error: updateError } = await supabase.from('form_submissions').update({ project_status: payload.projectStatus, last_status_changed_at: new Date().toISOString() }).eq('id', params.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (payload.note?.trim()) {
    const { error: noteError } = await supabase.from('project_notes').insert({ submission_id: params.id, author_id: user.id, content: payload.note.trim() });
    if (noteError) return NextResponse.json({ error: noteError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
