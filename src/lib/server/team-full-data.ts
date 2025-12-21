/**
 * Team Full Data Server Actions
 *
 * Single source of truth for all team data.
 * Used for SSR hydration and client-side queries.
 */

"use server";

import { dbPg } from "@/lib/db";
import { teamAssignments } from "@/lib/db/schema";
import { users } from "@/lib/db/schema";
import {
	teamMemberships,
	teamRoster,
	teamSubteams,
	teams,
} from "@/lib/db/schema";
import { getServerUser } from "@/lib/supabaseServer";
import { and, eq, inArray, sql } from "drizzle-orm";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TeamMeta {
	teamId: string;
	slug: string;
	school: string;
	division: "B" | "C";
	updatedAt: string;
	userRole: "captain" | "member" | null;
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
	isUnlinked: boolean;
	username: string | null;
	joinedAt: string | null;
	isPendingInvitation: boolean;
}

export interface TeamSubteam {
	id: string;
	teamId: string;
	name: string;
	description: string;
	displayOrder: number | null;
	createdAt: string;
}

export interface TeamRosterEntry {
	id: string;
	teamUnitId: string;
	eventName: string;
	slotIndex: number;
	studentName: string | null;
	userId: string | null;
}

export interface TeamAssignment {
	id: string;
	teamId: string;
	title: string;
	description: string | null;
	dueDate: string | null;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

export interface TeamFullData {
	meta: TeamMeta;
	subteams: TeamSubteam[];
	members: TeamMember[];
	rosterEntries: TeamRosterEntry[];
	assignments: TeamAssignment[];
}

// ============================================================================
// TEAM META (Lightweight version check)
// ============================================================================

/**
 * Get team metadata for version checking
 * This is a lightweight query to check if cached data is still valid
 */
export async function getTeamMeta(teamSlug: string): Promise<TeamMeta | null> {
	const user = await getServerUser();
	if (!user?.id) {
		return null;
	}

	const [group] = await dbPg
		.select({
			id: teams.id,
			slug: teams.slug,
			school: teams.school,
			division: teams.division,
			updatedAt: sql<string>`COALESCE(${teams.updatedAt}, ${teams.createdAt})::text`,
		})
		.from(teams)
		.where(eq(teams.slug, teamSlug));

	if (!group) {
		return null;
	}

	// Check user access and get role
	const [membership] = await dbPg
		.select({ role: teamMemberships.role })
		.from(teamMemberships)
		.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
		.where(
			and(
				eq(teamSubteams.teamId, group.id),
				eq(teamMemberships.userId, user.id),
				eq(teamMemberships.status, "active"),
			),
		)
		.limit(1);

	if (!membership) {
		return null;
	}

	return {
		teamId: group.id,
		slug: group.slug,
		school: group.school,
		division: group.division as "B" | "C",
		updatedAt: group.updatedAt,
		userRole: membership.role as "captain" | "member",
	};
}

// ============================================================================
// TEAM FULL DATA (Complete payload for all tabs)
// ============================================================================

/**
 * Get complete team data
 * This is the single source of truth used by all team tabs
 */
export async function getTeamFullData(
	teamSlug: string,
): Promise<TeamFullData | null> {
	const user = await getServerUser();
	if (!user?.id) {
		throw new Error("Unauthorized");
	}

	// 1. Get team group with version
	const [group] = await dbPg
		.select({
			id: teams.id,
			slug: teams.slug,
			school: teams.school,
			division: teams.division,
			updatedAt: sql<string>`COALESCE(${teams.updatedAt}, ${teams.createdAt})::text`,
		})
		.from(teams)
		.where(eq(teams.slug, teamSlug));

	if (!group) {
		throw new Error("Team not found");
	}

	// 2. Check user access
	const [membership] = await dbPg
		.select({ role: teamMemberships.role })
		.from(teamMemberships)
		.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
		.where(
			and(
				eq(teamSubteams.teamId, group.id),
				eq(teamMemberships.userId, user.id),
				eq(teamMemberships.status, "active"),
			),
		)
		.limit(1);

	if (!membership) {
		throw new Error("Access denied");
	}

	// 3. Get all subteams
	const subteams = await dbPg
		.select({
			id: teamSubteams.id,
			groupId: teamSubteams.teamId,
			teamId: teamSubteams.teamId,
			description: teamSubteams.description,
			rosterNotes: teamSubteams.rosterNotes,
			displayOrder: teamSubteams.displayOrder,
			createdAt: sql<string>`${teamSubteams.createdAt}::text`,
		})
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.teamId, group.id), eq(teamSubteams.status, "active")),
		)
		.orderBy(teamSubteams.displayOrder, teamSubteams.createdAt);

	const unitIds = subteams.map((u) => u.id);

	// If no subteams, return early with meta only
	if (unitIds.length === 0) {
		return {
			meta: {
				teamId: group.id,
				slug: group.slug,
				school: group.school,
				division: group.division as "B" | "C",
				updatedAt: group.updatedAt,
				userRole: membership.role as "captain" | "member",
			},
			subteams: [],
			members: [],
			rosterEntries: [],
			assignments: [],
		};
	}

	// 4. Fetch all data in parallel
	const [membershipsRaw, rosterEntriesRaw, assignmentsRaw] = await Promise.all([
		// Memberships with user data
		dbPg
			.select({
				id: teamMemberships.id,
				userId: teamMemberships.userId,
				teamId: teamMemberships.teamId,
				role: teamMemberships.role,
				status: teamMemberships.status,
				joinedAt: sql<string>`${teamMemberships.joinedAt}::text`,
				displayName: users.displayName,
				firstName: users.firstName,
				lastName: users.lastName,
				email: users.email,
				username: users.username,
			})
			.from(teamMemberships)
			.leftJoin(users, eq(teamMemberships.userId, users.id))
			.where(inArray(teamMemberships.teamId, unitIds)),

		// Roster entries
		dbPg
			.select({
				id: teamRoster.id,
				teamUnitId: teamRoster.subteamId,
				eventName: teamRoster.eventName,
				slotIndex: teamRoster.slotIndex,
				studentName: teamRoster.displayName,
				userId: teamRoster.userId,
			})
			.from(teamRoster)
			.where(inArray(teamRoster.subteamId, unitIds)),

		// Assignments
		dbPg
			.select({
				id: teamAssignments.id,
				teamId: teamAssignments.teamId,
				title: teamAssignments.title,
				description: teamAssignments.description,
				dueDate: sql<string | null>`${teamAssignments.dueDate}::text`,
				createdBy: teamAssignments.createdBy,
				createdAt: sql<string>`${teamAssignments.createdAt}::text`,
				updatedAt: sql<string>`COALESCE(${teamAssignments.updatedAt}, ${teamAssignments.createdAt})::text`,
			})
			.from(teamAssignments)
			.where(inArray(teamAssignments.teamId, unitIds))
			.orderBy(
				sql`${teamAssignments.dueDate} ASC NULLS LAST`,
				sql`${teamAssignments.createdAt} DESC`,
			),
	]);

	// 5. Build event map: userId -> events[]
	const userEventsMap = new Map<string, string[]>();
	for (const entry of rosterEntriesRaw) {
		if (entry.userId) {
			if (!userEventsMap.has(entry.userId)) {
				userEventsMap.set(entry.userId, []);
			}
			const events = userEventsMap.get(entry.userId);
			if (events && !events.includes(entry.eventName)) {
				events.push(entry.eventName);
			}
		}
	}

	// 6. Build members from memberships
	const members: TeamMember[] = [];
	const processedUserIds = new Set<string>();

	// Create subteam name lookup
	const subteamNameMap = new Map(subteams.map((s) => [s.id, s.description]));

	for (const m of membershipsRaw) {
		if (processedUserIds.has(m.userId)) continue;
		processedUserIds.add(m.userId);

		const displayName =
			m.displayName ||
			(m.firstName && m.lastName
				? `${m.firstName} ${m.lastName}`
				: m.firstName ||
					m.lastName ||
					m.username ||
					`User ${m.userId.substring(0, 8)}`);

		const events = userEventsMap.get(m.userId) || [];
		const hasRosterEntry = events.length > 0;

		members.push({
			id: m.userId,
			name: displayName,
			email: m.email || null,
			role: m.role as "captain" | "member",
			status: m.status as "active" | "pending" | "inactive",
			events,
			subteamId: hasRosterEntry ? m.teamId : null,
			subteamName: hasRosterEntry ? subteamNameMap.get(m.teamId) || null : null,
			isUnlinked: false,
			username: m.username || null,
			joinedAt: m.joinedAt,
			isPendingInvitation: m.status === "pending",
		});
	}

	// 7. Add unlinked people from roster
	const unlinkedPeople = new Map<
		string,
		{ name: string; events: string[]; subteamId: string }
	>();

	for (const entry of rosterEntriesRaw) {
		if (!entry.userId && entry.studentName) {
			const key = `${entry.studentName.toLowerCase().trim()}:${entry.teamUnitId}`;
			if (!unlinkedPeople.has(key)) {
				unlinkedPeople.set(key, {
					name: entry.studentName,
					events: [],
					subteamId: entry.teamUnitId || "",
				});
			}
			const person = unlinkedPeople.get(key);
			if (person && !person.events.includes(entry.eventName)) {
				person.events.push(entry.eventName);
			}
		}
	}

	for (const [_, person] of unlinkedPeople) {
		members.push({
			id: `unlinked-${person.name}-${person.subteamId}`,
			name: person.name,
			email: null,
			role: "member",
			status: "active",
			events: person.events,
			subteamId: person.subteamId,
			subteamName: subteamNameMap.get(person.subteamId) || null,
			isUnlinked: true,
			username: null,
			joinedAt: null,
			isPendingInvitation: false,
		});
	}

	// 8. Return complete payload
	return {
		meta: {
			teamId: group.id,
			slug: group.slug,
			school: group.school,
			division: group.division as "B" | "C",
			updatedAt: group.updatedAt,
			userRole: membership.role as "captain" | "member",
		},
		subteams: subteams.map((s) => ({
			id: s.id,
			teamId: s.teamId,
			name: s.description || "Unnamed Subteam",
			description: s.description || "",
			rosterNotes: s.rosterNotes || null,
			displayOrder: s.displayOrder,
			createdAt: s.createdAt,
		})),
		members,
		rosterEntries: rosterEntriesRaw.map((r) => ({
			id: r.id,
			teamUnitId: r.teamUnitId || "",
			eventName: r.eventName,
			slotIndex: r.slotIndex,
			studentName: r.studentName,
			userId: r.userId,
		})),
		assignments: assignmentsRaw.map((a) => ({
			id: a.id,
			teamId: a.teamId,
			title: a.title,
			description: a.description,
			dueDate: a.dueDate,
			createdBy: a.createdBy,
			createdAt: a.createdAt,
			updatedAt: a.updatedAt,
		})),
	};
}
