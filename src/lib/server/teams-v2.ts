import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
	teamsAssignment,
	teamsMembership,
	teamsRoster,
	teamsSubteam,
	teamsTeam,
} from "@/lib/db/schema/teams_v2";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

export interface TeamMeta {
	teamId: string;
	slug: string;
	name: string;
	school: string;
	division: string;
	updatedAt: string;
	version: number;
	userRole: "captain" | "member";
	status: string;
	memberCode: string;
	captainCode: string | null;
}

export interface TeamMember {
	id: string;
	name: string;
	email: string | null;
	role: "captain" | "member";
	status: "active" | "pending" | "inactive";
	events: string[];
	subteamId: string | null;
	subteamName: string | null;
	subteam?: {
		id: string;
		name: string | null;
		description?: string | null;
	} | null;
	isUnlinked: boolean;
	username: string | null;
	joinedAt: string | null;
	isPendingInvitation: boolean;
}

export interface TeamFullData {
	meta: TeamMeta;
	subteams: Array<{
		id: string;
		teamId: string;
		name: string;
		description: string | null;
		displayOrder: number;
		createdAt: string;
	}>;
	members: TeamMember[];
	rosterEntries: Array<{
		id: string;
		teamId: string;
		subteamId: string | null;
		eventName: string;
		slotIndex: number;
		displayName: string;
		userId: string | null;
	}>;
	assignments: Array<{
		id: string;
		teamId: string;
		subteamId: string | null;
		title: string;
		description: string | null;
		dueDate: string | null;
		status: string;
		createdBy: string;
		createdAt: string;
		updatedAt: string;
	}>;
}

function generateJoinCode(length = 8) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let result = "";
	for (let i = 0; i < length; i += 1) {
		result += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return result;
}

function slugifySchool(school: string) {
	const base = school
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return base || `team-${crypto.randomUUID().slice(0, 8)}`;
}

async function getMembershipForUser(teamId: string, userId: string) {
	const membership = await dbPg
		.select({
			id: teamsMembership.id,
			role: teamsMembership.role,
			status: teamsMembership.status,
		})
		.from(teamsMembership)
		.where(
			and(
				eq(teamsMembership.teamId, teamId),
				eq(teamsMembership.userId, userId),
			),
		)
		.limit(1);

	return membership[0];
}

async function assertTeamAccess(teamSlug: string, userId: string) {
	const [team] = await dbPg
		.select({
			id: teamsTeam.id,
			slug: teamsTeam.slug,
			name: teamsTeam.name,
			school: teamsTeam.school,
			division: teamsTeam.division,
			updatedAt: teamsTeam.updatedAt,
			version: teamsTeam.version,
			status: teamsTeam.status,
			memberCode: teamsTeam.memberCode,
			captainCode: teamsTeam.captainCode,
		})
		.from(teamsTeam)
		.where(eq(teamsTeam.slug, teamSlug))
		.limit(1);

	if (!team) {
		throw new Error("Team not found");
	}

	const membership = await getMembershipForUser(team.id, userId);
	if (!membership || membership.status !== "active") {
		throw new Error("Access denied");
	}

	return { team, membership };
}

async function assertCaptainAccess(teamSlug: string, userId: string) {
	const { team, membership } = await assertTeamAccess(teamSlug, userId);
	if ((membership.role as string) !== "captain") {
		throw new Error("Only captains can perform this action");
	}
	return { team, membership };
}

export async function getTeamMetaBySlug(
	teamSlug: string,
	userId: string,
): Promise<TeamMeta> {
	const { team, membership } = await assertTeamAccess(teamSlug, userId);

	return {
		teamId: team.id,
		slug: team.slug,
		name: team.name,
		school: team.school,
		division: team.division,
		updatedAt: (team.updatedAt || new Date()).toISOString(),
		version: Number(team.version ?? 1),
		userRole: (membership.role as "captain" | "member") ?? "member",
		status: team.status,
		memberCode: team.memberCode,
		captainCode: membership.role === "captain" ? team.captainCode : null,
	};
}

export async function getTeamFullBySlug(
	teamSlug: string,
	userId: string,
): Promise<TeamFullData> {
	const { team, membership } = await assertTeamAccess(teamSlug, userId);

	const subteams = await dbPg
		.select({
			id: teamsSubteam.id,
			teamId: teamsSubteam.teamId,
			name: teamsSubteam.name,
			description: teamsSubteam.description,
			displayOrder: teamsSubteam.displayOrder,
			createdAt: teamsSubteam.createdAt,
		})
		.from(teamsSubteam)
		.where(eq(teamsSubteam.teamId, team.id))
		.orderBy(teamsSubteam.displayOrder, desc(teamsSubteam.createdAt));

	const [membershipRows, rosterRows, assignmentRows] = await Promise.all([
		dbPg
			.select({
				id: teamsMembership.id,
				userId: teamsMembership.userId,
				role: teamsMembership.role,
				status: teamsMembership.status,
				joinedAt: teamsMembership.joinedAt,
				email: users.email,
				username: users.username,
				displayName: users.displayName,
				firstName: users.firstName,
				lastName: users.lastName,
			})
			.from(teamsMembership)
			.innerJoin(users, eq(users.id, teamsMembership.userId))
			.where(eq(teamsMembership.teamId, team.id)),
		dbPg
			.select({
				id: teamsRoster.id,
				teamId: teamsRoster.teamId,
				subteamId: teamsRoster.subteamId,
				userId: teamsRoster.userId,
				displayName: teamsRoster.displayName,
				eventName: teamsRoster.eventName,
				slotIndex: teamsRoster.slotIndex,
			})
			.from(teamsRoster)
			.where(eq(teamsRoster.teamId, team.id)),
		dbPg
			.select({
				id: teamsAssignment.id,
				teamId: teamsAssignment.teamId,
				subteamId: teamsAssignment.subteamId,
				title: teamsAssignment.title,
				description: teamsAssignment.description,
				dueDate: teamsAssignment.dueDate,
				status: teamsAssignment.status,
				createdBy: teamsAssignment.createdBy,
				createdAt: teamsAssignment.createdAt,
				updatedAt: teamsAssignment.updatedAt,
			})
			.from(teamsAssignment)
			.where(eq(teamsAssignment.teamId, team.id))
			.orderBy(desc(teamsAssignment.createdAt)),
	]);

	// Build helper maps
	const subteamNameMap = new Map(subteams.map((s) => [s.id, s.name]));
	const userEventsMap = new Map<string, Set<string>>();
	const userSubteamMap = new Map<string, string>();

	for (const row of rosterRows) {
		if (row.userId) {
			if (!userEventsMap.has(row.userId)) {
				userEventsMap.set(row.userId, new Set());
			}
			userEventsMap.get(row.userId)?.add(row.eventName);
			if (row.subteamId) {
				userSubteamMap.set(row.userId, row.subteamId);
			}
		}
	}

	const members: TeamMember[] = membershipRows.map((m) => {
		const displayName =
			m.displayName ||
			(m.firstName && m.lastName
				? `${m.firstName} ${m.lastName}`
				: m.firstName ||
					m.lastName ||
					m.username ||
					`User ${m.userId.slice(0, 8)}`);

		const subteamId = userSubteamMap.get(m.userId) || null;
		const events = Array.from(userEventsMap.get(m.userId) ?? []);
		const subteamName = subteamId
			? subteamNameMap.get(subteamId) || null
			: null;

		return {
			id: m.userId,
			name: displayName,
			email: m.email ?? null,
			role: (m.role as "captain" | "member") ?? "member",
			status: (m.status as "active" | "pending" | "inactive") ?? "active",
			events,
			subteamId,
			subteamName,
			subteam: subteamId
				? {
						id: subteamId,
						name: subteamName,
						description: "",
					}
				: null,
			isUnlinked: false,
			username: m.username ?? null,
			joinedAt: m.joinedAt ? m.joinedAt.toISOString() : null,
			isPendingInvitation: m.status === "pending",
		};
	});

	// Add unlinked members from roster
	for (const row of rosterRows) {
		if (row.userId) continue;
		const key = `${row.displayName.toLowerCase()}:${row.subteamId ?? "none"}`;
		const existing = members.find(
			(m) =>
				m.isUnlinked &&
				`${m.name.toLowerCase()}:${m.subteamId ?? "none"}` === key,
		);
		if (existing) {
			if (!existing.events.includes(row.eventName)) {
				existing.events.push(row.eventName);
			}
			continue;
		}
		members.push({
			id: `unlinked-${row.displayName}-${row.subteamId ?? "none"}`,
			name: row.displayName,
			email: null,
			role: "member",
			status: "active",
			events: [row.eventName],
			subteamId: row.subteamId,
			subteamName: row.subteamId
				? subteamNameMap.get(row.subteamId) || null
				: null,
			subteam: row.subteamId
				? {
						id: row.subteamId,
						name: subteamNameMap.get(row.subteamId) || null,
						description: "",
					}
				: null,
			isUnlinked: true,
			username: null,
			joinedAt: null,
			isPendingInvitation: false,
		});
	}

	return {
		meta: {
			teamId: team.id,
			slug: team.slug,
			name: team.name,
			school: team.school,
			division: team.division,
			updatedAt: (team.updatedAt || new Date()).toISOString(),
			version: Number(team.version ?? 1),
			userRole: (membership.role as "captain" | "member") ?? "member",
			status: team.status,
			memberCode: team.memberCode,
			captainCode: membership.role === "captain" ? team.captainCode : null,
		},
		subteams: subteams.map((s) => ({
			id: s.id,
			teamId: s.teamId,
			name: s.name,
			description: s.description,
			displayOrder: Number(s.displayOrder ?? 0),
			createdAt: s.createdAt
				? s.createdAt.toISOString()
				: new Date().toISOString(),
		})),
		members,
		rosterEntries: rosterRows.map((r) => ({
			id: r.id,
			teamId: r.teamId,
			subteamId: r.subteamId,
			eventName: r.eventName,
			slotIndex: Number(r.slotIndex ?? 0),
			displayName: r.displayName,
			userId: r.userId ?? null,
		})),
		assignments: assignmentRows.map((a) => ({
			id: a.id,
			teamId: a.teamId,
			subteamId: a.subteamId,
			title: a.title,
			description: a.description ?? null,
			dueDate: a.dueDate ? a.dueDate.toISOString() : null,
			status: a.status,
			createdBy: a.createdBy,
			createdAt: a.createdAt
				? a.createdAt.toISOString()
				: new Date().toISOString(),
			updatedAt: a.updatedAt
				? a.updatedAt.toISOString()
				: new Date().toISOString(),
		})),
	};
}

export async function leaveTeam(teamSlug: string, userId: string) {
	const { team, membership } = await assertTeamAccess(teamSlug, userId);
	const captains = await dbPg
		.select({ id: teamsMembership.id })
		.from(teamsMembership)
		.where(
			and(
				eq(teamsMembership.teamId, team.id),
				eq(teamsMembership.role, "captain"),
				eq(teamsMembership.status, "active"),
			),
		);

	if (membership.role === "captain" && captains.length <= 1) {
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
	const { team } = await assertCaptainAccess(teamSlug, userId);
	await dbPg.transaction(async (tx) => {
		await tx.delete(teamsTeam).where(eq(teamsTeam.id, team.id));
	});
	return { ok: true, deleted: true };
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
		role: t.role as "captain" | "member",
	}));
}

export async function createTeamWithDefaultSubteam(input: {
	school: string;
	division: "B" | "C";
	createdBy: string;
}) {
	const baseSlug = slugifySchool(input.school);

	let slugCandidate = baseSlug;
	let counter = 1;
	// Find unique slug
	// eslint-disable-next-line no-constant-condition
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
			name: "Main",
			description: "Default subteam",
			displayOrder: 0,
			createdBy: input.createdBy,
		});

		await tx.insert(teamsMembership).values({
			id: membershipId,
			teamId,
			userId: input.createdBy,
			role: "captain",
			status: "active",
		});
	});

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
			updatedAt: new Date(),
		};
		if (isCaptainCode && membershipRow?.role !== "captain") {
			updateData.role = "captain";
		}
		await dbPg
			.update(teamsMembership)
			.set(updateData)
			.where(eq(teamsMembership.id, membershipRow.id));
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
	name: string;
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

	await dbPg.insert(teamsSubteam).values({
		id: subteamId,
		teamId: team.id,
		name: input.name,
		description: input.description ?? null,
		displayOrder,
		createdBy: input.userId,
	});

	return {
		id: subteamId,
		teamId: team.id,
		name: input.name,
		description: input.description ?? null,
		displayOrder,
	};
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
		.set({ name: input.newName, updatedAt: new Date() })
		.where(eq(teamsSubteam.id, input.subteamId));

	return { id: input.subteamId, name: input.newName };
}

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
	const membership = await getMembershipForUser(teamId, actorId);
	if (!membership || membership.role !== "captain") {
		throw new Error("Only captains can edit roster");
	}

	const slotIndex = payload.slotIndex ?? 0;

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
