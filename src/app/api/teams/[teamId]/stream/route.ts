import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamEvents,
  newTeamGroups,
  newTeamMemberships,
  newTeamStreamComments,
  newTeamStreamPosts,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import {
  type PostStreamRequest,
  PostStreamRequestSchema,
  type PutStreamRequest,
  PutStreamRequestSchema,
  StreamResponseSchema,
  UUIDSchema,
  formatValidationError,
  validateRequest,
} from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import {
  // handleError,
  handleForbiddenError,
  // handleNotFoundError,
  handleUnauthorizedError,
  handleValidationError,
  validateEnvironment,
} from "@/lib/utils/error-handler";
import logger from "@/lib/utils/logger";
import { checkTeamGroupAccessCockroach } from "@/lib/utils/team-auth";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/teams/[teamId]/stream - Get stream posts for a subteam
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchStream, fetchStreamData)
// - src/app/hooks/useEnhancedTeamData.ts (fetchStream)
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
      return NextResponse.json({ error: "Subteam ID is required" }, { status: 400 });
    }

    // Validate UUID format using Zod
    try {
      UUIDSchema.parse(subteamId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Invalid subteam ID format. Must be a valid UUID.",
            path: ["subteamId"],
          },
        ])
      );
    }

    // Resolve the slug to team group using Drizzle ORM
    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (groupResult.length === 0) {
      return NextResponse.json({ error: "Team group not found" }, { status: 404 });
    }

    const groupId = groupResult[0]?.id;
    if (!groupId) {
      return NextResponse.json({ error: "Team group not found" }, { status: 404 });
    }

    // Check if user has access to this team group (membership OR roster entry)
    const authResult = await checkTeamGroupAccessCockroach(user.id, groupId);
    if (!authResult.isAuthorized) {
      return handleForbiddenError("Not authorized to access this team");
    }

    // Get stream posts with author information and tournament details using Drizzle ORM
    const streamResult = await dbPg
      .select({
        id: newTeamStreamPosts.id,
        content: newTeamStreamPosts.content,
        show_tournament_timer: newTeamStreamPosts.showTournamentTimer,
        tournament_id: newTeamStreamPosts.tournamentId,
        tournament_title: newTeamEvents.title,
        tournament_start_time: newTeamEvents.startTime,
        author_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        author_email: users.email,
        created_at: newTeamStreamPosts.createdAt,
        attachment_url: newTeamStreamPosts.attachmentUrl,
        attachment_title: newTeamStreamPosts.attachmentTitle,
      })
      .from(newTeamStreamPosts)
      .innerJoin(users, eq(newTeamStreamPosts.authorId, users.id))
      .leftJoin(newTeamEvents, eq(newTeamStreamPosts.tournamentId, newTeamEvents.id))
      .where(eq(newTeamStreamPosts.teamUnitId, subteamId))
      .orderBy(desc(newTeamStreamPosts.createdAt))
      .limit(50);

    // Get comments for each post using Drizzle ORM
    const postsWithComments = await Promise.all(
      streamResult.map(async (post) => {
        const commentsResult = await dbPg
          .select({
            id: newTeamStreamComments.id,
            content: newTeamStreamComments.content,
            author_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
            author_email: users.email,
            created_at: newTeamStreamComments.createdAt,
          })
          .from(newTeamStreamComments)
          .innerJoin(users, eq(newTeamStreamComments.authorId, users.id))
          .where(eq(newTeamStreamComments.postId, post.id))
          .orderBy(asc(newTeamStreamComments.createdAt));

        return {
          ...post,
          comments: commentsResult,
        };
      })
    );

    // Validate response using Zod
    const responseData = { posts: postsWithComments };
    try {
      StreamResponseSchema.parse(responseData);
    } catch (error) {
      logger.error("Response validation failed", error);
      // Still return the data, but log the validation error
    }

    return NextResponse.json(responseData);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/teams/[teamId]/stream - Create a new stream post
// Frontend Usage:
// - src/app/teams/components/StreamTab.tsx (createPost)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: "Database configuration error",
          details: "DATABASE_URL environment variable is missing",
        },
        { status: 500 }
      );
    }

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch (_error) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    // Validate request body using Zod
    let validatedBody: PostStreamRequest;
    try {
      validatedBody = validateRequest(PostStreamRequestSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(formatValidationError(error), { status: 400 });
      }
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400 }
      );
    }

    const {
      subteamId,
      content,
      showTournamentTimer,
      tournamentId,
      attachmentUrl,
      attachmentTitle,
    } = validatedBody;

    // Resolve the slug to team group using Drizzle ORM
    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (groupResult.length === 0) {
      return NextResponse.json({ error: "Team group not found" }, { status: 404 });
    }

    const groupId = groupResult[0]?.id;
    if (!groupId) {
      return NextResponse.json({ error: "Team group not found" }, { status: 404 });
    }

    // Check if user is a captain/leader of this team group using Drizzle ORM
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
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    const userRole = membershipResult[0]?.role;
    if (!userRole) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }
    if (!["captain", "co_captain"].includes(userRole)) {
      return NextResponse.json(
        { error: "Only captains and co-captains can post to the stream" },
        { status: 403 }
      );
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
      return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
    }

    // If tournament timer is enabled, validate tournament using Drizzle ORM
    if (showTournamentTimer && tournamentId) {
      const tournamentResult = await dbPg
        .select({ id: newTeamEvents.id })
        .from(newTeamEvents)
        .where(
          and(
            eq(newTeamEvents.id, tournamentId),
            eq(newTeamEvents.teamId, subteamId),
            eq(newTeamEvents.eventType, "tournament")
          )
        )
        .limit(1);

      if (tournamentResult.length === 0) {
        return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
      }
    }

    // Insert stream post using Drizzle ORM
    const [postResult] = await dbPg
      .insert(newTeamStreamPosts)
      .values({
        teamUnitId: subteamId,
        authorId: user.id,
        content,
        showTournamentTimer: showTournamentTimer,
        tournamentId: tournamentId || null,
        attachmentUrl: attachmentUrl || null,
        attachmentTitle: attachmentTitle || null,
      })
      .returning({ id: newTeamStreamPosts.id });

    return NextResponse.json({
      message: "Post created successfully",
      postId: postResult?.id ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[teamId]/stream - Edit a stream post
// Frontend Usage:
// - src/app/teams/components/StreamTab.tsx (editPost)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: "Database configuration error",
          details: "DATABASE_URL environment variable is missing",
        },
        { status: 500 }
      );
    }

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch (_error) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    // Validate request body using Zod
    let validatedBody: PutStreamRequest;
    try {
      validatedBody = validateRequest(PutStreamRequestSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(formatValidationError(error), { status: 400 });
      }
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400 }
      );
    }

    const { postId, content, attachmentUrl, attachmentTitle } = validatedBody;

    // Resolve the slug to team group using Drizzle ORM
    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (groupResult.length === 0) {
      return NextResponse.json({ error: "Team group not found" }, { status: 404 });
    }

    const groupId = groupResult[0]?.id;
    if (!groupId) {
      return NextResponse.json({ error: "Team group not found" }, { status: 404 });
    }

    // Check if user is a captain/leader of this team group using Drizzle ORM
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
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    const userRole = membershipResult[0]?.role;
    if (!userRole) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }
    if (!["captain", "co_captain"].includes(userRole)) {
      return NextResponse.json(
        { error: "Only captains and co-captains can edit posts" },
        { status: 403 }
      );
    }

    // Verify the post exists and belongs to this team using Drizzle ORM
    const postResult = await dbPg
      .select({ id: newTeamStreamPosts.id })
      .from(newTeamStreamPosts)
      .innerJoin(newTeamUnits, eq(newTeamStreamPosts.teamUnitId, newTeamUnits.id))
      .where(and(eq(newTeamStreamPosts.id, postId), eq(newTeamUnits.groupId, groupId)))
      .limit(1);

    if (postResult.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Update the post using Drizzle ORM
    await dbPg
      .update(newTeamStreamPosts)
      .set({
        content,
        attachmentUrl: attachmentUrl || null,
        attachmentTitle: attachmentTitle || null,
        updatedAt: new Date(),
      })
      .where(eq(newTeamStreamPosts.id, postId));

    return NextResponse.json({
      message: "Post updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[teamId]/stream - Delete a stream post
// Frontend Usage:
// - src/app/teams/components/StreamTab.tsx (deletePost)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: "Database configuration error",
          details: "DATABASE_URL environment variable is missing",
        },
        { status: 500 }
      );
    }

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        {
          error: "Post ID is required",
        },
        { status: 400 }
      );
    }

    // Validate UUID format using Zod
    try {
      UUIDSchema.parse(postId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(formatValidationError(error), { status: 400 });
      }
      return NextResponse.json(
        { error: "Invalid post ID format. Must be a valid UUID." },
        { status: 400 }
      );
    }

    // Resolve the slug to team group using Drizzle ORM
    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (groupResult.length === 0) {
      return NextResponse.json({ error: "Team group not found" }, { status: 404 });
    }

    const groupId = groupResult[0]?.id;
    if (!groupId) {
      return NextResponse.json({ error: "Team group not found" }, { status: 404 });
    }

    // Check if user is a captain/leader of this team group using Drizzle ORM
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
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    const userRole = membershipResult[0]?.role;
    if (!userRole) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }
    if (!["captain", "co_captain"].includes(userRole)) {
      return NextResponse.json(
        { error: "Only captains and co-captains can delete posts" },
        { status: 403 }
      );
    }

    // Verify the post exists and belongs to this team using Drizzle ORM
    const postResult = await dbPg
      .select({ id: newTeamStreamPosts.id })
      .from(newTeamStreamPosts)
      .innerJoin(newTeamUnits, eq(newTeamStreamPosts.teamUnitId, newTeamUnits.id))
      .where(and(eq(newTeamStreamPosts.id, postId), eq(newTeamUnits.groupId, groupId)))
      .limit(1);

    if (postResult.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Delete the post using Drizzle ORM (this will cascade delete comments due to foreign key constraints)
    await dbPg.delete(newTeamStreamPosts).where(eq(newTeamStreamPosts.id, postId));

    return NextResponse.json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
