import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
	teamMemberships,
	teamRoster,
	teamTournamentRosters,
} from "@/lib/db/schema";
import logger from "@/lib/utils/logging/logger";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { touchTeamCacheManifest } from "./cache-manifest";
import { getMembershipForUser } from "./shared";

type TournamentRosterStatus = "active" | "inactive" | "archived";

const isCaptainRole = (role?: string | null) =>
	role === "captain" || role === "admin";

async function getNextTournamentRosterName(teamId: string): Promise<string> {
	const existing = await dbPg
		.select({ name: teamTournamentRosters.name })
		.from(teamTournamentRosters)
		.where(eq(teamTournamentRosters.teamId, teamId));

	let maxNumber = 0;
	for (const row of existing) {
		const match = row.name.match(/Tournament\s+(\d+)/i);
		const matchNumber = match?.[1];
		if (matchNumber) {
			const parsed = Number.parseInt(matchNumber, 10);
			if (!Number.isNaN(parsed)) {
				maxNumber = Math.max(maxNumber, parsed);
			}
		}
	}

	return `Tournament ${maxNumber + 1}`;
}

async function hydrateRosterEntriesForTeam(teamId: string, rosterId: string) {
	await dbPg
		.update(teamRoster)
		.set({ tournamentRosterId: rosterId })
		.where(
			and(eq(teamRoster.teamId, teamId), isNull(teamRoster.tournamentRosterId)),
		);
}

export async function ensureActiveTournamentRoster(
	teamId: string,
	actorId: string,
) {
	const [active] = await dbPg
		.select({
			id: teamTournamentRosters.id,
			name: teamTournamentRosters.name,
			status: teamTournamentRosters.status,
		})
		.from(teamTournamentRosters)
		.where(
			and(
				eq(teamTournamentRosters.teamId, teamId),
				eq(teamTournamentRosters.status, "active"),
			),
		)
		.limit(1);

	if (active) {
		await hydrateRosterEntriesForTeam(teamId, active.id);
		return active;
	}

	const rosterId = crypto.randomUUID();
	const name = await getNextTournamentRosterName(teamId);
	const now = new Date().toISOString();
	await dbPg.insert(teamTournamentRosters).values({
		id: rosterId,
		teamId,
		name,
		status: "active",
		createdBy: actorId,
		createdAt: now,
		updatedAt: now,
	});

	await hydrateRosterEntriesForTeam(teamId, rosterId);

	return { id: rosterId, name, status: "active" as TournamentRosterStatus };
}

async function getRosterForTeam(
	teamId: string,
	rosterId: string,
): Promise<{
	id: string;
	status: TournamentRosterStatus;
	name: string;
}> {
	const [row] = await dbPg
		.select({
			id: teamTournamentRosters.id,
			status: teamTournamentRosters.status,
			name: teamTournamentRosters.name,
		})
		.from(teamTournamentRosters)
		.where(
			and(
				eq(teamTournamentRosters.teamId, teamId),
				eq(teamTournamentRosters.id, rosterId),
			),
		)
		.limit(1);

	if (!row) {
		throw new Error("Tournament roster not found");
	}

	return {
		id: row.id,
		status: row.status as TournamentRosterStatus,
		name: row.name,
	};
}

export async function listTournamentRosters(teamId: string, actorId: string) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (!membership || !isCaptainRole(membership.role)) {
		throw new Error("Only captains can view tournament rosters");
	}

	const active = await ensureActiveTournamentRoster(teamId, actorId);
	const rows = await dbPg
		.select({
			id: teamTournamentRosters.id,
			name: teamTournamentRosters.name,
			status: teamTournamentRosters.status,
			isPublic: teamTournamentRosters.isPublic,
			createdAt: teamTournamentRosters.createdAt,
			updatedAt: teamTournamentRosters.updatedAt,
			archivedAt: teamTournamentRosters.archivedAt,
		})
		.from(teamTournamentRosters)
		.where(eq(teamTournamentRosters.teamId, teamId))
		.orderBy(teamTournamentRosters.createdAt);

	const rosters = rows
		.filter((row) => row.status !== "archived")
		.map((row) => ({
			...row,
			status: row.status as TournamentRosterStatus,
			isPublic: Boolean(row.isPublic),
		}));
	const archivedRosters = rows
		.filter((row) => row.status === "archived")
		.map((row) => ({
			...row,
			status: row.status as TournamentRosterStatus,
			isPublic: Boolean(row.isPublic),
		}));

	return { activeRosterId: active.id, rosters, archivedRosters };
}

export async function listPublicTournamentRosters(
	teamId: string,
	actorId: string,
) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (!membership) {
		throw new Error("Access denied");
	}

	const active = await ensureActiveTournamentRoster(teamId, actorId);
	const rows = await dbPg
		.select({
			id: teamTournamentRosters.id,
			name: teamTournamentRosters.name,
			status: teamTournamentRosters.status,
			isPublic: teamTournamentRosters.isPublic,
			createdAt: teamTournamentRosters.createdAt,
			updatedAt: teamTournamentRosters.updatedAt,
			archivedAt: teamTournamentRosters.archivedAt,
		})
		.from(teamTournamentRosters)
		.where(
			and(
				eq(teamTournamentRosters.teamId, teamId),
				or(
					eq(teamTournamentRosters.status, "active"),
					and(
						eq(teamTournamentRosters.status, "archived"),
						eq(teamTournamentRosters.isPublic, true),
					),
				),
			),
		)
		.orderBy(teamTournamentRosters.createdAt);

	const rosters = rows
		.filter((row) => row.status !== "archived")
		.map((row) => ({
			...row,
			status: row.status as TournamentRosterStatus,
			isPublic: Boolean(row.isPublic),
		}));
	const archivedRosters = rows
		.filter((row) => row.status === "archived")
		.map((row) => ({
			...row,
			status: row.status as TournamentRosterStatus,
			isPublic: Boolean(row.isPublic),
		}));

	return { activeRosterId: active.id, rosters, archivedRosters };
}

export async function createTournamentRoster(
	teamId: string,
	actorId: string,
	name?: string | null,
) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (!membership || !isCaptainRole(membership.role)) {
		throw new Error("Only captains can create tournament rosters");
	}

	await ensureActiveTournamentRoster(teamId, actorId);

	const rosterId = crypto.randomUUID();
	const rosterName =
		typeof name === "string" && name.trim()
			? name.trim()
			: await getNextTournamentRosterName(teamId);
	const now = new Date().toISOString();

	await dbPg.insert(teamTournamentRosters).values({
		id: rosterId,
		teamId,
		name: rosterName,
		status: "inactive",
		isPublic: false,
		createdBy: actorId,
		createdAt: now,
		updatedAt: now,
	});

	await touchTeamCacheManifest(teamId, {
		tournamentRosters: true,
		publicTournamentRosters: true,
	});

	return {
		id: rosterId,
		name: rosterName,
		status: "inactive" as TournamentRosterStatus,
		isPublic: false,
		createdAt: now,
		updatedAt: now,
		archivedAt: null,
	};
}

export async function setTournamentRosterVisibility(
	teamId: string,
	actorId: string,
	rosterId: string,
	isPublic: boolean,
) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (!membership || !isCaptainRole(membership.role)) {
		throw new Error("Only captains can update roster visibility");
	}

	const [existing] = await dbPg
		.select({
			id: teamTournamentRosters.id,
			status: teamTournamentRosters.status,
			isPublic: teamTournamentRosters.isPublic,
		})
		.from(teamTournamentRosters)
		.where(
			and(
				eq(teamTournamentRosters.teamId, teamId),
				eq(teamTournamentRosters.id, rosterId),
			),
		)
		.limit(1);

	if (!existing) {
		throw new Error("Tournament roster not found");
	}

	if (existing.status !== "archived") {
		throw new Error("Only archived rosters can be made public");
	}

	if (Boolean(existing.isPublic) === isPublic) {
		return { ok: true, updated: false };
	}

	await dbPg
		.update(teamTournamentRosters)
		.set({
			isPublic,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(teamTournamentRosters.id, rosterId));

	await touchTeamCacheManifest(teamId, {
		tournamentRosters: true,
		publicTournamentRosters: true,
	});

	return { ok: true, updated: true };
}

export async function renameTournamentRoster(
	teamId: string,
	actorId: string,
	rosterId: string,
	name: string,
) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (!membership || !isCaptainRole(membership.role)) {
		throw new Error("Only captains can rename tournament rosters");
	}

	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Roster name cannot be empty");
	}

	await getRosterForTeam(teamId, rosterId);

	await dbPg
		.update(teamTournamentRosters)
		.set({ name: trimmed, updatedAt: new Date().toISOString() })
		.where(eq(teamTournamentRosters.id, rosterId));

	await touchTeamCacheManifest(teamId, {
		tournamentRosters: true,
		publicTournamentRosters: true,
	});

	return { ok: true };
}

export async function promoteTournamentRosterToActive(
	teamId: string,
	actorId: string,
	rosterId: string,
) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (!membership || !isCaptainRole(membership.role)) {
		throw new Error("Only captains can promote tournament rosters");
	}

	const roster = await getRosterForTeam(teamId, rosterId);
	if (roster.status === "archived") {
		throw new Error("Archived rosters must be restored before activation");
	}

	const now = new Date().toISOString();

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamTournamentRosters)
			.set({ status: "inactive", updatedAt: now })
			.where(
				and(
					eq(teamTournamentRosters.teamId, teamId),
					eq(teamTournamentRosters.status, "active"),
				),
			);

		await tx
			.update(teamTournamentRosters)
			.set({ status: "active", updatedAt: now, archivedAt: null })
			.where(eq(teamTournamentRosters.id, rosterId));
	});

	await touchTeamCacheManifest(teamId, {
		roster: true,
		full: true,
		tournamentRosters: true,
		publicTournamentRosters: true,
	});
	return { ok: true };
}

export async function archiveTournamentRoster(
	teamId: string,
	actorId: string,
	rosterId: string,
) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (!membership || !isCaptainRole(membership.role)) {
		throw new Error("Only captains can archive tournament rosters");
	}

	const roster = await getRosterForTeam(teamId, rosterId);
	if (roster.status === "active") {
		throw new Error("Active rosters must be demoted before archiving");
	}

	await dbPg
		.update(teamTournamentRosters)
		.set({
			status: "archived",
			archivedAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
		.where(eq(teamTournamentRosters.id, rosterId));

	await touchTeamCacheManifest(teamId, {
		tournamentRosters: true,
		publicTournamentRosters: true,
	});

	return { ok: true };
}

export async function restoreTournamentRoster(
	teamId: string,
	actorId: string,
	rosterId: string,
) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (!membership || !isCaptainRole(membership.role)) {
		throw new Error("Only captains can restore tournament rosters");
	}

	await dbPg
		.update(teamTournamentRosters)
		.set({
			status: "inactive",
			archivedAt: null,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(teamTournamentRosters.id, rosterId));

	await touchTeamCacheManifest(teamId, {
		tournamentRosters: true,
		publicTournamentRosters: true,
	});

	return { ok: true };
}

export async function deleteTournamentRoster(
	teamId: string,
	actorId: string,
	rosterId: string,
) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (!membership || !isCaptainRole(membership.role)) {
		throw new Error("Only captains can delete tournament rosters");
	}

	const roster = await getRosterForTeam(teamId, rosterId);
	if (roster.status !== "archived") {
		throw new Error("Only archived rosters can be deleted");
	}

	await dbPg
		.delete(teamTournamentRosters)
		.where(eq(teamTournamentRosters.id, rosterId));

	await touchTeamCacheManifest(teamId, {
		tournamentRosters: true,
		publicTournamentRosters: true,
	});

	return { ok: true };
}

export async function replaceRosterEntries(
	teamId: string,
	subteamId: string,
	rosterId: string | null,
	entries: Array<{
		eventName: string;
		slotIndex: number;
		displayName: string;
		userId?: string | null;
	}>,
	actorId: string,
) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (
		!membership ||
		(membership.role !== "captain" && membership.role !== "admin")
	) {
		throw new Error("Only captains can edit roster");
	}

	const resolvedRosterId =
		rosterId ?? (await ensureActiveTournamentRoster(teamId, actorId)).id;
	const roster = await getRosterForTeam(teamId, resolvedRosterId);
	if (roster.status === "archived") {
		throw new Error("Archived rosters cannot be edited");
	}

	// Map display names to users already on the team so new entries link instead of duplicating
	const memberships = await dbPg
		.select({
			userId: teamMemberships.userId,
			displayName: users.displayName,
			firstName: users.firstName,
			lastName: users.lastName,
			username: users.username,
			email: users.email,
		})
		.from(teamMemberships)
		.innerJoin(users, eq(users.id, teamMemberships.userId))
		.where(eq(teamMemberships.teamId, teamId));

	const displayNameMap = new Map<
		string,
		{ userId: string; displayName: string }[]
	>();
	for (const member of memberships) {
		const displayName =
			member.displayName ||
			(member.firstName && member.lastName
				? `${member.firstName} ${member.lastName}`
				: member.firstName ||
					member.lastName ||
					member.username ||
					member.email ||
					`User ${member.userId.slice(0, 8)}`);
		const key = displayName.toLowerCase();
		const existing = displayNameMap.get(key) ?? [];
		existing.push({ userId: member.userId, displayName });
		displayNameMap.set(key, existing);
	}

	// Snapshot current roster to catch cross-subteam conflicts
	const existingTeamRoster = await dbPg
		.select({
			subteamId: teamRoster.subteamId,
			userId: teamRoster.userId,
			displayName: teamRoster.displayName,
		})
		.from(teamRoster)
		.where(
			and(
				eq(teamRoster.teamId, teamId),
				eq(teamRoster.tournamentRosterId, resolvedRosterId),
			),
		);

	const conflicts = new Set<string>();
	let insertedEntries: Array<{
		id: string;
		teamId: string;
		tournamentRosterId: string;
		subteamId: string;
		eventName: string;
		slotIndex: number;
		displayName: string;
		userId: string | null;
	}> = [];

	await dbPg.transaction(async (tx) => {
		await tx
			.delete(teamRoster)
			.where(
				and(
					eq(teamRoster.teamId, teamId),
					eq(teamRoster.subteamId, subteamId),
					eq(teamRoster.tournamentRosterId, resolvedRosterId),
				),
			);

		if (entries.length === 0) return;

		const resolvedEntries = entries.flatMap((entry) => {
			const name = entry.displayName.trim();
			if (!name) {
				return [];
			}
			const lowerName = name.toLowerCase();

			let userId: string | null | undefined = entry.userId ?? null;
			let resolvedDisplayName = name;

			const candidates = displayNameMap.get(lowerName);
			if (candidates && candidates.length === 1 && candidates[0]) {
				userId = candidates[0].userId;
				resolvedDisplayName = candidates[0].displayName;
			}

			// Prevent the same member/name from living on multiple subteams
			const assignedElsewhere = existingTeamRoster.find(
				(row) =>
					row.subteamId !== subteamId &&
					((userId && row.userId === userId) ||
						(!userId &&
							!row.userId &&
							row.displayName.toLowerCase() === lowerName)),
			);
			if (assignedElsewhere) {
				conflicts.add(resolvedDisplayName);
				return [];
			}

			return [
				{
					id: crypto.randomUUID(),
					teamId,
					tournamentRosterId: resolvedRosterId,
					subteamId,
					eventName: entry.eventName,
					slotIndex: entry.slotIndex,
					displayName: resolvedDisplayName,
					userId: userId ?? null,
				},
			];
		});

		if (resolvedEntries.length === 0) {
			return;
		}

		insertedEntries = resolvedEntries;
		await tx.insert(teamRoster).values(resolvedEntries);
	});

	await touchTeamCacheManifest(teamId, {
		roster: true,
		full: true,
	});

	return { conflicts: Array.from(conflicts), rosterEntries: insertedEntries };
}

export async function upsertRosterEntry(
	teamId: string,
	subteamId: string | null,
	rosterId: string | null,
	payload: {
		eventName: string;
		slotIndex?: number;
		displayName: string;
		userId?: string | null;
	},
	actorId: string,
) {
	try {
		logger.info("[upsertRosterEntry] Starting", {
			teamId,
			subteamId,
			payload,
			actorId,
		});

		const membership = await getMembershipForUser(teamId, actorId);
		logger.info("[upsertRosterEntry] Membership check", {
			found: !!membership,
			role: membership?.role,
		});

		if (
			!membership ||
			(membership.role !== "captain" && membership.role !== "admin")
		) {
			throw new Error("Only captains can edit roster");
		}

		const resolvedRosterId =
			rosterId ?? (await ensureActiveTournamentRoster(teamId, actorId)).id;
		const roster = await getRosterForTeam(teamId, resolvedRosterId);
		if (roster.status === "archived") {
			throw new Error("Archived rosters cannot be edited");
		}

		const existingEntries = await dbPg
			.select({
				id: teamRoster.id,
				slotIndex: teamRoster.slotIndex,
				displayName: teamRoster.displayName,
				userId: teamRoster.userId,
			})
			.from(teamRoster)
			.where(
				and(
					eq(teamRoster.teamId, teamId),
					subteamId
						? eq(teamRoster.subteamId, subteamId)
						: isNull(teamRoster.subteamId),
					eq(teamRoster.tournamentRosterId, resolvedRosterId),
					eq(teamRoster.eventName, payload.eventName),
				),
			)
			.orderBy(teamRoster.slotIndex);

		logger.info("[upsertRosterEntry] Existing entries", {
			count: existingEntries.length,
			entries: existingEntries,
		});

		let slotIndex = payload.slotIndex;
		if (slotIndex === undefined || slotIndex === null) {
			const usedSlots = new Set(
				existingEntries.map((e) => Number(e.slotIndex)),
			);
			let candidate = 0;
			while (usedSlots.has(candidate)) {
				candidate += 1;
			}
			slotIndex = candidate;
			logger.info("[upsertRosterEntry] Auto-assigned slot", { slotIndex });
		}

		const alreadyAssignedToSlot = existingEntries.find(
			(e) =>
				Number(e.slotIndex) === slotIndex &&
				(e.displayName.toLowerCase() === payload.displayName.toLowerCase() ||
					(payload.userId && e.userId === payload.userId)),
		);
		if (alreadyAssignedToSlot) {
			const error = new Error(
				`${payload.displayName} is already assigned to ${payload.eventName}`,
			);
			logger.error("[upsertRosterEntry] Duplicate assignment", {
				payload,
				slotIndex,
				alreadyAssignedToSlot,
			});
			throw error;
		}

		logger.info("[upsertRosterEntry] Upserting entry", {
			teamId,
			subteamId,
			eventName: payload.eventName,
			slotIndex,
			displayName: payload.displayName,
			userId: payload.userId,
		});

		await dbPg.transaction(async (tx) => {
			await tx
				.insert(teamRoster)
				.values({
					id: crypto.randomUUID(),
					teamId,
					tournamentRosterId: resolvedRosterId,
					subteamId,
					eventName: payload.eventName,
					slotIndex,
					displayName: payload.displayName,
					userId: payload.userId ?? null,
				})
				.onConflictDoUpdate({
					target: [
						teamRoster.teamId,
						teamRoster.subteamId,
						teamRoster.tournamentRosterId,
						teamRoster.eventName,
						teamRoster.slotIndex,
					],
					set: {
						displayName: payload.displayName,
						userId: payload.userId ?? null,
						updatedAt: sql`now()`,
					},
				});
		});

		await touchTeamCacheManifest(teamId, {
			roster: true,
			full: true,
		});

		logger.info("[upsertRosterEntry] Success");
	} catch (error) {
		logger.error("[upsertRosterEntry] Error", {
			error,
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
}

export async function removeRosterEntry(
	teamId: string,
	actorId: string,
	options: {
		subteamId?: string | null;
		rosterId?: string | null;
		eventName?: string;
		slotIndex?: number;
		deleteAllForMember?: boolean;
		displayName?: string;
		userId?: string;
	},
) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (
		!membership ||
		(membership.role !== "captain" && membership.role !== "admin")
	) {
		throw new Error("Only captains can edit roster");
	}

	const resolvedRosterId =
		options.rosterId ??
		(await ensureActiveTournamentRoster(teamId, actorId)).id;
	const roster = await getRosterForTeam(teamId, resolvedRosterId);
	if (roster.status === "archived") {
		throw new Error("Archived rosters cannot be edited");
	}

	if (options.deleteAllForMember) {
		const deletions: Promise<unknown>[] = [];

		if (options.userId) {
			deletions.push(
				dbPg
					.delete(teamRoster)
					.where(
						and(
							eq(teamRoster.teamId, teamId),
							eq(teamRoster.tournamentRosterId, resolvedRosterId),
							eq(teamRoster.userId, options.userId),
							options.subteamId
								? eq(teamRoster.subteamId, options.subteamId)
								: sql`TRUE`,
						),
					),
			);
		}

		if (options.displayName) {
			deletions.push(
				dbPg
					.delete(teamRoster)
					.where(
						and(
							eq(teamRoster.teamId, teamId),
							eq(teamRoster.tournamentRosterId, resolvedRosterId),
							isNull(teamRoster.userId),
							eq(teamRoster.displayName, options.displayName),
							options.subteamId
								? eq(teamRoster.subteamId, options.subteamId)
								: sql`TRUE`,
						),
					),
			);
		}

		await Promise.all(deletions);
		await touchTeamCacheManifest(teamId, {
			roster: true,
			full: true,
		});
		return;
	}

	if (!options.eventName) {
		throw new Error("Event name is required when not deleting all occurrences");
	}

	const predicates = [
		eq(teamRoster.teamId, teamId),
		eq(teamRoster.tournamentRosterId, resolvedRosterId),
		options.subteamId
			? eq(teamRoster.subteamId, options.subteamId)
			: isNull(teamRoster.subteamId),
		eq(teamRoster.eventName, options.eventName),
	] as const;

	// If we know which member to remove, delete any slots they occupy for this event
	if (options.userId || options.displayName) {
		await dbPg
			.delete(teamRoster)
			.where(
				and(
					...predicates,
					options.userId
						? eq(teamRoster.userId, options.userId)
						: isNull(teamRoster.userId),
					options.displayName
						? eq(teamRoster.displayName, options.displayName)
						: sql`TRUE`,
				),
			);
		await touchTeamCacheManifest(teamId, {
			roster: true,
			full: true,
		});
		return;
	}

	// Fallback: delete specific slot (legacy behavior)
	await dbPg
		.delete(teamRoster)
		.where(
			and(...predicates, eq(teamRoster.slotIndex, options.slotIndex ?? 0)),
		);
	await touchTeamCacheManifest(teamId, {
		roster: true,
		full: true,
	});
}
