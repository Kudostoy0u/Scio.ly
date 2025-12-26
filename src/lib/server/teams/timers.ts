import { dbPg } from "@/lib/db";
import {
	calendarEvents,
	teamActiveTimers,
	teamSubteams,
} from "@/lib/db/schema";
import logger from "@/lib/utils/logging/logger";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { touchSubteamCacheManifest } from "./cache-manifest";
import { getTeamEventsForTimers } from "./calendar";
import { assertCaptainAccess, assertTeamAccess } from "./shared";

export async function getActiveTimers(
	teamSlug: string,
	subteamId: string,
	userId: string,
) {
	const startTime = Date.now();
	logger.dev.structured("info", "[getActiveTimers] Starting", {
		teamSlug,
		subteamId,
		userId,
	});

	try {
		// Check team access
		logger.dev.structured("debug", "[getActiveTimers] Checking team access", {
			teamSlug,
			userId,
		});
		const { team } = await assertTeamAccess(teamSlug, userId);
		logger.dev.structured("debug", "[getActiveTimers] Team access verified", {
			teamSlug,
			teamId: team.id,
			userId,
		});

		// Verify subteam belongs to team
		logger.dev.structured("debug", "[getActiveTimers] Verifying subteam", {
			subteamId,
			teamId: team.id,
		});
		const [subteam] = await dbPg
			.select({ id: teamSubteams.id })
			.from(teamSubteams)
			.where(
				and(eq(teamSubteams.id, subteamId), eq(teamSubteams.teamId, team.id)),
			)
			.limit(1);

		if (!subteam) {
			logger.dev.structured("warn", "[getActiveTimers] Subteam not found", {
				subteamId,
				teamId: team.id,
				teamSlug,
			});
			throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
		}
		logger.dev.structured("debug", "[getActiveTimers] Subteam verified", {
			subteamId,
			teamId: team.id,
		});

		// Query timers
		logger.dev.structured("debug", "[getActiveTimers] Querying timers", {
			subteamId,
		});
		const timerRows = await dbPg
			.select({
				event_id: teamActiveTimers.eventId,
				added_at: sql<string>`${teamActiveTimers.addedAt}::text`,
			})
			.from(teamActiveTimers)
			.where(eq(teamActiveTimers.subteamId, subteamId))
			.orderBy(asc(teamActiveTimers.addedAt));

		const recurringTimers = timerRows.filter((timer) =>
			timer.event_id.startsWith("recurring-"),
		);
		const standardTimers = timerRows.filter(
			(timer) => !timer.event_id.startsWith("recurring-"),
		);

		const standardIds = standardTimers.map((timer) => timer.event_id);
		const recurringBaseIds = new Set(
			recurringTimers
				.map((timer) => {
					const match = timer.event_id.match(
						/^recurring-(.+)-(\d{4}-\d{2}-\d{2})$/,
					);
					return match?.[1];
				})
				.filter((value): value is string => !!value),
		);

		const eventIds = [
			...new Set([...standardIds, ...Array.from(recurringBaseIds)]),
		];

		const eventRows = eventIds.length
			? await dbPg
					.select({
						id: calendarEvents.id,
						title: calendarEvents.title,
						start_time: calendarEvents.startTime,
						end_time: calendarEvents.endTime,
						location: calendarEvents.location,
						event_type: calendarEvents.eventType,
						recurrence_pattern: calendarEvents.recurrencePattern,
					})
					.from(calendarEvents)
					.where(inArray(calendarEvents.id, eventIds))
			: [];

		const eventsById = new Map(eventRows.map((event) => [event.id, event]));

		const toTimeString = (value?: string | null) => {
			if (!value) {
				return null;
			}
			const parsed = new Date(value);
			if (Number.isNaN(parsed.getTime())) {
				return null;
			}
			const hours = String(parsed.getHours()).padStart(2, "0");
			const minutes = String(parsed.getMinutes()).padStart(2, "0");
			const seconds = String(parsed.getSeconds()).padStart(2, "0");
			return `${hours}:${minutes}:${seconds}`;
		};

		const timersResult = timerRows
			.map((timer) => {
				if (timer.event_id.startsWith("recurring-")) {
					const match = timer.event_id.match(
						/^recurring-(.+)-(\d{4}-\d{2}-\d{2})$/,
					);
					if (!match) {
						return null;
					}
					const [, baseId, dateStr] = match;
					if (!baseId) {
						return null;
					}
					const baseEvent = eventsById.get(baseId);
					if (!baseEvent) {
						return null;
					}
					const pattern =
						typeof baseEvent.recurrence_pattern === "object" &&
						baseEvent.recurrence_pattern
							? (baseEvent.recurrence_pattern as {
									start_time?: string | null;
								})
							: {};
					const startTime =
						pattern.start_time ??
						toTimeString(baseEvent.start_time) ??
						"00:00:00";

					return {
						id: timer.event_id,
						title: baseEvent.title,
						start_time: `${dateStr}T${startTime}`,
						location: baseEvent.location,
						event_type: baseEvent.event_type ?? "meeting",
						added_at: timer.added_at,
					};
				}

				const baseEvent = eventsById.get(timer.event_id);
				if (!baseEvent) {
					return null;
				}

				return {
					id: timer.event_id,
					title: baseEvent.title,
					start_time: baseEvent.start_time,
					location: baseEvent.location,
					event_type: baseEvent.event_type ?? "other",
					added_at: timer.added_at,
				};
			})
			.filter((timer): timer is NonNullable<typeof timer> => !!timer)
			.map((timer) => ({
				...timer,
				event_type: (timer.event_type ?? "other") as string,
			}));

		const duration = Date.now() - startTime;
		logger.dev.structured("info", "[getActiveTimers] Success", {
			teamSlug,
			subteamId,
			userId,
			timerCount: timersResult.length,
			duration: `${duration}ms`,
		});

		return timersResult;
	} catch (error) {
		const duration = Date.now() - startTime;
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;

		// Log the full error details including any underlying database error
		logger.dev.error(
			"[getActiveTimers] Error",
			error instanceof Error ? error : new Error(String(error)),
			{
				teamSlug,
				subteamId,
				userId,
				duration: `${duration}ms`,
				errorMessage,
				errorStack,
				errorDetails:
					error instanceof Error
						? {
								name: error.name,
								message: error.message,
								stack: error.stack,
								...(typeof (error as { cause?: unknown }).cause !==
									"undefined" && {
									cause: (error as { cause?: unknown }).cause,
								}),
							}
						: undefined,
			},
		);
		throw error;
	}
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

	if (!team.id) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Team ID is missing",
		});
	}
	await touchSubteamCacheManifest(team.id, input.subteamId, {
		timers: true,
		tournaments: true,
	});

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

	if (!team.id) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Team ID is missing",
		});
	}
	await touchSubteamCacheManifest(team.id, input.subteamId, {
		timers: true,
		tournaments: true,
	});

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
