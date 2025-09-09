import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { listInvitesByUsername } from '@/lib/db/teamExtras';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: true, data: [] });
    const { data: profile } = await supabase.from('users').select('username').eq('id', user.id).maybeSingle();
    const username = (profile as any)?.username as string | undefined;
    if (!username) return NextResponse.json({ success: true, data: [] });
    const rows = await listInvitesByUsername(username);
    return NextResponse.json({ success: true, data: rows });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


