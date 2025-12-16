import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
	teamsAssignment,
	teamsLinkInvitation,
	teamsMembership,
	teamsRoster,
	teamsSubteam,
} from "@/lib/db/schema/teams_v2";
import { and, desc, eq } from "drizzle-orm";
import {
	type TeamFullData,
	type TeamMember,
	type TeamMeta,
	assertTeamAccess,
} from "./shared";

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
		updatedAt: team.updatedAt
			? String(team.updatedAt)
			: new Date().toISOString(),
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

	const [membershipRows, rosterRows, assignmentRows, pendingLinkInvites] =
		await Promise.all([
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
			dbPg
				.select({
					displayName: teamsLinkInvitation.rosterDisplayName,
				})
				.from(teamsLinkInvitation)
				.where(
					and(
						eq(teamsLinkInvitation.teamId, team.id),
						eq(teamsLinkInvitation.status, "pending"),
					),
				),
		]);

	const pendingLinkInviteNames = new Set(
		pendingLinkInvites.map((i) => i.displayName.toLowerCase()),
	);

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
			joinedAt: m.joinedAt ? String(m.joinedAt) : null,
			isPendingInvitation: m.status === "pending",
			hasPendingLinkInvite: pendingLinkInviteNames.has(
				displayName.toLowerCase(),
			),
		};
	});

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
			hasPendingLinkInvite: pendingLinkInviteNames.has(
				row.displayName.toLowerCase(),
			),
		});
	}

	return {
		meta: {
			teamId: team.id,
			slug: team.slug,
			name: team.name,
			school: team.school,
			division: team.division,
			updatedAt: team.updatedAt
				? String(team.updatedAt)
				: new Date().toISOString(),
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
			createdAt: s.createdAt ? String(s.createdAt) : new Date().toISOString(),
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
			dueDate: a.dueDate ? String(a.dueDate) : null,
			status: a.status,
			createdBy: a.createdBy,
			createdAt: a.createdAt ? String(a.createdAt) : new Date().toISOString(),
			updatedAt: a.updatedAt ? String(a.updatedAt) : new Date().toISOString(),
		})),
	};
}
