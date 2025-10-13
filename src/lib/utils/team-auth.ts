import { queryCockroachDB } from '@/lib/cockroachdb';
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
 */
export async function checkTeamGroupAccessCockroach(
  userId: string, 
  groupId: string
): Promise<TeamAuthResult> {
  try {
    console.log('checkTeamGroupAccessCockroach called with:', { userId, groupId });
    
    // Check for active team membership
    const membershipResult = await queryCockroachDB<{ role: string }>(
      `SELECT tm.role 
       FROM new_team_memberships tm
       JOIN new_team_units tu ON tm.team_id = tu.id
       WHERE tm.user_id = $1 AND tu.group_id = $2 AND tm.status = 'active'`,
      [userId, groupId]
    );

    console.log('CockroachDB membership result:', membershipResult.rows);
    const hasMembership = membershipResult.rows.length > 0;
    const role = hasMembership ? membershipResult.rows[0].role : undefined;

    // Check for roster entries (user's name appears in roster)
    const rosterResult = await queryCockroachDB<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM new_team_roster_data r
       JOIN new_team_units tu ON r.team_unit_id = tu.id
       WHERE tu.group_id = $1 AND r.user_id = $2`,
      [groupId, userId]
    );

    console.log('CockroachDB roster result:', rosterResult.rows);
    let hasRosterEntry = parseInt(rosterResult.rows[0].count) > 0;
    
    // If no roster entries by userId, check by name
    if (!hasRosterEntry) {
      // Get user names from CockroachDB
      const userResult = await queryCockroachDB<{ display_name: string; first_name: string; last_name: string }>(
        `SELECT display_name, first_name, last_name FROM users WHERE id = $1`,
        [userId]
      );
      
      const userDisplayName = userResult.rows[0]?.display_name;
      const userFirstName = userResult.rows[0]?.first_name;
      const userLastName = userResult.rows[0]?.last_name;
      console.log('CockroachDB user names:', { displayName: userDisplayName, firstName: userFirstName, lastName: userLastName });
      
      // Debug: Check what subteams exist in this group (CockroachDB)
      const subteamsInGroupCockroach = await queryCockroachDB<{ id: string; team_id: string; description: string }>(
        `SELECT id, team_id, description FROM new_team_units WHERE group_id = $1`,
        [groupId]
      );
      
      console.log('CockroachDB subteams in group:', subteamsInGroupCockroach.rows);
      
      if (userDisplayName || userFirstName || userLastName) {
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
          
          const rosterByNameResult = await queryCockroachDB<{ count: string }>(
            `SELECT COUNT(*) as count
             FROM new_team_roster_data r
             JOIN new_team_units tu ON r.team_unit_id = tu.id
             WHERE tu.group_id = $1 AND r.student_name = $2`,
            [groupId, name]
          );
          
          console.log(`CockroachDB roster entries by name "${name}":`, rosterByNameResult.rows);
          if (parseInt(rosterByNameResult.rows[0].count) > 0) {
            hasRosterEntry = true;
            break;
          }
        }
      }
    }

    // Special case: Team creators should maintain access even without membership or roster entries
    let isAuthorized = hasMembership || hasRosterEntry;
    
    if (!isAuthorized) {
      // Check if user is the creator of this team group (CockroachDB)
      const teamGroupResult = await queryCockroachDB<{ created_by: string }>(
        `SELECT created_by FROM new_team_groups WHERE id = $1`,
        [groupId]
      );
      
      const isTeamCreator = teamGroupResult.rows.length > 0 && teamGroupResult.rows[0].created_by === userId;
      console.log('CockroachDB is team creator:', isTeamCreator);
      
      if (isTeamCreator) {
        isAuthorized = true;
        console.log('CockroachDB granting access to team creator');
      }
    }

    console.log('CockroachDB final auth result:', { isAuthorized, hasMembership, hasRosterEntry, role });

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
 * Check if a user has leadership privileges (captain/co_captain) in a team group using CockroachDB
 */
export async function checkTeamGroupLeadershipCockroach(
  userId: string, 
  groupId: string
): Promise<{ hasLeadership: boolean; role?: string }> {
  try {
    const membershipResult = await queryCockroachDB<{ role: string }>(
      `SELECT tm.role 
       FROM new_team_memberships tm
       JOIN new_team_units tu ON tm.team_id = tu.id
       WHERE tm.user_id = $1 AND tu.group_id = $2 AND tm.status = 'active'`,
      [userId, groupId]
    );

    if (membershipResult.rows.length > 0) {
      const role = membershipResult.rows[0].role;
      const hasLeadership = ['captain', 'co_captain'].includes(role);
      return { hasLeadership, role };
    }

    // If no active membership, check if user is the team creator
    const teamGroupResult = await queryCockroachDB<{ created_by: string }>(
      `SELECT created_by FROM new_team_groups WHERE id = $1`,
      [groupId]
    );
    
    const isTeamCreator = teamGroupResult.rows.length > 0 && teamGroupResult.rows[0].created_by === userId;
    
    if (isTeamCreator) {
      return { hasLeadership: true, role: 'creator' };
    }

    return { hasLeadership: false };
  } catch (error) {
    console.error('Error checking team group leadership:', error);
    return { hasLeadership: false };
  }
}
