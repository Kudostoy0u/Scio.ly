import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { declineInvite } from '@/lib/db/teamExtras';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { inviteId } = await req.json();
    if (!inviteId) return NextResponse.json({ success: false, error: 'Missing inviteId' }, { status: 400 });
    await declineInvite(Number(inviteId));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


