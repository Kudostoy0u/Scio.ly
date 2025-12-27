import { dbPg } from "@/lib/db";
import {
	assignmentResults,
	teamMemberships,
	teamRoster,
	teamSubteams,
	teamTournamentRosters,
	users,
} from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { touchSubteamCacheManifest } from "./cache-manifest";
import { ensureActiveTournamentRoster } from "./roster";
import {
	assertCaptainAccess,
	assertTeamAccess,
	bumpTeamVersion,
} from "./shared";

type BlockOverrides = {
	added?: string[];
	removed?: string[];
};

type SubteamRosterConfigV1 = {
	v: 1;
	description?: string | null;
	blocks?: Record<string, BlockOverrides>;
};

function isObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeEventName(value: string) {
	return value.trim().replace(/\s+/g, " ");
}

function dedupeNonEmpty(values: string[]) {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const raw of values) {
		const normalized = normalizeEventName(raw);
		if (!normalized) continue;
		const key = normalized.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(normalized);
	}
	return out;
}

function parseSubteamConfig(
	rawDescription: string | null,
): SubteamRosterConfigV1 {
	if (!rawDescription) {
		return { v: 1, description: null, blocks: {} };
	}
	try {
		const parsed = JSON.parse(rawDescription) as unknown;
		if (!isObject(parsed) || parsed.v !== 1) {
			return { v: 1, description: rawDescription, blocks: {} };
		}
		const blocksRaw = isObject(parsed.blocks) ? parsed.blocks : {};
		const blocks: Record<string, BlockOverrides> = {};
		for (const [label, value] of Object.entries(blocksRaw)) {
			if (!isObject(value)) continue;
			const added = Array.isArray(value.added)
				? dedupeNonEmpty(value.added.filter((x) => typeof x === "string"))
				: [];
			const removed = Array.isArray(value.removed)
				? dedupeNonEmpty(value.removed.filter((x) => typeof x === "string"))
				: [];
			if (added.length || removed.length) {
				blocks[label] = { added, removed };
			}
		}

		return {
			v: 1,
			description:
				typeof parsed.description === "string" ? parsed.description : null,
			blocks,
		};
	} catch {
		return { v: 1, description: rawDescription, blocks: {} };
	}
}

function stringifySubteamConfig(config: SubteamRosterConfigV1) {
	return JSON.stringify({
		v: 1,
		description: config.description ?? null,
		blocks: config.blocks ?? {},
	} satisfies SubteamRosterConfigV1);
}

/**
 * Get team join codes (captain_code and user_code)
 * Only captains can view team codes
 */
export async function getTeamCodes(teamSlug: string, userId: string) {
	const { team } = await assertTeamAccess(teamSlug, userId);

	// Get team units for this group
	const unitsResult = await dbPg
		.select({ id: teamSubteams.id })
		.from(teamSubteams)
		.where(eq(teamSubteams.teamId, team.id));

	if (unitsResult.length === 0) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "No team units found for this group",
		});
	}

	const teamUnitIds = unitsResult.map((row) => row.id);

	// Check if user is captain of any team unit
	const membershipResult = await dbPg
		.select({
			id: teamMemberships.id,
			role: teamMemberships.role,
			teamId: teamMemberships.teamId,
		})
		.from(teamMemberships)
		.where(
			and(
				eq(teamMemberships.userId, userId),
				inArray(teamMemberships.teamId, teamUnitIds),
				eq(teamMemberships.status, "active"),
			),
		);

	if (membershipResult.length === 0) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Not a team member",
		});
	}

	const captainMemberships = membershipResult.filter(
		(m) => m.role === "captain",
	);

	if (captainMemberships.length === 0) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only captains can view team codes",
		});
	}

	// Get team codes from the first team unit
	const [teamResult] = await dbPg
		.select({
			captainCode: teamSubteams.captainCode,
			userCode: teamSubteams.userCode,
		})
		.from(teamSubteams)
		.where(eq(teamSubteams.id, teamUnitIds[0] ?? ""))
		.limit(1);

	if (!teamResult) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Team not found",
		});
	}

	return {
		captainCode: teamResult.captainCode,
		userCode: teamResult.userCode,
	};
}

/**
 * Get removed events for a subteam
 */
export async function getRemovedEvents(
	teamSlug: string,
	subteamId: string,
	userId: string,
) {
	const { team } = await assertTeamAccess(teamSlug, userId);

	// Verify subteam belongs to team
	const [subteam] = await dbPg
		.select({
			id: teamSubteams.id,
			description: teamSubteams.description,
		})
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.teamId, team.id), eq(teamSubteams.id, subteamId)),
		)
		.limit(1);

	if (!subteam) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Subteam not found",
		});
	}

	const config = parseSubteamConfig(subteam.description ?? null);
	return { blocks: config.blocks ?? {} };
}

/**
 * Update removed events (add or remove event from conflict block)
 */
export async function updateRemovedEvents(
	teamSlug: string,
	subteamId: string,
	eventName: string,
	conflictBlock: string,
	mode: "remove" | "add",
	userId: string,
) {
	await assertCaptainAccess(teamSlug, userId);
	const { team } = await assertTeamAccess(teamSlug, userId);

	// Verify subteam belongs to team
	const [subteam] = await dbPg
		.select({
			id: teamSubteams.id,
			description: teamSubteams.description,
		})
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.teamId, team.id), eq(teamSubteams.id, subteamId)),
		)
		.limit(1);

	if (!subteam) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Subteam not found",
		});
	}

	const config = parseSubteamConfig(subteam.description ?? null);
	const blocks = config.blocks ?? {};
	const current = blocks[conflictBlock] ?? {};
	const added = dedupeNonEmpty(current.added ?? []);
	const removed = dedupeNonEmpty(current.removed ?? []);
	const normalizedEventName = normalizeEventName(eventName);

	if (mode === "add") {
		const nextAdded = dedupeNonEmpty([...added, normalizedEventName]);
		const nextRemoved = removed.filter(
			(e) => e.toLowerCase() !== normalizedEventName.toLowerCase(),
		);
		blocks[conflictBlock] = { added: nextAdded, removed: nextRemoved };
	} else {
		const nextRemoved = dedupeNonEmpty([...removed, normalizedEventName]);
		const nextAdded = added.filter(
			(e) => e.toLowerCase() !== normalizedEventName.toLowerCase(),
		);
		blocks[conflictBlock] = { added: nextAdded, removed: nextRemoved };
	}

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamSubteams)
			.set({
				description: stringifySubteamConfig({ ...config, blocks }),
				updatedAt: new Date().toISOString(),
			})
			.where(eq(teamSubteams.id, subteamId));

		if (mode === "remove") {
			await tx
				.delete(teamRoster)
				.where(
					and(
						eq(teamRoster.teamId, team.id),
						eq(teamRoster.subteamId, subteamId),
						eq(teamRoster.eventName, normalizedEventName),
					),
				);
		}

		await bumpTeamVersion(team.id, tx);
	});

	return { ok: true };
}

/**
 * Restore or reset removed events
 */
export async function restoreRemovedEvents(
	teamSlug: string,
	subteamId: string,
	conflictBlock: string,
	mode: "restore" | "reset",
	userId: string,
) {
	await assertCaptainAccess(teamSlug, userId);
	const { team } = await assertTeamAccess(teamSlug, userId);

	// Verify subteam belongs to team
	const [subteam] = await dbPg
		.select({
			id: teamSubteams.id,
			description: teamSubteams.description,
		})
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.teamId, team.id), eq(teamSubteams.id, subteamId)),
		)
		.limit(1);

	if (!subteam) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Subteam not found",
		});
	}

	const config = parseSubteamConfig(subteam.description ?? null);
	const blocks = config.blocks ?? {};
	const current = blocks[conflictBlock] ?? {};
	const added = dedupeNonEmpty(current.added ?? []);

	let rosterCleanupEvents: string[] = [];
	if (mode === "reset") {
		rosterCleanupEvents = added;
		delete blocks[conflictBlock];
	} else {
		blocks[conflictBlock] = { added, removed: [] };
	}

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamSubteams)
			.set({
				description: stringifySubteamConfig({ ...config, blocks }),
				updatedAt: new Date().toISOString(),
			})
			.where(eq(teamSubteams.id, subteamId));

		if (rosterCleanupEvents.length) {
			for (const eventName of rosterCleanupEvents) {
				await tx
					.delete(teamRoster)
					.where(
						and(
							eq(teamRoster.teamId, team.id),
							eq(teamRoster.subteamId, subteamId),
							eq(teamRoster.eventName, eventName),
						),
					);
			}
		}

		await bumpTeamVersion(team.id, tx);
	});

	return { ok: true };
}

/**
 * Get roster for a team/subteam
 */
export async function getRoster(
	teamSlug: string,
	subteamId: string | null,
	userId: string,
	rosterId?: string | null,
) {
	const { team, membership } = await assertTeamAccess(teamSlug, userId);
	const activeRoster = await ensureActiveTournamentRoster(team.id, userId);

	let resolvedRosterId = activeRoster.id;
	if (membership.role === "captain" || membership.role === "admin") {
		if (rosterId) {
			const [candidate] = await dbPg
				.select({
					id: teamTournamentRosters.id,
					status: teamTournamentRosters.status,
					isPublic: teamTournamentRosters.isPublic,
				})
				.from(teamTournamentRosters)
				.where(
					and(
						eq(teamTournamentRosters.teamId, team.id),
						eq(teamTournamentRosters.id, rosterId),
					),
				)
				.limit(1);
			if (candidate) {
				resolvedRosterId = candidate.id;
			}
		}
	} else if (rosterId) {
		const [candidate] = await dbPg
			.select({
				id: teamTournamentRosters.id,
				status: teamTournamentRosters.status,
				isPublic: teamTournamentRosters.isPublic,
			})
			.from(teamTournamentRosters)
			.where(
				and(
					eq(teamTournamentRosters.teamId, team.id),
					eq(teamTournamentRosters.id, rosterId),
				),
			)
			.limit(1);
		if (candidate?.status === "archived" && candidate.isPublic) {
			resolvedRosterId = candidate.id;
		}
	}

	const rosterResult = await dbPg
		.select({
			event_name: teamRoster.eventName,
			slot_index: teamRoster.slotIndex,
			student_name: teamRoster.displayName,
			user_id: teamRoster.userId,
		})
		.from(teamRoster)
		.where(
			and(
				eq(teamRoster.teamId, team.id),
				eq(teamRoster.tournamentRosterId, resolvedRosterId),
				subteamId ? eq(teamRoster.subteamId, subteamId) : undefined,
			),
		);

	const roster: Record<string, string[]> = {};
	for (const row of rosterResult) {
		const name = row.event_name;
		if (!roster[name]) roster[name] = [];
		roster[name][row.slot_index] = row.student_name || "";
	}

	return { roster, removedEvents: [] };
}

/**
 * Get roster link status
 */
export async function getRosterLinkStatus(
	teamSlug: string,
	subteamId: string | null,
	userId: string,
) {
	const { team } = await assertTeamAccess(teamSlug, userId);
	const activeRoster = await ensureActiveTournamentRoster(team.id, userId);

	// Build where conditions for team units
	const teamUnitsWhere = [eq(teamSubteams.teamId, team.id)];
	if (subteamId) {
		teamUnitsWhere.push(eq(teamSubteams.id, subteamId));
	}

	// Get team units
	const teamUnits = await dbPg
		.select({ id: teamSubteams.id })
		.from(teamSubteams)
		.where(and(...teamUnitsWhere));

	const teamUnitIds = teamUnits.map((u) => u.id);

	if (teamUnitIds.length === 0) {
		return { linkStatus: {} };
	}

	// Get team members from memberships table
	const membersResult = await dbPg
		.select({
			user_id: teamMemberships.userId,
			role: teamMemberships.role,
			joined_at: teamMemberships.joinedAt,
			team_unit_id: teamSubteams.id,
			team_id: teamSubteams.teamId,
			description: teamSubteams.description,
		})
		.from(teamMemberships)
		.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
		.where(
			and(
				inArray(teamMemberships.teamId, teamUnitIds),
				eq(teamMemberships.status, "active"),
			),
		);

	// Get roster data if it exists
	const rosterWhere = [
		inArray(teamRoster.subteamId, teamUnitIds),
		eq(teamRoster.tournamentRosterId, activeRoster.id),
	];
	if (subteamId) {
		rosterWhere.push(eq(teamRoster.subteamId, subteamId));
	}

	const rosterResult = await dbPg
		.select({
			student_name: teamRoster.displayName,
			user_id: teamRoster.userId,
			team_unit_id: teamRoster.subteamId,
		})
		.from(teamRoster)
		.where(and(...rosterWhere));

	// Get real user data
	const userIds = membersResult.map((member) => member.user_id);

	if (userIds.length === 0) {
		// No members, but might have roster entries
		const linkStatus: Record<string, unknown> = {};
		for (const rosterEntry of rosterResult) {
			if (rosterEntry.student_name) {
				linkStatus[rosterEntry.student_name] = {
					userId: rosterEntry.user_id,
					isLinked: !!rosterEntry.user_id,
					userEmail: null,
					username: null,
					teamUnitId: rosterEntry.team_unit_id,
				};
			}
		}
		return { linkStatus };
	}

	// Fetch user profiles
	const userProfilesResult = await dbPg
		.select({
			id: users.id,
			display_name: users.displayName,
			email: users.email,
			first_name: users.firstName,
			last_name: users.lastName,
			username: users.username,
		})
		.from(users)
		.where(inArray(users.id, userIds));

	// Create a map of user profiles for quick lookup
	const userProfileMap = new Map<string, (typeof userProfilesResult)[0]>();
	for (const profile of userProfilesResult) {
		userProfileMap.set(profile.id, profile);
	}

	// Build link status object
	const linkStatus: Record<string, unknown> = {};

	// First, add all team members from memberships
	for (const member of membersResult) {
		const userProfile = userProfileMap.get(member.user_id);
		const displayName =
			userProfile?.display_name ||
			(userProfile?.first_name && userProfile?.last_name
				? `${userProfile.first_name} ${userProfile.last_name}`
				: `User ${member.user_id.substring(0, 8)}`);
		const email =
			userProfile?.email ||
			`user-${member.user_id.substring(0, 8)}@example.com`;
		const username = userProfile?.username;

		linkStatus[displayName] = {
			userId: member.user_id,
			isLinked: true,
			userEmail: email,
			username: username,
			role: member.role,
			teamUnitId: member.team_unit_id,
		};
	}

	// Group roster entries by student name
	const rosterByStudent: Record<
		string,
		{ userId: string | null; teamUnitId: string; isLinked: boolean }
	> = {};

	for (const rosterEntry of rosterResult) {
		if (rosterEntry.student_name && rosterEntry.team_unit_id) {
			const studentName = rosterEntry.student_name;

			if (rosterByStudent[studentName]) {
				rosterByStudent[studentName].isLinked =
					rosterByStudent[studentName].isLinked || !!rosterEntry.user_id;
				if (!rosterByStudent[studentName].userId && rosterEntry.user_id) {
					rosterByStudent[studentName].userId = rosterEntry.user_id;
				}
			} else {
				rosterByStudent[studentName] = {
					userId: rosterEntry.user_id,
					teamUnitId: rosterEntry.team_unit_id,
					isLinked: !!rosterEntry.user_id,
				};
			}
		}
	}

	for (const [studentName, rosterData] of Object.entries(rosterByStudent)) {
		let userEmail: string | null = null;
		let username: string | null = null;
		if (rosterData.userId) {
			const userProfile = userProfileMap.get(rosterData.userId);
			userEmail =
				userProfile?.email ||
				`user-${rosterData.userId.substring(0, 8)}@example.com`;
			username = userProfile?.username ?? null;
		}

		linkStatus[studentName] = {
			userId: rosterData.userId,
			isLinked: rosterData.isLinked,
			userEmail: userEmail,
			username: username,
			teamUnitId: rosterData.teamUnitId,
		};
	}

	return { linkStatus };
}

/**
 * Get subteams for a team
 */
export async function getSubteams(teamSlug: string, userId: string) {
	const { team } = await assertTeamAccess(teamSlug, userId);

	const subteamsResult = await dbPg
		.select({
			id: teamSubteams.id,
			teamId: teamSubteams.teamId,
			description: teamSubteams.description,
			createdAt: teamSubteams.createdAt,
		})
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.teamId, team.id), eq(teamSubteams.status, "active")),
		)
		.orderBy(teamSubteams.createdAt);

	const subteams = subteamsResult.map((subteam) => ({
		id: subteam.id,
		name: subteam.description || `Team ${subteam.teamId}`,
		teamId: subteam.teamId,
		description: subteam.description,
		createdAt: subteam.createdAt,
	}));

	return { subteams };
}

/**
 * Update subteam (PUT - update name/description)
 */
export async function updateSubteam(
	teamSlug: string,
	subteamId: string,
	name: string,
	userId: string,
) {
	await assertCaptainAccess(teamSlug, userId);
	const { team } = await assertTeamAccess(teamSlug, userId);

	// Check if the subteam exists and belongs to this group
	const [subteamResult] = await dbPg
		.select({ id: teamSubteams.id, teamId: teamSubteams.teamId })
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.id, subteamId), eq(teamSubteams.teamId, team.id)),
		)
		.limit(1);

	if (!subteamResult) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Subteam not found",
		});
	}

	// Update the subteam name (description field)
	const [updateResult] = await dbPg
		.update(teamSubteams)
		.set({
			description: name.trim(),
			updatedAt: new Date().toISOString(),
		})
		.where(eq(teamSubteams.id, subteamId))
		.returning({
			id: teamSubteams.id,
			teamId: teamSubteams.teamId,
			description: teamSubteams.description,
		});

	if (!updateResult) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to update subteam",
		});
	}

	return {
		id: updateResult.id,
		name: updateResult.description || `Team ${updateResult.teamId}`,
		team_id: updateResult.teamId,
		description: updateResult.description,
	};
}

/**
 * Get roster notes for a subteam
 */
export async function getRosterNotes(
	teamSlug: string,
	subteamId: string,
	userId: string,
) {
	const { team } = await assertTeamAccess(teamSlug, userId);

	// Check if the subteam exists and belongs to this group
	const [subteamResult] = await dbPg
		.select({
			id: teamSubteams.id,
			rosterNotes: teamSubteams.rosterNotes,
		})
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.id, subteamId), eq(teamSubteams.teamId, team.id)),
		)
		.limit(1);

	if (!subteamResult) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Subteam not found",
		});
	}

	return {
		id: subteamResult.id,
		rosterNotes: subteamResult.rosterNotes || null,
	};
}

/**
 * Update roster notes for a subteam
 */
export async function updateRosterNotes(
	teamSlug: string,
	subteamId: string,
	notes: string | null,
	userId: string,
) {
	await assertCaptainAccess(teamSlug, userId);
	const { team } = await assertTeamAccess(teamSlug, userId);

	// Check if the subteam exists and belongs to this group
	const [subteamResult] = await dbPg
		.select({ id: teamSubteams.id, teamId: teamSubteams.teamId })
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.id, subteamId), eq(teamSubteams.teamId, team.id)),
		)
		.limit(1);

	if (!subteamResult) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Subteam not found",
		});
	}

	// Update the roster notes
	const [updateResult] = await dbPg
		.update(teamSubteams)
		.set({
			rosterNotes: notes?.trim() || null,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(teamSubteams.id, subteamId))
		.returning({
			id: teamSubteams.id,
			rosterNotes: teamSubteams.rosterNotes,
		});

	if (!updateResult) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to update roster notes",
		});
	}

	// Touch the subteam cache manifest to invalidate cached roster notes
	await touchSubteamCacheManifest(team.id, subteamId, {
		rosterNotes: true,
	});

	return {
		id: updateResult.id,
		rosterNotes: updateResult.rosterNotes,
	};
}

/**
 * Submit assignment results
 */
export async function submitAssignment(
	assignmentId: number,
	userId: string | null,
	name: string | null,
	eventName: string | null,
	score: number | null,
	detail: string | null,
) {
	if (!(assignmentId && (userId || name))) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message:
				"Missing required parameters: assignmentId and either userId or name",
		});
	}

	const [result] = await dbPg
		.insert(assignmentResults)
		.values({
			assignmentId: Number(assignmentId),
			userId: userId || null,
			name: name || null,
			eventName: eventName || null,
			score: typeof score === "number" ? String(score) : null,
			detail: detail || null,
		} as typeof assignmentResults.$inferInsert)
		.returning();

	return { success: true, data: result };
}
