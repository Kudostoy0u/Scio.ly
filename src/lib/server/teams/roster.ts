import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { teamMemberships, teamRoster } from "@/lib/db/schema";
import logger from "@/lib/utils/logging/logger";
import { and, eq, isNull, sql } from "drizzle-orm";
import { touchTeamCacheManifest } from "./cache-manifest";
import { getMembershipForUser } from "./shared";

export async function replaceRosterEntries(
	teamId: string,
	subteamId: string,
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
		.where(eq(teamRoster.teamId, teamId));

	const conflicts = new Set<string>();
	let insertedEntries: Array<{
		id: string;
		teamId: string;
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
				and(eq(teamRoster.teamId, teamId), eq(teamRoster.subteamId, subteamId)),
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

	await touchTeamCacheManifest(teamId, { roster: true, full: true });

	return { conflicts: Array.from(conflicts), rosterEntries: insertedEntries };
}

export async function upsertRosterEntry(
	teamId: string,
	subteamId: string | null,
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

		await touchTeamCacheManifest(teamId, { roster: true, full: true });

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

	if (options.deleteAllForMember) {
		const deletions: Promise<unknown>[] = [];

		if (options.userId) {
			deletions.push(
				dbPg
					.delete(teamRoster)
					.where(
						and(
							eq(teamRoster.teamId, teamId),
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
		await touchTeamCacheManifest(teamId, { roster: true, full: true });
		return;
	}

	if (!options.eventName) {
		throw new Error("Event name is required when not deleting all occurrences");
	}

	const predicates = [
		eq(teamRoster.teamId, teamId),
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
		await touchTeamCacheManifest(teamId, { roster: true, full: true });
		return;
	}

	// Fallback: delete specific slot (legacy behavior)
	await dbPg
		.delete(teamRoster)
		.where(
			and(...predicates, eq(teamRoster.slotIndex, options.slotIndex ?? 0)),
		);
	await touchTeamCacheManifest(teamId, { roster: true, full: true });
}
