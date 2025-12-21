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
import {
	handleError,
	handleForbiddenError,
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
	{ params }: { params: Promise<{ teamId: string }> },
) {
	const envError = validateEnvironment();
	if (envError) return envError;

	try {
		const user = await getServerUser();
		if (!user?.id) return handleUnauthorizedError();

		const { teamId } = await params;
		const teamInfo = await resolveTeamSlugToUnits(teamId);
		const memberships = await getUserTeamMemberships(user.id, [
			teamInfo.teamId,
			...teamInfo.subteamIds,
		]);
		const isCaptain = memberships.some(
			(m) => m.role === "captain" || m.role === "admin",
		);
		if (!isCaptain) {
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
				subteamId: null,
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
			null,
			eventName,
			parsed.roster_members,
		);
		if (rosterMembers.length > 0) {
			await dbPg.insert(teamAssignmentRoster).values(
				rosterMembers.map((member) => ({
					assignmentId: assignment.id,
					userId: member.userId,
					subteamId: null,
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

		return NextResponse.json({ assignment });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return handleValidationError(error);
		}
		return handleError(
			error,
			"POST /api/teams/[teamId]/assignments/codebusters",
		);
	}
}
