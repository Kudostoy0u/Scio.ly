import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamRemovedEvents,
  newTeamRosterData,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import {
  PostRosterRequestSchema,
  RosterResponseSchema,
  UUIDSchema,
  validateRequest,
} from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import {
  handleError,
  handleForbiddenError,
  handleNotFoundError,
  handleUnauthorizedError,
  handleValidationError,
  validateEnvironment,
} from "@/lib/utils/error-handler";
import logger from "@/lib/utils/logger";
import {
  checkTeamGroupAccessCockroach,
  checkTeamGroupLeadershipCockroach,
} from "@/lib/utils/team-auth";
import { and, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/teams/[teamId]/roster - Get roster data for a subteam
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchRoster)
// - src/app/teams/components/assignment/assignmentUtils.ts (getTeamMembersAndRoster)
// - src/app/hooks/useEnhancedTeamData.ts (fetchRoster)
// - src/app/hooks/useTeamData.ts (fetchRoster)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const envError = validateEnvironment();
    if (envError) {
      return envError;
    }

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const subteamId = searchParams.get("subteamId");

    if (!subteamId) {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Subteam ID is required",
            path: ["subteamId"],
          },
        ])
      );
    }

    // Validate UUID format using Zod
    try {
      UUIDSchema.parse(subteamId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
    }

    // Resolve the slug to team group using Drizzle ORM
    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (groupResult.length === 0 || !groupResult[0]?.id) {
      return handleNotFoundError("Team group");
    }

    const groupId = groupResult[0].id;

    // Check if user has access to this team group (membership OR roster entry)
    const authResult = await checkTeamGroupAccessCockroach(user.id, groupId);
    if (!authResult.isAuthorized) {
      return handleForbiddenError("Not authorized to access this team");
    }

    const rosterResult = await dbPg
      .select({
        event_name: newTeamRosterData.eventName,
        slot_index: newTeamRosterData.slotIndex,
        student_name: sql<string>`COALESCE(${newTeamRosterData.studentName}, ${users.displayName}, ${users.firstName} || ' ' || ${users.lastName})`,
        user_id: newTeamRosterData.userId,
      })
      .from(newTeamRosterData)
      .leftJoin(users, eq(newTeamRosterData.userId, users.id))
      .where(eq(newTeamRosterData.teamUnitId, subteamId))
      .orderBy(newTeamRosterData.eventName, newTeamRosterData.slotIndex);
    // Validate roster data (already validated by database, but ensure type safety)
    const validatedRosterData = rosterResult.map((row) => ({
      event_name: row.event_name,
      slot_index: row.slot_index,
      student_name: row.student_name,
      user_id: row.user_id,
    }));
    // Get removed events using Drizzle ORM
    const removedEventsResult = await dbPg
      .select({
        event_name: newTeamRemovedEvents.eventName,
        conflict_block: newTeamRemovedEvents.conflictBlock,
        removed_at: newTeamRemovedEvents.removedAt,
      })
      .from(newTeamRemovedEvents)
      .where(eq(newTeamRemovedEvents.teamUnitId, subteamId))
      .orderBy(desc(newTeamRemovedEvents.removedAt));

    // Convert to roster format using validated data
    const roster: Record<string, string[]> = {};

    for (const row of validatedRosterData) {
      // Convert "and" to "&" in event names to match frontend expectations
      const normalizedEventName = row.event_name.replace(/\band\b/g, "&");

      if (!roster[normalizedEventName]) {
        roster[normalizedEventName] = [];
      }
      roster[normalizedEventName][row.slot_index] = row.student_name || "";
    }
    const removedEvents = removedEventsResult.map((row) => row.event_name);
    const responseData = { roster, removedEvents };

    // Validate response using Zod
    try {
      RosterResponseSchema.parse(responseData);
    } catch (error) {
      logger.error("Response validation failed", error);
      // Still return the data, but log the validation error
    }

    return NextResponse.json(responseData);
  } catch (error) {
    return handleError(error, "GET /api/teams/[teamId]/roster");
  }
}

// POST /api/teams/[teamId]/roster - Save roster data for a subteam
// Frontend Usage:
// - src/app/teams/components/RosterTab.tsx (saveRoster)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const envError = validateEnvironment();
    if (envError) {
      return envError;
    }

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

    const { teamId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch (_error) {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Invalid JSON in request body",
            path: [],
          },
        ])
      );
    }

    // Validate request body using Zod
    let validatedBody: z.infer<typeof PostRosterRequestSchema>;
    try {
      validatedBody = validateRequest(PostRosterRequestSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "POST /api/teams/[teamId]/roster - validation");
    }

    const { subteamId, eventName, slotIndex, studentName, userId } = validatedBody;

    // Convert "&" back to "and" in event names for database storage
    const normalizedEventName = eventName.replace(/&/g, "and");

    // Resolve the slug to team group using Drizzle ORM
    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (groupResult.length === 0 || !groupResult[0]?.id) {
      return handleNotFoundError("Team group");
    }

    const groupId = groupResult[0].id;

    // Check if user has access to this team group (membership OR roster entry)
    const authResult = await checkTeamGroupAccessCockroach(user.id, groupId);
    if (!authResult.isAuthorized) {
      return handleForbiddenError("Not authorized to access this team");
    }

    // Check if user has leadership access (captains and co-captains only)
    const leadershipResult = await checkTeamGroupLeadershipCockroach(user.id, groupId);
    if (!leadershipResult.hasLeadership) {
      return handleForbiddenError("Only captains and co-captains can manage roster");
    }

    // Check if the subteam belongs to this group using Drizzle ORM
    const subteamResult = await dbPg
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(
        and(
          eq(newTeamUnits.id, subteamId),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamUnits.status, "active")
        )
      )
      .limit(1);

    if (subteamResult.length === 0) {
      return handleNotFoundError("Subteam");
    }

    // Determine user ID to link - use provided userId if available, otherwise auto-link by name
    let userIdToLink: string | null = null;

    if (userId) {
      // Use the explicitly provided userId
      userIdToLink = userId;
    } else if (studentName?.trim()) {
      // Auto-link by matching student name to team members using Drizzle ORM
      const teamMembersResult = await dbPg
        .select({
          user_id: users.id,
          display_name: users.displayName,
          first_name: users.firstName,
          last_name: users.lastName,
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
      const studentNameLower = studentName.toLowerCase().trim();
      for (const member of teamMembersResult) {
        const displayName =
          member.display_name ||
          (member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : "");

        if (displayName) {
          const memberNameLower = displayName.toLowerCase().trim();

          // Exact case-insensitive match only
          if (memberNameLower === studentNameLower) {
            userIdToLink = member.user_id;
            break;
          }
        }
      }
    }

    // Upsert roster data with user_id if we found a match using Drizzle ORM
    await dbPg
      .insert(newTeamRosterData)
      .values({
        teamUnitId: subteamId,
        eventName: normalizedEventName,
        slotIndex: slotIndex,
        studentName: studentName || null,
        userId: userIdToLink,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          newTeamRosterData.teamUnitId,
          newTeamRosterData.eventName,
          newTeamRosterData.slotIndex,
        ],
        set: {
          studentName: studentName || null,
          userId: userIdToLink,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ message: "Roster data saved successfully" });
  } catch (error) {
    return handleError(error, "POST /api/teams/[teamId]/roster");
  }
}
