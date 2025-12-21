import { EVENTS_2026 } from "@/lib/constants/events2026";
import { getEventSubtopics as getEventSubtopicsFromModule } from "@/lib/constants/subtopics";
import { getEventCapabilities } from "@/lib/utils/assessments/eventConfig";
import { getTRPCProxyClient } from "@/lib/trpc/client";
import type { Question, RosterMember } from "./assignmentTypes";

export const getAvailableEvents = (): string[] => {
	return EVENTS_2026.map((event) => event.name);
};

// Re-export getEventSubtopics from the constants module for backwards compatibility
export const getEventSubtopics = async (
	eventName: string,
): Promise<string[]> => {
	// Use the synchronous function from the constants module
	return getEventSubtopicsFromModule(eventName);
};

export const getEventCapabilitiesForEvent = (eventName: string) => {
	return getEventCapabilities(eventName);
};

export const generateQuestions = async (
	eventName: string,
	questionCount: number,
	questionType: "mcq" | "both" | "frq",
	idPercentage: number,
	pureIdOnly: boolean,
	teamId: string,
	difficulties: string[] = ["any"],
	division?: "B" | "C" | "any",
	subtopics?: string[],
	rmTypeFilter?: "rock" | "mineral",
): Promise<Question[]> => {
	// Convert raw ID question count to percentage
	const idPercentageValue =
		questionCount > 0 ? Math.round((idPercentage / questionCount) * 100) : 0;

	const trpc = getTRPCProxyClient();
	const result = await trpc.teams.generateQuestions.mutate({
		teamSlug: teamId,
		event_name: eventName,
		question_count: questionCount,
		question_types:
			questionType === "both"
				? ["multiple_choice", "free_response"]
				: [questionType === "mcq" ? "multiple_choice" : "free_response"],
		id_percentage: idPercentageValue,
		pure_id_only: pureIdOnly,
		difficulties: difficulties,
		division: division && division !== "any" ? division : undefined,
		subtopics: subtopics && subtopics.length > 0 ? subtopics : undefined,
		rm_type_filter: rmTypeFilter,
	});

	return result.questions.map((q, index) => ({
		question_text: q.question_text,
		question_type: q.question_type as "multiple_choice" | "free_response" | "codebusters",
		options: Array.isArray(q.options)
			? q.options.map((opt, i) => ({
					id: String(i),
					text: opt,
					isCorrect: false,
				}))
			: undefined,
		answers: q.answers || [],
		order_index: index,
		difficulty: q.difficulty || 0.5,
		imageData: q.imageData || undefined,
	}));
};

/**
 * @deprecated Use tRPC cache via useTeamFull hook instead
 * This function made legacy fetch calls that resulted in 403 errors.
 * Use the cached team data from useTeamFull hook in components.
 *
 * Example:
 * ```tsx
 * const { data: teamData } = useTeamFull(teamSlug);
 * // Transform teamData.members and teamData.rosterEntries into RosterMember[]
 * ```
 */
export const fetchRosterMembers = async (
	_teamId: string,
	_subteamId?: string,
): Promise<RosterMember[]> => {
	throw new Error(
		"fetchRosterMembers is deprecated. Use useTeamFull hook from @/lib/hooks/useTeam instead.",
	);
};

export const createAssignment = async (
	teamId: string,
	subteamId: string | undefined,
	assignmentData: {
		title: string;
		description: string;
		assignment_type?: string;
		due_date: string;
		points: number;
		time_limit_minutes: number;
		event_name: string;
		questions: Question[];
		roster_members: Array<
			| string
			| {
					user_id?: string;
					student_name?: string;
					display_name?: string;
			  }
		>;
		codebusters_params?: {
			questionCount: number;
			cipherTypes: string[];
			division: "B" | "C" | "any";
			charLengthMin: number;
			charLengthMax: number;
		};
	},
) => {
	// Check if this is a Codebusters assignment
	if (assignmentData.event_name === "Codebusters") {
		return createCodebustersAssignment(teamId, subteamId, {
			...assignmentData,
			points: assignmentData.points || 100,
		});
	}

	const trpc = getTRPCProxyClient();
	const rosterMembers = assignmentData.roster_members.map((member) => {
		if (typeof member === "string") {
			return {
				studentName: member,
				displayName: member,
			};
		}
		return {
			studentName: member.student_name || member.display_name || "",
			displayName: member.display_name || member.student_name || "",
			userId: member.user_id || null,
		};
	});

	const questions = assignmentData.questions.map((q) => ({
		questionText: q.question_text,
		questionType: q.question_type,
		options: Array.isArray(q.options)
			? q.options.map((opt) =>
					typeof opt === "string" ? opt : opt.text,
				)
			: undefined,
		correctAnswer: Array.isArray(q.answers)
			? q.answers[0]?.toString()
			: q.correct_answer || undefined,
		points: 1,
		imageData: q.imageData || null,
		difficulty: q.difficulty,
	}));

	return await trpc.teams.createAssignment.mutate({
		teamSlug: teamId,
		title: assignmentData.title,
		description: assignmentData.description,
		dueDate: assignmentData.due_date,
		points: assignmentData.points,
		timeLimitMinutes: assignmentData.time_limit_minutes,
		eventName: assignmentData.event_name,
		subteamId: subteamId || null,
		questions,
		rosterMembers,
	});
};

export const createCodebustersAssignment = async (
	teamId: string,
	subteamId: string | undefined,
	assignmentData: {
		title: string;
		description: string;
		assignment_type?: string;
		due_date: string;
		points: number;
		time_limit_minutes: number;
		event_name: string;
		questions: Question[];
		roster_members: Array<
			| string
			| {
					user_id?: string;
					student_name?: string;
					display_name?: string;
			  }
		>;
		codebusters_params?: {
			questionCount: number;
			cipherTypes: string[];
			division: "B" | "C" | "any";
			charLengthMin: number;
			charLengthMax: number;
		};
	},
) => {
	if (!assignmentData.codebusters_params) {
		throw new Error("codebusters_params is required for Codebusters assignments");
	}

	const trpc = getTRPCProxyClient();
	const rosterMembers = assignmentData.roster_members.map((member) => {
		if (typeof member === "string") {
			return {
				studentName: member,
				displayName: member,
			};
		}
		return {
			studentName: member.student_name || member.display_name || "",
			displayName: member.display_name || member.student_name || "",
			userId: member.user_id || null,
		};
	});

	return await trpc.teams.createCodebustersAssignment.mutate({
		teamSlug: teamId,
		subteamId: subteamId || null,
		title: assignmentData.title,
		description: assignmentData.description,
		due_date: assignmentData.due_date,
		points: assignmentData.points,
		time_limit_minutes: assignmentData.time_limit_minutes,
		event_name: assignmentData.event_name || "Codebusters",
		roster_members: rosterMembers,
		codebusters_params: assignmentData.codebusters_params,
		codebusters_questions: assignmentData.questions.length > 0
			? assignmentData.questions.map((q) => ({
					author: q.author || "",
					quote: q.question_text,
					cipherType: q.cipherType || "",
					encrypted: "",
					...q,
				}))
			: undefined,
	});
};

export const validateAssignmentDetails = (details: {
	title: string;
	eventName: string;
}): string | null => {
	if (!details.title.trim()) {
		return "Title is required to proceed";
	}
	if (!details.eventName.trim()) {
		return "Event selection is required to proceed";
	}
	return null;
};

export const validateQuestionGeneration = (settings: {
	questionCount: number;
	questionType: string;
}): string | null => {
	if (settings.questionCount < 1 || settings.questionCount > 50) {
		return "Question count must be between 1 and 50";
	}
	return null;
};

export const validateRosterSelection = (
	selectedRoster: string[],
): string | null => {
	if (selectedRoster.length === 0) {
		return "Please select at least one roster member";
	}
	return null;
};
