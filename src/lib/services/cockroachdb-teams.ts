import { queryCockroachDB } from '@/lib/cockroachdb';
import { dbPg } from '@/lib/db';
import { 
  newTeamMemberships, 
  newTeamUnits, 
  newTeamGroups
} from '@/lib/db/schema';
import { eq, and, inArray, or } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// Type for user profile data
interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}

// Helper function to get real user data from Supabase
async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, first_name, last_name, username')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      console.warn(`Failed to fetch user profile for ${userId}:`, error);
      return null;
    }
    
    return data as UserProfile;
  } catch (error) {
    console.warn(`Error fetching user profile for ${userId}:`, error);
    return null;
  }
}

export interface TeamMembership {
  id: string;
  user_id: string;
  team_id: string;
  role: 'captain' | 'co_captain' | 'member' | 'observer';
  joined_at: string;
  invited_by?: string;
  status: 'active' | 'inactive' | 'pending' | 'banned';
  permissions?: Record<string, any>;
}

export interface TeamUnit {
  id: string;
  group_id: string;
  team_id: string;
  name: string;
  captain_code: string;
  user_code: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamGroup {
  id: string;
  school: string;
  division: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamWithDetails {
  id: string;
  name: string;
  slug: string;
  school: string;
  division: string;
  description?: string;
  captain_code: string;
  user_code: string;
  user_role: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    joined_at: string;
  }>;
}

export class CockroachDBTeamsService {
  async getUserTeams(userId: string): Promise<TeamWithDetails[]> {
    try {
      // Get user's team memberships using Drizzle ORM
      const memberships = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, userId),
            eq(newTeamMemberships.status, 'active')
          )
        )
        .orderBy(newTeamMemberships.joinedAt);

      if (memberships.length === 0) {
        return [];
      }

      // Get team details for each membership using Drizzle ORM
      const teamIds = memberships.map(m => m.teamId);
      const teams = await dbPg
        .select({
          id: newTeamUnits.id,
          teamId: newTeamUnits.teamId,
          description: newTeamUnits.description,
          captainCode: newTeamUnits.captainCode,
          userCode: newTeamUnits.userCode,
          school: newTeamGroups.school,
          division: newTeamGroups.division,
          slug: newTeamGroups.slug,
          groupCreatedAt: newTeamGroups.createdAt
        })
        .from(newTeamUnits)
        .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
        .where(
          and(
            inArray(newTeamUnits.id, teamIds),
            eq(newTeamUnits.status, 'active'),
            eq(newTeamGroups.status, 'active')
          )
        );

      // Format teams with members
      const formattedTeams = await Promise.all(
        memberships.map(async (membership) => {
          const team = teams.find(t => t.id === membership.teamId);
          if (!team) return null;

          // Get team members using Drizzle ORM
          const members = await this.getTeamMembers(team.id);

          return {
            id: team.id,
            team_id: team.teamId,
            name: team.teamId, // Use teamId as name since name column was removed
            slug: team.slug,
            school: team.school,
            division: team.division,
            description: team.description || undefined,
            captain_code: team.captainCode,
            user_code: team.userCode,
            user_role: membership.role,
            members: await Promise.all(members.map(async (m) => {
              const userProfile = await getUserProfile(m.user_id);
              return {
                id: m.user_id,
                name: userProfile?.display_name || 
                      (userProfile?.first_name && userProfile?.last_name 
                        ? `${userProfile.first_name} ${userProfile.last_name}` 
                        : `User ${m.user_id.substring(0, 8)}`),
                email: userProfile?.email || `user-${m.user_id.substring(0, 8)}@example.com`,
                role: m.role,
                joined_at: m.joined_at
              };
            }))
          };
        })
      );

      return formattedTeams.filter(team => team !== null) as TeamWithDetails[];
    } catch (error) {
      console.error('Error fetching user teams from CockroachDB:', error);
      throw error;
    }
  }

  async getUserArchivedTeams(userId: string): Promise<TeamWithDetails[]> {
    try {
      // Get user's archived team memberships
      const membershipsResult = await queryCockroachDB<TeamMembership>(
        `SELECT * FROM new_team_memberships 
         WHERE user_id = $1 AND status = 'archived' 
         ORDER BY joined_at ASC`,
        [userId]
      );

      if (membershipsResult.rows.length === 0) {
        return [];
      }

      // Get archived team details for each membership
      const teamIds = membershipsResult.rows.map(m => m.team_id);
      const teamsResult = await queryCockroachDB<any>(
        `SELECT tu.*, tg.school, tg.division, tg.slug, tg.created_at as group_created_at
         FROM new_team_units tu
         JOIN new_team_groups tg ON tu.group_id = tg.id
         WHERE tu.id = ANY($1) AND tu.status = 'archived' AND tg.status = 'archived'`,
        [teamIds]
      );

      // Format teams with members
      const formattedTeams = await Promise.all(
        membershipsResult.rows.map(async (membership) => {
          const team = teamsResult.rows.find(t => t.id === membership.team_id);
          if (!team) return null;

          // Get team members
          const members = await this.getTeamMembers(team.id);

          return {
            id: team.id,
            name: team.team_id, // Use team_id as name since name column was removed
            slug: team.slug,
            school: team.school,
            division: team.division,
            description: team.description || undefined,
            captain_code: team.captain_code,
            user_code: team.user_code,
            members: await Promise.all(members.map(async (m) => {
              const userProfile = await getUserProfile(m.user_id);
              return {
                id: m.user_id,
                name: userProfile?.display_name || 
                      (userProfile?.first_name && userProfile?.last_name 
                        ? `${userProfile.first_name} ${userProfile.last_name}` 
                        : `User ${m.user_id.substring(0, 8)}`),
                email: userProfile?.email || `user-${m.user_id.substring(0, 8)}@example.com`,
                role: m.role
              };
            }))
          };
        })
      );

      return formattedTeams.filter(team => team !== null) as TeamWithDetails[];
    } catch (error) {
      console.error('Error fetching user archived teams from CockroachDB:', error);
      throw error;
    }
  }

  async getTeamMembers(teamId: string): Promise<TeamMembership[]> {
    try {
      // Using Drizzle ORM to get team members
      const members = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.teamId, teamId),
            eq(newTeamMemberships.status, 'active')
          )
        )
        .orderBy(newTeamMemberships.joinedAt);

      // Convert to the expected format
      return members.map(member => ({
        id: member.id,
        user_id: member.userId,
        team_id: member.teamId,
        role: member.role as 'captain' | 'co_captain' | 'member' | 'observer',
        joined_at: member.joinedAt?.toISOString() || new Date().toISOString(),
        invited_by: member.invitedBy || undefined,
        status: member.status as 'active' | 'inactive' | 'pending' | 'banned',
        permissions: member.permissions as Record<string, any> | undefined
      }));
    } catch (error) {
      console.error('Error fetching team members from CockroachDB:', error);
      return [];
    }
  }

  async createTeamGroup(data: {
    school: string;
    division: string;
    slug: string;
    createdBy: string;
  }): Promise<TeamGroup> {
    try {
      // SECURITY FIX: Always create a new team group instead of reusing existing ones
      // This prevents unauthorized access to existing teams when someone tries to create
      // a team with the same school+division combination
      
      // Check if the provided slug already exists
      const existingSlug = await dbPg
        .select()
        .from(newTeamGroups)
        .where(eq(newTeamGroups.slug, data.slug))
        .limit(1);

      let finalSlug = data.slug;
      
      // If slug exists, generate a unique one
      if (existingSlug.length > 0) {
        console.log(`Slug ${data.slug} already exists, generating unique slug...`);
        const timestamp = Date.now().toString(36);
        finalSlug = `${data.slug}-${timestamp}`;
      }

      // Create the team group with the final slug
      const [result] = await dbPg
        .insert(newTeamGroups)
        .values({
          school: data.school,
          division: data.division,
          slug: finalSlug,
          createdBy: data.createdBy
        })
        .returning();

      console.log(`Created new team group with slug: ${result.slug}`);
      return {
        id: result.id,
        school: result.school,
        division: result.division,
        slug: result.slug,
        created_by: result.createdBy,
        created_at: result.createdAt?.toISOString() || new Date().toISOString(),
        updated_at: result.updatedAt?.toISOString() || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating team group in CockroachDB:', error);
      throw error;
    }
  }

  async createTeamUnit(data: {
    groupId: string;
    teamId: string;
    captainCode: string;
    userCode: string;
    description?: string;
    createdBy: string;
  }): Promise<TeamUnit> {
    try {
      // SECURITY FIX: Always create a new team unit instead of reusing existing ones
      // This prevents users from accessing subteams from other teams
      console.log(`Creating new team unit ${data.teamId} for group ${data.groupId}`);
      
      // Ensure the team group is active
      console.log(`Ensuring team group is active`);
      const groupStatusResult = await dbPg
        .select({ status: newTeamGroups.status })
        .from(newTeamGroups)
        .where(eq(newTeamGroups.id, data.groupId))
        .limit(1);
      
      if (groupStatusResult.length > 0 && groupStatusResult[0].status === 'archived') {
        console.log(`Reactivating archived team group ${data.groupId}`);
        await dbPg
          .update(newTeamGroups)
          .set({ 
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(newTeamGroups.id, data.groupId));
      }

      // Create a new team unit with a unique team ID
      // Find the next available team ID (A, B, C, etc.)
      const existingTeams = await dbPg
        .select({ teamId: newTeamUnits.teamId })
        .from(newTeamUnits)
        .where(eq(newTeamUnits.groupId, data.groupId))
        .orderBy(newTeamUnits.teamId);

      const existingTeamIds = existingTeams.map(t => t.teamId);
      let nextTeamId = 'A';
      let teamIdCounter = 0;

      while (existingTeamIds.includes(nextTeamId)) {
        teamIdCounter++;
        nextTeamId = String.fromCharCode(65 + teamIdCounter); // A=65, B=66, C=67, etc.
        if (teamIdCounter > 25) { // If we go beyond Z, use numbers
          nextTeamId = (teamIdCounter - 25).toString();
        }
      }
      
      console.log(`Creating new team unit with ID: ${nextTeamId}`);
      
      const [result] = await dbPg
        .insert(newTeamUnits)
        .values({
          groupId: data.groupId,
          teamId: nextTeamId,
          captainCode: data.captainCode,
          userCode: data.userCode,
          description: data.description || `Team ${nextTeamId}`,
          createdBy: data.createdBy,
          status: 'active' // Explicitly set status to active
        })
        .returning();

      return {
        id: result.id,
        group_id: result.groupId,
        team_id: result.teamId,
        name: result.description || `Team ${result.teamId}`,
        description: result.description || undefined,
        captain_code: result.captainCode,
        user_code: result.userCode,
        created_by: result.createdBy,
        created_at: result.createdAt?.toISOString() || new Date().toISOString(),
        updated_at: result.updatedAt?.toISOString() || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating team unit in CockroachDB:', error);
      throw error;
    }
  }

  async createTeamMembership(data: {
    userId: string;
    teamId: string;
    role: string;
    status: string;
    invitedBy?: string;
  }): Promise<TeamMembership> {
    try {
      // First, check if a membership already exists for this user and team
      const existingMembership = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(and(
          eq(newTeamMemberships.userId, data.userId),
          eq(newTeamMemberships.teamId, data.teamId)
        ))
        .limit(1);

      if (existingMembership.length > 0) {
        console.log(`Membership already exists for user ${data.userId} in team ${data.teamId}, using existing membership`);
        const membership = existingMembership[0];
        return {
          id: membership.id,
          user_id: membership.userId,
          team_id: membership.teamId,
          role: membership.role as 'captain' | 'co_captain' | 'member' | 'observer',
          joined_at: membership.joinedAt?.toISOString() || new Date().toISOString(),
          invited_by: membership.invitedBy || undefined,
          status: membership.status as 'active' | 'inactive' | 'pending' | 'banned',
          permissions: membership.permissions as Record<string, any> | undefined
        };
      }

      // If no existing membership, create a new one
      const [result] = await dbPg
        .insert(newTeamMemberships)
        .values({
          userId: data.userId,
          teamId: data.teamId,
          role: data.role,
          status: data.status,
          invitedBy: data.invitedBy
        })
        .returning();

      return {
        id: result.id,
        user_id: result.userId,
        team_id: result.teamId,
        role: result.role as 'captain' | 'co_captain' | 'member' | 'observer',
        joined_at: result.joinedAt?.toISOString() || new Date().toISOString(),
        invited_by: result.invitedBy || undefined,
        status: result.status as 'active' | 'inactive' | 'pending' | 'banned',
        permissions: result.permissions as Record<string, any> | undefined
      };
    } catch (error) {
      console.error('Error creating team membership in CockroachDB:', error);
      throw error;
    }
  }

  async joinTeamByCode(userId: string, code: string): Promise<TeamWithDetails | null> {
    try {
      // Find team by captain_code or user_code using Drizzle ORM
      const teams = await dbPg
        .select({
          id: newTeamUnits.id,
          teamId: newTeamUnits.teamId,
          description: newTeamUnits.description,
          captainCode: newTeamUnits.captainCode,
          userCode: newTeamUnits.userCode,
          school: newTeamGroups.school,
          division: newTeamGroups.division,
          slug: newTeamGroups.slug
        })
        .from(newTeamUnits)
        .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
        .where(
          or(
            eq(newTeamUnits.captainCode, code),
            eq(newTeamUnits.userCode, code)
          )
        );

      if (teams.length === 0) {
        return null;
      }

      const team = teams[0];

      // Check if user is already a member using Drizzle ORM
      const existingMemberships = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, userId),
            eq(newTeamMemberships.teamId, team.id)
          )
        );

      if (existingMemberships.length > 0) {
        // User is already a member, return team details
        const members = await this.getTeamMembers(team.id);
        return {
          id: team.id,
          name: team.teamId, // Use teamId as name since name column was removed
          slug: team.slug,
          school: team.school,
          division: team.division,
          description: team.description || undefined,
          captain_code: team.captainCode,
          user_code: team.userCode,
          user_role: existingMemberships[0].role,
          members: await Promise.all(members.map(async (m) => {
            const userProfile = await getUserProfile(m.user_id);
            return {
              id: m.user_id,
              name: userProfile?.display_name || 
                    (userProfile?.first_name && userProfile?.last_name 
                      ? `${userProfile.first_name} ${userProfile.last_name}` 
                      : `User ${m.user_id.substring(0, 8)}`),
              email: userProfile?.email || `user-${m.user_id.substring(0, 8)}@example.com`,
              role: m.role,
              joined_at: m.joined_at
            };
          }))
        };
      }

      // Determine role based on code type
      const isCaptain = team.captainCode === code;
      const role = isCaptain ? 'captain' : 'member';

      // Add user to team
      const membership = await this.createTeamMembership({
        userId,
        teamId: team.id,
        role,
        status: 'active'
      });

      // Get team members
      const members = await this.getTeamMembers(team.id);

      return {
        id: team.id,
        name: team.teamId, // Use teamId as name since name column was removed
        slug: team.slug,
        school: team.school,
        division: team.division,
        description: team.description || undefined,
        captain_code: team.captainCode,
        user_code: team.userCode,
        user_role: membership.role,
        members: await Promise.all(members.map(async (m) => {
          const userProfile = await getUserProfile(m.user_id);
          return {
            id: m.user_id,
            name: userProfile?.display_name || 
                  (userProfile?.first_name && userProfile?.last_name 
                    ? `${userProfile.first_name} ${userProfile.last_name}` 
                    : `User ${m.user_id.substring(0, 8)}`),
            email: userProfile?.email || `user-${m.user_id.substring(0, 8)}@example.com`,
            role: m.role,
            joined_at: m.joined_at
          };
        }))
      };
    } catch (error) {
      console.error('Error joining team by code in CockroachDB:', error);
      throw error;
    }
  }
}

export const cockroachDBTeamsService = new CockroachDBTeamsService();
