import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { dbPg } from '@/lib/db';
import { 
  newTeamMemberships, 
  newTeamUnits, 
  newTeamGroups,
  users 
} from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getTeamAccessCockroach, getUserDisplayInfo } from '@/lib/utils/team-auth-v2';

// GET /api/teams/[teamId]/members - Get team members with clean new system
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const subteamId = searchParams.get('subteamId');

    // Resolve team slug to group ID
    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId));

    if (groupResult.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult[0].id;

    // Check if user has access to this team group using new clean auth system
    const teamAccess = await getTeamAccessCockroach(user.id, groupId);
    console.log('Members API team access:', { userId: user.id, groupId, teamAccess });
    
    if (!teamAccess.hasAccess) {
      return NextResponse.json({ error: 'Not authorized to access this team' }, { status: 403 });
    }

    // Get all team members for this group using the new clean system
    const allMembers = new Map<string, any>();

    // 1. Add team creator if they're not already a member
    if (teamAccess.isCreator) {
      const creatorInfo = await getUserDisplayInfo(user.id);
      allMembers.set(user.id, {
        id: user.id,
        name: creatorInfo.name,
        email: creatorInfo.email,
        username: creatorInfo.username,
        role: 'creator',
        subteam: null, // Creator is not tied to a specific subteam
        joinedAt: null,
        events: [],
        isCreator: true
      });
    }

    // 2. Add all subteam members
    let membersQuery = dbPg
      .select({
        userId: newTeamMemberships.userId,
        role: newTeamMemberships.role,
        joinedAt: newTeamMemberships.joinedAt,
        teamUnitId: newTeamUnits.id,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description
      })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, 'active'),
          eq(newTeamUnits.status, 'active')
        )
      );

    // Add subteam filter if specified
    if (subteamId) {
      membersQuery = dbPg
        .select({
          userId: newTeamMemberships.userId,
          role: newTeamMemberships.role,
          joinedAt: newTeamMemberships.joinedAt,
          teamUnitId: newTeamUnits.id,
          teamId: newTeamUnits.teamId,
          description: newTeamUnits.description
        })
        .from(newTeamMemberships)
        .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
        .where(
          and(
            eq(newTeamUnits.groupId, groupId),
            eq(newTeamMemberships.status, 'active'),
            eq(newTeamUnits.status, 'active'),
            eq(newTeamUnits.id, subteamId)
          )
        );
    }

    const members = await membersQuery;

    // Get user profiles for all members
    const userIds = [...new Set(members.map(m => m.userId))];
    const userProfiles = await dbPg
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username
      })
      .from(users)
      .where(inArray(users.id, userIds));

    const userProfileMap = new Map(userProfiles.map(profile => [profile.id, profile]));

    // Add subteam members to the map
    members.forEach(member => {
      const userProfile = userProfileMap.get(member.userId);
      const name = userProfile?.displayName || 
        (userProfile?.firstName && userProfile?.lastName 
          ? `${userProfile.firstName} ${userProfile.lastName}` 
          : `User ${member.userId.substring(0, 8)}`);
      const email = userProfile?.email || `user-${member.userId.substring(0, 8)}@example.com`;

      // If user is already in map (as creator), add subteam info
      if (allMembers.has(member.userId)) {
        const existingMember = allMembers.get(member.userId);
        if (!existingMember.subteams) {
          existingMember.subteams = [];
        }
        existingMember.subteams.push({
          id: member.teamUnitId,
          name: member.teamId,
          description: member.description,
          role: member.role
        });
      } else {
        // Add as new member
        allMembers.set(member.userId, {
          id: member.userId,
          name,
          email,
          username: userProfile?.username,
          role: member.role,
          subteam: {
            id: member.teamUnitId,
            name: member.teamId,
            description: member.description
          },
          joinedAt: member.joinedAt,
          events: [],
          isCreator: false
        });
      }
    });

    // Convert map to array
    const formattedMembers = Array.from(allMembers.values());

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
