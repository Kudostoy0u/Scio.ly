import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamRecurringMeetings,
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
import { resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Utility function to safely parse JSON with fallback
function safeJsonParse(jsonString: string | null | any, fallback: any = []): any {
  if (!jsonString) {
    return fallback;
  }

  // If it's already an array or object, return it as-is
  if (Array.isArray(jsonString) || (typeof jsonString === "object" && jsonString !== null)) {
    return jsonString;
  }

  // Handle empty array string case
  if (jsonString === "[]") {
    return [];
  }

  try {
    return JSON.parse(jsonString);
  } catch (_error) {
    return fallback;
  }
}

// Validation schema for recurring meeting creation
const RecurringMeetingCreateSchema = z.object({
  team_slug: z.string().min(1, "Team slug is required"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1, "At least one day of week is required"),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().nullable().optional(),
  exceptions: z.array(z.any()).nullable().optional(),
  created_by: UUIDSchema.optional(),
  meeting_type: z.enum(["personal", "team"]).default("personal").optional(),
  selected_team_id: z.string().nullable().optional(),
});

// Note: Utility functions removed as they are no longer needed
// since we no longer create individual events in the API

export async function POST(request: NextRequest) {
  try {
    const envError = validateEnvironment();
    if (envError) return envError;

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

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

    let validatedBody: z.infer<typeof RecurringMeetingCreateSchema>;
    try {
      validatedBody = validateRequest(RecurringMeetingCreateSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "POST /api/teams/calendar/recurring-meetings - validation");
    }

    const {
      team_slug,
      title,
      description,
      location,
      days_of_week,
      start_time,
      end_time,
      start_date,
      end_date,
      exceptions,
      created_by,
      meeting_type = "personal",
      selected_team_id,
    } = validatedBody;

    if (
      !(team_slug && title && days_of_week) ||
      days_of_week.length === 0 ||
      !start_date ||
      !end_date
    ) {
      return NextResponse.json(
        {
          error: "Team slug, title, days of week, start date, and end date are required",
        },
        { status: 400 }
      );
    }

    // Determine which team to use based on meeting type
    let targetTeamSlug = team_slug;
    if (meeting_type === "team" && selected_team_id) {
      if (selected_team_id.startsWith("all-")) {
        // "All Subteams" option - use the school name to get the team group slug
        const schoolName = selected_team_id.replace("all-", "");
        const teamGroupResult = await dbPg
          .select({ slug: newTeamGroups.slug })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.school, schoolName))
          .limit(1);

        if (teamGroupResult.length > 0 && teamGroupResult[0]) {
          targetTeamSlug = teamGroupResult[0].slug;
        }
      } else {
        // Specific team - get the team slug for the selected team using Drizzle ORM
        const selectedTeamResult = await dbPg
          .select({ slug: newTeamGroups.slug })
          .from(newTeamGroups)
          .innerJoin(newTeamUnits, eq(newTeamGroups.id, newTeamUnits.groupId))
          .where(eq(newTeamUnits.id, selected_team_id))
          .limit(1);

        if (selectedTeamResult.length > 0 && selectedTeamResult[0]) {
          targetTeamSlug = selectedTeamResult[0].slug;
        }
      }
    }

    // Resolve the team slug to get the team group and units using Drizzle ORM
    const [groupResult] = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, targetTeamSlug))
      .limit(1);

    if (!groupResult) {
      return handleNotFoundError("Team");
    }

    const groupId = groupResult.id;

    // Get team units for this group using Drizzle ORM
    const unitsResult = await dbPg
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, groupId));

    if (unitsResult.length === 0) {
      return handleNotFoundError("No team units found for this group");
    }

    // Check if user is a member of any team unit in this group using Drizzle ORM
    const teamUnitIds = unitsResult.map((row) => row.id);
    const membershipResult = await dbPg
      .select({
        role: newTeamMemberships.role,
        teamId: newTeamMemberships.teamId,
      })
      .from(newTeamMemberships)
      .where(
        and(
          eq(newTeamMemberships.userId, user.id),
          inArray(newTeamMemberships.teamId, teamUnitIds),
          eq(newTeamMemberships.status, "active")
        )
      );

    // For "All Subteams", we need to check if the user is a member of any team in this school
    // For personal meetings, we don't need to be a member of this specific team group
    if (membershipResult.length === 0 && meeting_type !== "personal") {
      if (meeting_type === "team" && selected_team_id && selected_team_id.startsWith("all-")) {
        // For "All Subteams", check if user is a member of any team in this school using Drizzle ORM
        const schoolName = selected_team_id.replace("all-", "");
        const schoolMembershipResult = await dbPg
          .select({
            role: newTeamMemberships.role,
            teamId: newTeamMemberships.teamId,
          })
          .from(newTeamMemberships)
          .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
          .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
          .where(
            and(
              eq(newTeamMemberships.userId, user.id),
              eq(newTeamGroups.school, schoolName),
              eq(newTeamMemberships.status, "active")
            )
          );

        if (schoolMembershipResult.length === 0) {
          return handleForbiddenError("Not a team member");
        }

        // Add the school membership results to the main membership result
        membershipResult.push(...schoolMembershipResult);
      } else {
        return handleForbiddenError("Not a team member");
      }
    }

    // Check if user is a member (for personal meetings)
    const isMember = membershipResult.some((m) =>
      ["member", "captain", "co_captain"].includes(m.role)
    );

    // For team meetings, user must be a member. For personal meetings, this check is not required.
    if (!isMember && meeting_type === "team") {
      return handleForbiddenError("Not a team member");
    }

    // Determine which team units to create recurring meetings for
    let targetTeamIds: string[] = [];

    if (meeting_type === "personal") {
      // Personal meeting - use the first team unit from the group, or any team unit if user is not a member
      if (membershipResult.length > 0) {
        const firstMembership = membershipResult[0];
        if (firstMembership?.teamId) {
          targetTeamIds = [firstMembership.teamId];
        }
      } else {
        // User is not a member of this team group, use the first team unit for personal meeting
        const firstUnit = unitsResult[0];
        if (firstUnit?.id) {
          targetTeamIds = [firstUnit.id];
        }
      }
    } else if (meeting_type === "team" && selected_team_id) {
      if (selected_team_id.startsWith("all-")) {
        // "All Subteams" - create for all team units the user is a member of in this school
        targetTeamIds = membershipResult.map((m) => m.teamId);
      } else {
        // Specific team - find the team unit that matches the selected team
        const selectedTeamUnit = membershipResult.find((m) => m.teamId === selected_team_id);
        if (selectedTeamUnit) {
          targetTeamIds = [selectedTeamUnit.teamId];
        }
      }
    }

    // Create recurring meetings for all target teams using Drizzle ORM
    const meetingIds: string[] = [];
    for (const teamId of targetTeamIds) {
      const [result] = await dbPg
        .insert(newTeamRecurringMeetings)
        .values({
          teamId,
          createdBy: created_by || user.id,
          title,
          description: description || null,
          location: location || null,
          daysOfWeek: days_of_week,
          startTime: start_time || "00:00:00",
          endTime: end_time || "23:59:59",
          startDate: start_date ? new Date(start_date) : null,
          endDate: end_date ? new Date(end_date) : null,
          exceptions: exceptions || [],
        })
        .returning({ id: newTeamRecurringMeetings.id });

      if (result?.id) {
        meetingIds.push(result.id);
      }
    }

    // Note: We no longer create individual events here to avoid duplicates.
    // The frontend will generate events from the recurring meeting pattern.
    // This prevents the "ghost event" issue where both recurring meetings
    // and individual events were being displayed simultaneously.

    return NextResponse.json({
      success: true,
      meetingIds: meetingIds,
      count: meetingIds.length,
    });
  } catch (error) {
    return handleError(error, "POST /api/teams/calendar/recurring-meetings");
  }
}

export async function GET(request: NextRequest) {
  try {
    const envError = validateEnvironment();
    if (envError) return envError;

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

    const { searchParams } = new URL(request.url);
    const teamSlug = searchParams.get("teamSlug");

    if (!teamSlug) {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Team slug is required",
            path: ["teamSlug"],
          },
        ])
      );
    }

    // Resolve the team slug to get the team group and units using Drizzle ORM
    const [groupResult] = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamSlug))
      .limit(1);

    if (!groupResult) {
      return handleNotFoundError("Team");
    }

    const groupId = groupResult.id;

    // Get team units for this group using Drizzle ORM
    const unitsResult = await dbPg
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, groupId));

    if (unitsResult.length === 0) {
      return handleNotFoundError("No team units found for this group");
    }

    // Check if user is a member of any team unit in this group using Drizzle ORM
    const teamUnitIds = unitsResult.map((row) => row.id);
    const membershipResult = await dbPg
      .select({ role: newTeamMemberships.role })
      .from(newTeamMemberships)
      .where(
        and(
          eq(newTeamMemberships.userId, user.id),
          inArray(newTeamMemberships.teamId, teamUnitIds),
          eq(newTeamMemberships.status, "active")
        )
      );

    if (membershipResult.length === 0) {
      return handleForbiddenError("Not a member of this team");
    }

    // Get recurring meetings for all team units in this group using Drizzle ORM
    const meetingsResult = await dbPg
      .select({
        id: newTeamRecurringMeetings.id,
        team_id: newTeamRecurringMeetings.teamId,
        created_by: newTeamRecurringMeetings.createdBy,
        title: newTeamRecurringMeetings.title,
        description: newTeamRecurringMeetings.description,
        location: newTeamRecurringMeetings.location,
        days_of_week: newTeamRecurringMeetings.daysOfWeek,
        start_time: newTeamRecurringMeetings.startTime,
        end_time: newTeamRecurringMeetings.endTime,
        start_date: newTeamRecurringMeetings.startDate,
        end_date: newTeamRecurringMeetings.endDate,
        exceptions: newTeamRecurringMeetings.exceptions,
        created_at: newTeamRecurringMeetings.createdAt,
        creator_email: users.email,
        creator_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}), ${users.email})`,
      })
      .from(newTeamRecurringMeetings)
      .leftJoin(users, eq(newTeamRecurringMeetings.createdBy, users.id))
      .where(inArray(newTeamRecurringMeetings.teamId, teamUnitIds))
      .orderBy(desc(newTeamRecurringMeetings.createdAt));

    // Parse JSON fields safely with utility function
    const meetings = meetingsResult.map((meeting) => ({
      ...meeting,
      days_of_week: safeJsonParse(meeting.days_of_week, []),
      exceptions: safeJsonParse(meeting.exceptions, []),
    }));

    return NextResponse.json({
      success: true,
      meetings,
    });
  } catch (error) {
    return handleError(error, "GET /api/teams/calendar/recurring-meetings");
  }
}
