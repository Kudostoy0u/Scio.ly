import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
	newTeamGroups,
	newTeamMemberships,
	newTeamRecurringMeetings,
	newTeamUnits,
} from "@/lib/db/schema/teams";
import { UUIDSchema, validateRequest } from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import {
	ERROR_CODES,
	HTTP_STATUS,
	createErrorResponse,
	handleError,
	handleForbiddenError,
	handleNotFoundError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/error-handler";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Utility function to safely parse JSON with fallback
function safeJsonParse<T = unknown>(
	jsonString: string | null | unknown,
	fallback: T = [] as T,
): T {
	if (!jsonString) {
		return fallback;
	}

	// If it's already an array or object, return it as-is
	if (
		Array.isArray(jsonString) ||
		(typeof jsonString === "object" && jsonString !== null)
	) {
		return jsonString as T;
	}

	// Handle empty array string case
	if (jsonString === "[]") {
		return [] as T;
	}

	try {
		return JSON.parse(String(jsonString)) as T;
	} catch (_error) {
		return fallback;
	}
}

// Validation schema for recurring meeting creation
const RecurringMeetingCreateSchema = z.object({
	team_slug: z.string().min(1, "Team slug is required"),
	title: z.string().min(1, "Title is required").max(200),
	description: z.string().max(5000).nullable().optional(),
	location: z.string().max(200).nullable().optional(),
	days_of_week: z
		.array(z.number().int().min(0).max(6))
		.min(1, "At least one day of week is required"),
	start_time: z.string().nullable().optional(),
	end_time: z.string().nullable().optional(),
	start_date: z.string().datetime("Start date is required"),
	end_date: z.string().datetime().nullable().optional(),
	exceptions: z.array(z.unknown()).nullable().optional(),
	created_by: UUIDSchema.optional(),
	meeting_type: z.enum(["personal", "team"]).default("personal").optional(),
	selected_team_id: z.string().nullable().optional(),
});

// Helper function to determine target team slug based on meeting type
async function determineTargetTeamSlug(
	teamSlug: string,
	meetingType: string,
	selectedTeamId: string | null | undefined,
): Promise<string> {
	let targetTeamSlug = teamSlug;
	if (meetingType === "team" && selectedTeamId) {
		if (selectedTeamId.startsWith("all-")) {
			const schoolName = selectedTeamId.replace("all-", "");
			const teamGroupResult = await dbPg
				.select({ slug: newTeamGroups.slug })
				.from(newTeamGroups)
				.where(eq(newTeamGroups.school, schoolName))
				.limit(1);

			if (teamGroupResult.length > 0 && teamGroupResult[0]) {
				targetTeamSlug = teamGroupResult[0].slug;
			}
		} else {
			const selectedTeamResult = await dbPg
				.select({ slug: newTeamGroups.slug })
				.from(newTeamGroups)
				.innerJoin(newTeamUnits, eq(newTeamGroups.id, newTeamUnits.groupId))
				.where(eq(newTeamUnits.id, selectedTeamId))
				.limit(1);

			if (selectedTeamResult.length > 0 && selectedTeamResult[0]) {
				targetTeamSlug = selectedTeamResult[0].slug;
			}
		}
	}
	return targetTeamSlug;
}

// Helper function to resolve team group and units
async function resolveTeamGroupAndUnits(targetTeamSlug: string) {
	const [groupResult] = await dbPg
		.select({ id: newTeamGroups.id })
		.from(newTeamGroups)
		.where(eq(newTeamGroups.slug, targetTeamSlug))
		.limit(1);

	if (!groupResult) {
		return null;
	}

	const groupId = groupResult.id;
	const unitsResult = await dbPg
		.select({ id: newTeamUnits.id })
		.from(newTeamUnits)
		.where(eq(newTeamUnits.groupId, groupId));

	return { groupId, unitsResult };
}

// Helper function to check team membership
async function checkTeamMembership(
	userId: string,
	teamUnitIds: string[],
	meetingType: string,
	selectedTeamId: string | null | undefined,
) {
	const membershipResult = await dbPg
		.select({
			role: newTeamMemberships.role,
			teamId: newTeamMemberships.teamId,
		})
		.from(newTeamMemberships)
		.where(
			and(
				eq(newTeamMemberships.userId, userId),
				inArray(newTeamMemberships.teamId, teamUnitIds),
				eq(newTeamMemberships.status, "active"),
			),
		);

	if (membershipResult.length === 0 && meetingType !== "personal") {
		if (
			meetingType === "team" &&
			selectedTeamId &&
			selectedTeamId.startsWith("all-")
		) {
			const schoolName = selectedTeamId.replace("all-", "");
			const schoolMembershipResult = await dbPg
				.select({
					role: newTeamMemberships.role,
					teamId: newTeamMemberships.teamId,
				})
				.from(newTeamMemberships)
				.innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
				.innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
				.where(
					and(
						eq(newTeamMemberships.userId, userId),
						eq(newTeamGroups.school, schoolName),
						eq(newTeamMemberships.status, "active"),
					),
				);

			if (schoolMembershipResult.length === 0) {
				return null;
			}
			membershipResult.push(...schoolMembershipResult);
		} else {
			return null;
		}
	}

	return membershipResult;
}

// Helper function to get target team IDs for personal meetings
function getPersonalMeetingTeamIds(
	membershipResult: Array<{ role: string; teamId: string }>,
	unitsResult: Array<{ id: string }>,
): string[] {
	if (membershipResult.length > 0) {
		const firstMembership = membershipResult[0];
		if (firstMembership?.teamId) {
			return [firstMembership.teamId];
		}
	}
	const firstUnit = unitsResult[0];
	if (firstUnit?.id) {
		return [firstUnit.id];
	}
	return [];
}

// Helper function to get target team IDs for team meetings
function getTeamMeetingTeamIds(
	selectedTeamId: string,
	membershipResult: Array<{ role: string; teamId: string }>,
): string[] {
	if (selectedTeamId.startsWith("all-")) {
		return membershipResult.map((m) => m.teamId);
	}
	const selectedTeamUnit = membershipResult.find(
		(m) => m.teamId === selectedTeamId,
	);
	if (selectedTeamUnit) {
		return [selectedTeamUnit.teamId];
	}
	return [];
}

// Helper function to determine target team IDs
function determineTargetTeamIds(
	meetingType: string,
	selectedTeamId: string | null | undefined,
	membershipResult: Array<{ role: string; teamId: string }>,
	unitsResult: Array<{ id: string }>,
): string[] {
	if (meetingType === "personal") {
		return getPersonalMeetingTeamIds(membershipResult, unitsResult);
	}
	if (meetingType === "team" && selectedTeamId) {
		return getTeamMeetingTeamIds(selectedTeamId, membershipResult);
	}
	return [];
}

// Helper function to create recurring meetings
async function createRecurringMeetings(
	targetTeamIds: string[],
	validatedBody: z.infer<typeof RecurringMeetingCreateSchema>,
	userId: string,
): Promise<string[]> {
	const {
		title,
		description,
		location,
		days_of_week,
		start_time,
		end_time,
		start_date,
		end_date,
		exceptions,
		created_by,
	} = validatedBody;
	const meetingIds: string[] = [];
	for (const teamId of targetTeamIds) {
		const [result] = await dbPg
			.insert(newTeamRecurringMeetings)
			.values({
				teamId,
				createdBy: created_by || userId,
				title,
				description: description || null,
				location: location || null,
				daysOfWeek: days_of_week,
				startTime: start_time || "00:00:00",
				endTime: end_time || "23:59:59",
				startDate: start_date ? new Date(start_date).toISOString() : null,
				endDate: end_date ? new Date(end_date).toISOString() : null,
				exceptions: exceptions || [],
			})
			.returning({ id: newTeamRecurringMeetings.id });

		if (result?.id) {
			meetingIds.push(result.id);
		}
	}
	return meetingIds;
}

// Helper function to validate request and get user
async function validateRequestAndGetUser(request: NextRequest): Promise<
	| {
			user: { id: string };
			validatedBody: z.infer<typeof RecurringMeetingCreateSchema>;
	  }
	| NextResponse
> {
	const envError = validateEnvironment();
	if (envError) {
		return envError;
	}

	const user = await getServerUser();
	if (!user?.id) {
		return handleUnauthorizedError();
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch (_error) {
		return handleValidationError(
			new z.ZodError([
				{
					code: z.ZodIssueCode.custom,
					message: "Invalid JSON in request body",
					path: [],
				},
			]),
		);
	}

	let validatedBody: z.infer<typeof RecurringMeetingCreateSchema>;
	try {
		validatedBody = validateRequest(RecurringMeetingCreateSchema, body);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return handleValidationError(error);
		}
		return handleError(
			error,
			"POST /api/teams/calendar/recurring-meetings - validation",
		);
	}

	return { user, validatedBody };
}

// Helper function to resolve team and validate membership
async function resolveTeamAndValidateMembership(
	teamSlug: string,
	meetingType: string,
	selectedTeamId: string | null | undefined,
	userId: string,
): Promise<
	| {
			unitsResult: Array<{ id: string }>;
			membershipResult: Array<{ role: string; teamId: string }>;
	  }
	| NextResponse
> {
	const targetTeamSlug = await determineTargetTeamSlug(
		teamSlug,
		meetingType,
		selectedTeamId,
	);
	const teamGroupAndUnits = await resolveTeamGroupAndUnits(targetTeamSlug);
	if (!teamGroupAndUnits) {
		return handleNotFoundError("Team");
	}

	const { unitsResult } = teamGroupAndUnits;
	if (unitsResult.length === 0) {
		return handleNotFoundError("No team units found for this group");
	}

	const teamUnitIds = unitsResult.map((row) => row.id);
	const membershipResult = await checkTeamMembership(
		userId,
		teamUnitIds,
		meetingType,
		selectedTeamId,
	);

	if (!membershipResult) {
		return handleForbiddenError("Not a team member");
	}

	const isMember = membershipResult.some((m) =>
		["member", "captain", "co_captain"].includes(m.role),
	);

	if (!isMember && meetingType === "team") {
		return handleForbiddenError("Not a team member");
	}

	return { unitsResult, membershipResult };
}

export async function POST(request: NextRequest) {
	try {
		const validationResult = await validateRequestAndGetUser(request);
		if (validationResult instanceof NextResponse) {
			return validationResult;
		}

		const { user, validatedBody } = validationResult;
		const {
			team_slug,
			meeting_type = "personal",
			selected_team_id,
		} = validatedBody;

		const teamResult = await resolveTeamAndValidateMembership(
			team_slug,
			meeting_type,
			selected_team_id,
			user.id,
		);
		if (teamResult instanceof NextResponse) {
			return teamResult;
		}

		const { unitsResult, membershipResult } = teamResult;

		// Determine which team units to create recurring meetings for
		const targetTeamIds = determineTargetTeamIds(
			meeting_type,
			selected_team_id,
			membershipResult,
			unitsResult,
		);

		// Create recurring meetings for all target teams
		const meetingIds = await createRecurringMeetings(
			targetTeamIds,
			validatedBody,
			user.id,
		);

		// Note: We no longer create individual events here to avoid duplicates.
		// The frontend will generate events from the recurring meeting pattern.
		// This prevents the "ghost event" issue where both recurring meetings
		// and individual events were being displayed simultaneously.

		return NextResponse.json({
			success: true,
			meetingIds: meetingIds,
			count: meetingIds.length,
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		if (errorMessage.toLowerCase().includes("database")) {
			return createErrorResponse(
				"Database error",
				HTTP_STATUS.INTERNAL_SERVER_ERROR,
				errorMessage,
				ERROR_CODES.DATABASE_ERROR,
			);
		}
		return handleError(
			error,
			"POST /api/teams/calendar/recurring-meetings",
			"Failed to create recurring meeting",
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const envError = validateEnvironment();
		if (envError) {
			return envError;
		}

		const user = await getServerUser();
		if (!user?.id) {
			return handleUnauthorizedError();
		}

		const { searchParams } = new URL(request.url);
		const teamSlug = searchParams.get("teamSlug");

		if (!teamSlug) {
			return handleValidationError(
				new z.ZodError([
					{
						code: z.ZodIssueCode.custom,
						message: "Team slug is required",
						path: ["teamSlug"],
					},
				]),
			);
		}

		// Resolve the team slug to get the team group and units using Drizzle ORM
		const [groupResult] = await dbPg
			.select({ id: newTeamGroups.id })
			.from(newTeamGroups)
			.where(eq(newTeamGroups.slug, teamSlug))
			.limit(1);

		if (!groupResult) {
			return handleNotFoundError("Team");
		}

		const groupId = groupResult.id;

		// Get team units for this group using Drizzle ORM
		const unitsResult = await dbPg
			.select({ id: newTeamUnits.id })
			.from(newTeamUnits)
			.where(eq(newTeamUnits.groupId, groupId));

		if (unitsResult.length === 0) {
			return handleNotFoundError("No team units found for this group");
		}

		// Check if user is a member of any team unit in this group using Drizzle ORM
		const teamUnitIds = unitsResult.map((row) => row.id);
		const membershipResult = await dbPg
			.select({ role: newTeamMemberships.role })
			.from(newTeamMemberships)
			.where(
				and(
					eq(newTeamMemberships.userId, user.id),
					inArray(newTeamMemberships.teamId, teamUnitIds),
					eq(newTeamMemberships.status, "active"),
				),
			);

		if (membershipResult.length === 0) {
			return handleForbiddenError("Not a member of this team");
		}

		// Get recurring meetings for all team units in this group using Drizzle ORM
		const meetingsResult = await dbPg
			.select({
				id: newTeamRecurringMeetings.id,
				team_id: newTeamRecurringMeetings.teamId,
				created_by: newTeamRecurringMeetings.createdBy,
				title: newTeamRecurringMeetings.title,
				description: newTeamRecurringMeetings.description,
				location: newTeamRecurringMeetings.location,
				days_of_week: newTeamRecurringMeetings.daysOfWeek,
				start_time: newTeamRecurringMeetings.startTime,
				end_time: newTeamRecurringMeetings.endTime,
				start_date: newTeamRecurringMeetings.startDate,
				end_date: newTeamRecurringMeetings.endDate,
				exceptions: newTeamRecurringMeetings.exceptions,
				created_at: newTeamRecurringMeetings.createdAt,
				creator_email: users.email,
				creator_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}), ${users.email})`,
			})
			.from(newTeamRecurringMeetings)
			.leftJoin(users, eq(newTeamRecurringMeetings.createdBy, users.id))
			.where(inArray(newTeamRecurringMeetings.teamId, teamUnitIds))
			.orderBy(desc(newTeamRecurringMeetings.createdAt));

		// Parse JSON fields safely with utility function
		const meetings = meetingsResult.map((meeting) => ({
			...meeting,
			days_of_week: safeJsonParse(meeting.days_of_week, []),
			exceptions: safeJsonParse(meeting.exceptions, []),
		}));

		return NextResponse.json({
			success: true,
			meetings,
		});
	} catch (error) {
		return handleError(error, "GET /api/teams/calendar/recurring-meetings");
	}
}
