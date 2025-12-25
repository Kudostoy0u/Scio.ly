import { dbPg } from "@/lib/db";
import {
	teamMemberships,
	teamRoster,
	teamSubteams,
	teams,
	users,
} from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logging/logger";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import {
	deleteSubteamCacheManifest,
	ensureSubteamCacheManifest,
	ensureTeamCacheManifest,
	touchTeamCacheManifest,
} from "./cache-manifest";
import { touchUserCalendarManifest } from "./calendar";
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
		.select({ id: teamMemberships.id, role: teamMemberships.role })
		.from(teamMemberships)
		.where(
			and(
				eq(teamMemberships.teamId, team.id),
				eq(teamMemberships.status, "active"),
				or(
					eq(teamMemberships.role, "admin"),
					eq(teamMemberships.role, "captain"),
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
			.delete(teamMemberships)
			.where(
				and(
					eq(teamMemberships.teamId, team.id),
					eq(teamMemberships.userId, userId),
				),
			);

		await tx
			.delete(teamRoster)
			.where(
				and(eq(teamRoster.teamId, team.id), eq(teamRoster.userId, userId)),
			);
	});

	await touchTeamCacheManifest(team.id, {
		members: true,
		roster: true,
		full: true,
	});

	await touchUserCalendarManifest(userId, { teams: true });

	return { ok: true };
}

export async function archiveTeam(teamSlug: string, userId: string) {
	const { team } = await assertAdminAccess(teamSlug, userId);
	await dbPg.transaction(async (tx) => {
		await tx.delete(teams).where(eq(teams.id, team.id));
	});
	await touchUserCalendarManifest(userId, { teams: true });
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
		.select({ role: teamMemberships.role })
		.from(teamMemberships)
		.where(
			and(
				eq(teamMemberships.teamId, team.id),
				eq(teamMemberships.userId, input.userId),
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
			.select({ id: teamMemberships.id })
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.teamId, team.id),
					eq(teamMemberships.role, "admin"),
					eq(teamMemberships.status, "active"),
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
			.delete(teamRoster)
			.where(
				and(
					eq(teamRoster.teamId, team.id),
					eq(teamRoster.userId, input.userId),
				),
			);

		await tx
			.delete(teamMemberships)
			.where(
				and(
					eq(teamMemberships.teamId, team.id),
					eq(teamMemberships.userId, input.userId),
				),
			);

		await bumpTeamVersion(team.id, tx);
		await touchTeamCacheManifest(
			team.id,
			{ members: true, roster: true, full: true },
			tx,
		);
	});

	await touchUserCalendarManifest(input.userId, { teams: true });

	return { ok: true };
}

export async function listTeamsForUser(userId: string) {
	const teamsResult = await dbPg
		.select({
			id: teams.id,
			slug: teams.slug,
			name: teams.name,
			school: teams.school,
			division: teams.division,
			status: teams.status,
			role: teamMemberships.role,
		})
		.from(teamMemberships)
		.innerJoin(teams, eq(teamMemberships.teamId, teams.id))
		.where(
			and(
				eq(teamMemberships.userId, userId),
				eq(teamMemberships.status, "active"),
			),
		);

	return teamsResult.map((t) => ({
		id: t.id,
		slug: t.slug,
		name: t.name,
		school: t.school,
		division: t.division,
		status: t.status,
		role: t.role as "admin" | "captain" | "member",
	}));
}

export async function listTeamsWithSubteamsForUser(userId: string) {
	const teamsResult = await listTeamsForUser(userId);
	if (teamsResult.length === 0) {
		return [];
	}

	const teamIds = teamsResult.map((team) => team.id);
	const subteams = await dbPg
		.select({
			id: teamSubteams.id,
			teamId: teamSubteams.teamId,
			name: teamSubteams.name,
		})
		.from(teamSubteams)
		.where(inArray(teamSubteams.teamId, teamIds));

	const byTeam = new Map<string, { id: string; name: string }[]>();
	for (const subteam of subteams) {
		const list = byTeam.get(subteam.teamId) ?? [];
		list.push({ id: subteam.id, name: subteam.name });
		byTeam.set(subteam.teamId, list);
	}

	const result = teamsResult.map((team) => ({
		...team,
		subteams: byTeam.get(team.id) ?? [],
	}));
	logger.dev.structured("debug", "[Membership] Teams with subteams", {
		userId,
		teamCount: result.length,
		subteamCounts: result.map((team) => ({
			teamId: team.id,
			subteamCount: team.subteams.length,
		})),
	});

	return result;
}

export async function createTeamWithDefaultSubteam(input: {
	school: string;
	division: "B" | "C";
	createdBy: string;
	supabaseUser?: SupabaseUser | null;
}) {
	const startTime = Date.now();
	const createdAt = new Date().toISOString();
	logger.dev.structured("info", "Creating team with default subteam", {
		school: input.school,
		division: input.division,
		createdBy: input.createdBy,
	});

	try {
		// Ensure user exists in database BEFORE creating team
		if (input.supabaseUser) {
			logger.dev.structured("debug", "Ensuring user exists in database", {
				userId: input.createdBy,
			});
			await ensureSupabaseLink(input.supabaseUser);
		}

		// Verify user exists in database
		logger.dev.db("SELECT", "users", "Verifying user exists", [
			input.createdBy,
		]);
		const [userExists] = await dbPg
			.select({ id: users.id })
			.from(users)
			.where(eq(users.id, input.createdBy))
			.limit(1);

		if (!userExists) {
			const error = new Error(
				`User ${input.createdBy} does not exist in database. Please ensure you are logged in.`,
			);
			logger.dev.error("User does not exist in database", error, {
				userId: input.createdBy,
			});
			throw error;
		}

		const baseSlug = slugifySchool(input.school);
		logger.dev.structured("debug", "Generated base slug", { baseSlug });

		let slugCandidate = baseSlug;
		let counter = 1;
		while (true) {
			logger.dev.db("SELECT", "teams", "Checking slug availability", [
				slugCandidate,
			]);
			const existing = await dbPg
				.select({ id: teams.id })
				.from(teams)
				.where(eq(teams.slug, slugCandidate))
				.limit(1);
			if (existing.length === 0) break;
			logger.dev.structured("debug", "Slug already exists, trying next", {
				slugCandidate,
				counter,
			});
			slugCandidate = `${baseSlug}-${counter}`;
			counter += 1;
		}

		logger.dev.structured("info", "Found available slug", { slugCandidate });

		const teamId = crypto.randomUUID();
		const subteamId = crypto.randomUUID();
		const membershipId = crypto.randomUUID();
		const memberCode = generateJoinCode(8);
		const captainCode = generateJoinCode(10);

		logger.dev.structured("debug", "Generated IDs and codes", {
			teamId,
			subteamId,
			membershipId,
			memberCode,
			captainCode,
		});

		await dbPg.transaction(async (tx) => {
			logger.dev.db("INSERT", "teams", "Creating team", [
				teamId,
				slugCandidate,
			]);
			await tx.insert(teams).values({
				id: teamId,
				slug: slugCandidate,
				name: input.school,
				school: input.school,
				division: input.division,
				createdBy: input.createdBy,
				status: "active",
				memberCode,
				captainCode,
			});

			logger.dev.db("INSERT", "team_subteams", "Creating default subteam", [
				subteamId,
				teamId,
			]);
			await tx.insert(teamSubteams).values({
				id: subteamId,
				teamId,
				name: "Team A",
				description: "Default subteam",
				displayOrder: 0,
				createdBy: input.createdBy,
				settings: {},
			});

			logger.dev.db("INSERT", "team_memberships", "Creating admin membership", [
				membershipId,
				teamId,
				input.createdBy,
			]);
			await tx.insert(teamMemberships).values({
				id: membershipId,
				teamId,
				userId: input.createdBy,
				role: "admin",
				status: "active",
				metadata: {},
				permissions: {},
			});

			await ensureTeamCacheManifest(teamId, tx);
			await ensureSubteamCacheManifest(teamId, subteamId, tx);
		});

		logger.dev.structured("info", "Team created successfully", {
			teamId,
			slug: slugCandidate,
		});

		await touchUserCalendarManifest(input.createdBy, { teams: true });

		logger.dev.timing("createTeamWithDefaultSubteam", startTime, {
			teamId,
			slug: slugCandidate,
		});

		return {
			id: teamId,
			slug: slugCandidate,
			name: input.school,
			school: input.school,
			division: input.division,
			memberCode,
			captainCode,
			defaultSubteam: {
				id: subteamId,
				name: "Team A",
				description: "Default subteam",
				displayOrder: 0,
				createdAt,
			},
		};
	} catch (error) {
		logger.dev.error(
			"Failed to create team with default subteam",
			error instanceof Error ? error : new Error(String(error)),
			{
				school: input.school,
				division: input.division,
				createdBy: input.createdBy,
			},
		);
		logger.error("createTeamWithDefaultSubteam error", error);
		throw error;
	}
}

export async function joinTeamByCode(
	code: string,
	userId: string,
	supabaseUser?: SupabaseUser | null,
) {
	const startTime = Date.now();
	logger.dev.structured("info", "Joining team by code", {
		code: code.trim(),
		userId,
	});

	try {
		const normalized = code.trim();
		logger.dev.structured("debug", "Normalized code", { normalized });

		// Ensure user exists in database BEFORE proceeding
		if (supabaseUser) {
			logger.dev.structured("debug", "Ensuring user exists in database", {
				userId,
			});
			await ensureSupabaseLink(supabaseUser);
		}

		// Verify user exists in database
		logger.dev.db("SELECT", "users", "Verifying user exists", [userId]);
		const [userExists] = await dbPg
			.select({ id: users.id })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!userExists) {
			const error = new Error(
				`User ${userId} does not exist in database. Please ensure you are logged in.`,
			);
			logger.dev.error("User does not exist in database", error, { userId });
			throw error;
		}

		// Find team by code
		logger.dev.db("SELECT", "teams", "Finding team by code", [normalized]);
		const [team] = await dbPg
			.select({
				id: teams.id,
				slug: teams.slug,
				name: teams.name,
				division: teams.division,
				status: teams.status,
				memberCode: teams.memberCode,
				captainCode: teams.captainCode,
			})
			.from(teams)
			.where(
				or(eq(teams.memberCode, normalized), eq(teams.captainCode, normalized)),
			)
			.limit(1);

		if (!team) {
			const error = new Error("Team not found");
			logger.dev.error("Team not found by code", error, { code: normalized });
			throw error;
		}

		logger.dev.structured("info", "Team found", {
			teamId: team.id,
			slug: team.slug,
			status: team.status,
		});

		if (team.status === "archived") {
			const error = new Error(
				"This team is archived and cannot accept new members",
			);
			logger.dev.error("Team is archived", error, { teamId: team.id });
			throw error;
		}

		// Check for existing membership
		logger.dev.db(
			"SELECT",
			"team_memberships",
			"Checking existing membership",
			[team.id, userId],
		);
		const existing = await dbPg
			.select({ id: teamMemberships.id, role: teamMemberships.role })
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.teamId, team.id),
					eq(teamMemberships.userId, userId),
				),
			)
			.limit(1);

		const isCaptainCode = team.captainCode === normalized;
		const role = isCaptainCode ? "captain" : "member";

		logger.dev.structured("debug", "Membership check result", {
			existing: existing.length > 0,
			isCaptainCode,
			role,
		});

		if (existing.length === 0) {
			// Create new membership
			const membershipId = crypto.randomUUID();
			logger.dev.db("INSERT", "team_memberships", "Creating new membership", [
				membershipId,
				team.id,
				userId,
				role,
			]);
			await dbPg.insert(teamMemberships).values({
				id: membershipId,
				teamId: team.id,
				userId,
				role,
				status: "active",
				metadata: {},
				permissions: {},
			});
			logger.dev.structured("info", "New membership created", {
				membershipId,
				teamId: team.id,
				userId,
				role,
			});
		} else {
			// Update existing membership
			const [membershipRow] = existing;
			if (!membershipRow) {
				logger.dev.structured("warn", "Membership row not found after query", {
					teamId: team.id,
					userId,
				});
				return {
					id: team.id,
					slug: team.slug,
					name: team.name,
					division: team.division,
				};
			}

			const updateData: Partial<typeof teamMemberships.$inferInsert> = {
				status: "active",
				updatedAt: new Date().toISOString(),
			};
			if (isCaptainCode && membershipRow?.role !== "captain") {
				updateData.role = "captain";
				logger.dev.structured("info", "Upgrading user to captain", {
					membershipId: membershipRow.id,
					teamId: team.id,
					userId,
				});
			}

			logger.dev.db("UPDATE", "team_memberships", "Updating membership", [
				membershipRow.id,
			]);
			await dbPg
				.update(teamMemberships)
				.set(updateData)
				.where(eq(teamMemberships.id, membershipRow.id));
			logger.dev.structured("info", "Membership updated", {
				membershipId: membershipRow.id,
				teamId: team.id,
				userId,
			});
		}

		await touchTeamCacheManifest(team.id, {
			members: true,
			full: true,
		});

		// Ensure Supabase link (if not already done)
		if (!supabaseUser) {
			logger.dev.structured("debug", "Ensuring Supabase link", { userId });
			const supabase = await createSupabaseServerClient();
			const { data: supabaseUserData } = await supabase.auth.getUser();
			if (supabaseUserData?.user) {
				await ensureSupabaseLink(supabaseUserData.user);
			}
		}

		await touchUserCalendarManifest(userId, { teams: true });

		logger.dev.timing("joinTeamByCode", startTime, {
			teamId: team.id,
			slug: team.slug,
			userId,
			role,
		});

		return {
			id: team.id,
			slug: team.slug,
			name: team.name,
			division: team.division,
		};
	} catch (error) {
		logger.dev.error(
			"Failed to join team by code",
			error instanceof Error ? error : new Error(String(error)),
			{
				code: code.trim(),
				userId,
			},
		);
		logger.error("joinTeamByCode error", error);
		throw error;
	}
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
			max: sql<number>`COALESCE(MAX(${teamSubteams.displayOrder}), 0)`,
		})
		.from(teamSubteams)
		.where(eq(teamSubteams.teamId, team.id));

	const subteamId = crypto.randomUUID();
	const displayOrder = Number(maxOrder?.max ?? 0) + 1;
	let finalName = input.name?.trim();
	if (!finalName) {
		const existingCount = await dbPg
			.select({ count: sql<number>`COUNT(*)` })
			.from(teamSubteams)
			.where(eq(teamSubteams.teamId, team.id));
		const countValue = Number(existingCount[0]?.count ?? 0);
		const letter = String.fromCharCode("A".charCodeAt(0) + countValue);
		finalName = `Team ${letter}`;
	}

	await dbPg.insert(teamSubteams).values({
		id: subteamId,
		teamId: team.id,
		name: finalName,
		description: input.description ?? null,
		displayOrder,
		createdBy: input.userId,
	});

	await ensureSubteamCacheManifest(team.id, subteamId);
	await touchTeamCacheManifest(team.id, { subteams: true, full: true });

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
		.delete(teamSubteams)
		.where(
			and(
				eq(teamSubteams.id, input.subteamId),
				eq(teamSubteams.teamId, team.id),
			),
		);
	await deleteSubteamCacheManifest(team.id, input.subteamId);
	await touchTeamCacheManifest(team.id, { subteams: true, full: true });
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
			id: teamSubteams.id,
		})
		.from(teamSubteams)
		.where(
			and(
				eq(teamSubteams.id, input.subteamId),
				eq(teamSubteams.teamId, team.id),
			),
		)
		.limit(1);

	if (!existing) {
		throw new Error("Subteam not found for this team");
	}

	await dbPg
		.update(teamSubteams)
		.set({ name: input.newName, updatedAt: new Date().toISOString() })
		.where(eq(teamSubteams.id, input.subteamId));

	await touchTeamCacheManifest(team.id, { subteams: true, full: true });

	return { id: input.subteamId, name: input.newName };
}
