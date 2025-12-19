import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
	teamStreamComments,
	teamStreamPosts,
	teamSubteams,
} from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { assertCaptainAccess, assertTeamAccess } from "./shared";

export async function getStreamPosts(
	teamSlug: string,
	subteamId: string,
	userId: string,
) {
	const { team } = await assertTeamAccess(teamSlug, userId);

	// Verify subteam belongs to team
	const [subteam] = await dbPg
		.select({ id: teamSubteams.id })
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.id, subteamId), eq(teamSubteams.teamId, team.id)),
		)
		.limit(1);

	if (!subteam) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
	}

	const streamResult = await dbPg
		.select({
			id: teamStreamPosts.id,
			content: teamStreamPosts.content,
			show_tournament_timer: sql<boolean>`false`, // Placeholder for V2
			tournament_id: sql<string | null>`null`, // Placeholder for V2
			tournament_title: sql<string | null>`null`, // Placeholder for V2
			tournament_start_time: sql<string | null>`null`, // Placeholder for V2
			author_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
			author_email: users.email,
			author_photo_url: users.photoUrl,
			created_at: teamStreamPosts.createdAt,
			attachment_url: teamStreamPosts.attachmentUrl,
			attachment_title: teamStreamPosts.attachmentTitle,
		})
		.from(teamStreamPosts)
		.innerJoin(users, eq(teamStreamPosts.authorId, users.id))
		.where(eq(teamStreamPosts.subteamId, subteamId))
		.orderBy(desc(teamStreamPosts.createdAt))
		.limit(50);

	const postsWithComments = await Promise.all(
		streamResult.map(async (post) => {
			const commentsResult = await dbPg
				.select({
					id: teamStreamComments.id,
					content: teamStreamComments.content,
					author_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
					author_email: users.email,
					author_photo_url: users.photoUrl,
					created_at: teamStreamComments.createdAt,
				})
				.from(teamStreamComments)
				.innerJoin(users, eq(teamStreamComments.authorId, users.id))
				.where(eq(teamStreamComments.postId, post.id))
				.orderBy(asc(teamStreamComments.createdAt));

			return { ...post, comments: commentsResult };
		}),
	);

	return postsWithComments;
}

export async function createStreamPost(
	teamSlug: string,
	input: {
		subteamId: string;
		content: string;
		attachmentUrl?: string | null;
		attachmentTitle?: string | null;
	},
	userId: string,
) {
	const { team } = await assertCaptainAccess(teamSlug, userId);

	const [subteam] = await dbPg
		.select({ id: teamSubteams.id })
		.from(teamSubteams)
		.where(
			and(
				eq(teamSubteams.id, input.subteamId),
				eq(teamSubteams.teamId, team.id),
			),
		)
		.limit(1);

	if (!subteam) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
	}

	const [post] = await dbPg
		.insert(teamStreamPosts)
		.values({
			teamId: team.id,
			subteamId: input.subteamId,
			authorId: userId,
			content: input.content,
			attachmentUrl: input.attachmentUrl || null,
			attachmentTitle: input.attachmentTitle || null,
		})
		.returning({ id: teamStreamPosts.id });

	return post;
}

export async function updateStreamPost(
	teamSlug: string,
	input: {
		postId: string;
		content: string;
		attachmentUrl?: string | null;
		attachmentTitle?: string | null;
	},
	userId: string,
) {
	const { team } = await assertCaptainAccess(teamSlug, userId);

	const [post] = await dbPg
		.select({ id: teamStreamPosts.id })
		.from(teamStreamPosts)
		.innerJoin(teamSubteams, eq(teamStreamPosts.subteamId, teamSubteams.id))
		.where(
			and(
				eq(teamStreamPosts.id, input.postId),
				eq(teamSubteams.teamId, team.id),
			),
		)
		.limit(1);

	if (!post) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
	}

	await dbPg
		.update(teamStreamPosts)
		.set({
			content: input.content,
			attachmentUrl: input.attachmentUrl || null,
			attachmentTitle: input.attachmentTitle || null,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(teamStreamPosts.id, input.postId));

	return { success: true };
}

export async function deleteStreamPost(
	teamSlug: string,
	postId: string,
	userId: string,
) {
	const { team } = await assertCaptainAccess(teamSlug, userId);

	// Verify post belongs to one of the team's subteams
	const post = await dbPg
		.select({ id: teamStreamPosts.id })
		.from(teamStreamPosts)
		.innerJoin(teamSubteams, eq(teamStreamPosts.subteamId, teamSubteams.id))
		.where(
			and(eq(teamStreamPosts.id, postId), eq(teamSubteams.teamId, team.id)),
		)
		.limit(1);

	if (post.length === 0) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
	}

	await dbPg.delete(teamStreamPosts).where(eq(teamStreamPosts.id, postId));
	return { success: true };
}

export async function addComment(
	teamSlug: string,
	input: { postId: string; content: string },
	userId: string,
) {
	const { team } = await assertTeamAccess(teamSlug, userId);

	const post = await dbPg
		.select({ id: teamStreamPosts.id })
		.from(teamStreamPosts)
		.innerJoin(teamSubteams, eq(teamStreamPosts.subteamId, teamSubteams.id))
		.where(
			and(
				eq(teamStreamPosts.id, input.postId),
				eq(teamSubteams.teamId, team.id),
			),
		)
		.limit(1);

	if (post.length === 0) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
	}

	const [comment] = await dbPg
		.insert(teamStreamComments)
		.values({
			postId: input.postId,
			authorId: userId,
			content: input.content,
		})
		.returning({ id: teamStreamComments.id });

	return comment;
}

export async function deleteComment(
	teamSlug: string,
	commentId: string,
	userId: string,
) {
	const { team } = await assertCaptainAccess(teamSlug, userId);

	const comment = await dbPg
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
				eq(teamSubteams.teamId, team.id),
			),
		)
		.limit(1);

	if (comment.length === 0) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
	}

	await dbPg
		.delete(teamStreamComments)
		.where(eq(teamStreamComments.id, commentId));
	return { success: true };
}
