import { NextRequest, NextResponse } from 'next/server';
import { cockroachDBTeamsService } from '@/lib/services/cockroachdb-teams';

export async function POST(request: NextRequest) {
  try {
    // Check if CockroachDB is properly configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is missing'
      }, { status: 500 });
    }

    // Get user from Supabase auth
    const { getServerUser } = await import('@/lib/supabaseServer');
    const user = await getServerUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user.id;

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Team code is required' }, { status: 400 });
    }

    try {
      const team = await cockroachDBTeamsService.joinTeamByCode(userId, code);
      
      if (!team) {
        return NextResponse.json({ error: 'Invalid team code' }, { status: 400 });
      }

      return NextResponse.json({
        id: team.id,
        name: team.name,
        slug: team.slug,
        school: team.school,
        division: team.division,
        description: team.description,
        captain_code: team.captain_code,
        user_code: team.user_code,
        user_role: team.user_role,
        members: team.members
      });

    } catch (joinError: any) {
      return NextResponse.json({ error: joinError.message }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in join team API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
