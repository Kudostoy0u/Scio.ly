import { queryCockroachDB } from "@/lib/cockroachdb";
import { dbPg } from "@/lib/db";
import { newTeamAssignments } from "@/lib/db/schema/assignments";
import { users } from "@/lib/db/schema/core";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamPeople,
  newTeamRosterData,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { upsertUserProfile } from "@/lib/db/teams/utils";
import { cockroachDBTeamsService } from "@/lib/services/cockroachdb-teams";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logger";
import {
  checkTeamGroupAccessCockroach,
  checkTeamGroupLeadershipCockroach,
} from "@/lib/utils/team-auth";
import { getTeamAccess } from "@/lib/utils/team-auth-v2";
import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { protectedProcedure, router } from "@/lib/trpc/server";

// ============================================================================
// COMPREHENSIVE TEAMS TRPC ROUTER
// ============================================================================
// This router provides a complete, optimized teams backend using tRPC
// All operations are properly typed, validated, and use efficient queries

// Input/Output schemas
const CreateTeamInputSchema = z.object({
  school: z.string().min(1, "School name is required"),
  division: z.literal("B").or(z.literal("C")),
});

const JoinTeamInputSchema = z.object({
  code: z.string().min(1, "Team code is required"),
});

// Comprehensive validation schemas
// TeamMemberSchema removed - was causing output validation issues

// Roster data validation schema
const RosterDataSchema = z.object({
  roster: z.record(z.string(), z.array(z.string())),
  removedEvents: z.array(z.string()),
});

// Insert schemas for mutations
const InsertRosterDataSchema = createInsertSchema(newTeamRosterData);

// Removed unused schemas to avoid conflicts

// TeamSchema removed - was causing output validation issues

// Removed bypass logic - all auth checks are now enforced

// Helper function to ensure user has proper display name
async function ensureUserDisplayName(userId: string, userEmail?: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: existingProfile } = await supabase
      .from("users")
      .select("id, email, display_name, first_name, last_name, username")
      .eq("id", userId)
      .maybeSingle();

    const email = existingProfile?.email || userEmail;
    const currentDisplay = existingProfile?.display_name;
    const firstName = existingProfile?.first_name;
    const lastName = existingProfile?.last_name;
    const username = existingProfile?.username;

    const emailLocal = email?.includes("@") ? email.split("@")[0] : undefined;
    const derivedDisplayName = (() => {
      if (currentDisplay?.trim()) {
        return undefined;
      }
      if (firstName && lastName) {
        return `${firstName.trim()} ${lastName.trim()}`;
      }
      if (firstName?.trim()) {
        return firstName.trim();
      }
      if (lastName?.trim()) {
        return lastName.trim();
      }
      if (username?.trim()) {
        return username.trim();
      }
      if (emailLocal?.trim()) {
        return emailLocal.trim();
      }
      return undefined;
    })();

    if (derivedDisplayName && email) {
      logger.dev.structured("info", "Auto-filling display_name", {
        userId,
        derivedDisplayName,
      });
      await supabase.from("users").upsert(
        {
          id: userId,
          email,
          display_name: derivedDisplayName,
        },
        { onConflict: "id" }
      );
      await upsertUserProfile({
        id: userId,
        email,
        displayName: derivedDisplayName,
        username: username || emailLocal || undefined,
      });
    }
  } catch (error) {
    logger.warn("Failed to auto-fill display_name", error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const teamsRouter: any = router({
  // ============================================================================
  // DEVELOPMENT & TESTING ENDPOINTS
  // ============================================================================

  // Removed testAuth endpoint - no longer needed

  // ============================================================================
  // CORE TEAM OPERATIONS
  // ============================================================================

  // Get user teams
  getUserTeams: protectedProcedure.query(async ({ ctx }) => {
    try {
      const teams = await cockroachDBTeamsService.getUserTeams(ctx.user.id);
      return { teams };
    } catch (_error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user teams",
      });
    }
  }),

  // Create a new team
  createTeam: protectedProcedure.input(CreateTeamInputSchema).mutation(async ({ ctx, input }) => {
    try {
      // Ensure user has proper display name
      await ensureUserDisplayName(ctx.user.id, ctx.user.email);

      // Generate unique slug with timestamp to prevent collisions
      const baseSlug = `${input.school.toLowerCase().replace(/\s+/g, "-")}-${input.division.toLowerCase()}`;
      const timestamp = Date.now().toString(36);
      const slug = `${baseSlug}-${timestamp}`;

      // Create team group using CockroachDB
      const group = await cockroachDBTeamsService.createTeamGroup({
        school: input.school,
        division: input.division,
        slug,
        createdBy: ctx.user.id,
      });

      // Create default team unit using CockroachDB
      const team = await cockroachDBTeamsService.createTeamUnit({
        groupId: group.id,
        teamId: "A",
        captainCode: `CAP${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        userCode: `USR${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        description: "Team A",
        createdBy: ctx.user.id,
      });

      // Add creator as captain using CockroachDB
      await cockroachDBTeamsService.createTeamMembership({
        userId: ctx.user.id,
        teamId: team.id,
        role: "captain",
        status: "active",
      });

      // Get team members for response
      const members = await cockroachDBTeamsService.getTeamMembers(team.id);

      return {
        id: team.id,
        name: team.name,
        slug: group.slug,
        school: group.school,
        division: group.division as "B" | "C",
        description: team.description || null,
        captainCode: team.captain_code,
        userCode: team.user_code,
        userRole: "captain",
        members: await Promise.all(
          members.map(async (m) => {
            // Get user profile from Supabase instead of CockroachDB service
            const supabase = await createSupabaseServerClient();
            const { data: userProfile } = await supabase
              .from("users")
              .select("display_name, first_name, last_name, email")
              .eq("id", m.user_id)
              .single();

            return {
              id: m.user_id,
              name:
                userProfile?.display_name ||
                (userProfile?.first_name && userProfile?.last_name
                  ? `${userProfile.first_name} ${userProfile.last_name}`
                  : `User ${m.user_id.substring(0, 8)}`),
              email: userProfile?.email || `user-${m.user_id.substring(0, 8)}@example.com`,
              role: m.role as "captain" | "co_captain" | "member" | "observer",
              joinedAt: m.joined_at,
              subteamId: team.id,
              subteamName: team.name,
              events: [],
              isLinked: true,
            };
          })
        ),
        wasReactivated: team.created_at !== team.updated_at,
      };
    } catch (_error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create team",
      });
    }
  }),

  // Join a team by code
  joinTeam: protectedProcedure.input(JoinTeamInputSchema).mutation(async ({ ctx, input }) => {
    try {
      // Ensure user has proper display name
      await ensureUserDisplayName(ctx.user.id, ctx.user.email);

      const team = await cockroachDBTeamsService.joinTeamByCode(ctx.user.id, input.code);

      if (!team) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid team code",
        });
      }

      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        school: team.school,
        division: team.division as "B" | "C",
        description: team.description || null,
        captainCode: team.captain_code,
        userCode: team.user_code,
        userRole: team.user_role || null,
        members: team.members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role as "captain" | "co_captain" | "member" | "observer",
          joinedAt: m.joined_at,
          subteamId: team.id,
          subteamName: team.name,
          events: [],
          isLinked: true,
        })),
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to join team",
      });
    }
  }),

  // ============================================================================
  // TEAM DATA OPERATIONS (OPTIMIZED)
  // ============================================================================

  // Get subteams for a team
  getSubteams: protectedProcedure
    .input(z.object({ teamSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        const subteamsResult = await dbPg
          .select({
            id: newTeamUnits.id,
            teamId: newTeamUnits.teamId,
            description: newTeamUnits.description,
            createdAt: newTeamUnits.createdAt,
          })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")))
          .orderBy(newTeamUnits.createdAt);

        const subteams = subteamsResult.map((subteam) => ({
          id: subteam.id,
          name: subteam.teamId, // Use teamId directly (already includes "Team" prefix)
          team_id: groupId,
          description: subteam.description || "",
          created_at: subteam.createdAt?.toISOString() || new Date().toISOString(),
        }));

        return { subteams };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch subteams",
        });
      }
    }),

  // Get people/members for a subteam (optimized single query)
  getPeople: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Log only important business logic in development
        if (process.env.NODE_ENV === "development") {
        }

        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        // Only log important business logic
        if (process.env.NODE_ENV === "development") {
        }

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Get all team unit IDs for this group
        const teamUnits = await dbPg
          .select({ id: newTeamUnits.id })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")));

        const teamUnitIds = teamUnits.map((unit) => unit.id);

        // Build optimized single query with all necessary joins
        const whereConditions: any[] = [
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamUnits.status, "active"),
          eq(newTeamMemberships.status, "active"), // Only get active memberships
        ];

        if (input.subteamId && input.subteamId !== "all") {
          whereConditions.push(eq(newTeamMemberships.teamId, input.subteamId));
        }

        // First, get all users who have roster entries in this team (to include members without subteam membership)
        const usersWithRosterEntries = await dbPg
          .select({
            userId: newTeamRosterData.userId,
          })
          .from(newTeamRosterData)
          .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
          .where(
            and(
              eq(newTeamUnits.groupId, groupId),
              eq(newTeamUnits.status, "active"),
              isNotNull(newTeamRosterData.userId)
            )
          )
          .groupBy(newTeamRosterData.userId);

        const userIdsWithRoster = new Set(
          usersWithRosterEntries.map((r) => r.userId).filter((id): id is string => id !== null)
        );

        // Get members with subteam memberships
        const results = await dbPg
          .select({
            userId: newTeamMemberships.userId,
            role: newTeamMemberships.role,
            joinedAt: newTeamMemberships.joinedAt,
            subteamId: newTeamMemberships.teamId,
            subteamName: newTeamUnits.teamId, // Use actual subteam name (already includes "Team" prefix)
            email: users.email,
            displayName: users.displayName,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
          })
          .from(newTeamMemberships)
          .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
          .leftJoin(users, eq(newTeamMemberships.userId, users.id))
          .where(and(...whereConditions))
          .orderBy(newTeamMemberships.joinedAt);

        // Get users who have roster entries but no subteam membership (they should show as "Unknown")
        const membershipsUserIds = new Set(results.map((r) => r.userId));
        const userIdsWithoutSubteam = Array.from(userIdsWithRoster).filter(
          (id) => !membershipsUserIds.has(id)
        );

        const usersWithoutSubteam =
          userIdsWithoutSubteam.length > 0
            ? await dbPg
                .select({
                  id: users.id,
                  email: users.email,
                  displayName: users.displayName,
                  firstName: users.firstName,
                  lastName: users.lastName,
                  username: users.username,
                })
                .from(users)
                .where(inArray(users.id, userIdsWithoutSubteam))
            : [];

        // Add members without subteam membership to results
        const membersWithoutSubteam = usersWithoutSubteam.map((user) => {
          const displayName =
            user.displayName ||
            (user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.firstName ||
                user.lastName ||
                user.username ||
                `User ${user.id.substring(0, 8)}`);

          return {
            userId: user.id,
            role: "member",
            joinedAt: null,
            subteamId: null,
            subteamName: null,
            email: user.email || null,
            displayName: displayName,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
          };
        });

        // Only log important business logic
        if (process.env.NODE_ENV === "development") {
        }

        // Get roster data in a single optimized query to find events for each member
        const rosterData = await dbPg
          .select({
            eventName: newTeamRosterData.eventName,
            studentName: newTeamRosterData.studentName,
            userId: newTeamRosterData.userId,
            teamUnitId: newTeamRosterData.teamUnitId,
          })
          .from(newTeamRosterData)
          .where(
            input.subteamId
              ? eq(newTeamRosterData.teamUnitId, input.subteamId)
              : inArray(newTeamRosterData.teamUnitId, teamUnitIds)
          );

        // Get roster entries (unlinked people) from newTeamPeople table with subteam names
        const rosterEntries = await dbPg
          .select({
            name: newTeamPeople.name,
            userId: newTeamPeople.userId,
            events: newTeamPeople.events,
            teamUnitId: newTeamPeople.teamUnitId,
            subteamName: newTeamUnits.teamId, // Get the subteam name (already includes "Team" prefix)
          })
          .from(newTeamPeople)
          .leftJoin(newTeamUnits, eq(newTeamPeople.teamUnitId, newTeamUnits.id))
          .where(
            input.subteamId
              ? eq(newTeamPeople.teamUnitId, input.subteamId)
              : inArray(newTeamPeople.teamUnitId, teamUnitIds)
          );

        // Get subteam names for unlinked people
        const subteamNames = await dbPg
          .select({
            id: newTeamUnits.id,
            teamId: newTeamUnits.teamId,
          })
          .from(newTeamUnits)
          .where(
            input.subteamId
              ? eq(newTeamUnits.id, input.subteamId)
              : inArray(newTeamUnits.id, teamUnitIds)
          );

        const subteamNameMap = new Map(subteamNames.map((s) => [s.id, s.teamId]));

        // Extract unlinked people from roster data (those without userId)
        const unlinkedRosterPeople = rosterData
          .filter((rd) => !rd.userId && rd.studentName)
          .map((rd) => ({
            name: rd.studentName,
            userId: null,
            events: [rd.eventName],
            teamUnitId: rd.teamUnitId,
            subteamName: subteamNameMap.get(rd.teamUnitId) || "Unknown",
          }));

        // Combine roster entries from newTeamPeople and unlinked people from roster data
        const allRosterEntries = [...rosterEntries, ...unlinkedRosterPeople];

        // Debug logging for roster entries
        if (process.env.NODE_ENV === "development") {
        }

        // Build member events lookup for linked users
        const memberEvents: Record<string, string[]> = {};
        rosterData.forEach((rd) => {
          if (rd.userId && rd.eventName) {
            const userId = rd.userId;
            const eventName = rd.eventName;
            if (!memberEvents[userId]) {
              memberEvents[userId] = [];
            }
            if (!memberEvents[userId]?.includes(eventName)) {
              memberEvents[userId]?.push(eventName);
            }
          }
        });

        // Process linked members (from team memberships)
        const linkedMembers = results.map((result) => {
          // Use optimized display name generation
          const displayName =
            result.displayName ||
            (result.firstName && result.lastName
              ? `${result.firstName} ${result.lastName}`
              : result.firstName ||
                result.lastName ||
                result.username ||
                `User ${result.userId.substring(0, 8)}`);

          return {
            userId: result.userId,
            role: result.role,
            joinedAt: result.joinedAt || null,
            subteamId: result.subteamId || null,
            subteamName: result.subteamName || null,
            email: result.email || null,
            displayFirstName: displayName,
            displayLastName: "",
            hasRosterEntry: result.userId ? (memberEvents[result.userId]?.length ?? 0) > 0 : false,
            hasPendingInvite: false,
            events: memberEvents[result.userId] || [],
            isLinked: true,
          };
        });

        // Process members without subteam membership
        const membersWithoutSubteamProcessed = membersWithoutSubteam.map((result) => {
          return {
            userId: result.userId,
            role: result.role,
            joinedAt: result.joinedAt || null,
            subteamId: null,
            subteamName: null, // Will show as "Unknown"
            email: result.email || null,
            displayFirstName: result.displayName || null,
            displayLastName: "",
            hasRosterEntry: result.userId ? (memberEvents[result.userId]?.length ?? 0) > 0 : false,
            hasPendingInvite: false,
            events: memberEvents[result.userId] || [],
            isLinked: true,
          };
        });

        // Process roster entries (unlinked people)
        const rosterMembers = allRosterEntries.map((entry) => {
          const events = Array.isArray(entry.events) ? entry.events : [];
          return {
            userId: entry.userId, // null for unlinked
            role: "member",
            joinedAt: null,
            subteamId: entry.teamUnitId,
            subteamName: entry.subteamName || "Unknown",
            email: null,
            displayFirstName: entry.name,
            displayLastName: "",
            hasRosterEntry: events.length > 0,
            hasPendingInvite: false,
            events: events,
            isLinked: !!entry.userId,
          };
        });

        // Combine linked members and roster entries, avoiding duplicates
        const linkedUserIds = new Set(linkedMembers.map((m) => m.userId));
        const uniqueRosterMembers = rosterMembers.filter(
          (entry) => !(entry.userId && linkedUserIds.has(entry.userId))
        );

        // Debug logging for roster members filtering
        if (process.env.NODE_ENV === "development") {
        }

        // Merge roster data into linked members if they have roster entries
        const membersWithRosterData = linkedMembers.map((linkedMember) => {
          const rosterEntry = rosterMembers.find((entry) => entry.userId === linkedMember.userId);
          if (rosterEntry) {
            if (process.env.NODE_ENV === "development") {
            }
            return {
              ...linkedMember,
              events: [...(linkedMember.events || []), ...(rosterEntry.events || [])],
              hasRosterEntry: true,
            };
          }
          return linkedMember;
        });

        const members = [
          ...membersWithRosterData,
          ...membersWithoutSubteamProcessed,
          ...uniqueRosterMembers,
        ];

        // Only log important business logic
        if (process.env.NODE_ENV === "development") {
        }

        return { members };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch team members",
        });
      }
    }),

  // Get members for a subteam (alias for getPeople with same optimization)
  getMembers: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<{ members: Array<{
      id: string | null;
      name: string | null;
      email: string | null;
      role: string;
      events: string[];
      isPendingInvitation: boolean;
      subteamId: string | null;
      isUnlinked: boolean;
      username: string | null;
      subteam?: { id: string; name: string; description: string };
      joinedAt: Date | null;
      isCreator: boolean;
    }> }> => {
      // Delegate to getPeople for consistency and optimization
      // Use type assertion to avoid circular reference issue
      const peopleResult = await (teamsRouter as any).createCaller({ user: ctx.user }).getPeople(input);

      // Map the getPeople result to match TeamMemberSchema
      const validatedMembers = peopleResult.members.map((member: {
        userId: string | null;
        displayFirstName: string | null;
        email: string | null;
        role: string;
        events: string[];
        hasPendingInvite: boolean;
        subteamId: string | null;
        isLinked: boolean;
        subteamName?: string | null;
        joinedAt?: Date | null;
      }) => ({
        id: member.userId || null,
        name: member.displayFirstName || null,
        email: member.email || null,
        role: member.role || "member",
        events: member.events || [],
        isPendingInvitation: member.hasPendingInvite,
        subteamId: member.subteamId,
        isUnlinked: !member.isLinked,
        username: null, // Not available in getPeople result
        subteam: member.subteamName
          ? {
              id: member.subteamId || "",
              name: member.subteamName,
              description: member.subteamName,
            }
          : undefined,
        joinedAt: member.joinedAt || null,
        isCreator: false, // Not available in getPeople result
      }));

      return { members: validatedMembers };
    }),

  // ============================================================================
  // ROSTER OPERATIONS (OPTIMIZED)
  // ============================================================================

  // Get roster for a subteam (optimized single query)
  getRoster: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(input.subteamId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid subteam ID format" });
        }

        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug))
          .limit(1);

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const authResult = await checkTeamGroupAccessCockroach(ctx.user.id, groupId);
        if (!authResult.isAuthorized) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Single optimized query for roster data using Drizzle
        const rosterResult = await dbPg
          .select({
            eventName: newTeamRosterData.eventName,
            slotIndex: newTeamRosterData.slotIndex,
            studentName: newTeamRosterData.studentName,
            userId: newTeamRosterData.userId,
          })
          .from(newTeamRosterData)
          .where(eq(newTeamRosterData.teamUnitId, input.subteamId))
          .orderBy(newTeamRosterData.eventName, newTeamRosterData.slotIndex);

        // Removed events functionality not available in current schema
        // TODO: Add removed events table if needed

        // Build roster object efficiently
        const roster: Record<string, string[]> = {};
        rosterResult.forEach((row) => {
          // Convert "and" back to "&" for UI display
          const displayEventName = row.eventName.replace(/and/g, "&");
          if (!roster[displayEventName]) {
            roster[displayEventName] = [];
          }
          roster[displayEventName][row.slotIndex] = row.studentName || "";
        });

        const removedEvents: string[] = []; // Empty for now since table doesn't exist

        // Debug logging
        if (process.env.NODE_ENV === "development") {
        }

        const result = { roster, removedEvents };

        // Validate output with Zod
        const validatedResult = RosterDataSchema.parse(result);

        return validatedResult;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch roster data",
        });
      }
    }),

  // ============================================================================
  // BATCH LOADING (OPTIMIZED)
  // ============================================================================

  // Batch load all team data for hydration (single optimized call)
  batchLoadTeamData: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().optional(),
        includeRoster: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Use the optimized individual procedures for consistency
        const [subteamsRes, membersRes, rosterRes] = await Promise.allSettled([
          // Fetch subteams
          teamsRouter
            .createCaller({ user: ctx.user })
            .getSubteams({ teamSlug: input.teamSlug })
            .then((result: { subteams: unknown[] }) => result.subteams),

          // Fetch members if subteamId provided
          input.subteamId
            ? teamsRouter
                .createCaller({ user: ctx.user })
                .getPeople({ teamSlug: input.teamSlug, subteamId: input.subteamId })
                .then((result: { members: unknown[] }) => result.members)
            : Promise.resolve(null),

          // Fetch roster if requested
          input.includeRoster && input.subteamId && input.subteamId !== "all"
            ? teamsRouter
                .createCaller({ user: ctx.user })
                .getRoster({ teamSlug: input.teamSlug, subteamId: input.subteamId })
            : Promise.resolve(null),
        ]);

        return {
          subteams: subteamsRes.status === "fulfilled" ? subteamsRes.value : null,
          members: membersRes.status === "fulfilled" ? membersRes.value : null,
          roster: rosterRes.status === "fulfilled" ? rosterRes.value : null,
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to batch load team data",
        });
      }
    }),

  // ============================================================================
  // SUBTEAM MANAGEMENT
  // ============================================================================

  createSubteam: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        name: z.string().min(1, "Subteam name is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access
        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Check if user has leadership access
        const hasLeadership =
          teamAccess.isCreator ||
          teamAccess.subteamMemberships.some((m) => ["captain", "co_captain"].includes(m.role));

        if (!hasLeadership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only captains and co-captains can create subteams",
          });
        }

        // Check if a subteam with this name already exists
        const existingSubteam = await dbPg
          .select({ teamId: newTeamUnits.teamId })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.teamId, input.name)));

        if (existingSubteam.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A subteam with this name already exists",
          });
        }

        // Create new subteam using Drizzle ORM
        const [newSubteam] = await dbPg
          .insert(newTeamUnits)
          .values({
            groupId: groupId,
            teamId: input.name,
            description: input.name,
            captainCode: `CAP${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            userCode: `USR${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            createdBy: ctx.user.id,
          })
          .returning();

        if (!newSubteam) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create subteam",
          });
        }

        return {
          id: newSubteam.id,
          name: newSubteam.teamId,
          team_id: groupId,
          description: newSubteam.description || "",
          created_at: newSubteam.createdAt,
        };
      } catch (error) {
        logger.error("Failed to create subteam:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create subteam",
        });
      }
    }),

  updateSubteam: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string(),
        name: z.string().min(1, "Subteam name is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access
        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Check if user has leadership access
        const hasLeadership =
          teamAccess.isCreator ||
          teamAccess.subteamMemberships.some((m) => ["captain", "co_captain"].includes(m.role));

        if (!hasLeadership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only captains and co-captains can update subteams",
          });
        }

        // Update subteam using Drizzle ORM
        const [updatedSubteam] = await dbPg
          .update(newTeamUnits)
          .set({
            teamId: input.name,
            updatedAt: new Date(),
          })
          .where(and(eq(newTeamUnits.id, input.subteamId), eq(newTeamUnits.groupId, groupId)))
          .returning();

        if (!updatedSubteam) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subteam not found",
          });
        }

        return {
          id: updatedSubteam.id,
          name: updatedSubteam.description || `Team ${updatedSubteam.teamId}`,
          team_id: groupId,
          description: updatedSubteam.description || "",
          created_at: updatedSubteam.createdAt,
        };
      } catch (error) {
        logger.error("Failed to update subteam:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update subteam",
        });
      }
    }),

  deleteSubteam: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access
        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Check if user has leadership access
        const hasLeadership =
          teamAccess.isCreator ||
          teamAccess.subteamMemberships.some((m) => ["captain", "co_captain"].includes(m.role));

        if (!hasLeadership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only captains and co-captains can delete subteams",
          });
        }

        // Delete subteam using Drizzle ORM (soft delete by setting status to 'deleted')
        const [deletedSubteam] = await dbPg
          .update(newTeamUnits)
          .set({
            status: "deleted",
            updatedAt: new Date(),
          })
          .where(and(eq(newTeamUnits.id, input.subteamId), eq(newTeamUnits.groupId, groupId)))
          .returning();

        if (!deletedSubteam) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subteam not found",
          });
        }

        return { success: true };
      } catch (error) {
        logger.error("Failed to delete subteam:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete subteam",
        });
      }
    }),

  // ============================================================================
  // ROSTER MANAGEMENT
  // ============================================================================

  updateRoster: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string().min(1, "Team slug is required"),
        subteamId: z.string().uuid("Invalid subteam ID format"),
        eventName: z.string().min(1, "Event name is required"),
        slotIndex: z.number().int().min(0, "Slot index must be non-negative"),
        studentName: z.string().min(1, "Student name is required"),
        userId: z.string().uuid("Invalid user ID format").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access
        // Check if user has access to this team group
        const authResult = await checkTeamGroupAccessCockroach(ctx.user.id, groupId);
        if (!authResult.isAuthorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to access this team",
          });
        }

        // Check if the subteam belongs to this group
        const subteamResult = await dbPg
          .select({ id: newTeamUnits.id })
          .from(newTeamUnits)
          .where(
            and(
              eq(newTeamUnits.id, input.subteamId),
              eq(newTeamUnits.groupId, groupId),
              eq(newTeamUnits.status, "active")
            )
          );

        if (subteamResult.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subteam not found",
          });
        }

        // Convert "&" back to "and" in event names for database storage
        const normalizedEventName = input.eventName.replace(/&/g, "and");

        // Determine user ID to link - use provided userId if available, otherwise auto-link by name
        let userIdToLink: string | null = null;

        if (input.userId) {
          // Use the explicitly provided userId
          userIdToLink = input.userId;
        } else if (input.studentName?.trim()) {
          // Auto-link by matching student name to team members
          const teamMembersResult = await dbPg
            .select({
              userId: users.id,
              displayName: users.displayName,
              firstName: users.firstName,
              lastName: users.lastName,
            })
            .from(users)
            .innerJoin(newTeamMemberships, eq(users.id, newTeamMemberships.userId))
            .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
            .where(
              and(
                eq(newTeamUnits.groupId, groupId),
                eq(newTeamMemberships.status, "active"),
                eq(newTeamUnits.status, "active")
              )
            );

          // Try to find a matching team member
          const studentNameLower = input.studentName.toLowerCase().trim();
          for (const member of teamMembersResult) {
            const displayName =
              member.displayName ||
              (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : "");

            if (displayName) {
              const memberNameLower = displayName.toLowerCase().trim();

              // Exact case-insensitive match only
              if (memberNameLower === studentNameLower) {
                userIdToLink = member.userId;
                break;
              }
            }
          }
        }

        // Validate roster data with Drizzle Zod schema
        const rosterDataToInsert = InsertRosterDataSchema.parse({
          teamUnitId: input.subteamId,
          eventName: normalizedEventName,
          slotIndex: input.slotIndex,
          studentName: input.studentName || null,
          userId: userIdToLink,
          updatedAt: new Date(),
        });

        // Upsert roster data with user_id if we found a match
        await dbPg
          .insert(newTeamRosterData)
          .values(rosterDataToInsert)
          .onConflictDoUpdate({
            target: [
              newTeamRosterData.teamUnitId,
              newTeamRosterData.eventName,
              newTeamRosterData.slotIndex,
            ],
            set: {
              studentName: input.studentName || null,
              userId: userIdToLink,
              updatedAt: new Date(),
            },
          });

        const result = { message: "Roster data saved successfully" };

        // Validate output
        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to update roster:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update roster",
        });
      }
    }),

  // ============================================================================
  // ASSIGNMENTS MANAGEMENT
  // ============================================================================

  getAssignments: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string().min(1, "Team slug is required"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access ONCE
        const authResult = await checkTeamGroupAccessCockroach(ctx.user.id, groupId);
        if (!authResult.isAuthorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to access this team",
          });
        }

        // Get all subteams for this group
        const subteams = await dbPg
          .select({ id: newTeamUnits.id })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")));

        const subteamIds = subteams.map((s) => s.id);

        if (subteamIds.length === 0) {
          return { assignments: [] };
        }

        // Get assignments for all subteams
        const assignments = await dbPg
          .select({
            id: newTeamAssignments.id,
            title: newTeamAssignments.title,
            description: newTeamAssignments.description,
            assignmentType: newTeamAssignments.assignmentType,
            dueDate: newTeamAssignments.dueDate,
            points: newTeamAssignments.points,
            isRequired: newTeamAssignments.isRequired,
            maxAttempts: newTeamAssignments.maxAttempts,
            timeLimitMinutes: newTeamAssignments.timeLimitMinutes,
            createdAt: newTeamAssignments.createdAt,
            updatedAt: newTeamAssignments.updatedAt,
            createdBy: newTeamAssignments.createdBy,
            teamId: newTeamAssignments.teamId,
          })
          .from(newTeamAssignments)
          .where(inArray(newTeamAssignments.teamId, subteamIds))
          .orderBy(
            sql`${newTeamAssignments.dueDate} ASC NULLS LAST`,
            sql`${newTeamAssignments.createdAt} DESC`
          );

        return { assignments };
      } catch (error) {
        logger.error("Failed to get assignments:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get assignments",
        });
      }
    }),

  // ============================================================================
  // COMPREHENSIVE TEAM DASHBOARD - SINGLE ENDPOINT FOR ALL DATA
  // ============================================================================

  getTeamDashboard: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string().min(1, "Team slug is required"),
        subteamId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID ONCE
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access ONCE for everything
        const authResult = await checkTeamGroupAccessCockroach(ctx.user.id, groupId);
        if (!authResult.isAuthorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to access this team",
          });
        }

        // Get all subteams for this group
        const subteams = await dbPg
          .select({
            id: newTeamUnits.id,
            teamId: newTeamUnits.teamId,
            description: newTeamUnits.description,
            createdAt: newTeamUnits.createdAt,
          })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")));

        const subteamIds = subteams.map((s) => s.id);

        // Get all data in parallel using Promise.all
        const [assignments, allMembers, rosterData] = await Promise.all([
          // Get assignments for all subteams
          subteamIds.length > 0
            ? dbPg
                .select({
                  id: newTeamAssignments.id,
                  title: newTeamAssignments.title,
                  description: newTeamAssignments.description,
                  assignmentType: newTeamAssignments.assignmentType,
                  dueDate: newTeamAssignments.dueDate,
                  points: newTeamAssignments.points,
                  isRequired: newTeamAssignments.isRequired,
                  maxAttempts: newTeamAssignments.maxAttempts,
                  timeLimitMinutes: newTeamAssignments.timeLimitMinutes,
                  createdAt: newTeamAssignments.createdAt,
                  updatedAt: newTeamAssignments.updatedAt,
                  createdBy: newTeamAssignments.createdBy,
                  teamId: newTeamAssignments.teamId,
                })
                .from(newTeamAssignments)
                .where(inArray(newTeamAssignments.teamId, subteamIds))
                .orderBy(
                  sql`${newTeamAssignments.dueDate} ASC NULLS LAST`,
                  sql`${newTeamAssignments.createdAt} DESC`
                )
            : [],

          // Get all team members
          dbPg
            .select({
              userId: users.id,
              displayName: users.displayName,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              role: newTeamMemberships.role,
              joinedAt: newTeamMemberships.joinedAt,
              subteamId: newTeamUnits.id,
            })
            .from(users)
            .innerJoin(newTeamMemberships, eq(users.id, newTeamMemberships.userId))
            .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
            .where(
              and(
                eq(newTeamUnits.groupId, groupId),
                eq(newTeamMemberships.status, "active"),
                eq(newTeamUnits.status, "active")
              )
            ),

          // Get roster data for specific subteam or all subteams
          input.subteamId
            ? dbPg
                .select({
                  eventName: newTeamRosterData.eventName,
                  studentName: newTeamRosterData.studentName,
                  slotIndex: newTeamRosterData.slotIndex,
                  userId: newTeamRosterData.userId,
                })
                .from(newTeamRosterData)
                .where(eq(newTeamRosterData.teamUnitId, input.subteamId))
                .orderBy(newTeamRosterData.eventName, newTeamRosterData.slotIndex)
            : [],
        ]);

        // Process roster data into the expected format
        const processedRoster: Record<string, string[]> = {};
        for (const entry of rosterData) {
          if (!entry.eventName || entry.slotIndex === undefined) {
            continue;
          }
          const eventName = entry.eventName;
          if (!processedRoster[eventName]) {
            processedRoster[eventName] = [];
          }
          // Ensure array is large enough
          const rosterArray = processedRoster[eventName];
          if (rosterArray) {
            while (rosterArray.length <= entry.slotIndex) {
              rosterArray.push("");
            }
            rosterArray[entry.slotIndex] = entry.studentName || "";
          }
        }

        // Process members data
        const processedMembers = allMembers.map((member) => ({
          userId: member.userId,
          displayFirstName:
            member.displayName || `${member.firstName || ""} ${member.lastName || ""}`.trim(),
          role: member.role,
          subteamId: member.subteamId,
          isLinked: true,
        }));

        return {
          subteams: subteams.map((s) => ({
            id: s.id,
            name: s.description || s.teamId,
            team_id: s.teamId,
            created_at: s.createdAt,
          })),
          assignments,
          members: processedMembers,
          roster: processedRoster,
          auth: {
            isAuthorized: authResult.isAuthorized,
            hasMembership: authResult.hasMembership,
            hasRosterEntry: authResult.hasRosterEntry,
            role: authResult.role,
          },
        };
      } catch (error) {
        logger.error("Failed to get team dashboard:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get team dashboard",
        });
      }
    }),

  // ============================================================================
  // MULTIPLEXED TEAM PAGE INITIALIZATION - ULTIMATE OPTIMIZATION
  // ============================================================================
  // This endpoint combines ALL initial page load requests into ONE:
  // - getUserTeams (for sidebar)
  // - getSubteams (for subteam selector)
  // - getTeamDashboard (for main content)
  // - getRoster (for first subteam)
  // Reduces 3 separate HTTP requests to 1, with single auth check

  getTeamPageData: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string().min(1, "Team slug is required"),
        includeRoster: z.boolean().optional().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID ONCE
        const groupResult = await dbPg
          .select({
            id: newTeamGroups.id,
            school: newTeamGroups.school,
            division: newTeamGroups.division,
            slug: newTeamGroups.slug,
          })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const group = groupResult[0];
        if (!group) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }
        const groupId = group.id;

        // Parallel execution: get user teams AND check team access at the same time
        const [userTeamsResult, authResult] = await Promise.all([
          // Get all user's teams for sidebar
          cockroachDBTeamsService.getUserTeams(ctx.user.id),
          // Check team access for this specific team
          checkTeamGroupAccessCockroach(ctx.user.id, groupId),
        ]);

        if (!authResult.isAuthorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to access this team",
          });
        }

        // Get all subteams for this group
        const subteams = await dbPg
          .select({
            id: newTeamUnits.id,
            teamId: newTeamUnits.teamId,
            description: newTeamUnits.description,
            createdAt: newTeamUnits.createdAt,
          })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")))
          .orderBy(newTeamUnits.createdAt);

        const subteamIds = subteams.map((s) => s.id);
        const firstSubteamId = subteams[0]?.id;

        // Get ALL remaining data in parallel
        const [assignments, allMembers, rosterData] = await Promise.all([
          // Get assignments for all subteams
          subteamIds.length > 0
            ? dbPg
                .select({
                  id: newTeamAssignments.id,
                  title: newTeamAssignments.title,
                  description: newTeamAssignments.description,
                  assignmentType: newTeamAssignments.assignmentType,
                  dueDate: newTeamAssignments.dueDate,
                  points: newTeamAssignments.points,
                  isRequired: newTeamAssignments.isRequired,
                  maxAttempts: newTeamAssignments.maxAttempts,
                  timeLimitMinutes: newTeamAssignments.timeLimitMinutes,
                  createdAt: newTeamAssignments.createdAt,
                  updatedAt: newTeamAssignments.updatedAt,
                  createdBy: newTeamAssignments.createdBy,
                  teamId: newTeamAssignments.teamId,
                })
                .from(newTeamAssignments)
                .where(inArray(newTeamAssignments.teamId, subteamIds))
                .orderBy(
                  sql`${newTeamAssignments.dueDate} ASC NULLS LAST`,
                  sql`${newTeamAssignments.createdAt} DESC`
                )
            : [],

          // Get all team members across all subteams
          dbPg
            .select({
              userId: users.id,
              displayName: users.displayName,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              role: newTeamMemberships.role,
              joinedAt: newTeamMemberships.joinedAt,
              subteamId: newTeamUnits.id,
              subteamName: newTeamUnits.teamId,
            })
            .from(users)
            .innerJoin(newTeamMemberships, eq(users.id, newTeamMemberships.userId))
            .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
            .where(
              and(
                eq(newTeamUnits.groupId, groupId),
                eq(newTeamMemberships.status, "active"),
                eq(newTeamUnits.status, "active")
              )
            ),

          // Get roster data for first subteam (if enabled and exists)
          input.includeRoster && firstSubteamId
            ? dbPg
                .select({
                  eventName: newTeamRosterData.eventName,
                  studentName: newTeamRosterData.studentName,
                  slotIndex: newTeamRosterData.slotIndex,
                  userId: newTeamRosterData.userId,
                  teamUnitId: newTeamRosterData.teamUnitId,
                })
                .from(newTeamRosterData)
                .where(eq(newTeamRosterData.teamUnitId, firstSubteamId))
                .orderBy(newTeamRosterData.eventName, newTeamRosterData.slotIndex)
            : [],
        ]);

        // Process roster data into the expected format
        const processedRoster: Record<string, string[]> = {};
        for (const entry of rosterData) {
          // Convert "and" back to "&" for UI display
          const displayEventName = entry.eventName.replace(/and/g, "&");
          if (!processedRoster[displayEventName]) {
            processedRoster[displayEventName] = [];
          }
          // Ensure array is large enough
          while (processedRoster[displayEventName].length <= entry.slotIndex) {
            processedRoster[displayEventName].push("");
          }
          processedRoster[displayEventName][entry.slotIndex] = entry.studentName || "";
        }

        // Process members data with subteam information
        const processedMembers = allMembers.map((member) => ({
          userId: member.userId,
          displayFirstName:
            member.displayName || `${member.firstName || ""} ${member.lastName || ""}`.trim(),
          email: member.email,
          role: member.role,
          subteamId: member.subteamId,
          subteamName: member.subteamName,
          joinedAt: member.joinedAt,
          isLinked: true,
        }));

        return {
          // User's all teams (for sidebar navigation)
          userTeams: userTeamsResult,

          // Current team info
          currentTeam: {
            id: groupId,
            school: group.school,
            division: group.division as "B" | "C",
            slug: group.slug,
          },

          // Subteams for this team
          subteams: subteams.map((s) => ({
            id: s.id,
            name: s.teamId,
            team_id: groupId,
            description: s.description || "",
            created_at: s.createdAt?.toISOString() || new Date().toISOString(),
          })),

          // Assignments for all subteams
          assignments,

          // Members across all subteams
          members: processedMembers,

          // Roster for first subteam (if requested)
          roster: processedRoster,
          rosterSubteamId: firstSubteamId || null,

          // Authorization info
          auth: {
            isAuthorized: authResult.isAuthorized,
            hasMembership: authResult.hasMembership,
            hasRosterEntry: authResult.hasRosterEntry,
            role: authResult.role,
          },
        };
      } catch (error) {
        logger.error("Failed to get team page data:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get team page data",
        });
      }
    }),

  // NEW: Bulk roster update endpoint for better performance
  updateRosterBulk: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string().min(1, "Team slug is required"),
        subteamId: z.string().uuid("Invalid subteam ID format"),
        rosterEntries: z.array(
          z.object({
            eventName: z.string().min(1, "Event name is required"),
            slotIndex: z.number().int().min(0, "Slot index must be non-negative"),
            studentName: z.string().min(1, "Student name is required"),
            userId: z.string().uuid("Invalid user ID format").optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access ONCE for the entire batch
        const authResult = await checkTeamGroupAccessCockroach(ctx.user.id, groupId);
        if (!authResult.isAuthorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to access this team",
          });
        }

        // Check if the subteam belongs to this group ONCE
        const subteamResult = await dbPg
          .select({ id: newTeamUnits.id })
          .from(newTeamUnits)
          .where(
            and(
              eq(newTeamUnits.id, input.subteamId),
              eq(newTeamUnits.groupId, groupId),
              eq(newTeamUnits.status, "active")
            )
          );

        if (subteamResult.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subteam not found",
          });
        }

        // Get team members ONCE for the entire batch
        const teamMembersResult = await dbPg
          .select({
            userId: users.id,
            displayName: users.displayName,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .innerJoin(newTeamMemberships, eq(users.id, newTeamMemberships.userId))
          .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
          .where(
            and(
              eq(newTeamUnits.groupId, groupId),
              eq(newTeamMemberships.status, "active"),
              eq(newTeamUnits.status, "active")
            )
          );

        // Create a lookup map for faster name matching
        const memberLookup = new Map<string, string>();
        for (const member of teamMembersResult) {
          const displayName =
            member.displayName ||
            (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : "");

          if (displayName) {
            memberLookup.set(displayName.toLowerCase().trim(), member.userId);
          }
        }

        // Prepare all roster entries for bulk insert
        const rosterEntriesToInsert = input.rosterEntries.map((entry) => {
          const normalizedEventName = entry.eventName.replace(/&/g, "and");

          // Fast lookup for user ID
          let userIdToLink: string | null = null;
          if (entry.userId) {
            userIdToLink = entry.userId;
          } else if (entry.studentName?.trim()) {
            const studentNameLower = entry.studentName.toLowerCase().trim();
            userIdToLink = memberLookup.get(studentNameLower) || null;
          }

          return {
            teamUnitId: input.subteamId,
            eventName: normalizedEventName,
            slotIndex: entry.slotIndex,
            studentName: entry.studentName || null,
            userId: userIdToLink,
            updatedAt: new Date(),
          };
        });

        // Bulk upsert all roster entries
        if (rosterEntriesToInsert.length > 0) {
          await dbPg
            .insert(newTeamRosterData)
            .values(rosterEntriesToInsert)
            .onConflictDoUpdate({
              target: [
                newTeamRosterData.teamUnitId,
                newTeamRosterData.eventName,
                newTeamRosterData.slotIndex,
              ],
              set: {
                studentName: sql`excluded.student_name`,
                userId: sql`excluded.user_id`,
                updatedAt: new Date(),
              },
            });
        }

        return {
          message: `Bulk roster update completed for ${rosterEntriesToInsert.length} entries`,
        };
      } catch (error) {
        logger.error("Failed to update roster bulk:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update roster bulk",
        });
      }
    }),

  removeRosterEntry: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string(),
        eventName: z.string(),
        userId: z.string().optional(),
        studentName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access
        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Ensure user has leadership privileges in this group
        const leadershipResult = await checkTeamGroupLeadershipCockroach(ctx.user.id, groupId);
        if (!leadershipResult.hasLeadership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only captains and co-captains can modify roster",
          });
        }

        let removedEntries = 0;

        if (input.userId) {
          if (input.eventName?.trim()) {
            // Remove specific event entries for this user
            const deleteByUserEvent = await dbPg
              .delete(newTeamRosterData)
              .where(
                and(
                  eq(newTeamRosterData.userId, input.userId),
                  eq(newTeamRosterData.eventName, input.eventName.trim()),
                  sql`${newTeamRosterData.teamUnitId} IN (
                    SELECT id FROM new_team_units WHERE group_id = ${groupId} AND status = 'active'
                  )`
                )
              )
              .returning({ teamUnitId: newTeamRosterData.teamUnitId });

            removedEntries = deleteByUserEvent.length;
          } else if (input.subteamId) {
            // Remove roster entries and team membership for this user from specific subteam only
            const deleteByUserSubteam = await dbPg
              .delete(newTeamRosterData)
              .where(
                and(
                  eq(newTeamRosterData.userId, input.userId),
                  eq(newTeamRosterData.teamUnitId, input.subteamId)
                )
              )
              .returning({ teamUnitId: newTeamRosterData.teamUnitId });

            removedEntries = deleteByUserSubteam.length;

            // Also remove team membership for this user from the specific subteam
            await dbPg
              .delete(newTeamMemberships)
              .where(
                and(
                  eq(newTeamMemberships.userId, input.userId),
                  eq(newTeamMemberships.teamId, input.subteamId)
                )
              );
          } else {
            // Remove all roster entries AND team memberships for this user across the group
            const deleteByUser = await dbPg
              .delete(newTeamRosterData)
              .where(
                and(
                  eq(newTeamRosterData.userId, input.userId),
                  sql`${newTeamRosterData.teamUnitId} IN (
                      SELECT id FROM new_team_units WHERE group_id = ${groupId} AND status = 'active'
                    )`
                )
              )
              .returning({ teamUnitId: newTeamRosterData.teamUnitId });

            removedEntries = deleteByUser.length;

            // Also remove team memberships for this user within the group
            await dbPg.delete(newTeamMemberships).where(
              sql`${newTeamMemberships.teamId} IN (
                    SELECT id FROM new_team_units WHERE group_id = ${groupId}
                  )`
            );
          }
        } else if (input.studentName?.trim()) {
          // Remove by student name
          const deleteByName = await dbPg
            .delete(newTeamRosterData)
            .where(
              and(
                sql`LOWER(COALESCE(${newTeamRosterData.studentName},'')) = LOWER(${input.studentName.trim()})`,
                sql`${newTeamRosterData.teamUnitId} IN (
                  SELECT id FROM new_team_units WHERE group_id = ${groupId} AND status = 'active'
                )`
              )
            )
            .returning({ teamUnitId: newTeamRosterData.teamUnitId });

          removedEntries = deleteByName.length;
        }

        return { removedEntries };
      } catch (error) {
        logger.error("Failed to remove roster entry:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove roster entry",
        });
      }
    }),

  // ============================================================================
  // TEAM MANAGEMENT
  // ============================================================================

  exitSubteam: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Verify the subteam belongs to this group
        const subteamResult = await dbPg
          .select({ id: newTeamUnits.id, status: newTeamUnits.status })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.id, input.subteamId), eq(newTeamUnits.groupId, groupId)));

        if (subteamResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
        }

        // Check if user is a member of this subteam using Drizzle ORM
        const membershipResult = await dbPg
          .select({
            id: newTeamMemberships.id,
            role: newTeamMemberships.role,
          })
          .from(newTeamMemberships)
          .where(
            and(
              eq(newTeamMemberships.userId, ctx.user.id),
              eq(newTeamMemberships.teamId, input.subteamId),
              eq(newTeamMemberships.status, "active")
            )
          )
          .limit(1);

        // If not a member, return success (idempotent operation - already removed)
        if (membershipResult.length === 0) {
          return { message: "Successfully exited subteam" };
        }

        // Remove user from this specific subteam using Drizzle ORM
        // Note: We allow zero-person subteams, so we don't check if user is the last captain
        const updateResult = await dbPg
          .update(newTeamMemberships)
          .set({ status: "inactive" })
          .where(
            and(
              eq(newTeamMemberships.userId, ctx.user.id),
              eq(newTeamMemberships.teamId, input.subteamId),
              eq(newTeamMemberships.status, "active") // Only update active memberships
            )
          )
          .returning({ id: newTeamMemberships.id });

        // Also remove roster entries for this user from this subteam
        const deleteResult = await dbPg
          .delete(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.userId, ctx.user.id),
              eq(newTeamRosterData.teamUnitId, input.subteamId)
            )
          )
          .returning({ id: newTeamRosterData.id });

        // Log for debugging
        if (process.env.NODE_ENV === "development") {
          logger.info("exitSubteam completed", {
            membershipUpdated: updateResult.length,
            rosterEntriesDeleted: deleteResult.length,
            subteamId: input.subteamId,
            userId: ctx.user.id,
          });
        }

        const result = { message: "Successfully exited subteam" };

        // Validate output
        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to exit subteam:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to exit subteam",
        });
      }
    }),

  exitTeam: protectedProcedure
    .input(z.object({ teamSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const exitGroupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (exitGroupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = exitGroupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access
        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Get all team units for this group (only active ones) using Drizzle ORM
        const unitsResult = await dbPg
          .select({ id: newTeamUnits.id })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")));

        if (unitsResult.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No active team units found for this group",
          });
        }

        const teamUnitIds = unitsResult.map((row) => row.id);

        // Check if user is a member of any team unit in this group using Drizzle ORM
        const membershipResult = await dbPg
          .select({
            id: newTeamMemberships.id,
            role: newTeamMemberships.role,
            teamId: newTeamMemberships.teamId,
          })
          .from(newTeamMemberships)
          .where(
            and(
              eq(newTeamMemberships.userId, ctx.user.id),
              inArray(newTeamMemberships.teamId, teamUnitIds),
              eq(newTeamMemberships.status, "active")
            )
          );

        if (membershipResult.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a team member" });
        }

        const memberships = membershipResult;

        // Check if user is a captain in any team unit
        const captainMemberships = memberships.filter((m) => m.role === "captain");

        if (captainMemberships.length > 0) {
          // Check if there are other captains in the same team units using Drizzle ORM
          for (const membership of captainMemberships) {
            const captainCountResult = await dbPg
              .select({ count: count() })
              .from(newTeamMemberships)
              .where(
                and(
                  eq(newTeamMemberships.teamId, membership.teamId),
                  eq(newTeamMemberships.role, "captain"),
                  eq(newTeamMemberships.status, "active")
                )
              );

            const captainCount = captainCountResult[0]?.count || 0;
            if (captainCount <= 1) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Cannot exit team as the only captain. Promote another member to captain first.",
              });
            }
          }
        }

        // Remove user from all team units in this group using Drizzle ORM
        await dbPg
          .update(newTeamMemberships)
          .set({ status: "inactive" })
          .where(
            and(
              eq(newTeamMemberships.userId, ctx.user.id),
              inArray(newTeamMemberships.teamId, teamUnitIds)
            )
          );

        // Also remove all roster entries for this user across all subteams using Drizzle ORM
        await dbPg
          .delete(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.userId, ctx.user.id),
              inArray(newTeamRosterData.teamUnitId, teamUnitIds)
            )
          );

        const result = { message: "Successfully exited team" };

        // Validate output
        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to exit team:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to exit team",
        });
      }
    }),

  archiveTeam: protectedProcedure
    .input(z.object({ teamSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access
        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Get team units for this group using Drizzle
        const teamUnits = await dbPg
          .select({ id: newTeamUnits.id })
          .from(newTeamUnits)
          .where(eq(newTeamUnits.groupId, groupId));

        if (teamUnits.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No team units found for this group" });
        }

        const teamUnitIds = teamUnits.map((unit) => unit.id);

        // Check if user is the creator of the team group using Drizzle
        const archiveGroupResult = await dbPg
          .select({ createdBy: newTeamGroups.createdBy })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.id, groupId))
          .limit(1);

        if (archiveGroupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const groupCreator = archiveGroupResult[0]?.createdBy;
        if (!groupCreator) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        // Allow team creator OR captains to archive the team
        if (groupCreator !== ctx.user.id) {
          // Check if user is a captain of any team unit in this group using Drizzle
          const captainCheck = await dbPg
            .select({ role: newTeamMemberships.role })
            .from(newTeamMemberships)
            .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
            .where(
              and(
                eq(newTeamMemberships.userId, ctx.user.id),
                eq(newTeamUnits.groupId, groupId),
                eq(newTeamMemberships.status, "active")
              )
            )
            .limit(1);

          if (captainCheck.length === 0) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the team creator or captains can archive the team",
            });
          }

          const captainCheckResult = captainCheck[0];
          if (!captainCheckResult) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the team creator or captains can archive the team",
            });
          }
          const userRole = captainCheckResult.role;
          if (!["captain", "co_captain"].includes(userRole)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the team creator or captains can archive the team",
            });
          }
        }

        // Archive the team group using Drizzle
        await dbPg
          .update(newTeamGroups)
          .set({
            status: "archived",
            updatedAt: new Date(),
          })
          .where(eq(newTeamGroups.id, groupId));

        // Archive all team units using Drizzle
        await dbPg
          .update(newTeamUnits)
          .set({
            status: "archived",
            updatedAt: new Date(),
          })
          .where(eq(newTeamUnits.groupId, groupId));

        // Archive all memberships using Drizzle
        await dbPg
          .update(newTeamMemberships)
          .set({ status: "archived" })
          .where(inArray(newTeamMemberships.teamId, teamUnitIds));

        const result = { message: "Team successfully archived" };

        // Validate output
        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to archive team:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to archive team",
        });
      }
    }),

  // ============================================================================
  // INVITATION MANAGEMENT
  // ============================================================================

  inviteMember: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        email: z.string().email(),
        role: z.enum(["captain", "co_captain", "member", "observer"]).default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access
        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Get all team units for this group
        const unitsResult = await queryCockroachDB<{ id: string }>(
          "SELECT id FROM new_team_units WHERE group_id = $1",
          [groupId]
        );

        if (unitsResult.rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No team units found for this group" });
        }

        const teamUnitIds = unitsResult.rows.map((row) => row.id);

        // Check if user is captain or co-captain in any team unit
        const membershipResult = await queryCockroachDB<{
          id: string;
          role: string;
          team_id: string;
        }>(
          `SELECT id, role, team_id FROM new_team_memberships 
           WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
          [ctx.user.id, teamUnitIds]
        );

        if (membershipResult.rows.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a team member" });
        }

        // Check if user has captain/co-captain role
        const hasPermission = membershipResult.rows.some((membership) =>
          ["captain", "co_captain"].includes(membership.role)
        );

        if (!hasPermission) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only captains can invite members" });
        }

        // Find the user to invite by email
        const userResult = await queryCockroachDB<{
          id: string;
          email: string;
          display_name: string;
        }>("SELECT id, email, display_name FROM users WHERE email = $1", [input.email]);

        if (userResult.rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        const invitedUser = userResult.rows[0];
        if (!invitedUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        // Check if user is already a member
        const existingMembership = await queryCockroachDB<{ id: string }>(
          `SELECT id FROM new_team_memberships 
           WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
          [invitedUser.id, teamUnitIds]
        );

        if (existingMembership.rows.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "User is already a team member" });
        }

        // Check for existing pending invitation
        const existingInvitation = await queryCockroachDB<{ id: string }>(
          `SELECT id FROM new_team_invitations 
           WHERE team_id = ANY($1) AND email = $2 AND status = 'pending'`,
          [teamUnitIds, input.email]
        );

        if (existingInvitation.rows.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation already sent" });
        }

        // Create invitation for the first team unit where user has permission
        const targetTeamUnitId = membershipResult.rows.find((membership) =>
          ["captain", "co_captain"].includes(membership.role)
        )?.team_id;

        if (!targetTeamUnitId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No valid team unit found",
          });
        }

        // Generate invitation code
        const invitationCode = `INV${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        // Create invitation
        await queryCockroachDB(
          `INSERT INTO new_team_invitations (team_id, invited_by, email, role, invitation_code, expires_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
          [targetTeamUnitId, ctx.user.id, input.email, input.role, invitationCode, expiresAt]
        );

        const result = {
          message: "Invitation sent successfully",
          invitationCode,
          expiresAt: expiresAt.toISOString(),
        };

        // Validate output
        const validatedResult = z
          .object({
            message: z.string(),
            invitationCode: z.string(),
            expiresAt: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to invite member:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to invite member",
        });
      }
    }),

  cancelInvitation: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        invitationCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access
        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Get all team units for this group
        const unitsResult = await queryCockroachDB<{ id: string }>(
          "SELECT id FROM new_team_units WHERE group_id = $1",
          [groupId]
        );

        if (unitsResult.rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No team units found for this group" });
        }

        const teamUnitIds = unitsResult.rows.map((row) => row.id);

        // Check if user is captain or co-captain in any team unit
        const membershipResult = await queryCockroachDB<{
          id: string;
          role: string;
          team_id: string;
        }>(
          `SELECT id, role, team_id FROM new_team_memberships 
           WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
          [ctx.user.id, teamUnitIds]
        );

        if (membershipResult.rows.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a team member" });
        }

        // Check if user has captain/co-captain role
        const hasPermission = membershipResult.rows.some((membership) =>
          ["captain", "co_captain"].includes(membership.role)
        );

        if (!hasPermission) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only captains can cancel invitations",
          });
        }

        // Find and cancel the invitation
        const invitationResult = await queryCockroachDB<{ id: string; email: string }>(
          `SELECT id, email FROM new_team_invitations 
           WHERE invitation_code = $1 AND team_id = ANY($2) AND status = 'pending'`,
          [input.invitationCode, teamUnitIds]
        );

        if (invitationResult.rows.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation not found or already processed",
          });
        }

        // Cancel the invitation
        await queryCockroachDB(
          `UPDATE new_team_invitations SET status = 'cancelled', updated_at = NOW() 
           WHERE invitation_code = $1`,
          [input.invitationCode]
        );

        const result = { message: "Invitation cancelled successfully" };

        // Validate output
        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to cancel invitation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel invitation",
        });
      }
    }),

  // ============================================================================
  // MEMBER MANAGEMENT
  // ============================================================================

  removeMember: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        userId: z.string(),
        subteamId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access
        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Get all team units for this group
        const unitsResult = await queryCockroachDB<{ id: string }>(
          "SELECT id FROM new_team_units WHERE group_id = $1",
          [groupId]
        );

        if (unitsResult.rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No team units found for this group" });
        }

        const teamUnitIds = unitsResult.rows.map((row) => row.id);

        // Check if user is captain or co-captain in any team unit
        const membershipResult = await queryCockroachDB<{
          id: string;
          role: string;
          team_id: string;
        }>(
          `SELECT id, role, team_id FROM new_team_memberships 
           WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
          [ctx.user.id, teamUnitIds]
        );

        if (membershipResult.rows.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a team member" });
        }

        // Check if user has captain/co-captain role
        const hasPermission = membershipResult.rows.some((membership) =>
          ["captain", "co_captain"].includes(membership.role)
        );

        if (!hasPermission) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only captains can remove members" });
        }

        // Find the member to remove
        const memberToRemove = await queryCockroachDB<{
          id: string;
          role: string;
          team_id: string;
        }>(
          `SELECT id, role, team_id FROM new_team_memberships 
           WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
          [input.userId, teamUnitIds]
        );

        if (memberToRemove.rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Member not found in this team" });
        }

        const memberMembership = memberToRemove.rows[0];
        if (!memberMembership) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Member not found in this team" });
        }

        // Prevent removing the last captain
        if (memberMembership.role === "captain") {
          const captainCountResult = await queryCockroachDB<{ count: string }>(
            `SELECT COUNT(*) as count FROM new_team_memberships 
             WHERE team_id = $1 AND role = 'captain' AND status = 'active'`,
            [memberMembership.team_id]
          );

          const countRow = captainCountResult.rows[0];
          if (!countRow) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to get captain count",
            });
          }
          if (Number.parseInt(countRow.count) <= 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot remove the last captain. Promote another member to captain first.",
            });
          }
        }

        // Remove the member
        await queryCockroachDB(
          `UPDATE new_team_memberships SET status = 'inactive', updated_at = NOW() 
           WHERE user_id = $1 AND team_id = $2`,
          [input.userId, memberMembership.team_id]
        );

        const result = { message: "Member removed successfully" };

        // Validate output
        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to remove member:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove member",
        });
      }
    }),

  promoteMember: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        userId: z.string(),
        role: z.enum(["captain", "co_captain", "member", "observer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Resolve team slug to group ID
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        // Check team access
        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        // Get all team units for this group
        const unitsResult = await queryCockroachDB<{ id: string }>(
          "SELECT id FROM new_team_units WHERE group_id = $1",
          [groupId]
        );

        if (unitsResult.rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No team units found for this group" });
        }

        const teamUnitIds = unitsResult.rows.map((row) => row.id);

        // Check if user is captain or co-captain in any team unit
        const membershipResult = await queryCockroachDB<{
          id: string;
          role: string;
          team_id: string;
        }>(
          `SELECT id, role, team_id FROM new_team_memberships 
           WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
          [ctx.user.id, teamUnitIds]
        );

        if (membershipResult.rows.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a team member" });
        }

        // Check if user has captain/co-captain role
        const hasPermission = membershipResult.rows.some((membership) =>
          ["captain", "co_captain"].includes(membership.role)
        );

        if (!hasPermission) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only captains can promote members" });
        }

        // Find the member to promote
        const memberToPromote = await queryCockroachDB<{
          id: string;
          role: string;
          team_id: string;
        }>(
          `SELECT id, role, team_id FROM new_team_memberships 
           WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
          [input.userId, teamUnitIds]
        );

        if (memberToPromote.rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Member not found in this team" });
        }

        const memberMembership = memberToPromote.rows[0];
        if (!memberMembership) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Member not found in this team" });
        }

        // Validate the new role
        if (!["captain", "co_captain", "member", "observer"].includes(input.role)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid role specified" });
        }

        // Update the member's role
        await queryCockroachDB(
          `UPDATE new_team_memberships SET role = $1, updated_at = NOW() 
           WHERE user_id = $2 AND team_id = $3`,
          [input.role, input.userId, memberMembership.team_id]
        );

        const result = { message: "Member promoted successfully" };

        // Validate output
        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to promote member:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to promote member",
        });
      }
    }),
});
