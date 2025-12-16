import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
	teamsLinkInvitation,
	teamsMembership,
	teamsRoster,
	teamsTeam,
} from "@/lib/db/schema/teams_v2";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { assertCaptainAccess, bumpTeamVersion } from "./shared";

export async function createLinkInvitation(input: {
	teamSlug: string;
	rosterDisplayName: string;
	invitedUsername: string;
	invitedBy: string;
}) {
	const { team } = await assertCaptainAccess(input.teamSlug, input.invitedBy);

	const existingInvite = await dbPg
		.select({ id: teamsLinkInvitation.id })
		.from(teamsLinkInvitation)
		.where(
			and(
				eq(teamsLinkInvitation.teamId, team.id),
				eq(teamsLinkInvitation.rosterDisplayName, input.rosterDisplayName),
				eq(teamsLinkInvitation.status, "pending"),
			),
		)
		.limit(1);

	if (existingInvite.length > 0) {
		throw new Error(
			"There is already a pending link invitation for this roster member",
		);
	}

	await dbPg.insert(teamsLinkInvitation).values({
		id: crypto.randomUUID(),
		teamId: team.id,
		rosterDisplayName: input.rosterDisplayName,
		invitedUsername: input.invitedUsername,
		invitedBy: input.invitedBy,
		status: "pending",
	});

	await bumpTeamVersion(team.id);

	return { ok: true };
}

export async function listPendingLinkInvitesForUser(userId: string) {
	const [userProfile] = await dbPg
		.select({
			username: users.username,
			supabaseUsername: users.supabaseUsername,
			displayName: users.displayName,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	if (!userProfile) {
		return [];
	}

	const username = userProfile.supabaseUsername || userProfile.username || null;
	if (!username) {
		return [];
	}

	const linkInvites = await dbPg
		.select({
			id: teamsLinkInvitation.id,
			teamId: teamsTeam.id,
			slug: teamsTeam.slug,
			teamName: teamsTeam.name,
			school: teamsTeam.school,
			division: teamsTeam.division,
			rosterDisplayName: teamsLinkInvitation.rosterDisplayName,
		})
		.from(teamsLinkInvitation)
		.innerJoin(teamsTeam, eq(teamsLinkInvitation.teamId, teamsTeam.id))
		.where(
			and(
				ilike(teamsLinkInvitation.invitedUsername, username),
				eq(teamsLinkInvitation.status, "pending"),
			),
		);

	return linkInvites.map((invite) => ({
		id: invite.id,
		teamId: invite.teamId,
		slug: invite.slug,
		teamName: invite.teamName,
		school: invite.school,
		division: invite.division,
		rosterDisplayName: invite.rosterDisplayName,
	}));
}

export async function acceptLinkInvitation(
	linkInviteId: string,
	userId: string,
) {
	const [linkInvite] = await dbPg
		.select({
			id: teamsLinkInvitation.id,
			teamId: teamsLinkInvitation.teamId,
			rosterDisplayName: teamsLinkInvitation.rosterDisplayName,
			invitedUsername: teamsLinkInvitation.invitedUsername,
		})
		.from(teamsLinkInvitation)
		.where(
			and(
				eq(teamsLinkInvitation.id, linkInviteId),
				eq(teamsLinkInvitation.status, "pending"),
			),
		)
		.limit(1);

	if (!linkInvite) {
		throw new Error("Link invitation not found or already processed");
	}

	const [userProfile] = await dbPg
		.select({
			username: users.username,
			supabaseUsername: users.supabaseUsername,
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	const username =
		userProfile?.supabaseUsername || userProfile?.username || null;
	if (
		!username ||
		username.toLowerCase() !== linkInvite.invitedUsername.toLowerCase()
	) {
		throw new Error("This link invitation is not for your account");
	}

	const linkedDisplayName =
		userProfile?.displayName ||
		(userProfile?.firstName && userProfile?.lastName
			? `${userProfile.firstName} ${userProfile.lastName}`
			: userProfile?.firstName ||
				userProfile?.lastName ||
				userProfile?.username ||
				userProfile?.email ||
				`User ${userId.slice(0, 8)}`);

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamsRoster)
			.set({
				userId,
				displayName: linkedDisplayName,
				updatedAt: new Date().toISOString(),
			})
			.where(
				and(
					eq(teamsRoster.teamId, linkInvite.teamId),
					eq(teamsRoster.displayName, linkInvite.rosterDisplayName),
					isNull(teamsRoster.userId),
				),
			);

		const existingMembership = await tx
			.select({ id: teamsMembership.id })
			.from(teamsMembership)
			.where(
				and(
					eq(teamsMembership.teamId, linkInvite.teamId),
					eq(teamsMembership.userId, userId),
				),
			)
			.limit(1);

		if (existingMembership.length === 0) {
			await tx.insert(teamsMembership).values({
				id: crypto.randomUUID(),
				teamId: linkInvite.teamId,
				userId,
				role: "member",
				status: "active",
			});
		}

		await tx
			.update(teamsLinkInvitation)
			.set({ status: "accepted", updatedAt: new Date().toISOString() })
			.where(eq(teamsLinkInvitation.id, linkInviteId));

		await bumpTeamVersion(linkInvite.teamId);
	});

	return { ok: true };
}

export async function declineLinkInvitation(
	linkInviteId: string,
	userId: string,
) {
	const [linkInvite] = await dbPg
		.select({
			id: teamsLinkInvitation.id,
			invitedUsername: teamsLinkInvitation.invitedUsername,
			teamId: teamsLinkInvitation.teamId,
		})
		.from(teamsLinkInvitation)
		.where(
			and(
				eq(teamsLinkInvitation.id, linkInviteId),
				eq(teamsLinkInvitation.status, "pending"),
			),
		)
		.limit(1);

	if (!linkInvite) {
		throw new Error("Link invitation not found or already processed");
	}

	const [userProfile] = await dbPg
		.select({
			username: users.username,
			supabaseUsername: users.supabaseUsername,
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	const username =
		userProfile?.supabaseUsername || userProfile?.username || null;
	if (
		!username ||
		username.toLowerCase() !== linkInvite.invitedUsername.toLowerCase()
	) {
		throw new Error("This link invitation is not for your account");
	}

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamsLinkInvitation)
			.set({ status: "declined", updatedAt: new Date().toISOString() })
			.where(eq(teamsLinkInvitation.id, linkInviteId));

		await bumpTeamVersion(linkInvite.teamId);
	});

	return { ok: true };
}
