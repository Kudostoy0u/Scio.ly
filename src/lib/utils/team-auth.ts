import { dbPg } from '@/lib/db';
import { newTeamMemberships, newTeamUnits, newTeamRosterData, users, newTeamGroups } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface TeamAuthResult {
  isAuthorized: boolean;
  hasMembership: boolean;
  hasRosterEntry: boolean;
  role?: string;
  error?: string;
}

/**
 * Check if a user is authorized to access a team group.
 * A user is authorized if they either:
 * 1. Have an active team membership in any subteam of the group, OR
 * 2. Have their name in the roster of any subteam in the group
 */
export async function checkTeamGroupAccess(
  userId: string, 
  groupId: string
): Promise<TeamAuthResult> {
  try {
    console.log('checkTeamGroupAccess called with:', { userId, groupId });
    
    // Check for active team membership using Drizzle ORM
    const membershipResult = await dbPg
      .select({ role: newTeamMemberships.role })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, userId),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, 'active')
        )
      );

    console.log('Membership result:', membershipResult);
    const hasMembership = membershipResult.length > 0;
    const role = hasMembership ? membershipResult[0].role : undefined;

    // Check for roster entries (user's name appears in roster) using Drizzle ORM
    const rosterResult = await dbPg
      .select({ count: sql<number>`count(*)` })
      .from(newTeamRosterData)
      .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamRosterData.userId, userId)
        )
      );

    console.log('Roster result:', rosterResult);
    
    // Also check for any roster entries by student name (in case user_id is null)
    // We need to get the user's display name first
    const userResult = await dbPg
      .select({ displayName: users.displayName, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, userId));
    
    const userDisplayName = userResult[0]?.displayName;
    const userFirstName = userResult[0]?.firstName;
    const userLastName = userResult[0]?.lastName;
    console.log('User names:', { displayName: userDisplayName, firstName: userFirstName, lastName: userLastName });
    
    // Debug: Check what subteams exist in this group
    const subteamsInGroup = await dbPg
      .select({ 
        id: newTeamUnits.id,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description
      })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, groupId));
    
    console.log('Subteams in group:', subteamsInGroup);
    
    let hasRosterEntry = rosterResult[0]?.count > 0;
    
    // If no roster entries by userId, check by name
    if (!hasRosterEntry && (userDisplayName || userFirstName || userLastName)) {
      // Try different name combinations
      const possibleNames = [
        userDisplayName,
        userFirstName,
        userLastName,
        userFirstName && userLastName ? `${userFirstName} ${userLastName}` : null,
        userLastName && userFirstName ? `${userLastName}, ${userFirstName}` : null
      ].filter(Boolean);
      
      for (const name of possibleNames) {
        if (!name) continue;
        
        const rosterByNameResult = await dbPg
          .select({ count: sql<number>`count(*)` })
          .from(newTeamRosterData)
          .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
          .where(
            and(
              eq(newTeamUnits.groupId, groupId),
              eq(newTeamRosterData.studentName, name)
            )
          );
        
        console.log(`Roster entries by name "${name}":`, rosterByNameResult);
        if (rosterByNameResult[0]?.count > 0) {
          hasRosterEntry = true;
          break;
        }
      }
    }

    // Special case: Team creators should maintain access even without membership or roster entries
    let isAuthorized = hasMembership || hasRosterEntry;
    
    if (!isAuthorized) {
      // Check if user is the creator of this team group
      const teamGroupResult = await dbPg
        .select({ createdBy: newTeamGroups.createdBy })
        .from(newTeamGroups)
        .where(eq(newTeamGroups.id, groupId));
      
      const isTeamCreator = teamGroupResult.length > 0 && teamGroupResult[0].createdBy === userId;
      console.log('Is team creator:', isTeamCreator);
      
      if (isTeamCreator) {
        isAuthorized = true;
        console.log('Granting access to team creator');
      }
    }

    console.log('Final auth result:', { isAuthorized, hasMembership, hasRosterEntry, role });

    return {
      isAuthorized,
      hasMembership,
      hasRosterEntry,
      role
    };
  } catch (error) {
    console.error('Error checking team group access:', error);
    return {
      isAuthorized: false,
      hasMembership: false,
      hasRosterEntry: false,
      error: 'Database error'
    };
  }
}

/**
 * Check if a user has leadership privileges (captain/co_captain) in a team group
 */
export async function checkTeamGroupLeadership(
  userId: string, 
  groupId: string
): Promise<{ hasLeadership: boolean; role?: string }> {
  try {
    const membershipResult = await dbPg
      .select({ role: newTeamMemberships.role })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, userId),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, 'active')
        )
      );

    if (membershipResult.length > 0) {
      const role = membershipResult[0].role;
      const hasLeadership = ['captain', 'co_captain'].includes(role);
      return { hasLeadership, role };
    }

    // If no active membership, check if user is the team creator
    const teamGroupResult = await dbPg
      .select({ createdBy: newTeamGroups.createdBy })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.id, groupId));
    
    const isTeamCreator = teamGroupResult.length > 0 && teamGroupResult[0].createdBy === userId;
    
    if (isTeamCreator) {
      return { hasLeadership: true, role: 'creator' };
    }

    return { hasLeadership: false };
  } catch (error) {
    console.error('Error checking team group leadership:', error);
    return { hasLeadership: false };
  }
}

/**
 * Check if a user is authorized to access a team group using CockroachDB.
 * A user is authorized if they either:
 * 1. Have an active team membership in any subteam of the group, OR
 * 2. Have their name in the roster of any subteam in the group
 * 
 * @deprecated Use checkTeamGroupAccess instead - this function is kept for backward compatibility
 */
export async function checkTeamGroupAccessCockroach(
  userId: string, 
  groupId: string
): Promise<TeamAuthResult> {
  // Delegate to the Drizzle ORM implementation
  return checkTeamGroupAccess(userId, groupId);
}

/**
 * Check if a user has leadership privileges (captain, co-captain, or creator) in a team group using CockroachDB
 * 
 * @deprecated Use checkTeamGroupLeadership instead - this function is kept for backward compatibility
 */
export async function checkTeamGroupLeadershipCockroach(
  userId: string, 
  groupId: string
): Promise<{ hasLeadership: boolean; role?: string }> {
  // Delegate to the Drizzle ORM implementation
  return checkTeamGroupLeadership(userId, groupId);
}