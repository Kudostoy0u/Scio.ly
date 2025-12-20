import { dbPg } from "@/lib/db";
import {
	teamCacheManifests,
	teamSubteamCacheManifests,
	teamSubteams,
} from "@/lib/db/schema";
import logger from "@/lib/utils/logging/logger";
import { and, eq, inArray, sql } from "drizzle-orm";
import { assertTeamAccess } from "./shared";

type TeamCacheDb = Pick<typeof dbPg, "insert" | "update" | "delete" | "select">;

export type SubteamCacheManifest = {
	subteamId: string;
	streamUpdatedAt: string;
	timersUpdatedAt: string;
	tournamentsUpdatedAt: string;
};

export type TeamCacheManifest = {
	teamId: string;
	fullUpdatedAt: string;
	assignmentsUpdatedAt: string;
	rosterUpdatedAt: string;
	membersUpdatedAt: string;
	subteamsUpdatedAt: string;
	calendarUpdatedAt: string;
	subteams: SubteamCacheManifest[];
};

export async function ensureTeamCacheManifest(
	teamId: string,
	db: TeamCacheDb = dbPg,
) {
	await db.insert(teamCacheManifests).values({ teamId }).onConflictDoNothing();
}

export async function ensureSubteamCacheManifest(
	teamId: string,
	subteamId: string,
	db: TeamCacheDb = dbPg,
) {
	await db
		.insert(teamSubteamCacheManifests)
		.values({ teamId, subteamId })
		.onConflictDoNothing();
}

export async function touchTeamCacheManifest(
	teamId: string,
	updates: {
		full?: boolean;
		assignments?: boolean;
		roster?: boolean;
		members?: boolean;
		subteams?: boolean;
		calendar?: boolean;
	},
	db: TeamCacheDb = dbPg,
) {
	const set: Record<string, unknown> = {};
	const now = sql`now()`;

	if (updates.full) {
		set.fullUpdatedAt = now;
	}
	if (updates.assignments) {
		set.assignmentsUpdatedAt = now;
	}
	if (updates.roster) {
		set.rosterUpdatedAt = now;
	}
	if (updates.members) {
		set.membersUpdatedAt = now;
	}
	if (updates.subteams) {
		set.subteamsUpdatedAt = now;
	}
	if (updates.calendar) {
		set.calendarUpdatedAt = now;
	}

	if (Object.keys(set).length === 0) {
		return;
	}

	set.updatedAt = now;

	logger.dev.structured("debug", "[TeamCache] Touch team manifest", {
		teamId,
		updates,
	});

	await db
		.insert(teamCacheManifests)
		.values({ teamId })
		.onConflictDoUpdate({
			target: teamCacheManifests.teamId,
			set: set as Partial<typeof teamCacheManifests.$inferInsert>,
		});
}

export async function touchSubteamCacheManifest(
	teamId: string,
	subteamId: string,
	updates: {
		stream?: boolean;
		timers?: boolean;
		tournaments?: boolean;
	},
	db: TeamCacheDb = dbPg,
) {
	const set: Record<string, unknown> = {};
	const now = sql`now()`;

	if (updates.stream) {
		set.streamUpdatedAt = now;
	}
	if (updates.timers) {
		set.timersUpdatedAt = now;
	}
	if (updates.tournaments) {
		set.tournamentsUpdatedAt = now;
	}

	if (Object.keys(set).length === 0) {
		return;
	}

	set.updatedAt = now;

	logger.dev.structured("debug", "[TeamCache] Touch subteam manifest", {
		teamId,
		subteamId,
		updates,
	});

	await db
		.insert(teamSubteamCacheManifests)
		.values({ teamId, subteamId })
		.onConflictDoUpdate({
			target: [
				teamSubteamCacheManifests.teamId,
				teamSubteamCacheManifests.subteamId,
			],
			set: set as Partial<typeof teamSubteamCacheManifests.$inferInsert>,
		});
}

export async function deleteSubteamCacheManifest(
	teamId: string,
	subteamId: string,
	db: TeamCacheDb = dbPg,
) {
	await db
		.delete(teamSubteamCacheManifests)
		.where(
			and(
				eq(teamSubteamCacheManifests.teamId, teamId),
				eq(teamSubteamCacheManifests.subteamId, subteamId),
			),
		);
}

export async function getTeamCacheManifest(
	teamSlug: string,
	userId: string,
): Promise<TeamCacheManifest> {
	const { team } = await assertTeamAccess(teamSlug, userId);

	logger.dev.structured("debug", "[TeamCache] Fetch manifest", {
		teamId: team.id,
		teamSlug,
		userId,
	});

	await ensureTeamCacheManifest(team.id);

	const [manifest] = await dbPg
		.select({
			fullUpdatedAt: teamCacheManifests.fullUpdatedAt,
			assignmentsUpdatedAt: teamCacheManifests.assignmentsUpdatedAt,
			rosterUpdatedAt: teamCacheManifests.rosterUpdatedAt,
			membersUpdatedAt: teamCacheManifests.membersUpdatedAt,
			subteamsUpdatedAt: teamCacheManifests.subteamsUpdatedAt,
			calendarUpdatedAt: teamCacheManifests.calendarUpdatedAt,
		})
		.from(teamCacheManifests)
		.where(eq(teamCacheManifests.teamId, team.id))
		.limit(1);

	const subteamRows = await dbPg
		.select({ id: teamSubteams.id })
		.from(teamSubteams)
		.where(eq(teamSubteams.teamId, team.id));
	const subteamIds = subteamRows.map((row) => row.id);

	if (subteamIds.length > 0) {
		await dbPg
			.insert(teamSubteamCacheManifests)
			.values(subteamIds.map((subteamId) => ({ teamId: team.id, subteamId })))
			.onConflictDoNothing();
	}

	const subteamManifests = subteamIds.length
		? await dbPg
				.select({
					subteamId: teamSubteamCacheManifests.subteamId,
					streamUpdatedAt: teamSubteamCacheManifests.streamUpdatedAt,
					timersUpdatedAt: teamSubteamCacheManifests.timersUpdatedAt,
					tournamentsUpdatedAt: teamSubteamCacheManifests.tournamentsUpdatedAt,
				})
				.from(teamSubteamCacheManifests)
				.where(
					and(
						eq(teamSubteamCacheManifests.teamId, team.id),
						inArray(teamSubteamCacheManifests.subteamId, subteamIds),
					),
				)
		: [];

	if (!manifest) {
		const fallback = new Date().toISOString();
		return {
			teamId: team.id,
			fullUpdatedAt: fallback,
			assignmentsUpdatedAt: fallback,
			rosterUpdatedAt: fallback,
			membersUpdatedAt: fallback,
			subteamsUpdatedAt: fallback,
			calendarUpdatedAt: fallback,
			subteams: subteamManifests,
		};
	}

	return {
		teamId: team.id,
		fullUpdatedAt: String(manifest.fullUpdatedAt),
		assignmentsUpdatedAt: String(manifest.assignmentsUpdatedAt),
		rosterUpdatedAt: String(manifest.rosterUpdatedAt),
		membersUpdatedAt: String(manifest.membersUpdatedAt),
		subteamsUpdatedAt: String(manifest.subteamsUpdatedAt),
		calendarUpdatedAt: String(manifest.calendarUpdatedAt),
		subteams: subteamManifests.map((row) => ({
			subteamId: row.subteamId,
			streamUpdatedAt: String(row.streamUpdatedAt),
			timersUpdatedAt: String(row.timersUpdatedAt),
			tournamentsUpdatedAt: String(row.tournamentsUpdatedAt),
		})),
	};
}
