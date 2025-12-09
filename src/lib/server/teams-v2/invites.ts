import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
	teamsInvitation,
	teamsMembership,
	teamsTeam,
} from "@/lib/db/schema/teams_v2";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { and, eq, or } from "drizzle-orm";
import {
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
						invitationId: teamsInvitation.id,
						teamId: teamsTeam.id,
						slug: teamsTeam.slug,
						name: teamsTeam.name,
						school: teamsTeam.school,
						division: teamsTeam.division,
						role: teamsInvitation.role,
					})
					.from(teamsInvitation)
					.innerJoin(teamsTeam, eq(teamsInvitation.teamId, teamsTeam.id))
					.where(and(eq(teamsInvitation.status, "pending"), inviteMatch))
			: [];

	const pendingMemberships = await dbPg
		.select({
			teamId: teamsTeam.id,
			slug: teamsTeam.slug,
			name: teamsTeam.name,
			school: teamsTeam.school,
			division: teamsTeam.division,
			role: teamsMembership.role,
		})
		.from(teamsMembership)
		.innerJoin(teamsTeam, eq(teamsMembership.teamId, teamsTeam.id))
		.where(
			and(
				eq(teamsMembership.userId, userId),
				eq(teamsMembership.status, "pending"),
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
			id: teamsTeam.id,
			slug: teamsTeam.slug,
		})
		.from(teamsTeam)
		.where(eq(teamsTeam.slug, teamSlug))
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
				id: teamsInvitation.id,
				role: teamsInvitation.role,
			})
			.from(teamsInvitation)
			.where(
				and(
					eq(teamsInvitation.teamId, team.id),
					eq(teamsInvitation.status, "pending"),
					inviteMatch,
				),
			)
			.limit(1);

		const [existingMembership] = await tx
			.select({
				id: teamsMembership.id,
				role: teamsMembership.role,
				status: teamsMembership.status,
			})
			.from(teamsMembership)
			.where(
				and(
					eq(teamsMembership.teamId, team.id),
					eq(teamsMembership.userId, userId),
				),
			)
			.limit(1);

		if (existingMembership) {
			await tx
				.update(teamsMembership)
				.set({
					status: "active",
					role: existingMembership.role ?? invite?.role ?? "member",
					updatedAt: new Date().toISOString(),
				})
				.where(eq(teamsMembership.id, existingMembership.id));
		} else {
			await tx.insert(teamsMembership).values({
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
				.update(teamsInvitation)
				.set({
					status: "accepted",
					invitedUserId: userId,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(teamsInvitation.id, invite.id));
		}

		await bumpTeamVersion(team.id);
	});

	return { slug: team.slug };
}

export async function declineInvite(teamSlug: string, userId: string) {
	const [team] = await dbPg
		.select({
			id: teamsTeam.id,
			slug: teamsTeam.slug,
		})
		.from(teamsTeam)
		.where(eq(teamsTeam.slug, teamSlug))
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
			.update(teamsInvitation)
			.set({
				status: "declined",
				invitedUserId: userId,
				updatedAt: new Date().toISOString(),
			})
			.where(
				and(
					eq(teamsInvitation.teamId, team.id),
					eq(teamsInvitation.status, "pending"),
					inviteMatch,
				),
			);

		await tx
			.update(teamsMembership)
			.set({ status: "inactive", updatedAt: new Date().toISOString() })
			.where(
				and(
					eq(teamsMembership.teamId, team.id),
					eq(teamsMembership.userId, userId),
					eq(teamsMembership.status, "pending"),
				),
			);

		await bumpTeamVersion(team.id);
	});

	return { ok: true };
}

export async function createInvitation(input: {
	teamSlug: string;
	invitedUsername: string;
	role?: "captain" | "member";
	invitedBy: string;
}) {
	const { team } = await assertCaptainAccess(input.teamSlug, input.invitedBy);

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
		.select({ id: teamsMembership.id })
		.from(teamsMembership)
		.where(
			and(
				eq(teamsMembership.teamId, team.id),
				eq(teamsMembership.userId, invitedUserId),
				or(
					eq(teamsMembership.status, "active"),
					eq(teamsMembership.status, "pending"),
				),
			),
		)
		.limit(1);

	if (existing.length > 0) {
		throw new Error("User is already a member or has a pending invitation");
	}

	const token = crypto.randomUUID();

	await dbPg.transaction(async (tx) => {
		await tx.insert(teamsInvitation).values({
			id: crypto.randomUUID(),
			teamId: team.id,
			invitedUserId,
			invitedEmail: invitedUser.email ?? null,
			role: input.role ?? "member",
			invitedBy: input.invitedBy,
			status: "pending",
			token,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		});

		await tx.insert(teamsMembership).values({
			id: crypto.randomUUID(),
			teamId: team.id,
			userId: invitedUserId,
			role: input.role ?? "member",
			status: "pending",
			invitedBy: input.invitedBy,
		});

		await bumpTeamVersion(team.id);
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
	newRole: "captain" | "member";
	actorId: string;
}) {
	const { team } = await assertCaptainAccess(input.teamSlug, input.actorId);

	const membership = await dbPg
		.select({
			id: teamsMembership.id,
			role: teamsMembership.role,
			status: teamsMembership.status,
		})
		.from(teamsMembership)
		.where(
			and(
				eq(teamsMembership.teamId, team.id),
				eq(teamsMembership.userId, input.userId),
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

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamsMembership)
			.set({ role: input.newRole, updatedAt: new Date().toISOString() })
			.where(
				and(
					eq(teamsMembership.teamId, team.id),
					eq(teamsMembership.userId, input.userId),
				),
			);

		await bumpTeamVersion(team.id);
	});

	return { ok: true, newRole: input.newRole };
}
