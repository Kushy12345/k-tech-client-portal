import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PROJECT_STATUSES } from '@/lib/constants';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });

  let payload: { projectStatus?: string; note?: string };
  try {
    payload = await request.json() as { projectStatus?: string; note?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!payload.projectStatus || !PROJECT_STATUSES.includes(payload.projectStatus as typeof PROJECT_STATUSES[number])) {
    return NextResponse.json({ error: 'Invalid project status.' }, { status: 400 });
  }

  const note = payload.note?.trim() || null;
  if (note && note.length > 2000) {
    return NextResponse.json({ error: 'Internal note must be 2,000 characters or less.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('admin_update_project', {
    p_submission_id: params.id,
    p_project_status: payload.projectStatus,
    p_note: note,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
