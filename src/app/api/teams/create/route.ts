import { upsertUserProfile } from "@/lib/db/teams/utils";
import { cockroachDBTeamsService } from "@/lib/services/cockroachdb-teams";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logging/logger";
import { type NextRequest, NextResponse } from "next/server";

// Helper function to derive display name from user profile
function deriveDisplayName(
	currentDisplay: string | undefined,
	firstName: string | undefined,
	lastName: string | undefined,
	username: string | undefined,
	emailLocal: string | undefined,
): string | undefined {
	if (currentDisplay?.trim()) {
		return undefined;
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
	if (username?.trim()) {
		return username.trim();
	}
	if (emailLocal?.trim()) {
		return emailLocal.trim();
	}
	return undefined;
}

// Helper function to ensure user has display name before creating team
async function ensureDisplayName(
	userId: string,
	userEmail: string | undefined,
): Promise<void> {
	try {
		const supabase = await createSupabaseServerClient();
		const { data: existingProfile } = await supabase
			.from("users")
			.select("id, email, display_name, first_name, last_name, username")
			.eq("id", userId)
			.maybeSingle();

		const email: string | undefined =
			(existingProfile as { email?: string } | null)?.email ||
			userEmail ||
			undefined;
		const currentDisplay = (existingProfile as { display_name?: string } | null)
			?.display_name;
		const firstName = (existingProfile as { first_name?: string } | null)
			?.first_name;
		const lastName = (existingProfile as { last_name?: string } | null)
			?.last_name;
		const username = (existingProfile as { username?: string } | null)
			?.username;

		const emailLocal = email?.includes("@") ? email.split("@")[0] : undefined;
		const derivedDisplayName = deriveDisplayName(
			currentDisplay,
			firstName,
			lastName,
			username,
			emailLocal,
		);

		if (derivedDisplayName && email) {
			logger.dev.structured(
				"info",
				"Auto-filling display_name before team creation",
				{
					userId,
					derivedDisplayName,
				},
			);
			if (!email) {
				throw new Error("Email is required");
			}
			const fallbackUsername = username?.trim() || emailLocal || userId;
			await upsertUserProfile({
				id: userId,
				email,
				displayName: derivedDisplayName,
				username: fallbackUsername,
			});
		}
	} catch (e) {
		logger.warn("Failed to auto-fill display_name before team creation", e);
	}
}

// Helper function to validate request body
function validateCreateTeamBody(
	body: unknown,
): { school: string; division: string } | NextResponse {
	if (typeof body !== "object" || body === null) {
		return NextResponse.json(
			{ error: "Request body must be an object" },
			{ status: 400 },
		);
	}

	const { school, division } = body as { school?: unknown; division?: unknown };

	if (!(school && division)) {
		return NextResponse.json(
			{ error: "School and division are required" },
			{ status: 400 },
		);
	}

	if (typeof school !== "string" || typeof division !== "string") {
		return NextResponse.json(
			{ error: "School and division must be strings" },
			{ status: 400 },
		);
	}

	if (!["B", "C"].includes(division)) {
		return NextResponse.json(
			{ error: "Division must be B or C" },
			{ status: 400 },
		);
	}

	return { school, division };
}

// POST /api/teams/create - Create a new team
// Frontend Usage:
// - src/app/teams/components/TeamsPageClient.tsx (createTeam)

// Type for user profile data
interface UserProfile {
	id: string;
	email: string;
	display_name: string | null;
	first_name: string | null;
	last_name: string | null;
	username: string | null;
}

// Helper function to get real user data from Supabase
async function getUserProfile(userId: string): Promise<UserProfile | null> {
	try {
		const supabase = await createSupabaseServerClient();
		const { data, error } = await supabase
			.from("users")
			.select("id, email, display_name, first_name, last_name, username")
			.eq("id", userId)
			.single();

		if (error || !data) {
			return null;
		}

		return data as UserProfile;
	} catch (_error) {
		return null;
	}
}

export async function POST(request: NextRequest) {
	try {
		// Check if CockroachDB is properly configured
		if (!process.env.DATABASE_URL) {
			return NextResponse.json(
				{
					error: "Database configuration error",
					details: "DATABASE_URL environment variable is missing",
				},
				{ status: 500 },
			);
		}

		// Get user from Supabase auth
		const { getServerUser } = await import("@/lib/supabaseServer");
		const user = await getServerUser();

		if (!user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const userId = user.id;

		// Handle empty request body
		let body: unknown;
		try {
			const text = await request.text();
			if (!text || text.trim() === "") {
				return NextResponse.json(
					{ error: "Request body is required" },
					{ status: 400 },
				);
			}
			body = JSON.parse(text);
		} catch (_error) {
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 },
			);
		}

		// Validate request body
		const validationResult = validateCreateTeamBody(body);
		if (validationResult instanceof NextResponse) {
			return validationResult;
		}
		const { school, division } = validationResult;

		// Generate unique slug with timestamp to prevent collisions
		const baseSlug = `${school.toLowerCase().replace(/\s+/g, "-")}-${division.toLowerCase()}`;
		const timestamp = Date.now().toString(36);
		const slug = `${baseSlug}-${timestamp}`;

		// Before team creation, ensure the creator has a meaningful display_name
		await ensureDisplayName(userId, user.email);

		// Create team group using CockroachDB
		const group = await cockroachDBTeamsService.createTeamGroup({
			school,
			division,
			slug,
			createdBy: userId,
		});

		// Create default team unit using CockroachDB
		const team = await cockroachDBTeamsService.createTeamUnit({
			groupId: group.id,
			teamId: "A",
			captainCode: `CAP${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
			userCode: `USR${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
			description: "Team A",
			createdBy: userId,
		});

		// Add creator as captain using CockroachDB
		await cockroachDBTeamsService.createTeamMembership({
			userId,
			teamId: team.id,
			role: "captain",
			status: "active",
		});

		// Get team members for response
		const members = await cockroachDBTeamsService.getTeamMembers(team.id);

		const response = {
			id: team.id,
			name: team.name,
			slug: group.slug,
			school: group.school,
			division: group.division,
			description: team.description,
			captain_code: team.captain_code,
			user_code: team.user_code,
			members: await Promise.all(
				members.map(async (m) => {
					const userProfile = await getUserProfile(m.user_id);
					return {
						id: m.user_id,
						name:
							userProfile?.display_name ||
							(userProfile?.first_name && userProfile?.last_name
								? `${userProfile.first_name} ${userProfile.last_name}`
								: `User ${m.user_id.substring(0, 8)}`),
						email:
							userProfile?.email ||
							`user-${m.user_id.substring(0, 8)}@example.com`,
						role: m.role,
					};
				}),
			),
			// Add flag to indicate if team was reactivated (for cache clearing)
			wasReactivated: team.created_at !== team.updated_at,
		};

		return NextResponse.json(response);
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
