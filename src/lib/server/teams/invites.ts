import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { teamInvitations, teamMemberships, teams } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { and, eq, or } from "drizzle-orm";
import { touchTeamCacheManifest } from "./cache-manifest";
import {
	assertAdminAccess,
	assertCaptainAccess,
	buildInviteMatchFilters,
	bumpTeamVersion,
	ensureSupabaseLink,
} from "./shared";

export interface PendingInvite {
	teamId: string;
	slug: string;
	name: string;
	school: string;
	division: string;
	role: "captain" | "member";
}

export async function listPendingInvitesForUser(
	userId: string,
): Promise<PendingInvite[]> {
	const [profile] = await dbPg
		.select({
			email: users.email,
			username: users.supabaseUsername,
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	const inviteMatch = buildInviteMatchFilters(
		userId,
		profile?.email ?? null,
		profile?.username ?? null,
	);

	const invites =
		profile || userId
			? await dbPg
					.select({
						invitationId: teamInvitations.id,
						teamId: teams.id,
						slug: teams.slug,
						name: teams.name,
						school: teams.school,
						division: teams.division,
						role: teamInvitations.role,
					})
					.from(teamInvitations)
					.innerJoin(teams, eq(teamInvitations.teamId, teams.id))
					.where(and(eq(teamInvitations.status, "pending"), inviteMatch))
			: [];

	const pendingMemberships = await dbPg
		.select({
			teamId: teams.id,
			slug: teams.slug,
			name: teams.name,
			school: teams.school,
			division: teams.division,
			role: teamMemberships.role,
		})
		.from(teamMemberships)
		.innerJoin(teams, eq(teamMemberships.teamId, teams.id))
		.where(
			and(
				eq(teamMemberships.userId, userId),
				eq(teamMemberships.status, "pending"),
			),
		);

	const combined = new Map<string, PendingInvite>();

	for (const invite of invites) {
		combined.set(invite.teamId, {
			teamId: invite.teamId,
			slug: invite.slug,
			name: invite.name,
			school: invite.school,
			division: invite.division,
			role: (invite.role as "captain" | "member") ?? "member",
		});
	}

	for (const membership of pendingMemberships) {
		if (combined.has(membership.teamId)) continue;
		combined.set(membership.teamId, {
			teamId: membership.teamId,
			slug: membership.slug,
			name: membership.name,
			school: membership.school,
			division: membership.division,
			role: (membership.role as "captain" | "member") ?? "member",
		});
	}

	return Array.from(combined.values());
}

export async function acceptPendingInvite(teamSlug: string, userId: string) {
	const [team] = await dbPg
		.select({
			id: teams.id,
			slug: teams.slug,
		})
		.from(teams)
		.where(eq(teams.slug, teamSlug))
		.limit(1);

	if (!team) {
		throw new Error("Team not found");
	}

	const supabase = await createSupabaseServerClient();
	const { data: supabaseUser } = await supabase.auth.getUser();
	if (supabaseUser?.user) {
		await ensureSupabaseLink(supabaseUser.user);
	}

	await dbPg.transaction(async (tx) => {
		const [profile] = await tx
			.select({
				email: users.email,
				username: users.supabaseUsername,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		const inviteMatch = buildInviteMatchFilters(
			userId,
			profile?.email ?? null,
			profile?.username ?? null,
		);

		const [invite] = await tx
			.select({
				id: teamInvitations.id,
				role: teamInvitations.role,
			})
			.from(teamInvitations)
			.where(
				and(
					eq(teamInvitations.teamId, team.id),
					eq(teamInvitations.status, "pending"),
					inviteMatch,
				),
			)
			.limit(1);

		const [existingMembership] = await tx
			.select({
				id: teamMemberships.id,
				role: teamMemberships.role,
				status: teamMemberships.status,
			})
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.teamId, team.id),
					eq(teamMemberships.userId, userId),
				),
			)
			.limit(1);

		if (existingMembership) {
			await tx
				.update(teamMemberships)
				.set({
					status: "active",
					role: existingMembership.role ?? invite?.role ?? "member",
					updatedAt: new Date().toISOString(),
				})
				.where(eq(teamMemberships.id, existingMembership.id));
		} else {
			await tx.insert(teamMemberships).values({
				id: crypto.randomUUID(),
				teamId: team.id,
				userId,
				role: invite?.role ?? "member",
				status: "active",
				invitedBy: null,
				joinedAt: new Date().toISOString(),
			});
		}

		if (invite) {
			await tx
				.update(teamInvitations)
				.set({
					status: "accepted",
					invitedUserId: userId,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(teamInvitations.id, invite.id));
		}

		await bumpTeamVersion(team.id, tx);
		await touchTeamCacheManifest(team.id, { members: true, full: true }, tx);
	});

	return { slug: team.slug };
}

export async function declineInvite(teamSlug: string, userId: string) {
	const [team] = await dbPg
		.select({
			id: teams.id,
			slug: teams.slug,
		})
		.from(teams)
		.where(eq(teams.slug, teamSlug))
		.limit(1);

	if (!team) {
		throw new Error("Team not found");
	}

	const supabase = await createSupabaseServerClient();
	const { data: supabaseUser } = await supabase.auth.getUser();
	if (supabaseUser?.user) {
		await ensureSupabaseLink(supabaseUser.user);
	}

	await dbPg.transaction(async (tx) => {
		const [profile] = await tx
			.select({
				email: users.email,
				username: users.supabaseUsername,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		const inviteMatch = buildInviteMatchFilters(
			userId,
			profile?.email ?? null,
			profile?.username ?? null,
		);

		await tx
			.update(teamInvitations)
			.set({
				status: "declined",
				invitedUserId: userId,
				updatedAt: new Date().toISOString(),
			})
			.where(
				and(
					eq(teamInvitations.teamId, team.id),
					eq(teamInvitations.status, "pending"),
					inviteMatch,
				),
			);

		await tx
			.update(teamMemberships)
			.set({ status: "inactive", updatedAt: new Date().toISOString() })
			.where(
				and(
					eq(teamMemberships.teamId, team.id),
					eq(teamMemberships.userId, userId),
					eq(teamMemberships.status, "pending"),
				),
			);

		await bumpTeamVersion(team.id, tx);
		await touchTeamCacheManifest(team.id, { members: true, full: true }, tx);
	});

	return { ok: true };
}

export async function cancelPendingInvite(input: {
	teamSlug: string;
	invitedUserId: string;
	actorId: string;
}) {
	const { team } = await assertCaptainAccess(input.teamSlug, input.actorId);

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamInvitations)
			.set({ status: "cancelled", updatedAt: new Date().toISOString() })
			.where(
				and(
					eq(teamInvitations.teamId, team.id),
					eq(teamInvitations.status, "pending"),
					eq(teamInvitations.invitedUserId, input.invitedUserId),
				),
			);

		await tx
			.update(teamMemberships)
			.set({ status: "inactive", updatedAt: new Date().toISOString() })
			.where(
				and(
					eq(teamMemberships.teamId, team.id),
					eq(teamMemberships.userId, input.invitedUserId),
					eq(teamMemberships.status, "pending"),
				),
			);

		await bumpTeamVersion(team.id, tx);
		await touchTeamCacheManifest(team.id, { members: true, full: true }, tx);
	});

	return { ok: true };
}

export async function createInvitation(input: {
	teamSlug: string;
	invitedUsername: string;
	role?: "captain" | "member";
	invitedBy: string;
}) {
	const { team } =
		input.role === "captain"
			? await assertAdminAccess(input.teamSlug, input.invitedBy)
			: await assertCaptainAccess(input.teamSlug, input.invitedBy);

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("users")
		.select("id, username, email")
		.ilike("username", input.invitedUsername.trim())
		.limit(1)
		.maybeSingle();

	if (error) {
		throw new Error(`Failed to look up user: ${error.message}`);
	}

	const invitedUser = data as {
		id?: string;
		username?: string;
		email?: string;
	} | null;

	if (!invitedUser?.id) {
		throw new Error("User not found");
	}

	const invitedUserId = invitedUser.id;

	const existing = await dbPg
		.select({ id: teamMemberships.id })
		.from(teamMemberships)
		.where(
			and(
				eq(teamMemberships.teamId, team.id),
				eq(teamMemberships.userId, invitedUserId),
				or(
					eq(teamMemberships.status, "active"),
					eq(teamMemberships.status, "pending"),
				),
			),
		)
		.limit(1);

	if (existing.length > 0) {
		throw new Error("User is already a member or has a pending invitation");
	}

	const token = crypto.randomUUID();

	await dbPg.transaction(async (tx) => {
		await tx.insert(teamInvitations).values({
			teamId: team.id,
			email: invitedUser.email ?? "",
			invitedUserId,
			invitedEmail: invitedUser.email ?? null,
			role: input.role ?? "member",
			invitedBy: input.invitedBy,
			status: "pending",
			token,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		});

		await tx.insert(teamMemberships).values({
			teamId: team.id,
			userId: invitedUserId,
			role: input.role ?? "member",
			status: "pending",
			invitedBy: input.invitedBy,
		});

		await bumpTeamVersion(team.id, tx);
		await touchTeamCacheManifest(team.id, { members: true, full: true }, tx);
	});

	return {
		ok: true,
		invitedUserId: invitedUser.id,
		invitedUsername: invitedUser.username ?? null,
	};
}

export async function promoteToRole(input: {
	teamSlug: string;
	userId: string;
	newRole: "admin" | "captain" | "member";
	actorId: string;
}) {
	const { team } = await assertAdminAccess(input.teamSlug, input.actorId);

	const membership = await dbPg
		.select({
			id: teamMemberships.id,
			role: teamMemberships.role,
			status: teamMemberships.status,
		})
		.from(teamMemberships)
		.where(
			and(
				eq(teamMemberships.teamId, team.id),
				eq(teamMemberships.userId, input.userId),
			),
		)
		.limit(1);

	const [currentMembership] = membership;
	if (!currentMembership || currentMembership.status !== "active") {
		throw new Error(
			"User must be linked to an account before they can be promoted to captain",
		);
	}

	if (currentMembership.role === input.newRole) {
		throw new Error(`User is already a ${input.newRole}`);
	}

	if ((currentMembership.role as string) === "admin") {
		throw new Error("Admins cannot be demoted");
	}

	// Enforce a strict progression:
	// member <-> captain, and captain -> admin (admins are immutable)
	if (
		input.newRole === "admin" &&
		(currentMembership.role as string) !== "captain"
	) {
		throw new Error("Only captains can be promoted to admin");
	}
	if (
		input.newRole === "captain" &&
		(currentMembership.role as string) !== "member"
	) {
		throw new Error("Only members can be promoted to captain");
	}
	if (
		input.newRole === "member" &&
		(currentMembership.role as string) !== "captain"
	) {
		throw new Error("Only captains can be demoted to member");
	}

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamMemberships)
			.set({ role: input.newRole, updatedAt: new Date().toISOString() })
			.where(
				and(
					eq(teamMemberships.teamId, team.id),
					eq(teamMemberships.userId, input.userId),
				),
			);

		await bumpTeamVersion(team.id, tx);
		await touchTeamCacheManifest(team.id, { members: true, full: true }, tx);
	});

	return { ok: true, newRole: input.newRole };
}
