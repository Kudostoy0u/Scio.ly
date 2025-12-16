import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
	teamsInvitation,
	teamsMembership,
	teamsTeam,
} from "@/lib/db/schema/teams_v2";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { and, eq, or, sql } from "drizzle-orm";

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
	hasPendingLinkInvite: boolean;
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

export function generateJoinCode(length = 8) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let result = "";
	for (let i = 0; i < length; i += 1) {
		result += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return result;
}

export function slugifySchool(school: string) {
	const base = school
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return base || `team-${crypto.randomUUID().slice(0, 8)}`;
}

export async function getMembershipForUser(teamId: string, userId: string) {
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

export async function assertTeamAccess(teamSlug: string, userId: string) {
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

export async function assertCaptainAccess(teamSlug: string, userId: string) {
	const { team, membership } = await assertTeamAccess(teamSlug, userId);
	if ((membership.role as string) !== "captain") {
		throw new Error("Only captains can perform this action");
	}
	return { team, membership };
}

export async function ensureSupabaseLink(user: SupabaseUser | null) {
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
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
		.onConflictDoNothing();

	await dbPg
		.update(users)
		.set({
			email: user.email ?? sql`COALESCE(${users.email}, '')`,
			username: supabaseUsername ?? users.username,
			supabaseUserId: user.id,
			supabaseUsername,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(users.id, user.id));

	return supabaseUsername;
}

export function buildInviteMatchFilters(
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

export async function bumpTeamVersion(teamId: string) {
	await dbPg
		.update(teamsTeam)
		.set({
			updatedAt: sql`now()`,
			version: sql`${teamsTeam.version} + 1`,
		})
		.where(eq(teamsTeam.id, teamId));
}
