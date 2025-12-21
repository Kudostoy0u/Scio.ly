import { dbPg } from "@/lib/db";
import {
	teamMemberships,
	teamStreamComments,
	teamStreamPosts,
	teamSubteams,
	teams,
} from "@/lib/db/schema";
import { getServerUser } from "@/lib/supabaseServer";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// UUID validation regex
const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// POST /api/teams/[teamId]/stream/comments - Add a comment to a stream post
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
		const body = await request.json();
		const { postId, content } = body;

		if (!(postId && content)) {
			return NextResponse.json(
				{
					error: "Post ID and content are required",
				},
				{ status: 400 },
			);
		}

		// Validate UUID format for postId
		if (!UUID_REGEX.test(postId)) {
			return NextResponse.json(
				{
					error: "Invalid post ID format. Must be a valid UUID.",
				},
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

		// Check if user is a member of this team group using Drizzle ORM
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

		// Insert comment using Drizzle ORM
		const [commentResult] = await dbPg
			.insert(teamStreamComments)
			.values({
				postId,
				authorId: user.id,
				content,
			})
			.returning({ id: teamStreamComments.id });

		return NextResponse.json({
			message: "Comment added successfully",
			commentId: commentResult?.id ?? "",
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

// DELETE /api/teams/[teamId]/stream/comments - Delete a comment
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
		const commentId = searchParams.get("commentId");

		if (!commentId) {
			return NextResponse.json(
				{
					error: "Comment ID is required",
				},
				{ status: 400 },
			);
		}

		// Validate UUID format
		if (!UUID_REGEX.test(commentId)) {
			return NextResponse.json(
				{
					error: "Invalid comment ID format. Must be a valid UUID.",
				},
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
				{ error: "Only captains can delete comments" },
				{ status: 403 },
			);
		}

		// Verify the comment exists and belongs to this team using Drizzle ORM
		const commentResult = await dbPg
			.select({ id: teamStreamComments.id })
			.from(teamStreamComments)
			.innerJoin(
				teamStreamPosts,
				eq(teamStreamComments.postId, teamStreamPosts.id),
			)
			.innerJoin(teamSubteams, eq(teamStreamPosts.subteamId, teamSubteams.id))
			.where(
				and(
					eq(teamStreamComments.id, commentId),
					eq(teamSubteams.teamId, groupId),
				),
			)
			.limit(1);

		if (commentResult.length === 0) {
			return NextResponse.json({ error: "Comment not found" }, { status: 404 });
		}

		// Delete the comment using Drizzle ORM
		await dbPg
			.delete(teamStreamComments)
			.where(eq(teamStreamComments.id, commentId));

		return NextResponse.json({
			message: "Comment deleted successfully",
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
