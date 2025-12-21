import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
	teamEvents,
	teamMemberships,
	teamStreamComments,
	teamStreamPosts,
	teamSubteams,
	teams,
} from "@/lib/db/schema";
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
import logger from "@/lib/utils/logging/logger";
import { getTeamAccess } from "@/lib/utils/teams/access";
import {
	// handleError,
	handleForbiddenError,
	// handleNotFoundError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/teams/errors";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/teams/[teamId]/stream - Get stream posts for a subteam
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchStream, fetchStreamData)
// - src/app/hooks/useEnhancedTeamData.ts (fetchStream)
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
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
			return NextResponse.json(
				{ error: "Subteam ID is required" },
				{ status: 400 },
			);
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
				]),
			);
		}

		// Resolve the slug to team group using Drizzle ORM
		const groupResult = await dbPg
			.select({ id: teams.id })
			.from(teams)
			.where(eq(teams.slug, teamId))
			.limit(1);

		if (groupResult.length === 0) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		const groupId = groupResult[0]?.id;
		if (!groupId) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		// Check if user has access to this team group (membership OR roster entry)
		const access = await getTeamAccess(user.id, groupId);
		if (!access.hasAccess) {
			return handleForbiddenError("Not authorized to access this team");
		}

		// Get stream posts with author information and tournament details using Drizzle ORM
		const streamResult = await dbPg
			.select({
				id: teamStreamPosts.id,
				content: teamStreamPosts.content,
				show_tournament_timer: teamStreamPosts.showTournamentTimer,
				tournament_id: teamStreamPosts.tournamentId,
				tournament_title: teamEvents.title,
				tournament_start_time: teamEvents.startTime,
				author_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
				author_email: users.email,
				created_at: teamStreamPosts.createdAt,
				attachment_url: teamStreamPosts.attachmentUrl,
				attachment_title: teamStreamPosts.attachmentTitle,
			})
			.from(teamStreamPosts)
			.innerJoin(users, eq(teamStreamPosts.authorId, users.id))
			.leftJoin(teamEvents, eq(teamStreamPosts.tournamentId, teamEvents.id))
			.where(eq(teamStreamPosts.subteamId, subteamId))
			.orderBy(desc(teamStreamPosts.createdAt))
			.limit(50);

		// Get comments for each post using Drizzle ORM
		const postsWithComments = await Promise.all(
			streamResult.map(async (post) => {
				const commentsResult = await dbPg
					.select({
						id: teamStreamComments.id,
						content: teamStreamComments.content,
						author_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
						author_email: users.email,
						created_at: teamStreamComments.createdAt,
					})
					.from(teamStreamComments)
					.innerJoin(users, eq(teamStreamComments.authorId, users.id))
					.where(eq(teamStreamComments.postId, post.id))
					.orderBy(asc(teamStreamComments.createdAt));

				return {
					...post,
					comments: commentsResult,
				};
			}),
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
			{ status: 500 },
		);
	}
}

// POST /api/teams/[teamId]/stream - Create a new stream post
// Frontend Usage:
// - src/app/teams/components/StreamTab.tsx (createPost)
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		if (!process.env.DATABASE_URL) {
			return NextResponse.json(
				{
					error: "Database configuration error",
					details: "DATABASE_URL environment variable is missing",
				},
				{ status: 500 },
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
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 },
			);
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
				{ status: 400 },
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
			.select({ id: teams.id })
			.from(teams)
			.where(eq(teams.slug, teamId))
			.limit(1);

		if (groupResult.length === 0) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		const groupId = groupResult[0]?.id;
		if (!groupId) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		// Check if user is a captain/leader of this team group using Drizzle ORM
		const membershipResult = await dbPg
			.select({ role: teamMemberships.role })
			.from(teamMemberships)
			.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
			.where(
				and(
					eq(teamMemberships.userId, user.id),
					eq(teamSubteams.teamId, groupId),
					eq(teamMemberships.status, "active"),
				),
			)
			.limit(1);

		if (membershipResult.length === 0) {
			return NextResponse.json({ error: "Not a team member" }, { status: 403 });
		}

		const userRole = membershipResult[0]?.role;
		if (!userRole) {
			return NextResponse.json({ error: "Not a team member" }, { status: 403 });
		}
		if (userRole !== "captain") {
			return NextResponse.json(
				{ error: "Only captains can post to the stream" },
				{ status: 403 },
			);
		}

		// Check if the subteam belongs to this group using Drizzle ORM
		const subteamResult = await dbPg
			.select({ id: teamSubteams.id })
			.from(teamSubteams)
			.where(
				and(
					eq(teamSubteams.id, subteamId),
					eq(teamSubteams.teamId, groupId),
					eq(teamSubteams.status, "active"),
				),
			)
			.limit(1);

		if (subteamResult.length === 0) {
			return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
		}

		// If tournament timer is enabled, validate tournament using Drizzle ORM
		if (showTournamentTimer && tournamentId) {
			const tournamentResult = await dbPg
				.select({ id: teamEvents.id })
				.from(teamEvents)
				.where(
					and(
						eq(teamEvents.id, tournamentId),
						eq(teamEvents.teamId, subteamId),
						eq(teamEvents.eventType, "tournament"),
					),
				)
				.limit(1);

			if (tournamentResult.length === 0) {
				return NextResponse.json(
					{ error: "Tournament not found" },
					{ status: 404 },
				);
			}
		}

		// Insert stream post using Drizzle ORM
		const [postResult] = await dbPg
			.insert(teamStreamPosts)
			.values({
				teamId: groupId,
				subteamId: subteamId,
				authorId: user.id,
				content,
				showTournamentTimer: showTournamentTimer,
				tournamentId: tournamentId || null,
				attachmentUrl: attachmentUrl || null,
				attachmentTitle: attachmentTitle || null,
			})
			.returning({ id: teamStreamPosts.id });

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
			{ status: 500 },
		);
	}
}

// PUT /api/teams/[teamId]/stream - Edit a stream post
// Frontend Usage:
// - src/app/teams/components/StreamTab.tsx (editPost)
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		if (!process.env.DATABASE_URL) {
			return NextResponse.json(
				{
					error: "Database configuration error",
					details: "DATABASE_URL environment variable is missing",
				},
				{ status: 500 },
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
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 },
			);
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
				{ status: 400 },
			);
		}

		const { postId, content, attachmentUrl, attachmentTitle } = validatedBody;

		// Resolve the slug to team group using Drizzle ORM
		const groupResult = await dbPg
			.select({ id: teams.id })
			.from(teams)
			.where(eq(teams.slug, teamId))
			.limit(1);

		if (groupResult.length === 0) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		const groupId = groupResult[0]?.id;
		if (!groupId) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		// Check if user is a captain/leader of this team group using Drizzle ORM
		const membershipResult = await dbPg
			.select({ role: teamMemberships.role })
			.from(teamMemberships)
			.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
			.where(
				and(
					eq(teamMemberships.userId, user.id),
					eq(teamSubteams.teamId, groupId),
					eq(teamMemberships.status, "active"),
				),
			)
			.limit(1);

		if (membershipResult.length === 0) {
			return NextResponse.json({ error: "Not a team member" }, { status: 403 });
		}

		const userRole = membershipResult[0]?.role;
		if (!userRole) {
			return NextResponse.json({ error: "Not a team member" }, { status: 403 });
		}
		if (userRole !== "captain") {
			return NextResponse.json(
				{ error: "Only captains can edit posts" },
				{ status: 403 },
			);
		}

		// Verify the post exists and belongs to this team using Drizzle ORM
		const postResult = await dbPg
			.select({ id: teamStreamPosts.id })
			.from(teamStreamPosts)
			.innerJoin(teamSubteams, eq(teamStreamPosts.subteamId, teamSubteams.id))
			.where(
				and(eq(teamStreamPosts.id, postId), eq(teamSubteams.teamId, groupId)),
			)
			.limit(1);

		if (postResult.length === 0) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		// Update the post using Drizzle ORM
		await dbPg
			.update(teamStreamPosts)
			.set({
				content,
				attachmentUrl: attachmentUrl || null,
				attachmentTitle: attachmentTitle || null,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(teamStreamPosts.id, postId));

		return NextResponse.json({
			message: "Post updated successfully",
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// DELETE /api/teams/[teamId]/stream - Delete a stream post
// Frontend Usage:
// - src/app/teams/components/StreamTab.tsx (deletePost)
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		if (!process.env.DATABASE_URL) {
			return NextResponse.json(
				{
					error: "Database configuration error",
					details: "DATABASE_URL environment variable is missing",
				},
				{ status: 500 },
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
				{ status: 400 },
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
				{ status: 400 },
			);
		}

		// Resolve the slug to team group using Drizzle ORM
		const groupResult = await dbPg
			.select({ id: teams.id })
			.from(teams)
			.where(eq(teams.slug, teamId))
			.limit(1);

		if (groupResult.length === 0) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		const groupId = groupResult[0]?.id;
		if (!groupId) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		// Check if user is a captain/leader of this team group using Drizzle ORM
		const membershipResult = await dbPg
			.select({ role: teamMemberships.role })
			.from(teamMemberships)
			.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
			.where(
				and(
					eq(teamMemberships.userId, user.id),
					eq(teamSubteams.teamId, groupId),
					eq(teamMemberships.status, "active"),
				),
			)
			.limit(1);

		if (membershipResult.length === 0) {
			return NextResponse.json({ error: "Not a team member" }, { status: 403 });
		}

		const userRole = membershipResult[0]?.role;
		if (!userRole) {
			return NextResponse.json({ error: "Not a team member" }, { status: 403 });
		}
		if (userRole !== "captain") {
			return NextResponse.json(
				{ error: "Only captains can delete posts" },
				{ status: 403 },
			);
		}

		// Verify the post exists and belongs to this team using Drizzle ORM
		const postResult = await dbPg
			.select({ id: teamStreamPosts.id })
			.from(teamStreamPosts)
			.innerJoin(teamSubteams, eq(teamStreamPosts.subteamId, teamSubteams.id))
			.where(
				and(eq(teamStreamPosts.id, postId), eq(teamSubteams.teamId, groupId)),
			)
			.limit(1);

		if (postResult.length === 0) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		// Delete the post using Drizzle ORM (this will cascade delete comments due to foreign key constraints)
		await dbPg.delete(teamStreamPosts).where(eq(teamStreamPosts.id, postId));

		return NextResponse.json({
			message: "Post deleted successfully",
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
