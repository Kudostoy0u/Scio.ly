import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await supabase.from('users').update({ team_code: null }).eq('id', user.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


