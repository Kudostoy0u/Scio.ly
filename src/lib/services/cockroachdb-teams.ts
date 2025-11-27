import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamPeople,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import logger from "@/lib/utils/logger";
import { and, eq, inArray, or } from "drizzle-orm";
import { formatMember } from "./utils/memberFormatters";
import { generateUniqueSlug } from "./utils/slugGenerator";
import { formatTeamWithDetails } from "./utils/teamFormatters";
import { generateNextTeamId } from "./utils/teamIdGenerator";
import { getUserProfile } from "./utils/userProfileUtils";

export interface TeamMembership {
  id: string;
  user_id: string;
  team_id: string;
  role: "captain" | "co_captain" | "member" | "observer";
  joined_at: string;
  invited_by?: string;
  status: "active" | "inactive" | "pending" | "banned";
  permissions?: Record<string, unknown>;
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
    // Get user's team memberships using Drizzle ORM
    const memberships = await dbPg
      .select()
      .from(newTeamMemberships)
      .where(and(eq(newTeamMemberships.userId, userId), eq(newTeamMemberships.status, "active")))
      .orderBy(newTeamMemberships.joinedAt);

    if (memberships.length === 0) {
      return [];
    }

    // Get team details for each membership using Drizzle ORM
    const teamIds = memberships.map((m) => m.teamId);
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
        groupCreatedAt: newTeamGroups.createdAt,
      })
      .from(newTeamUnits)
      .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
      .where(
        and(
          inArray(newTeamUnits.id, teamIds),
          eq(newTeamUnits.status, "active"),
          eq(newTeamGroups.status, "active")
        )
      );

    // Format teams with members
    const formattedTeams = await Promise.all(
      memberships.map(async (membership) => {
        const team = teams.find((t) => t.id === membership.teamId);
        if (!team) {
          return null;
        }

        // Get team members using Drizzle ORM
        const members = await this.getTeamMembers(team.id);
        const formattedMembers = await Promise.all(
          members.map(async (m) => {
            const userProfile = await getUserProfile(m.user_id);
            return formatMember(m, userProfile);
          })
        );

        return formatTeamWithDetails(
          {
            id: team.id,
            teamId: team.teamId,
            description: team.description,
            captainCode: team.captainCode,
            userCode: team.userCode,
            school: team.school,
            division: team.division,
            slug: team.slug,
          },
          { role: membership.role },
          formattedMembers
        );
      })
    );

    return formattedTeams.filter((team) => team !== null) as TeamWithDetails[];
  }

  async getUserArchivedTeams(userId: string): Promise<TeamWithDetails[]> {
    // Get user's archived team memberships
    const membershipsResult = await dbPg
      .select()
      .from(newTeamMemberships)
      .where(and(eq(newTeamMemberships.userId, userId), eq(newTeamMemberships.status, "archived")))
      .orderBy(newTeamMemberships.joinedAt);

    if (membershipsResult.length === 0) {
      return [];
    }

    // Get archived team details for each membership
    const teamIds = membershipsResult.map((m) => m.teamId);
    const teamsResult = await dbPg
      .select({
        id: newTeamUnits.id,
        group_id: newTeamUnits.groupId,
        team_id: newTeamUnits.teamId,
        description: newTeamUnits.description,
        captain_code: newTeamUnits.captainCode,
        user_code: newTeamUnits.userCode,
        created_by: newTeamUnits.createdBy,
        created_at: newTeamUnits.createdAt,
        updated_at: newTeamUnits.updatedAt,
        status: newTeamUnits.status,
        school: newTeamGroups.school,
        division: newTeamGroups.division,
        slug: newTeamGroups.slug,
        group_created_at: newTeamGroups.createdAt,
      })
      .from(newTeamUnits)
      .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
      .where(
        and(
          inArray(newTeamUnits.id, teamIds),
          eq(newTeamUnits.status, "archived"),
          eq(newTeamGroups.status, "archived")
        )
      );

    // Format teams with members
    const formattedTeams = await Promise.all(
      membershipsResult.map(async (membership) => {
        const team = teamsResult.find((t) => t.id === membership.teamId);
        if (!team) {
          return null;
        }

        // Get team members
        const members = await this.getTeamMembers(team.id);
        const formattedMembers = await Promise.all(
          members.map(async (m) => {
            const userProfile = await getUserProfile(m.user_id);
            return formatMember(m, userProfile);
          })
        );

        return formatTeamWithDetails(
          {
            id: team.id,
            teamId: team.team_id,
            description: team.description,
            captainCode: team.captain_code,
            userCode: team.user_code,
            school: team.school,
            division: team.division,
            slug: team.slug,
          },
          { role: membership.role },
          formattedMembers
        );
      })
    );

    return formattedTeams.filter((team) => team !== null) as TeamWithDetails[];
  }

  async getTeamMembers(teamId: string): Promise<TeamMembership[]> {
    try {
      // Using Drizzle ORM to get team members
      const members = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(and(eq(newTeamMemberships.teamId, teamId), eq(newTeamMemberships.status, "active")))
        .orderBy(newTeamMemberships.joinedAt);

      // Convert to the expected format
      return members.map((member) => ({
        id: member.id,
        user_id: member.userId,
        team_id: member.teamId,
        role: member.role as "captain" | "co_captain" | "member" | "observer",
        joined_at: member.joinedAt?.toISOString() || new Date().toISOString(),
        invited_by: member.invitedBy || undefined,
        status: member.status as "active" | "inactive" | "pending" | "banned",
        permissions: member.permissions as Record<string, unknown> | undefined,
      }));
    } catch (error) {
      logger.error(
        "Failed to getTeamMembers",
        error instanceof Error ? error : new Error(String(error)),
        {
          teamId,
        }
      );
      return [];
    }
  }

  async createTeamGroup(data: {
    school: string;
    division: string;
    slug: string;
    createdBy: string;
  }): Promise<TeamGroup> {
    // SECURITY FIX: Always create a new team group instead of reusing existing ones
    // This prevents unauthorized access to existing teams when someone tries to create
    // a team with the same school+division combination

    // Generate unique slug
    const finalSlug = await generateUniqueSlug(data.slug);

    // Create the team group with the final slug
    const [result] = await dbPg
      .insert(newTeamGroups)
      .values({
        school: data.school,
        division: data.division,
        slug: finalSlug,
        createdBy: data.createdBy,
      })
      .returning();
    if (!result) {
      throw new Error("Failed to create team group");
    }
    return {
      id: result.id,
      school: result.school,
      division: result.division,
      slug: result.slug,
      created_by: result.createdBy,
      created_at: result.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: result.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  async createTeamUnit(data: {
    groupId: string;
    teamId: string;
    captainCode: string;
    userCode: string;
    description?: string;
    createdBy: string;
  }): Promise<TeamUnit> {
    const groupStatusResult = await dbPg
      .select({ status: newTeamGroups.status })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.id, data.groupId))
      .limit(1);

    const firstResult = groupStatusResult[0];
    if (firstResult && firstResult.status === "archived") {
      await dbPg
        .update(newTeamGroups)
        .set({
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(newTeamGroups.id, data.groupId));
    }

    // Generate next available team ID
    const nextTeamId = await generateNextTeamId(data.groupId);

    const [result] = await dbPg
      .insert(newTeamUnits)
      .values({
        groupId: data.groupId,
        teamId: nextTeamId,
        captainCode: data.captainCode,
        userCode: data.userCode,
        description: data.description || `Team ${nextTeamId}`,
        createdBy: data.createdBy,
        status: "active", // Explicitly set status to active
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create team unit");
    }
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
      updated_at: result.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  async createTeamMembership(data: {
    userId: string;
    teamId: string;
    role: string;
    status: string;
    invitedBy?: string;
  }): Promise<TeamMembership> {
    const existingMembership = await dbPg
      .select()
      .from(newTeamMemberships)
      .where(
        and(eq(newTeamMemberships.userId, data.userId), eq(newTeamMemberships.teamId, data.teamId))
      )
      .limit(1);

    if (existingMembership.length > 0) {
      const [updatedMembership] = await dbPg
        .update(newTeamMemberships)
        .set({
          role: data.role,
          status: data.status,
          joinedAt: new Date(), // Update joined_at to reflect the new join
        })
        .where(
          and(
            eq(newTeamMemberships.userId, data.userId),
            eq(newTeamMemberships.teamId, data.teamId)
          )
        )
        .returning();
      if (!updatedMembership) {
        throw new Error("Failed to update team membership");
      }
      await this.syncTeamPeopleEntry(data.userId, data.teamId, data.role);

      const result = {
        id: updatedMembership.id,
        user_id: updatedMembership.userId,
        team_id: updatedMembership.teamId,
        role: updatedMembership.role as "captain" | "co_captain" | "member" | "observer",
        joined_at: updatedMembership.joinedAt?.toISOString() || new Date().toISOString(),
        invited_by: updatedMembership.invitedBy || undefined,
        status: updatedMembership.status as "active" | "inactive" | "pending" | "banned",
        permissions: updatedMembership.permissions as Record<string, unknown> | undefined,
      };
      return result;
    }
    const [result] = await dbPg
      .insert(newTeamMemberships)
      .values({
        userId: data.userId,
        teamId: data.teamId,
        role: data.role,
        status: data.status,
        invitedBy: data.invitedBy,
      })
      .returning();
    if (!result) {
      throw new Error("Failed to create team membership");
    }
    await this.syncTeamPeopleEntry(data.userId, data.teamId, data.role);

    const finalResult = {
      id: result.id,
      user_id: result.userId,
      team_id: result.teamId,
      role: result.role as "captain" | "co_captain" | "member" | "observer",
      joined_at: result.joinedAt?.toISOString() || new Date().toISOString(),
      invited_by: result.invitedBy || undefined,
      status: result.status as "active" | "inactive" | "pending" | "banned",
      permissions: result.permissions as Record<string, unknown> | undefined,
    };
    return finalResult;
  }

  /**
   * Sync team people entry when team membership is created or updated
   */
  private async syncTeamPeopleEntry(userId: string, teamId: string, role: string): Promise<void> {
    try {
      const [userInfo] = await dbPg
        .select({
          display_name: users.displayName,
          username: users.username,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!userInfo) {
        return;
      }

      const displayName =
        userInfo.display_name ||
        userInfo.username ||
        userInfo.email?.split("@")[0] ||
        "Unknown User";
      const isAdmin = role === "captain" || role === "co_captain";
      const [existingEntry] = await dbPg
        .select({ id: newTeamPeople.id })
        .from(newTeamPeople)
        .where(and(eq(newTeamPeople.userId, userId), eq(newTeamPeople.teamUnitId, teamId)))
        .limit(1);

      if (existingEntry) {
        await dbPg
          .update(newTeamPeople)
          .set({
            name: displayName,
            isAdmin: isAdmin ? "true" : "false",
            updatedAt: new Date(),
          })
          .where(and(eq(newTeamPeople.userId, userId), eq(newTeamPeople.teamUnitId, teamId)));
      } else {
        await dbPg.insert(newTeamPeople).values({
          teamUnitId: teamId,
          name: displayName,
          userId,
          isAdmin: isAdmin ? "true" : "false",
          events: [],
        });
      }
    } catch (error) {
      logger.error(
        "Failed to syncTeamEventsToCalendar",
        error instanceof Error ? error : new Error(String(error)),
        {
          teamId,
        }
      );
      // Don't throw error to avoid breaking the main flow
    }
  }

  async joinTeamByCode(userId: string, code: string): Promise<TeamWithDetails | null> {
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
      })
      .from(newTeamUnits)
      .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
      .where(or(eq(newTeamUnits.captainCode, code), eq(newTeamUnits.userCode, code)));

    if (teams.length === 0) {
      return null;
    }

    const team = teams[0];
    if (!team) {
      throw new Error("Team not found");
    }
    const existingMemberships = await dbPg
      .select()
      .from(newTeamMemberships)
      .where(and(eq(newTeamMemberships.userId, userId), eq(newTeamMemberships.teamId, team.id)));

    if (existingMemberships.length > 0) {
      // User is already a member, return team details
      const members = await this.getTeamMembers(team.id);
      const firstMembership = existingMemberships[0];
      if (!firstMembership) {
        throw new Error("Membership not found");
      }
      const formattedMembers = await Promise.all(
        members.map(async (m) => {
          const userProfile = await getUserProfile(m.user_id);
          return formatMember(m, userProfile);
        })
      );
      return formatTeamWithDetails(
        {
          id: team.id,
          teamId: team.teamId,
          description: team.description,
          captainCode: team.captainCode,
          userCode: team.userCode,
          school: team.school,
          division: team.division,
          slug: team.slug,
        },
        { role: firstMembership.role },
        formattedMembers
      );
    }

    // Determine role based on code type
    const isCaptain = team.captainCode === code;
    const role = isCaptain ? "captain" : "member";
    const membership = await this.createTeamMembership({
      userId,
      teamId: team.id,
      role,
      status: "active",
    });
    const members = await this.getTeamMembers(team.id);
    const formattedMembers = await Promise.all(
      members.map(async (m) => {
        const userProfile = await getUserProfile(m.user_id);
        return formatMember(m, userProfile);
      })
    );
    return formatTeamWithDetails(
      {
        id: team.id,
        teamId: team.teamId,
        description: team.description,
        captainCode: team.captainCode,
        userCode: team.userCode,
        school: team.school,
        division: team.division,
        slug: team.slug,
      },
      { role: membership.role },
      formattedMembers
    );
  }
}

export const cockroachDBTeamsService = new CockroachDBTeamsService();
