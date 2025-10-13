import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

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

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const subteamId = searchParams.get('subteamId');

    // First, resolve the slug to team group
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Check if user is a member of this team group
    const membershipResult = await queryCockroachDB<{ role: string }>(
      `SELECT tm.role FROM new_team_memberships tm
       JOIN new_team_units tu ON tm.team_id = tu.id
       WHERE tu.group_id = $1 AND tm.user_id = $2 AND tm.status = 'active'`,
      [groupId, user.id]
    );

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get team members from memberships table
    let membersQuery = `
      SELECT tm.user_id, tm.role, tm.joined_at, tu.id as team_unit_id, tu.team_id, tu.description
      FROM new_team_memberships tm
      JOIN new_team_units tu ON tm.team_id = tu.id
      WHERE tu.group_id = $1 AND tm.status = 'active'
    `;
    const membersParams = [groupId];

    if (subteamId) {
      membersQuery += ` AND tu.id = $2`;
      membersParams.push(subteamId);
    }

    const membersResult = await queryCockroachDB<{ user_id: string; role: string; joined_at: string; team_unit_id: string; team_id: string; description: string | null }>(
      membersQuery,
      membersParams
    );

    // Get roster data if it exists (for additional student names)
    let rosterQuery = `
      SELECT student_name, user_id, team_unit_id 
      FROM new_team_roster_data 
      WHERE team_unit_id IN (SELECT id FROM new_team_units WHERE group_id = $1)
    `;
    const rosterParams = [groupId];

    if (subteamId) {
      rosterQuery += ` AND team_unit_id = $2`;
      rosterParams.push(subteamId);
    }

    const rosterResult = await queryCockroachDB<{ student_name: string; user_id: string | null; team_unit_id: string }>(
      rosterQuery,
      rosterParams
    );

    // Get real user data from CockroachDB
    const userIds = membersResult.rows.map(member => member.user_id);
    
    // Fetch user profiles from CockroachDB
    const userProfilesResult = await queryCockroachDB<{
      id: string;
      display_name: string;
      email: string;
      first_name: string;
      last_name: string;
      username: string;
    }>(
      `SELECT id, display_name, email, first_name, last_name, username 
       FROM users 
       WHERE id = ANY($1)`,
      [userIds]
    );

    // Create a map of user profiles for quick lookup
    const userProfileMap = new Map<string, any>();
    userProfilesResult.rows.forEach((profile: any) => {
      userProfileMap.set(profile.id, profile);
    });

    // Build link status object
    const linkStatus: Record<string, any> = {};
    
    // First, add all team members from memberships
    for (const member of membersResult.rows) {
      // Get real user data
      const userProfile = userProfileMap.get(member.user_id);
      const displayName = userProfile?.display_name || 
        (userProfile?.first_name && userProfile?.last_name 
          ? `${userProfile.first_name} ${userProfile.last_name}` 
          : `User ${member.user_id.substring(0, 8)}`);
      const email = userProfile?.email || `user-${member.user_id.substring(0, 8)}@example.com`;
      const username = userProfile?.username;
      
      linkStatus[displayName] = {
        userId: member.user_id,
        isLinked: true,
        userEmail: email,
        username: username,
        role: member.role,
        teamUnitId: member.team_unit_id
      };
    }
    
    // Group roster entries by student name to handle multiple entries per student
    const rosterByStudent: Record<string, { userId: string | null; teamUnitId: string; isLinked: boolean }> = {};
    
    for (const rosterEntry of rosterResult.rows) {
      if (rosterEntry.student_name) {
        const studentName = rosterEntry.student_name;
        
        // If this student already exists, update the link status
        if (rosterByStudent[studentName]) {
          // Mark as linked if ANY entry for this student is linked
          rosterByStudent[studentName].isLinked = rosterByStudent[studentName].isLinked || !!rosterEntry.user_id;
          // Use the first non-null user_id we find
          if (!rosterByStudent[studentName].userId && rosterEntry.user_id) {
            rosterByStudent[studentName].userId = rosterEntry.user_id;
          }
        } else {
          // First entry for this student
          rosterByStudent[studentName] = {
            userId: rosterEntry.user_id,
            teamUnitId: rosterEntry.team_unit_id,
            isLinked: !!rosterEntry.user_id
          };
        }
      }
    }
    
    // Then, add roster entries to linkStatus
    for (const [studentName, rosterData] of Object.entries(rosterByStudent)) {
      // Get user data if this roster entry is linked
      let userEmail = null;
      let username = null;
      if (rosterData.userId) {
        const userProfile = userProfileMap.get(rosterData.userId);
        userEmail = userProfile?.email || `user-${rosterData.userId.substring(0, 8)}@example.com`;
        username = userProfile?.username;
      }
      
      linkStatus[studentName] = {
        userId: rosterData.userId,
        isLinked: rosterData.isLinked,
        userEmail: userEmail,
        username: username,
        teamUnitId: rosterData.teamUnitId
      };
    }

    return NextResponse.json({ linkStatus });
  } catch (error) {
    console.error('Error fetching roster link status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
