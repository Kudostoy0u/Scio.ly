import { dbPg } from "@/lib/db";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamRosterData,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import {
  UUIDSchema,
  validateRequest,
} from "@/lib/schemas/teams-validation";
import {
  handleError,
  handleForbiddenError,
  handleNotFoundError,
  handleUnauthorizedError,
  handleValidationError,
  validateEnvironment,
} from "@/lib/utils/error-handler";
import logger from "@/lib/utils/logger";
import { getServerUser } from "@/lib/supabaseServer";
import { checkTeamGroupLeadershipCockroach } from "@/lib/utils/team-auth";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/teams/[teamId]/roster/remove - Remove all roster occurrences by student name or userId across the team group
// Frontend Usage:
// - src/app/teams/components/PeopleTab.tsx (removeMember, removeSubteamBadge, removeEventBadge)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const envError = validateEnvironment();
    if (envError) return envError;

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

    const { teamId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
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

    // Validate request body
    const RemoveRosterSchema = z.object({
      studentName: z.string().min(1).optional(),
      userId: UUIDSchema.optional(),
      eventName: z.string().min(1).optional(),
      subteamId: UUIDSchema.optional(),
    }).refine(
      (data) => data.studentName?.trim() || data.userId,
      {
        message: "Either studentName or userId is required",
        path: [],
      }
    );

    let validatedBody: z.infer<typeof RemoveRosterSchema>;
    try {
      validatedBody = validateRequest(RemoveRosterSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "POST /api/teams/[teamId]/roster/remove - validation");
    }

    const { studentName, userId, eventName, subteamId } = validatedBody;

    // Resolve slug to group id using Drizzle ORM
    const [groupResult] = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (!groupResult) {
      return handleNotFoundError("Team group");
    }

    const groupId = groupResult.id;

    // Ensure user has leadership privileges in this group
    const leadershipResult = await checkTeamGroupLeadershipCockroach(user.id, groupId);
    if (!leadershipResult.hasLeadership) {
      return handleForbiddenError("Only captains and co-captains can modify roster");
    }

    // Get team units for this group using Drizzle ORM
    const teamUnits = await dbPg
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(
        and(
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamUnits.status, "active")
        )
      );

    const teamUnitIds = teamUnits.map((u) => u.id);

    // Build deletion based on parameters
    if (userId) {
      if (eventName?.trim()) {
        // Remove specific event entries for this user using Drizzle ORM
        const deleteByUserEvent = await dbPg
          .delete(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.userId, userId),
              sql`LOWER(${newTeamRosterData.eventName}) = LOWER(${eventName.trim()})`,
              inArray(newTeamRosterData.teamUnitId, teamUnitIds)
            )
          )
          .returning({ teamUnitId: newTeamRosterData.teamUnitId });

        return NextResponse.json({ removedEntries: deleteByUserEvent.length });
      }
      if (subteamId) {
        // Remove roster entries and team membership for this user from specific subteam only using Drizzle ORM
        const deleteByUserSubteam = await dbPg
          .delete(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.userId, userId),
              eq(newTeamRosterData.teamUnitId, subteamId)
            )
          )
          .returning({ teamUnitId: newTeamRosterData.teamUnitId });

        // Also remove team membership for this user from the specific subteam
        await dbPg
          .delete(newTeamMemberships)
          .where(
            and(
              eq(newTeamMemberships.userId, userId),
              eq(newTeamMemberships.teamId, subteamId)
            )
          );

        return NextResponse.json({ removedEntries: deleteByUserSubteam.length });
      }
      // Remove all roster entries AND team memberships for this user across the group using Drizzle ORM
      const deleteByUser = await dbPg
        .delete(newTeamRosterData)
        .where(
          and(
            eq(newTeamRosterData.userId, userId),
            inArray(newTeamRosterData.teamUnitId, teamUnitIds)
          )
        )
        .returning({ teamUnitId: newTeamRosterData.teamUnitId });

      // Also remove team memberships for this user within the group
      await dbPg
        .delete(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, userId),
            inArray(newTeamMemberships.teamId, teamUnitIds)
          )
        );

      return NextResponse.json({ removedEntries: deleteByUser.length });
    }

    // Remove by student name using Drizzle ORM
    if (!studentName?.trim()) {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "studentName is required when userId is not provided",
            path: ["studentName"],
          },
        ])
      );
    }

    const deleteByName = await dbPg
      .delete(newTeamRosterData)
      .where(
        and(
          inArray(newTeamRosterData.teamUnitId, teamUnitIds),
          sql`LOWER(COALESCE(${newTeamRosterData.studentName}, '')) = LOWER(${studentName.trim()})`
        )
      )
      .returning({ id: newTeamRosterData.id });

    return NextResponse.json({ removedEntries: deleteByName.length });
  } catch (error) {
    return handleError(error, "POST /api/teams/[teamId]/roster/remove");
  }
}
