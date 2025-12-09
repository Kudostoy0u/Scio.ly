import { dbPg } from "@/lib/db";
import {
	newTeamGroups,
	newTeamMemberships,
	newTeamUnits,
} from "@/lib/db/schema/teams";
import { UUIDSchema, validateRequest } from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import {
	handleError,
	handleForbiddenError,
	handleNotFoundError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/teams/errors";
import { and, eq, inArray, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/teams/[teamId]/members/promote - Promote a member to captain or co-captain
// Frontend Usage:
// - src/app/teams/components/PeopleTab.tsx (promoteMember)
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		const envError = validateEnvironment();
		if (envError) {
			return envError;
		}

		const user = await getServerUser();
		if (!user?.id) {
			return handleUnauthorizedError();
		}

		const { teamId } = await params;
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

		// Validate request body
		const PromoteMemberSchema = z.object({
			userId: UUIDSchema,
			newRole: z.enum(["captain", "co_captain"], {
				message: "Only captain or co_captain promotion is supported",
			}),
		});

		let validatedBody: z.infer<typeof PromoteMemberSchema>;
		try {
			validatedBody = validateRequest(PromoteMemberSchema, body);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleValidationError(error);
			}
			return handleError(
				error,
				"POST /api/teams/[teamId]/members/promote - validation",
			);
		}

		const { userId, newRole } = validatedBody;

		// Resolve the team group from the slug using Drizzle ORM
		const [groupResult] = await dbPg
			.select({ id: newTeamGroups.id, slug: newTeamGroups.slug })
			.from(newTeamGroups)
			.where(eq(newTeamGroups.slug, teamId))
			.limit(1);

		if (!groupResult) {
			return handleNotFoundError("Team");
		}

		const groupId = groupResult.id;

		// Get all team units for this group using Drizzle ORM
		const unitsResult = await dbPg
			.select({ id: newTeamUnits.id })
			.from(newTeamUnits)
			.where(eq(newTeamUnits.groupId, groupId));

		if (unitsResult.length === 0) {
			return handleNotFoundError("No team units found");
		}

		const teamUnitIds = unitsResult.map((row) => row.id);

		// Check if the requesting user is a captain of this team group using Drizzle ORM
		const captainCheck = await dbPg
			.select({ role: newTeamMemberships.role })
			.from(newTeamMemberships)
			.where(
				and(
					inArray(newTeamMemberships.teamId, teamUnitIds),
					eq(newTeamMemberships.userId, user.id),
					eq(newTeamMemberships.role, "captain"),
				),
			)
			.limit(1);

		if (captainCheck.length === 0) {
			return handleForbiddenError("Only team captains can promote members");
		}

		// Check if the user to be promoted is a member of this team using Drizzle ORM
		const memberCheck = await dbPg
			.select({ id: newTeamMemberships.id, role: newTeamMemberships.role })
			.from(newTeamMemberships)
			.where(
				and(
					inArray(newTeamMemberships.teamId, teamUnitIds),
					eq(newTeamMemberships.userId, userId),
				),
			)
			.limit(1);

		if (memberCheck.length === 0) {
			return handleNotFoundError("User is not a member of this team");
		}

		const memberRole = memberCheck[0]?.role;
		if (memberRole === newRole) {
			return handleValidationError(
				new z.ZodError([
					{
						code: z.ZodIssueCode.custom,
						message: `User is already a ${newRole}`,
						path: ["newRole"],
					},
				]),
			);
		}

		// Promote the user to the new role in all team units they're a member of using Drizzle ORM
		const promoteResult = await dbPg
			.update(newTeamMemberships)
			.set({ role: newRole })
			.where(
				and(
					inArray(newTeamMemberships.teamId, teamUnitIds),
					eq(newTeamMemberships.userId, userId),
					ne(newTeamMemberships.role, newRole),
				),
			)
			.returning({ id: newTeamMemberships.id });

		if (promoteResult.length === 0) {
			return handleError(
				new Error("Failed to promote user"),
				"POST /api/teams/[teamId]/members/promote - update",
			);
		}

		return NextResponse.json({
			success: true,
			message: `User promoted to ${newRole} successfully`,
		});
	} catch (error) {
		return handleError(error, "POST /api/teams/[teamId]/members/promote");
	}
}
