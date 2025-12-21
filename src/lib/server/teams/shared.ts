import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { teamInvitations, teamMemberships, teams } from "@/lib/db/schema";
import { upsertUserProfile } from "@/lib/db/teams/utils";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logging/logger";
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
	userRole: "admin" | "captain" | "member";
	status: string;
	memberCode: string;
	captainCode: string | null;
}

export interface TeamMember {
	id: string;
	name: string;
	email: string | null;
	role: "admin" | "captain" | "member";
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
		rosterNotes: string | null;
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

export function buildInviteMatchFilters(
	userId: string,
	userEmail?: string | null,
	_username?: string | null,
) {
	const filters: ReturnType<typeof eq>[] = [
		eq(teamInvitations.invitedUserId, userId),
	];

	// Also match by email if provided
	if (userEmail) {
		filters.push(eq(teamInvitations.email, userEmail));
		filters.push(eq(teamInvitations.invitedEmail, userEmail));
	}

	// Return combined filter: match by userId OR email
	// filters always has at least one element (invitedUserId check)
	if (filters.length > 1) {
		return or(...filters);
	}
	return filters[0] as ReturnType<typeof eq>;
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
			id: teamMemberships.id,
			role: teamMemberships.role,
			status: teamMemberships.status,
		})
		.from(teamMemberships)
		.where(
			and(
				eq(teamMemberships.teamId, teamId),
				eq(teamMemberships.userId, userId),
			),
		)
		.limit(1);

	return membership[0];
}

/**
 * Asserts that a user has access to a team (slug or ID)
 */
export async function assertTeamAccess(teamIdentifier: string, userId: string) {
	const isUuid =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			teamIdentifier,
		);

	const [team] = await dbPg
		.select()
		.from(teams)
		.where(
			isUuid ? eq(teams.id, teamIdentifier) : eq(teams.slug, teamIdentifier),
		)
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

export async function assertCaptainAccess(
	teamIdentifier: string,
	userId: string,
) {
	const { team, membership } = await assertTeamAccess(teamIdentifier, userId);
	if (
		(membership.role as string) !== "captain" &&
		(membership.role as string) !== "admin"
	) {
		throw new Error("Only captains can perform this action");
	}
	return { team, membership };
}

export async function assertAdminAccess(
	teamIdentifier: string,
	userId: string,
) {
	const { team, membership } = await assertTeamAccess(teamIdentifier, userId);
	if ((membership.role as string) !== "admin") {
		throw new Error("Only admins can perform this action");
	}
	return { team, membership };
}

// Helper function to extract names from user metadata (same logic as AuthContext)
function extractNamesFromMetadata(meta: Record<string, unknown>): {
	firstName: string | null;
	lastName: string | null;
	full: string;
	given: string;
	family: string;
} {
	const WHITESPACE_REGEX = /\s+/;
	const given = (meta.given_name || meta.givenName || "").toString().trim();
	const family = (meta.family_name || meta.familyName || "").toString().trim();
	const full = (meta.name || meta.full_name || meta.fullName || "")
		.toString()
		.trim();

	let firstName: string | null = null;
	let lastName: string | null = null;

	if (given || family) {
		firstName = given || null;
		lastName = family || null;
	} else if (full) {
		const parts = full.split(WHITESPACE_REGEX).filter(Boolean);
		if (parts.length >= 2) {
			const first = parts[0];
			firstName =
				first !== undefined && typeof first === "string" ? first : null;
			const lastNameStr = parts.slice(1).join(" ");
			if (typeof lastNameStr === "string" && lastNameStr.length > 0) {
				lastName = lastNameStr;
			} else {
				lastName = null;
			}
		} else if (parts.length === 1) {
			const first = parts[0];
			firstName =
				first !== undefined && typeof first === "string" ? first : null;
			lastName = null;
		}
	}

	return { firstName, lastName, full, given, family };
}

// Helper function to generate display name (same logic as AuthContext)
function generateDisplayName(
	existingDisplayName: string | undefined,
	full: string,
	given: string,
	firstName: string | null,
	lastName: string | null,
	email: string | null | undefined,
): string | null {
	const HEX_PATTERN_REGEX = /^[a-f0-9]{8}$/;
	if (existingDisplayName?.trim()) {
		return existingDisplayName.trim();
	}
	if (full?.trim()) {
		return full.trim();
	}
	if (given?.trim()) {
		return given.trim();
	}
	if (firstName && lastName) {
		return `${firstName.trim()} ${lastName.trim()}`;
	}
	if (firstName?.trim()) {
		return firstName.trim();
	}
	if (lastName?.trim()) {
		return lastName.trim();
	}
	if (email?.includes("@")) {
		const emailLocal = email.split("@")[0];
		if (
			emailLocal &&
			emailLocal.length > 2 &&
			!emailLocal.match(HEX_PATTERN_REGEX)
		) {
			return `@${emailLocal}`;
		}
	}
	return null;
}

// Helper function to generate username (same logic as AuthContext)
function generateUsername(
	existingUsername: string | undefined,
	email: string | null | undefined,
	userId: string,
): string {
	const HEX_PATTERN_REGEX = /^[a-f0-9]{8}$/;
	if (existingUsername?.trim()) {
		return existingUsername.trim();
	}
	if (email?.includes("@")) {
		const emailLocal = email.split("@")[0];
		if (
			emailLocal &&
			emailLocal.length > 2 &&
			!emailLocal.match(HEX_PATTERN_REGEX)
		) {
			return emailLocal;
		}
	}
	return `user_${userId.slice(0, 8)}`;
}

export async function ensureSupabaseLink(user: SupabaseUser | null) {
	if (!user?.id) return null;

	logger.dev.structured("info", "Ensuring Supabase link", { userId: user.id });

	const supabaseClient = await createSupabaseServerClient();

	// Fetch full profile from Supabase (same as profile page does)
	const { data: profile } = await supabaseClient
		.from("users")
		.select(
			"id, username, email, display_name, first_name, last_name, photo_url",
		)
		.eq("id", user.id)
		.maybeSingle();

	const profileData = profile as {
		username?: string | null;
		email?: string | null;
		display_name?: string | null;
		first_name?: string | null;
		last_name?: string | null;
		photo_url?: string | null;
	} | null;

	// Extract names from user_metadata (same logic as AuthContext)
	const meta: Record<string, unknown> = user.user_metadata || {};
	const {
		firstName: metaFirstName,
		lastName: metaLastName,
		full,
		given,
	} = extractNamesFromMetadata(meta);

	// Use profile data if available, otherwise use metadata
	const email = user.email || profileData?.email || "";
	const existingUsername = profileData?.username || undefined;
	const username = generateUsername(existingUsername, email, user.id);

	// Generate display name using same logic as AuthContext
	const displayName = generateDisplayName(
		profileData?.display_name || undefined,
		full,
		given,
		metaFirstName,
		metaLastName,
		email,
	);

	// Use firstName/lastName from profile if available, otherwise from metadata
	const firstName = profileData?.first_name || metaFirstName || null;
	const lastName = profileData?.last_name || metaLastName || null;
	const photoUrlRaw =
		profileData?.photo_url ||
		(meta.avatar_url as string | undefined) ||
		(meta.picture as string | undefined) ||
		null;
	const photoUrl: string | null =
		typeof photoUrlRaw === "string" ? photoUrlRaw : null;

	logger.dev.structured("debug", "Extracted user profile data", {
		userId: user.id,
		email,
		username,
		displayName,
		firstName,
		lastName,
		hasPhotoUrl: !!photoUrl,
	});

	// Use upsertUserProfile to sync all fields to CockroachDB (same as profile sync)
	await upsertUserProfile({
		id: user.id,
		email,
		username,
		displayName,
		firstName,
		lastName,
		photoUrl,
	});

	// Also update supabaseUserId and supabaseUsername for reference
	await dbPg
		.update(users)
		.set({
			supabaseUserId: user.id,
			supabaseUsername: username,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(users.id, user.id));

	logger.dev.structured("info", "Supabase link ensured", {
		userId: user.id,
		username,
		displayName,
	});

	return username;
}

type TeamVersionDb = Pick<typeof dbPg, "update">;

export async function bumpTeamVersion(
	teamId: string,
	db: TeamVersionDb = dbPg,
) {
	await db
		.update(teams)
		.set({
			updatedAt: sql`now()`,
			version: sql`${teams.version} + 1`,
		})
		.where(eq(teams.id, teamId));
}
