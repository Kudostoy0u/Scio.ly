import { EVENTS_2026 } from "@/lib/constants/events2026";
import { getEventSubtopics as getEventSubtopicsFromModule } from "@/lib/constants/subtopics";
import { getEventCapabilities } from "@/lib/utils/assessments/eventConfig";
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

	const requestBody: Record<string, unknown> = {
		event_name: eventName,
		question_count: questionCount,
		question_types:
			questionType === "both"
				? ["multiple_choice", "free_response"]
				: [questionType === "mcq" ? "multiple_choice" : "free_response"],
		id_percentage: idPercentageValue,
		pure_id_only: pureIdOnly,
		difficulties: difficulties,
	};

	if (division && division !== "any") {
		requestBody.division = division;
	}

	if (subtopics && subtopics.length > 0) {
		requestBody.subtopics = subtopics;
	}

	if (rmTypeFilter) {
		requestBody.rm_type_filter = rmTypeFilter;
	}

	const response = await fetch(
		`/api/teams/${teamId}/assignments/generate-questions`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		},
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`Failed to generate questions: ${response.status} ${errorText}`,
		);
	}

	const data = await response.json();
	return data.questions || [];
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
		roster_members: string[];
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

	const url = subteamId
		? `/api/teams/${teamId}/subteams/${subteamId}/assignments`
		: `/api/teams/${teamId}/assignments`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(assignmentData),
	});

	if (!response.ok) {
		throw new Error("Failed to create assignment");
	}

	return await response.json();
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
		roster_members: string[];
		codebusters_params?: {
			questionCount: number;
			cipherTypes: string[];
			division: "B" | "C" | "any";
			charLengthMin: number;
			charLengthMax: number;
		};
	},
) => {
	const url = subteamId
		? `/api/teams/${teamId}/subteams/${subteamId}/assignments/codebusters`
		: `/api/teams/${teamId}/assignments/codebusters`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(assignmentData),
	});

	if (!response.ok) {
		throw new Error("Failed to create Codebusters assignment");
	}

	return await response.json();
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
