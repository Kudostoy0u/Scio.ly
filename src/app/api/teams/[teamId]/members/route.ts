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
import { queryCockroachDB } from '@/lib/cockroachdb';

// GET /api/teams/[teamId]/members - Get team members with clean new system
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchMembers)
// - src/app/teams/components/assignment/assignmentUtils.ts (getTeamMembersAndRoster)
// - src/app/hooks/useEnhancedTeamData.ts (fetchMembers)
// - src/app/hooks/useTeamData.ts (fetchMembers)
// - src/app/teams/components/PeopleTab.tsx (loadMembers)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const startTime = Date.now();
  let teamId: string | undefined;
  let user: any;
  
  console.log('🔍 [MEMBERS API] GET request started', { 
    timestamp: new Date().toISOString(),
    url: request.url 
  });

  try {
    user = await getServerUser();
    if (!user?.id) {
      console.log('❌ [MEMBERS API] Unauthorized - no user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId: paramTeamId } = await params;
    teamId = paramTeamId;
    const { searchParams } = new URL(request.url);
    const subteamId = searchParams.get('subteamId');

    console.log('📋 [MEMBERS API] Request params', { 
      teamId, 
      subteamId, 
      userId: user.id 
    });

    // Resolve team slug to group ID using Drizzle ORM
    console.log('🔍 [MEMBERS API] Resolving team slug to group ID');
    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId));

    if (groupResult.length === 0) {
      console.log('❌ [MEMBERS API] Team group not found', { teamId });
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult[0].id;
    console.log('✅ [MEMBERS API] Team group resolved', { teamId, groupId });

    // Check if user has access to this team group using new clean auth system
    console.log('🔐 [MEMBERS API] Checking team access');
    const teamAccess = await getTeamAccessCockroach(user.id, groupId);
    console.log('🔐 [MEMBERS API] Team access result', { 
      userId: user.id, 
      groupId, 
      teamAccess: {
        hasAccess: teamAccess.hasAccess,
        isCreator: teamAccess.isCreator,
        hasSubteamMembership: teamAccess.hasSubteamMembership,
        hasRosterEntries: teamAccess.hasRosterEntries,
        subteamRole: teamAccess.subteamRole,
        subteamMemberships: teamAccess.subteamMemberships.length,
        rosterSubteams: teamAccess.rosterSubteams.length
      }
    });
    
    if (!teamAccess.hasAccess) {
      console.log('❌ [MEMBERS API] Access denied', { userId: user.id, groupId });
      return NextResponse.json({ error: 'Not authorized to access this team' }, { status: 403 });
    }

    // Get all team members for this group using the new clean system
    console.log('👥 [MEMBERS API] Building members list');
    const allMembers = new Map<string, any>();

    // 1. Add team creator if they're not already a member
    if (teamAccess.isCreator) {
      console.log('👑 [MEMBERS API] Adding team creator to members list');
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
      console.log('👑 [MEMBERS API] Team creator added', { 
        userId: user.id, 
        name: creatorInfo.name 
      });
    }

    // 2. Add all subteam members using Drizzle ORM
    console.log('🔍 [MEMBERS API] Fetching subteam memberships');
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
      console.log('🔍 [MEMBERS API] Filtering by subteam', { subteamId });
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
    console.log('✅ [MEMBERS API] Fetched subteam memberships', { 
      count: members.length,
      members: members.map(m => ({ userId: m.userId, role: m.role, teamId: m.teamId }))
    });

    // Get user profiles for all members using Drizzle ORM
    const userIds = [...new Set(members.map(m => m.userId))];
    console.log('👤 [MEMBERS API] Fetching user profiles', { userIds });
    
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

    console.log('✅ [MEMBERS API] Fetched user profiles', { 
      count: userProfiles.length,
      profiles: userProfiles.map(p => ({ id: p.id, name: p.displayName || p.firstName }))
    });

    const userProfileMap = new Map(userProfiles.map(profile => [profile.id, profile]));

    // Add subteam members to the map
    members.forEach(member => {
      const userProfile = userProfileMap.get(member.userId);
      const name = userProfile?.displayName || 
        (userProfile?.firstName && userProfile?.lastName 
          ? `${userProfile.firstName} ${userProfile.lastName}` 
          : `User ${member.userId.substring(0, 8)}`);
      const email = userProfile?.email || `user-${member.userId.substring(0, 8)}@example.com`;

      // If user is already in map (as creator), add subteam info and update role
      if (allMembers.has(member.userId)) {
        const existingMember = allMembers.get(member.userId);
        
        // Update the main role to reflect their subteam role (captain/co_captain takes precedence over creator)
        if (['captain', 'co_captain'].includes(member.role)) {
          existingMember.role = member.role;
        }
        
        if (!existingMember.subteams) {
          existingMember.subteams = [];
        }
        existingMember.subteams.push({
          id: member.teamUnitId,
          name: member.description || `Team ${member.teamId}`,
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
            name: member.description || `Team ${member.teamId}`,
            description: member.description
          },
          joinedAt: member.joinedAt,
          events: [],
          isCreator: false
        });
      }
    });

    // 3. Fetch linked roster data to update member subteam and events info
    console.log('🔍 [MEMBERS API] Fetching linked roster data');
    let linkedRosterQuery = `
      SELECT DISTINCT r.user_id, r.team_unit_id, tu.team_id as subteam_name, tu.description as subteam_description,
             ARRAY_AGG(r.event_name) as events
      FROM new_team_roster_data r
      JOIN new_team_units tu ON r.team_unit_id = tu.id
      WHERE tu.group_id = $1 AND r.user_id IS NOT NULL
      GROUP BY r.user_id, r.team_unit_id, tu.team_id, tu.description
    `;
    const linkedRosterParams = [groupId];

    // Add subteam filter if specified
    if (subteamId) {
      linkedRosterQuery += ` AND r.team_unit_id = $2`;
      linkedRosterParams.push(subteamId);
    }

    const linkedRosterResult = await queryCockroachDB<{
      user_id: string;
      team_unit_id: string;
      subteam_name: string;
      subteam_description: string;
      events: string[];
    }>(linkedRosterQuery, linkedRosterParams);

    console.log('✅ [MEMBERS API] Fetched linked roster data', { 
      count: linkedRosterResult.rows.length,
      members: linkedRosterResult.rows.map(r => ({ userId: r.user_id, subteam: r.subteam_name, events: r.events.length }))
    });

    // Update existing members with roster data
    linkedRosterResult.rows.forEach(rosterData => {
      const existingMember = allMembers.get(rosterData.user_id);
      if (existingMember) {
        // Initialize subteams array if it doesn't exist
        if (!existingMember.subteams) {
          existingMember.subteams = [];
        }
        
        // Add this subteam to the subteams array
        const subteamInfo = {
          id: rosterData.team_unit_id,
          name: rosterData.subteam_description || `Team ${rosterData.subteam_name}`,
          description: rosterData.subteam_description,
          events: rosterData.events
        };
        
        // Check if this subteam is already in the array
        const existingSubteamIndex = existingMember.subteams.findIndex(s => s.id === rosterData.team_unit_id);
        if (existingSubteamIndex >= 0) {
          // Update existing subteam with events
          existingMember.subteams[existingSubteamIndex].events = rosterData.events;
        } else {
          // Add new subteam
          existingMember.subteams.push(subteamInfo);
        }
        
        // For backward compatibility, set the primary subteam (first one or most recent)
        if (!existingMember.subteam || existingMember.subteams.length === 1) {
          existingMember.subteam = {
            id: subteamInfo.id,
            name: subteamInfo.name,
            description: subteamInfo.description
          };
        }
        
        // Combine all events from all subteams
        const allEvents = existingMember.subteams.flatMap(s => s.events || []);
        existingMember.events = [...new Set(allEvents)]; // Remove duplicates
        
        console.log('🔄 [MEMBERS API] Updated member with roster data', { 
          userId: rosterData.user_id, 
          name: existingMember.name,
          subteam: subteamInfo.name,
          events: rosterData.events.length,
          totalSubteams: existingMember.subteams.length,
          totalEvents: existingMember.events.length
        });
      }
    });

    // 4. Add unlinked roster members (people in roster but without linked accounts)
    console.log('🔍 [MEMBERS API] Fetching unlinked roster members');
    let unlinkedRosterQuery = `
      SELECT DISTINCT r.student_name, r.team_unit_id, tu.team_id as subteam_name, tu.description as subteam_description
      FROM new_team_roster_data r
      JOIN new_team_units tu ON r.team_unit_id = tu.id
      WHERE tu.group_id = $1 AND r.student_name IS NOT NULL AND r.student_name != '' AND r.user_id IS NULL
    `;
    const unlinkedRosterParams = [groupId];

    // Add subteam filter if specified
    if (subteamId) {
      unlinkedRosterQuery += ` AND r.team_unit_id = $2`;
      unlinkedRosterParams.push(subteamId);
    }

    const unlinkedRosterResult = await queryCockroachDB<{
      student_name: string;
      team_unit_id: string;
      subteam_name: string;
      subteam_description: string;
    }>(unlinkedRosterQuery, unlinkedRosterParams);

    console.log('✅ [MEMBERS API] Fetched unlinked roster members', { 
      count: unlinkedRosterResult.rows.length,
      members: unlinkedRosterResult.rows.map(r => ({ name: r.student_name, subteam: r.subteam_name }))
    });

    // Add unlinked roster members to the map
    unlinkedRosterResult.rows.forEach(rosterMember => {
      const memberKey = `roster-${rosterMember.student_name}-${rosterMember.team_unit_id}`;
      
      // Check if this person is already in the members list (shouldn't happen for unlinked, but just in case)
      const existingMember = Array.from(allMembers.values()).find(member => 
        member.name === rosterMember.student_name && 
        member.subteam?.id === rosterMember.team_unit_id
      );
      
      if (!existingMember) {
        allMembers.set(memberKey, {
          id: null, // No user ID for unlinked members
          name: rosterMember.student_name,
          email: null, // No email for unlinked members
          username: 'unknown', // Special username for unlinked members
          role: 'unlinked', // Special role for unlinked members
          subteam: {
            id: rosterMember.team_unit_id,
            name: rosterMember.subteam_description || `Team ${rosterMember.subteam_name}`,
            description: rosterMember.subteam_description
          },
          joinedAt: null,
          events: [], // Events will be populated separately if needed
          isCreator: false,
          isUnlinked: true // Flag to identify unlinked members
        });
      }
    });

    // 5. Update members without roster data to show "Unknown team"
    console.log('🔍 [MEMBERS API] Checking for members without roster data');
    const membersWithRosterData = new Set(linkedRosterResult.rows.map(r => r.user_id));
    
    allMembers.forEach((member, _memberId) => {
      // Skip unlinked roster members
      if (member.isUnlinked) {
        return;
      }
      
      // If member has no roster data, set their subteam to "Unknown team"
      // This applies to both regular members and creators who are also members
      if (!membersWithRosterData.has(member.id)) {
        console.log('🔄 [MEMBERS API] Member has no roster data, setting to Unknown team', { 
          userId: member.id, 
          name: member.name,
          isCreator: member.isCreator,
          currentSubteam: member.subteam?.name 
        });
        
        member.subteam = {
          id: null,
          name: 'Unknown team',
          description: 'Not assigned to any roster'
        };
        
        // Clear subteams array and events since they're not on roster
        member.subteams = [];
        member.events = [];
      }
    });

    // Convert map to array
    const formattedMembers = Array.from(allMembers.values());
    const duration = Date.now() - startTime;

    console.log('✅ [MEMBERS API] Request completed successfully', {
      duration: `${duration}ms`,
      memberCount: formattedMembers.length,
      linkedMembers: formattedMembers.filter(m => m.id).length,
      unlinkedMembers: formattedMembers.filter(m => !m.id).length,
      teamId: teamId,
      subteamId: subteamId,
      userId: user.id
    });

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [MEMBERS API] Error fetching team members:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      teamId: teamId,
      userId: user?.id
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
