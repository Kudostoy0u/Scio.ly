import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
	teamLinkInvitations,
	teamMemberships,
	teamRoster,
	teams,
} from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { touchTeamCacheManifest } from "./cache-manifest";
import { ensureActiveTournamentRoster } from "./roster";
import { assertCaptainAccess, bumpTeamVersion } from "./shared";

export async function createLinkInvitation(input: {
	teamSlug: string;
	rosterDisplayName: string;
	invitedUsername: string;
	invitedBy: string;
}) {
	const { team } = await assertCaptainAccess(input.teamSlug, input.invitedBy);

	const existingInvite = await dbPg
		.select({ id: teamLinkInvitations.id })
		.from(teamLinkInvitations)
		.where(
			and(
				eq(teamLinkInvitations.teamId, team.id),
				eq(teamLinkInvitations.rosterDisplayName, input.rosterDisplayName),
				eq(teamLinkInvitations.status, "pending"),
			),
		)
		.limit(1);

	if (existingInvite.length > 0) {
		throw new Error(
			"There is already a pending link invitation for this roster member",
		);
	}

	await dbPg.insert(teamLinkInvitations).values({
		id: crypto.randomUUID(),
		teamId: team.id,
		rosterDisplayName: input.rosterDisplayName,
		invitedUsername: input.invitedUsername,
		invitedBy: input.invitedBy,
		status: "pending",
	});

	await bumpTeamVersion(team.id);
	await touchTeamCacheManifest(team.id, { full: true });

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
			id: teamLinkInvitations.id,
			teamId: teams.id,
			slug: teams.slug,
			teamName: teams.name,
			school: teams.school,
			division: teams.division,
			rosterDisplayName: teamLinkInvitations.rosterDisplayName,
		})
		.from(teamLinkInvitations)
		.innerJoin(teams, eq(teamLinkInvitations.teamId, teams.id))
		.where(
			and(
				ilike(teamLinkInvitations.invitedUsername, username),
				eq(teamLinkInvitations.status, "pending"),
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
			id: teamLinkInvitations.id,
			teamId: teamLinkInvitations.teamId,
			rosterDisplayName: teamLinkInvitations.rosterDisplayName,
			invitedUsername: teamLinkInvitations.invitedUsername,
		})
		.from(teamLinkInvitations)
		.where(
			and(
				eq(teamLinkInvitations.id, linkInviteId),
				eq(teamLinkInvitations.status, "pending"),
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
			displayName: users.displayName,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
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

	const activeRoster = await ensureActiveTournamentRoster(
		linkInvite.teamId,
		userId,
	);

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamRoster)
			.set({
				userId,
				displayName: linkedDisplayName,
				updatedAt: new Date().toISOString(),
			})
			.where(
				and(
					eq(teamRoster.teamId, linkInvite.teamId),
					eq(teamRoster.tournamentRosterId, activeRoster.id),
					eq(teamRoster.displayName, linkInvite.rosterDisplayName),
					isNull(teamRoster.userId),
				),
			);

		const existingMembership = await tx
			.select({ id: teamMemberships.id })
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.teamId, linkInvite.teamId),
					eq(teamMemberships.userId, userId),
				),
			)
			.limit(1);

		if (existingMembership.length === 0) {
			await tx.insert(teamMemberships).values({
				id: crypto.randomUUID(),
				teamId: linkInvite.teamId,
				userId,
				role: "member",
				status: "active",
			});
		}

		await tx
			.update(teamLinkInvitations)
			.set({ status: "accepted", updatedAt: new Date().toISOString() })
			.where(eq(teamLinkInvitations.id, linkInviteId));

		await bumpTeamVersion(linkInvite.teamId, tx);
		await touchTeamCacheManifest(
			linkInvite.teamId,
			{ roster: true, members: true, full: true },
			tx,
		);
	});

	return { ok: true };
}

export async function declineLinkInvitation(
	linkInviteId: string,
	userId: string,
) {
	const [linkInvite] = await dbPg
		.select({
			id: teamLinkInvitations.id,
			invitedUsername: teamLinkInvitations.invitedUsername,
			teamId: teamLinkInvitations.teamId,
		})
		.from(teamLinkInvitations)
		.where(
			and(
				eq(teamLinkInvitations.id, linkInviteId),
				eq(teamLinkInvitations.status, "pending"),
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
			displayName: users.displayName,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
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
			.update(teamLinkInvitations)
			.set({ status: "declined", updatedAt: new Date().toISOString() })
			.where(eq(teamLinkInvitations.id, linkInviteId));

		await bumpTeamVersion(linkInvite.teamId, tx);
		await touchTeamCacheManifest(linkInvite.teamId, { full: true }, tx);
	});

	return { ok: true };
}

export async function cancelLinkInvitation(input: {
	teamSlug: string;
	rosterDisplayName: string;
	userId: string;
}) {
	const { team } = await assertCaptainAccess(input.teamSlug, input.userId);

	const [linkInvite] = await dbPg
		.select({
			id: teamLinkInvitations.id,
			teamId: teamLinkInvitations.teamId,
		})
		.from(teamLinkInvitations)
		.where(
			and(
				eq(teamLinkInvitations.teamId, team.id),
				eq(teamLinkInvitations.rosterDisplayName, input.rosterDisplayName),
				eq(teamLinkInvitations.status, "pending"),
			),
		)
		.limit(1);

	if (!linkInvite) {
		throw new Error("No pending link invitation found for this roster member");
	}

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamLinkInvitations)
			.set({ status: "cancelled", updatedAt: new Date().toISOString() })
			.where(eq(teamLinkInvitations.id, linkInvite.id));

		await bumpTeamVersion(linkInvite.teamId, tx);
		await touchTeamCacheManifest(linkInvite.teamId, { full: true }, tx);
	});

	return { ok: true };
}
