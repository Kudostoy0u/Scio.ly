import { dbPg } from "@/lib/db";
import { teamActiveTimers, teamSubteams } from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { getTeamEventsForTimers } from "./calendar";
import { touchSubteamCacheManifest } from "./cache-manifest";
import { assertCaptainAccess, assertTeamAccess } from "./shared";

export async function getActiveTimers(
	teamSlug: string,
	subteamId: string,
	userId: string,
) {
	const { team } = await assertTeamAccess(teamSlug, userId);

	// Verify subteam belongs to team
	const [subteam] = await dbPg
		.select({ id: teamSubteams.id })
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.id, subteamId), eq(teamSubteams.teamId, team.id)),
		)
		.limit(1);

	if (!subteam) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
	}

	const timersResult = await dbPg
		.select({
			id: teamActiveTimers.eventId,
			title: sql<string>`'Timer ' || SUBSTRING(${teamActiveTimers.eventId}::text, 1, 8)`,
			start_time: sql<string>`now()::text`,
			location: sql<string | null>`null`,
			event_type: sql<string>`'meeting'`,
			added_at: sql<string>`${teamActiveTimers.addedAt}::text`,
		})
		.from(teamActiveTimers)
		.where(eq(teamActiveTimers.subteamId, subteamId))
		.orderBy(asc(teamActiveTimers.addedAt));

	return timersResult;
}

export async function addTimer(
	teamSlug: string,
	input: {
		subteamId: string;
		eventId: string;
	},
	userId: string,
) {
	const { team } = await assertCaptainAccess(teamSlug, userId);

	const [subteam] = await dbPg
		.select({ id: teamSubteams.id })
		.from(teamSubteams)
		.where(
			and(
				eq(teamSubteams.id, input.subteamId),
				eq(teamSubteams.teamId, team.id),
			),
		)
		.limit(1);

	if (!subteam) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
	}

	const existingTimer = await dbPg
		.select({ id: teamActiveTimers.id })
		.from(teamActiveTimers)
		.where(
			and(
				eq(teamActiveTimers.subteamId, input.subteamId),
				eq(teamActiveTimers.eventId, input.eventId),
			),
		)
		.limit(1);

	if (existingTimer.length > 0) {
		return { timerId: existingTimer[0]?.id };
	}

	const [timer] = await dbPg
		.insert(teamActiveTimers)
		.values({
			teamId: team.id,
			subteamId: input.subteamId,
			eventId: input.eventId,
			addedBy: userId,
		})
		.returning({ id: teamActiveTimers.id });

	await touchSubteamCacheManifest(team.id, input.subteamId, { timers: true });

	return { timerId: timer?.id };
}

export async function removeTimer(
	teamSlug: string,
	input: {
		subteamId: string;
		eventId: string;
	},
	userId: string,
) {
	const { team } = await assertCaptainAccess(teamSlug, userId);

	const [subteam] = await dbPg
		.select({ id: teamSubteams.id })
		.from(teamSubteams)
		.where(
			and(
				eq(teamSubteams.id, input.subteamId),
				eq(teamSubteams.teamId, team.id),
			),
		)
		.limit(1);

	if (!subteam) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
	}

	await dbPg
		.delete(teamActiveTimers)
		.where(
			and(
				eq(teamActiveTimers.subteamId, input.subteamId),
				eq(teamActiveTimers.eventId, input.eventId),
			),
		);

	await touchSubteamCacheManifest(team.id, input.subteamId, { timers: true });

	return { success: true };
}

export async function getUpcomingTournaments(
	teamSlug: string,
	subteamId: string,
	userId: string,
) {
	const events = await getTeamEventsForTimers({
		teamSlug,
		subteamId,
		userId,
	});

	const activeTimers = await dbPg
		.select({ eventId: teamActiveTimers.eventId })
		.from(teamActiveTimers)
		.where(eq(teamActiveTimers.subteamId, subteamId));

	const activeTimerIds = new Set(activeTimers.map((timer) => timer.eventId));

	return events.map((event) => ({
		...event,
		has_timer: activeTimerIds.has(event.id),
	}));
}
