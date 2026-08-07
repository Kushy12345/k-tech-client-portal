import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/dashboard/profile-form';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const initialName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  return <main className="mx-auto max-w-2xl px-6 py-10"><ProfileForm email={user.email ?? ''} initialName={initialName} /></main>;
}
