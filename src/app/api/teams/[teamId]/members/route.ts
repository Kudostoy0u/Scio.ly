import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { dbPg } from '@/lib/db';
import { 
  newTeamMemberships, 
  newTeamUnits, 
  newTeamGroups,
  newTeamRosterData,
  users 
} from '@/lib/db/schema';
import { eq, and, inArray, isNotNull, isNull, ne } from 'drizzle-orm';
import { getTeamAccess, getUserDisplayInfo } from '@/lib/utils/team-auth-v2';
import { generateDisplayName } from '@/lib/utils/displayNameUtils';

// GET /api/teams/[teamId]/members - Get team members with clean Drizzle ORM implementation
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
    const subteamIdParam = searchParams.get('subteamId');

    // Validate subteamId format if provided
    let subteamId: string | null = null;
    if (subteamIdParam) {
      // Check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(subteamIdParam)) {
        subteamId = subteamIdParam;
      } else {
        console.log('❌ [MEMBERS API] Invalid subteamId format', { subteamId: subteamIdParam });
        return NextResponse.json({ error: 'Invalid subteam ID format' }, { status: 400 });
      }
    }

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

    // Check if user has access to this team group using clean auth system
    console.log('🔐 [MEMBERS API] Checking team access');
    const teamAccess = await getTeamAccess(user.id, groupId);
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

    // Get all team members for this group using Drizzle ORM
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
    
    // Build the where conditions
    const whereConditions = [
      eq(newTeamUnits.groupId, groupId),
      eq(newTeamMemberships.status, 'active'),
      eq(newTeamUnits.status, 'active')
    ];
    
    // Add subteam filter if specified
    if (subteamId) {
      console.log('🔍 [MEMBERS API] Filtering by subteam', { subteamId });
      whereConditions.push(eq(newTeamUnits.id, subteamId));
    }

    const members = await dbPg
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
      .where(and(...whereConditions));
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
      
      // Use centralized display name generation utility
      const { name } = generateDisplayName(userProfile || null, member.userId);
      
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

    // 3. Fetch linked roster data using Drizzle ORM
    console.log('🔍 [MEMBERS API] Fetching linked roster data');
    
    // Build the where conditions for linked roster
    const linkedRosterConditions = [
      eq(newTeamUnits.groupId, groupId),
      isNotNull(newTeamRosterData.userId)
    ];
    
    // Add subteam filter if specified
    if (subteamId) {
      linkedRosterConditions.push(eq(newTeamRosterData.teamUnitId, subteamId));
    }

    const linkedRosterResult = await dbPg
      .select({
        userId: newTeamRosterData.userId,
        teamUnitId: newTeamRosterData.teamUnitId,
        eventName: newTeamRosterData.eventName,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description
      })
      .from(newTeamRosterData)
      .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
      .where(and(...linkedRosterConditions));
    console.log('✅ [MEMBERS API] Fetched linked roster data', { 
      count: linkedRosterResult.length,
      members: linkedRosterResult.map(r => ({ userId: r.userId, subteam: r.teamId, event: r.eventName }))
    });

    // Group roster data by user and subteam
    const rosterDataByUser = new Map<string, Map<string, string[]>>();
    linkedRosterResult.forEach(rosterData => {
      if (!rosterData.userId) return;
      
      if (!rosterDataByUser.has(rosterData.userId)) {
        rosterDataByUser.set(rosterData.userId, new Map());
      }
      
      const userRosterData = rosterDataByUser.get(rosterData.userId)!;
      if (!userRosterData.has(rosterData.teamUnitId)) {
        userRosterData.set(rosterData.teamUnitId, []);
      }
      
      if (rosterData.eventName) {
        userRosterData.get(rosterData.teamUnitId)!.push(rosterData.eventName);
      }
    });

    // Update existing members with roster data
    rosterDataByUser.forEach((userRosterData, userId) => {
      const existingMember = allMembers.get(userId);
      if (existingMember) {
        // Initialize subteams array if it doesn't exist
        if (!existingMember.subteams) {
          existingMember.subteams = [];
        }
        
        // Update or add subteam information with events
        userRosterData.forEach((events, teamUnitId) => {
          const subteamInfo = {
            id: teamUnitId,
            name: linkedRosterResult.find(r => r.teamUnitId === teamUnitId)?.description || `Team ${linkedRosterResult.find(r => r.teamUnitId === teamUnitId)?.teamId}`,
            description: linkedRosterResult.find(r => r.teamUnitId === teamUnitId)?.description,
            events: [...new Set(events)] // Remove duplicates
          };
          
          // Check if this subteam is already in the array
          const existingSubteamIndex = existingMember.subteams.findIndex(s => s.id === teamUnitId);
          if (existingSubteamIndex >= 0) {
            // Update existing subteam with events
            existingMember.subteams[existingSubteamIndex].events = subteamInfo.events;
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
        });
        
        // Combine all events from all subteams
        const allEvents = existingMember.subteams.flatMap(s => s.events || []);
        existingMember.events = [...new Set(allEvents)]; // Remove duplicates
        
        console.log('🔄 [MEMBERS API] Updated member with roster data', { 
          userId, 
          name: existingMember.name,
          totalSubteams: existingMember.subteams.length,
          totalEvents: existingMember.events.length
        });
      }
    });

    // 4. Add unlinked roster members using Drizzle ORM
    console.log('🔍 [MEMBERS API] Fetching unlinked roster members');
    
    // Build the where conditions for unlinked roster
    const unlinkedRosterConditions = [
      eq(newTeamUnits.groupId, groupId),
      isNotNull(newTeamRosterData.studentName),
      ne(newTeamRosterData.studentName, ''),
      isNull(newTeamRosterData.userId)
    ];
    
    // Add subteam filter if specified
    if (subteamId) {
      unlinkedRosterConditions.push(eq(newTeamRosterData.teamUnitId, subteamId));
    }

    const unlinkedRosterResult = await dbPg
      .select({
        studentName: newTeamRosterData.studentName,
        teamUnitId: newTeamRosterData.teamUnitId,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description
      })
      .from(newTeamRosterData)
      .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
      .where(and(...unlinkedRosterConditions));
    console.log('✅ [MEMBERS API] Fetched unlinked roster members', { 
      count: unlinkedRosterResult.length,
      members: unlinkedRosterResult.map(r => ({ name: r.studentName, subteam: r.teamId }))
    });

    // Add unlinked roster members to the map
    unlinkedRosterResult.forEach(rosterMember => {
      if (!rosterMember.studentName) return;
      
      const memberKey = `roster-${rosterMember.studentName}-${rosterMember.teamUnitId}`;
      
      // Check if this person is already in the members list (shouldn't happen for unlinked, but just in case)
      const existingMember = Array.from(allMembers.values()).find(member => 
        member.name === rosterMember.studentName && 
        member.subteam?.id === rosterMember.teamUnitId
      );
      
      if (!existingMember) {
        allMembers.set(memberKey, {
          id: null, // No user ID for unlinked members
          name: rosterMember.studentName,
          email: null, // No email for unlinked members
          username: 'unknown', // Special username for unlinked members
          role: 'unlinked', // Special role for unlinked members
          subteam: {
            id: rosterMember.teamUnitId,
            name: rosterMember.description || `Team ${rosterMember.teamId}`,
            description: rosterMember.description
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
    const membersWithRosterData = new Set(rosterDataByUser.keys());
    
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