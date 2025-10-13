import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { dbPg } from '@/lib/db';
import { 
  newTeamGroups, 
  newTeamUnits, 
  newTeamMemberships, 
  newTeamRosterData,
  newTeamInvitations,
  rosterLinkInvitations,
  users 
} from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

// GET /api/teams/[teamId]/members - Get team members with their event assignments
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

    // First, resolve the slug to team group using Drizzle ORM
    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId));

    if (groupResult.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult[0].id;

    // Check if user is a member of this team group using Drizzle ORM
    const membershipResult = await dbPg
      .select({ role: newTeamMemberships.role })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, user.id),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, 'active')
        )
      );

    if (membershipResult.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Get all team members for this group using Drizzle ORM
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

    const membersResult = await membersQuery.orderBy(newTeamMemberships.joinedAt);

    // Get roster data for each member to determine their events using Drizzle ORM
    let rosterQuery = dbPg
      .select({
        teamUnitId: newTeamRosterData.teamUnitId,
        eventName: newTeamRosterData.eventName,
        slotIndex: newTeamRosterData.slotIndex,
        studentName: newTeamRosterData.studentName,
        userId: newTeamRosterData.userId
      })
      .from(newTeamRosterData)
      .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamUnits.groupId, groupId),
          sql`${newTeamRosterData.studentName} IS NOT NULL`,
          sql`${newTeamRosterData.studentName} != ''`
        )
      );

    if (subteamId) {
      rosterQuery = dbPg
        .select({
          teamUnitId: newTeamRosterData.teamUnitId,
          eventName: newTeamRosterData.eventName,
          slotIndex: newTeamRosterData.slotIndex,
          studentName: newTeamRosterData.studentName,
          userId: newTeamRosterData.userId
        })
        .from(newTeamRosterData)
        .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
        .where(
          and(
            eq(newTeamUnits.groupId, groupId),
            eq(newTeamUnits.id, subteamId),
            sql`${newTeamRosterData.studentName} IS NOT NULL`,
            sql`${newTeamRosterData.studentName} != ''`
          )
        );
    }

    const rosterResult = await rosterQuery
      .orderBy(newTeamRosterData.eventName, newTeamRosterData.slotIndex);

    // console.log('Members API: Roster query result:', {
    //   groupId,
    //   subteamId,
    //   rowCount: rosterResult.length,
    //   rows: rosterResult
    // });

    // Group roster data by team unit and student name, tracking linked status
    const rosterByUnit: Record<string, Record<string, { events: string[], isLinked: boolean }>> = {};
    rosterResult.forEach(row => {
      if (!row.studentName) return; // Skip rows with null student names
      
      if (!rosterByUnit[row.teamUnitId]) {
        rosterByUnit[row.teamUnitId] = {};
      }
      if (!rosterByUnit[row.teamUnitId][row.studentName]) {
        rosterByUnit[row.teamUnitId][row.studentName] = { events: [], isLinked: false };
      }
      rosterByUnit[row.teamUnitId][row.studentName].events.push(row.eventName);
      // Mark as linked if any roster entry for this student has a user_id
      if (row.userId) {
        rosterByUnit[row.teamUnitId][row.studentName].isLinked = true;
      }
    });

    // Get real user data using Drizzle ORM
    const userIds = membersResult.map(member => member.userId);
    
    // Fetch user profiles using Drizzle ORM
    const userProfilesResult = await dbPg
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(users)
      .where(inArray(users.id, userIds));

    // Create a map of user profiles for quick lookup
    const userProfileMap = new Map<string, any>();
    userProfilesResult.forEach((profile: any) => {
      userProfileMap.set(profile.id, profile);
    });

    // Format members with their event assignments
    const members = membersResult.map(member => {
      // Get real user data first
      const userProfile = userProfileMap.get(member.userId);
      const displayName = userProfile?.displayName || 
        (userProfile?.firstName && userProfile?.lastName 
          ? `${userProfile.firstName} ${userProfile.lastName}` 
          : `User ${member.userId.substring(0, 8)}`);
      const email = userProfile?.email || `user-${member.userId.substring(0, 8)}@example.com`;

      // Get events where this specific member's name appears
      const memberEvents: string[] = [];
      const teamUnitRoster = rosterByUnit[member.teamUnitId] || {};
      
      // Check each student to see if this member's name matches
      Object.entries(teamUnitRoster).forEach(([studentName, rosterData]) => {
        const memberNameLower = displayName.toLowerCase().trim();
        const rosterNameLower = studentName.toLowerCase().trim();
        
        // Try exact match first
        let isMatched = memberNameLower === rosterNameLower;
        
        if (!isMatched) {
          // Try fuzzy matching for cases where names might not match exactly
          isMatched = memberNameLower.includes(rosterNameLower) || 
                     rosterNameLower.includes(memberNameLower) ||
                     // Check if first and last names match in different order
                     (memberNameLower.split(' ').length > 1 && rosterNameLower.split(' ').length > 1 &&
                      memberNameLower.split(' ').every(part => rosterNameLower.includes(part)) ||
                      rosterNameLower.split(' ').every(part => memberNameLower.includes(part)));
        }
        
        if (isMatched) {
          // Add all events for this student
          memberEvents.push(...rosterData.events);
        }
      });
      
      const uniqueEvents = [...new Set(memberEvents)];

      return {
        id: member.userId,
        name: displayName,
        email: email,
        username: userProfile?.username,
        role: member.role,
        joinedAt: member.joinedAt?.toISOString() || new Date().toISOString(),
        subteam: {
          id: member.teamUnitId,
          name: member.description,
          teamId: member.teamId
        },
        events: uniqueEvents,
        eventCount: uniqueEvents.length
      };
    });

    // Get subteam information for all team units using Drizzle ORM
    const subteamInfoResult = await dbPg
      .select({
        id: newTeamUnits.id,
        description: newTeamUnits.description,
        teamId: newTeamUnits.teamId
      })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, groupId));

    const subteamInfoMap = new Map<string, { id: string; name: string; teamId: string }>();
    subteamInfoResult.forEach(subteam => {
      subteamInfoMap.set(subteam.id, {
        id: subteam.id,
        name: subteam.description || 'Unknown',
        teamId: subteam.teamId
      });
    });

    // Add unlinked roster entries as separate "members"
    const unlinkedEntries: any[] = [];
    // console.log('Members API: Processing roster data for unlinked entries:', {
    //   rosterByUnitKeys: Object.keys(rosterByUnit),
    //   rosterByUnit: rosterByUnit
    // });
    
    Object.entries(rosterByUnit).forEach(([teamUnitId, studentEvents]) => {
      Object.entries(studentEvents).forEach(([studentName, rosterData]) => {
        // console.log('Members API: Checking roster entry:', {
        //   teamUnitId,
        //   studentName,
        //   isLinked: rosterData.isLinked,
        //   events: rosterData.events
        // });
        
        // Only add as unlinked if the roster entry is not linked to any user
        // AND the student name doesn't match any existing linked member
        if (!rosterData.isLinked && studentName.trim()) {
          // Check if this student name matches any existing linked member
          const studentNameLower = studentName.toLowerCase().trim();
          const isAlreadyLinkedMember = members.some(member => {
            const memberNameLower = member.name.toLowerCase().trim();
            
            // Exact case-insensitive match only
            return memberNameLower === studentNameLower;
          });
          
          // Only create unlinked entry if this student is not already a linked member
          if (!isAlreadyLinkedMember) {
            // Get subteam info from the map
            const subteamInfo = subteamInfoMap.get(teamUnitId);
            // console.log('Members API: Adding unlinked entry:', {
            //   studentName,
            //   subteamInfo,
            //   events: rosterData.events
            // });
            
            unlinkedEntries.push({
              id: null, // No user ID for unlinked entries
              name: studentName,
              email: '',
              role: 'member',
              joinedAt: new Date().toISOString(),
              subteam: subteamInfo || { id: teamUnitId, name: 'Unknown', teamId: '' },
              events: [...new Set(rosterData.events)],
              eventCount: rosterData.events.length
            });
          }
        }
      });
    });
    
    // console.log('Members API: Final unlinked entries:', unlinkedEntries);

    // Get team units for this group to check pending invitations using Drizzle ORM
    const teamUnitsResult = await dbPg
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, groupId));

    const teamUnitIds = teamUnitsResult.map(row => row.id);

    // Check for pending invitations using Drizzle ORM
    const pendingInvitationsResult = await dbPg
      .select({
        email: newTeamInvitations.email,
        invitedBy: newTeamInvitations.invitedBy,
        createdAt: newTeamInvitations.createdAt,
        teamId: newTeamInvitations.teamId,
        role: newTeamInvitations.role,
        invitationCode: newTeamInvitations.invitationCode
      })
      .from(newTeamInvitations)
      .where(
        and(
          inArray(newTeamInvitations.teamId, teamUnitIds),
          eq(newTeamInvitations.status, 'pending')
        )
      );

    // Get user information for pending invitations using Drizzle ORM
    const pendingInvitationEmails = pendingInvitationsResult.map(inv => inv.email);
    const pendingInvitationUsersResult = await dbPg
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(users)
      .where(inArray(users.email, pendingInvitationEmails));

    // Create a map of user profiles for pending invitations
    const pendingInvitationUserMap = new Map<string, any>();
    pendingInvitationUsersResult.forEach((profile: any) => {
      pendingInvitationUserMap.set(profile.email, profile);
    });

    // Add pending invitations as separate entries
    const pendingInvitationEntries: any[] = [];
    pendingInvitationsResult.forEach(invitation => {
      const userProfile = pendingInvitationUserMap.get(invitation.email);
      if (userProfile) {
        const displayName = userProfile.displayName || 
          (userProfile.firstName && userProfile.lastName 
            ? `${userProfile.firstName} ${userProfile.lastName}` 
            : `User ${userProfile.id.substring(0, 8)}`);
        
        pendingInvitationEntries.push({
          id: userProfile.id,
          name: displayName,
          email: invitation.email,
          role: invitation.role,
          joinedAt: invitation.createdAt?.toISOString() || new Date().toISOString(),
          subteam: { id: '', name: 'Pending', teamId: '' },
          events: [],
          eventCount: 0,
          isPendingInvitation: true,
          invitationCode: invitation.invitationCode
        });
      }
    });

    // Combine real members with unlinked entries and pending invitations
    const allMembers = [...members, ...unlinkedEntries, ...pendingInvitationEntries];

    // Check for pending link invitations (for unlinked roster entries) using Drizzle ORM
    const pendingLinkInvitationsResult = await dbPg
      .select({
        studentName: rosterLinkInvitations.studentName,
        teamId: rosterLinkInvitations.teamId,
        invitedBy: rosterLinkInvitations.invitedBy,
        createdAt: rosterLinkInvitations.createdAt,
        message: rosterLinkInvitations.message
      })
      .from(rosterLinkInvitations)
      .where(
        and(
          inArray(rosterLinkInvitations.teamId, teamUnitIds),
          eq(rosterLinkInvitations.status, 'pending')
        )
      );

    // Create maps of pending invitations by email
    const pendingInvitationsMap = new Map<string, any>();
    pendingInvitationsResult.forEach(invitation => {
      pendingInvitationsMap.set(invitation.email, invitation);
    });

    const pendingLinkInvitationsMap = new Map<string, any>();
    pendingLinkInvitationsResult.forEach(invitation => {
      const key = `${invitation.teamId}:${invitation.studentName}`;
      pendingLinkInvitationsMap.set(key, invitation);
    });

    // Add pending invitation status to members
    const membersWithInviteStatus = allMembers.map(member => {
      // Skip pending invitation entries as they already have the status
      if (member.isPendingInvitation) {
        return {
          ...member,
          hasPendingInvite: true,
          hasPendingLinkInvite: false
        };
      }
      
      const hasPendingInvite = member.email && pendingInvitationsMap.has(member.email);
      const linkInviteKey = `${member.subteam.id}:${member.name}`;
      const hasPendingLinkInvite = pendingLinkInvitationsMap.has(linkInviteKey);
      return {
        ...member,
        hasPendingInvite: !!hasPendingInvite,
        hasPendingLinkInvite: !!hasPendingLinkInvite
      };
    });

    return NextResponse.json({ members: membersWithInviteStatus });

  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
