import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
	teamsAssignment,
	teamsInvitation,
	teamsMembership,
	teamsRoster,
	teamsSubteam,
	teamsTeam,
} from "@/lib/db/schema/teams_v2";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { User as SupabaseUser } from "@supabase/supabase-js";
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

async function ensureSupabaseLink(user: SupabaseUser | null) {
	if (!user?.id) return null;
	const preferredUsername =
		(user.user_metadata?.username as string | undefined) ??
		(user.user_metadata?.user_name as string | undefined) ??
		(user.email ? user.email.split("@")[0] : null);
	const supabaseClient = await createSupabaseServerClient();
	const { data: profile } = await supabaseClient
		.from("users")
		.select("id, username, email")
		.eq("id", user.id)
		.maybeSingle();

	const supabaseUsername =
		(profile as { username?: string | null } | null)?.username ??
		(preferredUsername ? preferredUsername.trim() : null) ??
		null;

	await dbPg
		.insert(users)
		.values({
			id: user.id,
			email: user.email ?? "",
			username: supabaseUsername ?? user.email ?? user.id,
			supabaseUserId: user.id,
			supabaseUsername,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		.onConflictDoNothing();

	await dbPg
		.update(users)
		.set({
			email: user.email ?? sql`COALESCE(${users.email}, '')`,
			username: supabaseUsername ?? users.username,
			supabaseUserId: user.id,
			supabaseUsername,
			updatedAt: new Date(),
		})
		.where(eq(users.id, user.id));

	return supabaseUsername;
}

export async function linkSupabaseAccount(username: string, userId: string) {
	const normalized = username.trim();
	if (!normalized) throw new Error("Username is required");
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("users")
		.select("id, username, email")
		.ilike("username", normalized)
		.limit(1)
		.maybeSingle();
	if (error) {
		throw new Error(`Supabase lookup failed: ${error.message}`);
	}
	const supUser = data as { id?: string; username?: string | null } | null;
	if (!supUser?.id) {
		throw new Error("Supabase user not found");
	}

	await dbPg
		.update(users)
		.set({
			supabaseUserId: supUser.id,
			supabaseUsername: supUser.username ?? normalized,
			updatedAt: new Date(),
		})
		.where(eq(users.id, userId));

	return {
		supabaseUserId: supUser.id,
		supabaseUsername: supUser.username ?? normalized,
	};
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
	supabaseUser?: SupabaseUser | null;
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
			name: "Team A",
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

	// Link creator to Supabase if possible
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

	// Link joining user to Supabase profile
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

	const alreadyAssigned = existingEntries.find(
		(e) =>
			e.displayName.toLowerCase() === payload.displayName.toLowerCase() ||
			(payload.userId && e.userId === payload.userId),
	);
	if (alreadyAssigned) {
		throw new Error("Member is already assigned to this event");
	}

	let slotIndex = payload.slotIndex;
	if (slotIndex === undefined || slotIndex === null) {
		const usedSlots = new Set(existingEntries.map((e) => Number(e.slotIndex)));
		let candidate = 0;
		while (usedSlots.has(candidate)) {
			candidate += 1;
		}
		slotIndex = candidate;
	}

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

export interface PendingInvite {
	teamId: string;
	slug: string;
	name: string;
	school: string;
	division: string;
	role: "captain" | "member";
}

function buildInviteMatchFilters(
	userId: string,
	userEmail?: string | null,
	username?: string | null,
) {
	const filters = [eq(teamsInvitation.invitedUserId, userId)];
	if (userEmail) {
		filters.push(eq(teamsInvitation.invitedEmail, userEmail));
	}
	if (username) {
		filters.push(eq(teamsInvitation.invitedEmail, username));
	}

	if (filters.length === 1) return filters[0];
	return or(...filters);
}

async function bumpTeamVersion(teamId: string) {
	await dbPg
		.update(teamsTeam)
		.set({
			updatedAt: sql`now()`,
			version: sql`${teamsTeam.version} + 1`,
		})
		.where(eq(teamsTeam.id, teamId));
}

export async function listPendingInvitesForUser(
	userId: string,
): Promise<PendingInvite[]> {
	const [profile] = await dbPg
		.select({
			email: users.email,
			username: users.supabaseUsername,
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	const inviteMatch = buildInviteMatchFilters(
		userId,
		profile?.email ?? null,
		profile?.username ?? null,
	);

	const invites =
		profile || userId
			? await dbPg
					.select({
						invitationId: teamsInvitation.id,
						teamId: teamsTeam.id,
						slug: teamsTeam.slug,
						name: teamsTeam.name,
						school: teamsTeam.school,
						division: teamsTeam.division,
						role: teamsInvitation.role,
					})
					.from(teamsInvitation)
					.innerJoin(teamsTeam, eq(teamsInvitation.teamId, teamsTeam.id))
					.where(and(eq(teamsInvitation.status, "pending"), inviteMatch))
			: [];

	const pendingMemberships = await dbPg
		.select({
			teamId: teamsTeam.id,
			slug: teamsTeam.slug,
			name: teamsTeam.name,
			school: teamsTeam.school,
			division: teamsTeam.division,
			role: teamsMembership.role,
		})
		.from(teamsMembership)
		.innerJoin(teamsTeam, eq(teamsMembership.teamId, teamsTeam.id))
		.where(
			and(
				eq(teamsMembership.userId, userId),
				eq(teamsMembership.status, "pending"),
			),
		);

	const combined = new Map<string, PendingInvite>();

	for (const invite of invites) {
		combined.set(invite.teamId, {
			teamId: invite.teamId,
			slug: invite.slug,
			name: invite.name,
			school: invite.school,
			division: invite.division,
			role: (invite.role as "captain" | "member") ?? "member",
		});
	}

	for (const membership of pendingMemberships) {
		if (combined.has(membership.teamId)) continue;
		combined.set(membership.teamId, {
			teamId: membership.teamId,
			slug: membership.slug,
			name: membership.name,
			school: membership.school,
			division: membership.division,
			role: (membership.role as "captain" | "member") ?? "member",
		});
	}

	return Array.from(combined.values());
}

export async function acceptPendingInvite(teamSlug: string, userId: string) {
	const [team] = await dbPg
		.select({
			id: teamsTeam.id,
			slug: teamsTeam.slug,
		})
		.from(teamsTeam)
		.where(eq(teamsTeam.slug, teamSlug))
		.limit(1);

	if (!team) {
		throw new Error("Team not found");
	}

	const supabase = await createSupabaseServerClient();
	const { data: supabaseUser } = await supabase.auth.getUser();
	if (supabaseUser?.user) {
		await ensureSupabaseLink(supabaseUser.user);
	}

	await dbPg.transaction(async (tx) => {
		const [profile] = await tx
			.select({
				email: users.email,
				username: users.supabaseUsername,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		const inviteMatch = buildInviteMatchFilters(
			userId,
			profile?.email ?? null,
			profile?.username ?? null,
		);

		const [invite] = await tx
			.select({
				id: teamsInvitation.id,
				role: teamsInvitation.role,
			})
			.from(teamsInvitation)
			.where(
				and(
					eq(teamsInvitation.teamId, team.id),
					eq(teamsInvitation.status, "pending"),
					inviteMatch,
				),
			)
			.limit(1);

		const [existingMembership] = await tx
			.select({
				id: teamsMembership.id,
				role: teamsMembership.role,
				status: teamsMembership.status,
			})
			.from(teamsMembership)
			.where(
				and(
					eq(teamsMembership.teamId, team.id),
					eq(teamsMembership.userId, userId),
				),
			)
			.limit(1);

		if (existingMembership) {
			await tx
				.update(teamsMembership)
				.set({
					status: "active",
					role: existingMembership.role ?? invite?.role ?? "member",
					updatedAt: new Date(),
				})
				.where(eq(teamsMembership.id, existingMembership.id));
		} else {
			await tx.insert(teamsMembership).values({
				id: crypto.randomUUID(),
				teamId: team.id,
				userId,
				role: invite?.role ?? "member",
				status: "active",
				invitedBy: null,
				joinedAt: new Date(),
			});
		}

		if (invite) {
			await tx
				.update(teamsInvitation)
				.set({
					status: "accepted",
					invitedUserId: userId,
					updatedAt: new Date(),
				})
				.where(eq(teamsInvitation.id, invite.id));
		}

		await bumpTeamVersion(team.id);
	});

	return { slug: team.slug };
}

export async function declineInvite(teamSlug: string, userId: string) {
	const [team] = await dbPg
		.select({
			id: teamsTeam.id,
			slug: teamsTeam.slug,
		})
		.from(teamsTeam)
		.where(eq(teamsTeam.slug, teamSlug))
		.limit(1);

	if (!team) {
		throw new Error("Team not found");
	}

	const supabase = await createSupabaseServerClient();
	const { data: supabaseUser } = await supabase.auth.getUser();
	if (supabaseUser?.user) {
		await ensureSupabaseLink(supabaseUser.user);
	}

	await dbPg.transaction(async (tx) => {
		const [profile] = await tx
			.select({
				email: users.email,
				username: users.supabaseUsername,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		const inviteMatch = buildInviteMatchFilters(
			userId,
			profile?.email ?? null,
			profile?.username ?? null,
		);

		await tx
			.update(teamsInvitation)
			.set({
				status: "declined",
				invitedUserId: userId,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(teamsInvitation.teamId, team.id),
					eq(teamsInvitation.status, "pending"),
					inviteMatch,
				),
			);

		await tx
			.update(teamsMembership)
			.set({ status: "inactive", updatedAt: new Date() })
			.where(
				and(
					eq(teamsMembership.teamId, team.id),
					eq(teamsMembership.userId, userId),
					eq(teamsMembership.status, "pending"),
				),
			);

		await bumpTeamVersion(team.id);
	});

	return { ok: true };
}
