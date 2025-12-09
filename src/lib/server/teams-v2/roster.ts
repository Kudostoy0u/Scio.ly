import { dbPg } from "@/lib/db";
import { teamsRoster } from "@/lib/db/schema/teams_v2";
import logger from "@/lib/utils/logging/logger";
import { and, eq, isNull, sql } from "drizzle-orm";
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
	if (!membership || membership.role !== "captain") {
		throw new Error("Only captains can edit roster");
	}

	await dbPg.transaction(async (tx) => {
		await tx
			.delete(teamsRoster)
			.where(
				and(
					eq(teamsRoster.teamId, teamId),
					eq(teamsRoster.subteamId, subteamId),
				),
			);

		if (entries.length === 0) return;

		await tx.insert(teamsRoster).values(
			entries.map((entry) => ({
				id: crypto.randomUUID(),
				teamId,
				subteamId,
				eventName: entry.eventName,
				slotIndex: entry.slotIndex,
				displayName: entry.displayName,
				userId: entry.userId ?? null,
			})),
		);
	});
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

		if (!membership || membership.role !== "captain") {
			throw new Error("Only captains can edit roster");
		}

		const existingEntries = await dbPg
			.select({
				id: teamsRoster.id,
				slotIndex: teamsRoster.slotIndex,
				displayName: teamsRoster.displayName,
				userId: teamsRoster.userId,
			})
			.from(teamsRoster)
			.where(
				and(
					eq(teamsRoster.teamId, teamId),
					subteamId
						? eq(teamsRoster.subteamId, subteamId)
						: isNull(teamsRoster.subteamId),
					eq(teamsRoster.eventName, payload.eventName),
				),
			)
			.orderBy(teamsRoster.slotIndex);

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
				.insert(teamsRoster)
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
						teamsRoster.teamId,
						teamsRoster.subteamId,
						teamsRoster.eventName,
						teamsRoster.slotIndex,
					],
					set: {
						displayName: payload.displayName,
						userId: payload.userId ?? null,
						updatedAt: sql`now()`,
					},
				});
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
	subteamId: string | null,
	eventName: string,
	slotIndex: number,
	actorId: string,
) {
	const membership = await getMembershipForUser(teamId, actorId);
	if (!membership || membership.role !== "captain") {
		throw new Error("Only captains can edit roster");
	}

	await dbPg
		.delete(teamsRoster)
		.where(
			and(
				eq(teamsRoster.teamId, teamId),
				subteamId
					? eq(teamsRoster.subteamId, subteamId)
					: isNull(teamsRoster.subteamId),
				eq(teamsRoster.eventName, eventName),
				eq(teamsRoster.slotIndex, slotIndex),
			),
		);
}
