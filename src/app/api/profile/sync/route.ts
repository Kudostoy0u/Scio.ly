import { NextRequest, NextResponse } from 'next/server';
import { upsertUserProfile } from '@/lib/db/teams/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, displayName, username } = body || {};

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing id or email' }, { status: 400 });
    }

    const name: string | undefined =
      (typeof displayName === 'string' && displayName.trim())
        ? displayName.trim()
        : (typeof username === 'string' && username.trim())
          ? `@${username.trim()}`
          : undefined;

    await upsertUserProfile({
      id,
      email,
      name,
      username: typeof username === 'string' ? username : undefined,
      displayName: typeof displayName === 'string' ? displayName : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to sync profile' }, { status: 500 });
  }
}


