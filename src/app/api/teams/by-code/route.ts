import { NextRequest, NextResponse } from 'next/server';
import { loadTeamDataByCode } from '@/lib/db/teams';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });
    const res = await loadTeamDataByCode(code);
    if (!res) return NextResponse.json({ success: true, data: null });
    return NextResponse.json({ success: true, data: res.teamData });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


