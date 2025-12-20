import { dbPg } from "@/lib/db";
import {
	teamAssignmentQuestions,
	teamAssignmentRoster,
	teamAssignments,
} from "@/lib/db/schema";
import { generateCodebustersQuestions } from "@/lib/server/codebusters/generation";
import { touchTeamCacheManifest } from "@/lib/server/teams/cache-manifest";
import {
	CodebustersAssignmentSchema,
	buildCodebustersOptions,
	resolveRosterMembers,
} from "@/lib/server/teams/codebusters-assignments";
import { getServerUser } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logging/logger";
import {
	handleError,
	handleForbiddenError,
	handleNotFoundError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/teams/errors";
import {
	getUserTeamMemberships,
	resolveTeamSlugToUnits,
} from "@/lib/utils/teams/resolver";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string; subteamId: string }> },
) {
	const envError = validateEnvironment();
	if (envError) return envError;

	try {
		const user = await getServerUser();
		if (!user?.id) return handleUnauthorizedError();

		const { teamId, subteamId } = await params;

		logger.info(
			"[POST /api/teams/[teamId]/subteams/[subteamId]/assignments/codebusters] Request received",
			{
				userId: user.id,
				userEmail: user.email,
				teamId,
				subteamId,
			},
		);

		const teamInfo = await resolveTeamSlugToUnits(teamId);

		logger.info(
			"[POST /api/teams/[teamId]/subteams/[subteamId]/assignments/codebusters] Team resolved",
			{
				teamId: teamInfo.teamId,
				subteamIds: teamInfo.subteamIds,
				requestedSubteamId: subteamId,
				subteamExists: teamInfo.subteamIds.includes(subteamId),
			},
		);

		if (!teamInfo.subteamIds.includes(subteamId)) {
			logger.warn(
				"[POST /api/teams/[teamId]/subteams/[subteamId]/assignments/codebusters] Subteam not found",
				{
					teamId,
					subteamId,
					availableSubteamIds: teamInfo.subteamIds,
				},
			);
			return handleNotFoundError("Subteam");
		}

		const memberships = await getUserTeamMemberships(user.id, [
			teamInfo.teamId,
			...teamInfo.subteamIds,
		]);

		logger.info(
			"[POST /api/teams/[teamId]/subteams/[subteamId]/assignments/codebusters] Memberships retrieved",
			{
				userId: user.id,
				memberships: memberships.map((m) => ({
					team_id: m.team_id,
					role: m.role,
				})),
				membershipCount: memberships.length,
			},
		);

		const isCaptain = memberships.some(
			(m) => m.role === "captain" || m.role === "admin",
		);
		logger.info(
			"[POST /api/teams/[teamId]/subteams/[subteamId]/assignments/codebusters] Captain check",
			{
				userId: user.id,
				isCaptain,
				relevantMemberships: memberships
					.filter((m) => m.role === "captain" || m.role === "admin")
					.map((m) => ({
						team_id: m.team_id,
						role: m.role,
					})),
			},
		);

		if (!isCaptain) {
			logger.warn(
				"[POST /api/teams/[teamId]/subteams/[subteamId]/assignments/codebusters] 403 Forbidden - User is not a captain",
				{
					userId: user.id,
					userEmail: user.email,
					teamId,
					subteamId,
					memberships: memberships.map((m) => ({
						team_id: m.team_id,
						role: m.role,
					})),
				},
			);
			return handleForbiddenError("Only captains can create assignments");
		}

		const body = await request.json();
		const parsed = CodebustersAssignmentSchema.parse(body);

		const eventName = parsed.event_name || "Codebusters";
		const preGeneratedQuestions = parsed.codebusters_questions;
		const generatedQuestions =
			preGeneratedQuestions && preGeneratedQuestions.length > 0
				? preGeneratedQuestions
				: await generateCodebustersQuestions({
						questionCount: parsed.codebusters_params.questionCount,
						cipherTypes: parsed.codebusters_params.cipherTypes,
						division: parsed.codebusters_params.division,
						charLengthMin: parsed.codebusters_params.charLengthMin,
						charLengthMax: parsed.codebusters_params.charLengthMax,
					});

		const [assignment] = await dbPg
			.insert(teamAssignments)
			.values({
				teamId: teamInfo.teamId,
				subteamId,
				title: parsed.title,
				description: parsed.description || null,
				dueDate: parsed.due_date || null,
				createdBy: user.id,
				status: "active",
				assignmentType: "standard",
				points: parsed.points || 0,
				isRequired: false,
				maxAttempts: 1,
				timeLimitMinutes: parsed.time_limit_minutes || null,
				eventName,
			})
			.returning();

		if (!assignment) {
			return NextResponse.json(
				{ error: "Failed to create assignment" },
				{ status: 500 },
			);
		}

		if (generatedQuestions.length > 0) {
			await dbPg.insert(teamAssignmentQuestions).values(
				generatedQuestions.map((quote, index) => {
					const quoteCharLength = quote.charLength ?? quote.quote.length;
					const storedQuote = {
						...quote,
						charLength: quoteCharLength,
						key: quote.key ?? undefined,
					};
					return {
						assignmentId: assignment.id,
						questionText: quote.quote,
						questionType: "codebusters",
						options: buildCodebustersOptions(storedQuote),
						correctAnswer: null,
						points: Math.round(quote.points || 10),
						orderIndex: index,
						imageData: null,
						difficulty:
							typeof quote.difficulty === "number"
								? quote.difficulty.toString()
								: null,
					};
				}),
			);
		}

		const rosterMembers = await resolveRosterMembers(
			teamInfo.teamId,
			subteamId,
			eventName,
			parsed.roster_members,
		);
		if (rosterMembers.length > 0) {
			await dbPg.insert(teamAssignmentRoster).values(
				rosterMembers.map((member) => ({
					assignmentId: assignment.id,
					userId: member.userId,
					subteamId,
					displayName: member.displayName,
					studentName: member.studentName,
					status: "assigned",
				})),
			);
		}

		await touchTeamCacheManifest(teamInfo.teamId, {
			assignments: true,
			full: true,
		});

		logger.info(
			"[POST /api/teams/[teamId]/subteams/[subteamId]/assignments/codebusters] Assignment created successfully",
			{
				userId: user.id,
				teamId,
				subteamId,
				assignmentId: assignment.id,
				assignmentTitle: assignment.title,
				questionCount: generatedQuestions.length,
				rosterMemberCount: rosterMembers.length,
			},
		);

		return NextResponse.json({ assignment });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return handleValidationError(error);
		}
		return handleError(
			error,
			"POST /api/teams/[teamId]/subteams/[subteamId]/assignments/codebusters",
		);
	}
}
