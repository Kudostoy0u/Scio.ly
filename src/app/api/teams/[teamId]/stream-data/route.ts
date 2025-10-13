import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { 
  resolveTeamSlugToUnits, 
  getUserTeamMemberships, 
  validateUUID,
  getStreamPosts,
  getTournaments,
  getActiveTimers
} from '@/lib/utils/team-api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is missing'
      }, { status: 500 });
    }

    const { teamId } = await params;
    const user = await getServerUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subteamId = request.nextUrl.searchParams.get('subteamId');
    
    if (!subteamId) {
      return NextResponse.json({ error: 'Subteam ID is required' }, { status: 400 });
    }

    // Validate UUID format
    if (!validateUUID(subteamId)) {
      return NextResponse.json({ 
        error: 'Invalid subteam ID format. Must be a valid UUID.' 
      }, { status: 400 });
    }

    // Resolve team slug to get team info
    const teamInfo = await resolveTeamSlugToUnits(teamId);
    if (!teamInfo) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if the user is a member of the team
    const userMemberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);
    const userMembership = userMemberships.find(membership => membership.team_id === subteamId);

    if (!userMembership) {
      return NextResponse.json({ error: 'Not authorized to view this team' }, { status: 403 });
    }

    const isCaptain = userMembership.role === 'captain';

    // Fetch all stream-related data in parallel using the same functions as individual routes
    const [streamPosts, tournaments, timers] = await Promise.all([
      getStreamPosts(subteamId),
      getTournaments(subteamId),
      getActiveTimers(subteamId)
    ]);

    // Return combined data
    return NextResponse.json({
      success: true,
      data: {
        stream: {
          posts: streamPosts
        },
        tournaments: tournaments,
        timers: timers,
        team: {
          id: teamInfo.groupId,
          slug: teamId,
          // Note: We don't have school/division info in the current query
          // This would need to be added if needed
        },
        subteam: {
          id: subteamId,
          team_id: subteamId
        },
        user: {
          role: userMembership.role,
          is_captain: isCaptain
        }
      }
    });

  } catch (error) {
    console.error('Error fetching stream data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
