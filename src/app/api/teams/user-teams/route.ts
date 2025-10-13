import { NextRequest, NextResponse } from 'next/server';
import { cockroachDBTeamsService } from '@/lib/services/cockroachdb-teams';
import { getServerUser } from '@/lib/supabaseServer';

export async function GET(_request: NextRequest) {
  try {
    // Check if CockroachDB is properly configured
    if (!process.env.DATABASE_URL) {
      console.error('CockroachDB configuration missing:', {
        database_url: !!process.env.DATABASE_URL
      });
      return NextResponse.json({ 
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is missing'
      }, { status: 500 });
    }

    // Get user from Supabase auth
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's teams using CockroachDB
    const teams = await cockroachDBTeamsService.getUserTeams(user.id);

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error in user teams API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
