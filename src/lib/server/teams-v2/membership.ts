import { dbPg } from "@/lib/db";
import {
	teamsMembership,
	teamsRoster,
	teamsSubteam,
	teamsTeam,
} from "@/lib/db/schema/teams_v2";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { and, eq, or, sql } from "drizzle-orm";
import {
	assertAdminAccess,
	assertCaptainAccess,
	assertTeamAccess,
	bumpTeamVersion,
	ensureSupabaseLink,
	generateJoinCode,
	slugifySchool,
} from "./shared";

export async function leaveTeam(teamSlug: string, userId: string) {
	const { team, membership } = await assertTeamAccess(teamSlug, userId);
	const elevatedMembers = await dbPg
		.select({ id: teamsMembership.id, role: teamsMembership.role })
		.from(teamsMembership)
		.where(
			and(
				eq(teamsMembership.teamId, team.id),
				eq(teamsMembership.status, "active"),
				or(
					eq(teamsMembership.role, "admin"),
					eq(teamsMembership.role, "captain"),
				),
			),
		);

	const adminCount = elevatedMembers.filter((m) => m.role === "admin").length;
	const elevatedCount = elevatedMembers.length;

	if (membership.role === "admin" && adminCount <= 1) {
		throw new Error("You cannot leave as the sole admin");
	}
	if (
		(membership.role === "admin" || membership.role === "captain") &&
		elevatedCount <= 1
	) {
		throw new Error("You cannot leave as the sole captain");
	}

	await dbPg.transaction(async (tx) => {
		await tx
			.delete(teamsMembership)
			.where(
				and(
					eq(teamsMembership.teamId, team.id),
					eq(teamsMembership.userId, userId),
				),
			);

		await tx
			.delete(teamsRoster)
			.where(
				and(eq(teamsRoster.teamId, team.id), eq(teamsRoster.userId, userId)),
			);
	});

	return { ok: true };
}

export async function archiveTeam(teamSlug: string, userId: string) {
	const { team } = await assertAdminAccess(teamSlug, userId);
	await dbPg.transaction(async (tx) => {
		await tx.delete(teamsTeam).where(eq(teamsTeam.id, team.id));
	});
	return { ok: true, deleted: true };
}

export async function kickMemberFromTeam(input: {
	teamSlug: string;
	userId: string;
	actorId: string;
}) {
	if (input.userId === input.actorId) {
		throw new Error("You cannot remove yourself from the team");
	}

	const { team, membership: actorMembership } = await assertCaptainAccess(
		input.teamSlug,
		input.actorId,
	);

	const [targetMembership] = await dbPg
		.select({ role: teamsMembership.role })
		.from(teamsMembership)
		.where(
			and(
				eq(teamsMembership.teamId, team.id),
				eq(teamsMembership.userId, input.userId),
			),
		)
		.limit(1);

	if (!targetMembership) {
		return { ok: true };
	}

	if ((targetMembership.role as string) === "admin") {
		if ((actorMembership.role as string) !== "admin") {
			throw new Error("Only admins can remove an admin from the team");
		}
		const admins = await dbPg
			.select({ id: teamsMembership.id })
			.from(teamsMembership)
			.where(
				and(
					eq(teamsMembership.teamId, team.id),
					eq(teamsMembership.role, "admin"),
					eq(teamsMembership.status, "active"),
				),
			);
		if (admins.length <= 1) {
			throw new Error("You cannot remove the sole admin from the team");
		}
	}

	if ((targetMembership.role as string) === "captain") {
		if ((actorMembership.role as string) !== "admin") {
			throw new Error("Only admins can remove a captain from the team");
		}
	}

	await dbPg.transaction(async (tx) => {
		await tx
			.delete(teamsRoster)
			.where(
				and(
					eq(teamsRoster.teamId, team.id),
					eq(teamsRoster.userId, input.userId),
				),
			);

		await tx
			.delete(teamsMembership)
			.where(
				and(
					eq(teamsMembership.teamId, team.id),
					eq(teamsMembership.userId, input.userId),
				),
			);

		await bumpTeamVersion(team.id, tx);
	});

	return { ok: true };
}

export async function listTeamsForUser(userId: string) {
	const teams = await dbPg
		.select({
			id: teamsTeam.id,
			slug: teamsTeam.slug,
			name: teamsTeam.name,
			school: teamsTeam.school,
			division: teamsTeam.division,
			status: teamsTeam.status,
			role: teamsMembership.role,
		})
		.from(teamsMembership)
		.innerJoin(teamsTeam, eq(teamsMembership.teamId, teamsTeam.id))
		.where(
			and(
				eq(teamsMembership.userId, userId),
				eq(teamsMembership.status, "active"),
			),
		);

	return teams.map((t) => ({
		id: t.id,
		slug: t.slug,
		name: t.name,
		school: t.school,
		division: t.division,
		status: t.status,
		role: t.role as "admin" | "captain" | "member",
	}));
}

export async function createTeamWithDefaultSubteam(input: {
	school: string;
	division: "B" | "C";
	createdBy: string;
	supabaseUser?: SupabaseUser | null;
}) {
	const baseSlug = slugifySchool(input.school);

	let slugCandidate = baseSlug;
	let counter = 1;
	while (true) {
		const existing = await dbPg
			.select({ id: teamsTeam.id })
			.from(teamsTeam)
			.where(eq(teamsTeam.slug, slugCandidate))
			.limit(1);
		if (existing.length === 0) break;
		slugCandidate = `${baseSlug}-${counter}`;
		counter += 1;
	}

	const teamId = crypto.randomUUID();
	const subteamId = crypto.randomUUID();
	const membershipId = crypto.randomUUID();

	await dbPg.transaction(async (tx) => {
		await tx.insert(teamsTeam).values({
			id: teamId,
			slug: slugCandidate,
			name: input.school,
			school: input.school,
			division: input.division,
			createdBy: input.createdBy,
			status: "active",
			memberCode: generateJoinCode(8),
			captainCode: generateJoinCode(10),
		});

		await tx.insert(teamsSubteam).values({
			id: subteamId,
			teamId,
			name: "Team A",
			description: "Default subteam",
			displayOrder: 0,
			createdBy: input.createdBy,
		});

		await tx.insert(teamsMembership).values({
			id: membershipId,
			teamId,
			userId: input.createdBy,
			role: "admin",
			status: "active",
		});
	});

	if (input.supabaseUser) {
		await ensureSupabaseLink(input.supabaseUser);
	}

	return {
		id: teamId,
		slug: slugCandidate,
		name: input.school,
		division: input.division,
	};
}

export async function joinTeamByCode(code: string, userId: string) {
	const normalized = code.trim();
	const [team] = await dbPg
		.select({
			id: teamsTeam.id,
			slug: teamsTeam.slug,
			name: teamsTeam.name,
			division: teamsTeam.division,
			status: teamsTeam.status,
			memberCode: teamsTeam.memberCode,
			captainCode: teamsTeam.captainCode,
		})
		.from(teamsTeam)
		.where(
			or(
				eq(teamsTeam.memberCode, normalized),
				eq(teamsTeam.captainCode, normalized),
			),
		)
		.limit(1);

	if (!team) {
		throw new Error("Team not found");
	}
	if (team.status === "archived") {
		throw new Error("This team is archived and cannot accept new members");
	}

	const existing = await dbPg
		.select({ id: teamsMembership.id, role: teamsMembership.role })
		.from(teamsMembership)
		.where(
			and(
				eq(teamsMembership.teamId, team.id),
				eq(teamsMembership.userId, userId),
			),
		)
		.limit(1);

	const isCaptainCode = team.captainCode === normalized;

	if (existing.length === 0) {
		await dbPg.insert(teamsMembership).values({
			id: crypto.randomUUID(),
			teamId: team.id,
			userId,
			role: isCaptainCode ? "captain" : "member",
			status: "active",
		});
	} else {
		const [membershipRow] = existing;
		if (!membershipRow) {
			return {
				id: team.id,
				slug: team.slug,
				name: team.name,
				division: team.division,
			};
		}
		const updateData: Partial<typeof teamsMembership.$inferInsert> = {
			status: "active",
			updatedAt: new Date().toISOString(),
		};
		if (isCaptainCode && membershipRow?.role !== "captain") {
			updateData.role = "captain";
		}
		await dbPg
			.update(teamsMembership)
			.set(updateData)
			.where(eq(teamsMembership.id, membershipRow.id));
	}

	const supabase = await createSupabaseServerClient();
	const { data: supabaseUser } = await supabase.auth.getUser();
	if (supabaseUser?.user) {
		await ensureSupabaseLink(supabaseUser.user);
	}

	return {
		id: team.id,
		slug: team.slug,
		name: team.name,
		division: team.division,
	};
}

export async function createSubteam(input: {
	teamSlug: string;
	name?: string | null;
	description?: string | null;
	userId: string;
}) {
	const { team } = await assertCaptainAccess(input.teamSlug, input.userId);

	const [maxOrder] = await dbPg
		.select({
			max: sql<number>`COALESCE(MAX(${teamsSubteam.displayOrder}), 0)`,
		})
		.from(teamsSubteam)
		.where(eq(teamsSubteam.teamId, team.id));

	const subteamId = crypto.randomUUID();
	const displayOrder = Number(maxOrder?.max ?? 0) + 1;
	let finalName = input.name?.trim();
	if (!finalName) {
		const existingCount = await dbPg
			.select({ count: sql<number>`COUNT(*)` })
			.from(teamsSubteam)
			.where(eq(teamsSubteam.teamId, team.id));
		const countValue = Number(existingCount[0]?.count ?? 0);
		const letter = String.fromCharCode("A".charCodeAt(0) + countValue);
		finalName = `Team ${letter}`;
	}

	await dbPg.insert(teamsSubteam).values({
		id: subteamId,
		teamId: team.id,
		name: finalName,
		description: input.description ?? null,
		displayOrder,
		createdBy: input.userId,
	});

	return {
		id: subteamId,
		teamId: team.id,
		name: finalName,
		description: input.description ?? null,
		displayOrder,
	};
}

export async function deleteSubteam(input: {
	teamSlug: string;
	subteamId: string;
	userId: string;
}) {
	const { team } = await assertCaptainAccess(input.teamSlug, input.userId);
	await dbPg
		.delete(teamsSubteam)
		.where(
			and(
				eq(teamsSubteam.id, input.subteamId),
				eq(teamsSubteam.teamId, team.id),
			),
		);
	return { ok: true };
}

export async function renameSubteam(input: {
	teamSlug: string;
	subteamId: string;
	newName: string;
	userId: string;
}) {
	const { team } = await assertCaptainAccess(input.teamSlug, input.userId);

	const [existing] = await dbPg
		.select({
			id: teamsSubteam.id,
		})
		.from(teamsSubteam)
		.where(
			and(
				eq(teamsSubteam.id, input.subteamId),
				eq(teamsSubteam.teamId, team.id),
			),
		)
		.limit(1);

	if (!existing) {
		throw new Error("Subteam not found for this team");
	}

	await dbPg
		.update(teamsSubteam)
		.set({ name: input.newName, updatedAt: new Date().toISOString() })
		.where(eq(teamsSubteam.id, input.subteamId));

	return { id: input.subteamId, name: input.newName };
}
