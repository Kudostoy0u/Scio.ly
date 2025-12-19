import { dbPg } from "@/lib/db";
import { teamInvitations, teamMemberships } from "@/lib/db/schema";
import { validateRequest } from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import {
	handleError,
	handleForbiddenError,
	handleNotFoundError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/teams/errors";
import { resolveTeamSlugToUnits } from "@/lib/utils/teams/resolver";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/teams/[teamId]/invite/cancel - Cancel team invitation
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
		const CancelInviteSchema = z.object({
			invitationCode: z.string().min(1, "Invitation code is required"),
		});

		let validatedBody: z.infer<typeof CancelInviteSchema>;
		try {
			validatedBody = validateRequest(CancelInviteSchema, body);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleValidationError(error);
			}
			return handleError(
				error,
				"POST /api/teams/[teamId]/invite/cancel - validation",
			);
		}

		const { invitationCode } = validatedBody;

		// Resolve team slug to team unit IDs
		let teamUnitIds: string[];
		try {
			const teamInfo = await resolveTeamSlugToUnits(teamId);
			teamUnitIds = teamInfo.subteamIds;
		} catch {
			return handleNotFoundError("Team");
		}

		// Check if user is captain or co-captain in any of the team units using Drizzle ORM
		const membershipResult = await dbPg
			.select({
				id: teamMemberships.id,
				role: teamMemberships.role,
				teamId: teamMemberships.teamId,
			})
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.userId, user.id),
					inArray(teamMemberships.teamId, teamUnitIds),
					eq(teamMemberships.status, "active"),
				),
			);

		if (membershipResult.length === 0) {
			return handleForbiddenError("Not a team member");
		}

		// Check if user has captain or co-captain role in any team unit
		const hasCaptainRole = membershipResult.some(
			(membership) => membership.role === "captain",
		);

		if (!hasCaptainRole) {
			return handleForbiddenError("Only captains can cancel invitations");
		}

		// Find and cancel the invitation using Drizzle ORM
		const [invitationResult] = await dbPg
			.select({ id: teamInvitations.id, email: teamInvitations.email })
			.from(teamInvitations)
			.where(
				and(
					eq(teamInvitations.invitationCode, invitationCode),
					inArray(teamInvitations.teamId, teamUnitIds),
					eq(teamInvitations.status, "pending"),
				),
			)
			.limit(1);

		if (!invitationResult) {
			return handleNotFoundError("Invitation not found or already processed");
		}

		// Update invitation status to cancelled using Drizzle ORM
		await dbPg
			.update(teamInvitations)
			.set({
				status: "declined",
				acceptedAt: new Date().toISOString(),
			})
			.where(eq(teamInvitations.id, invitationResult.id));

		return NextResponse.json({
			message: "Invitation cancelled successfully",
			email: invitationResult.email ?? "",
		});
	} catch (error) {
		return handleError(error, "POST /api/teams/[teamId]/invite/cancel");
	}
}
