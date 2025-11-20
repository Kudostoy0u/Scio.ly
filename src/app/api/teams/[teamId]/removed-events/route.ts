import { dbPg } from "@/lib/db";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamRemovedEvents,
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
import { and, desc, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/teams/[teamId]/removed-events - Get removed events for a subteam
export async function GET(
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

    // Validate UUID format
    try {
      UUIDSchema.parse(subteamId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
    }

    // Resolve the slug to team group using Drizzle ORM
    const [groupResult] = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (!groupResult) {
      return handleNotFoundError("Team group");
    }

    const groupId = groupResult.id;

    // Check if user is a member of this team group using Drizzle ORM
    const membershipResult = await dbPg
      .select({ role: newTeamMemberships.role })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, user.id),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, "active")
        )
      )
      .limit(1);

    if (membershipResult.length === 0) {
      return handleForbiddenError("Not a team member");
    }

    // Get removed events for the specific subteam using Drizzle ORM
    const removedEventsResult = await dbPg
      .select({
        event_name: newTeamRemovedEvents.eventName,
        conflict_block: newTeamRemovedEvents.conflictBlock,
        removed_at: newTeamRemovedEvents.removedAt,
      })
      .from(newTeamRemovedEvents)
      .where(eq(newTeamRemovedEvents.teamUnitId, subteamId))
      .orderBy(desc(newTeamRemovedEvents.removedAt));

    return NextResponse.json({
      removedEvents: removedEventsResult,
    });
  } catch (error) {
    return handleError(error, "GET /api/teams/[teamId]/removed-events");
  }
}

// POST /api/teams/[teamId]/removed-events - Remove an event from a conflict block
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
    const RemoveEventSchema = z.object({
      subteamId: UUIDSchema,
      eventName: z.string().min(1, "Event name is required").max(100),
      conflictBlock: z.string().min(1, "Conflict block is required").max(50),
    });

    let validatedBody: z.infer<typeof RemoveEventSchema>;
    try {
      validatedBody = validateRequest(RemoveEventSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "POST /api/teams/[teamId]/removed-events - validation");
    }

    const { subteamId, eventName, conflictBlock } = validatedBody;

    // Resolve the slug to team group using Drizzle ORM
    const [groupResult] = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (!groupResult) {
      return handleNotFoundError("Team group");
    }

    const groupId = groupResult.id;

    // Check if user is a captain of this team group using Drizzle ORM
    const membershipResult = await dbPg
      .select({ role: newTeamMemberships.role })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, user.id),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, "active")
        )
      )
      .limit(1);

    if (membershipResult.length === 0) {
      return handleForbiddenError("Not a team member");
    }

    const memberRole = membershipResult[0]?.role;
    if (memberRole !== "captain") {
      return handleForbiddenError("Only team captains can remove events");
    }

    // Check if the subteam belongs to this group using Drizzle ORM
    const [subteamResult] = await dbPg
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

    if (!subteamResult) {
      return handleNotFoundError("Subteam");
    }

    // Delete roster entries for this event using Drizzle ORM
    const rosterCleanupResult = await dbPg
      .delete(newTeamRosterData)
      .where(
        and(
          eq(newTeamRosterData.teamUnitId, subteamId),
          eq(newTeamRosterData.eventName, eventName)
        )
      )
      .returning({ id: newTeamRosterData.id });

    // Insert or update removed event using Drizzle ORM
    await dbPg
      .insert(newTeamRemovedEvents)
      .values({
        teamUnitId: subteamId,
        eventName,
        conflictBlock,
        removedBy: user.id,
      })
      .onConflictDoUpdate({
        target: [newTeamRemovedEvents.teamUnitId, newTeamRemovedEvents.eventName],
        set: {
          conflictBlock,
          removedBy: user.id,
          removedAt: new Date(),
        },
      });

    return NextResponse.json({
      message: "Event removed successfully",
      deletedRosterEntries: rosterCleanupResult.length,
    });
  } catch (error) {
    return handleError(error, "POST /api/teams/[teamId]/removed-events");
  }
}

// DELETE /api/teams/[teamId]/removed-events - Restore removed events in a conflict block
export async function DELETE(
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
    const RestoreEventsSchema = z.object({
      subteamId: UUIDSchema,
      conflictBlock: z.string().min(1, "Conflict block is required").max(50),
    });

    let validatedBody: z.infer<typeof RestoreEventsSchema>;
    try {
      validatedBody = validateRequest(RestoreEventsSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "DELETE /api/teams/[teamId]/removed-events - validation");
    }

    const { subteamId, conflictBlock } = validatedBody;

    // Resolve the slug to team group using Drizzle ORM
    const [groupResult] = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (!groupResult) {
      return handleNotFoundError("Team group");
    }

    const groupId = groupResult.id;

    // Check if user is a captain of this team group using Drizzle ORM
    const membershipResult = await dbPg
      .select({ role: newTeamMemberships.role })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, user.id),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, "active")
        )
      )
      .limit(1);

    if (membershipResult.length === 0) {
      return handleForbiddenError("Not a team member");
    }

    const memberRole = membershipResult[0]?.role;
    if (memberRole !== "captain") {
      return handleForbiddenError("Only team captains can restore events");
    }

    // Check if the subteam belongs to this group using Drizzle ORM
    const [subteamResult] = await dbPg
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

    if (!subteamResult) {
      return handleNotFoundError("Subteam");
    }

    // Delete removed events for the conflict block using Drizzle ORM
    const result = await dbPg
      .delete(newTeamRemovedEvents)
      .where(
        and(
          eq(newTeamRemovedEvents.teamUnitId, subteamId),
          eq(newTeamRemovedEvents.conflictBlock, conflictBlock)
        )
      )
      .returning({ id: newTeamRemovedEvents.id });

    return NextResponse.json({
      message: "Events restored successfully",
      restoredCount: result.length,
    });
  } catch (error) {
    return handleError(error, "DELETE /api/teams/[teamId]/removed-events");
  }
}
