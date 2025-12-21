export interface Question {
	question_text: string;
	question_type: "multiple_choice" | "free_response" | "codebusters";
	author?: string;
	options?: Array<{ id: string; text: string; isCorrect: boolean }>;
	correct_answer?: string;
	answers?: (string | number)[] | string;
	order_index: number;
	imageData?: string;
	difficulty?: number;
	cipherType?: string;
}

export interface RosterMember {
	student_name: string;
	user_id?: string;
	subteam_id?: string;
	subteam_name?: string | null;
	isLinked: boolean;
	userEmail?: string;
	username?: string;
	roster_entry_id?: string; // For unique identification of roster entries
}

export interface AssignmentCreatorProps {
	teamId: string;
	subteamId?: string;
	onAssignmentCreated: (assignment: { id: string; title: string }) => void;
	onCancel: () => void;
	darkMode?: boolean;
	prefillEventName?: string;
}

export interface AssignmentDetails {
	title: string;
	description: string;
	dueDate: string;
	points: number;
	timeLimitMinutes: number;
	eventName: string;
}

export interface QuestionGenerationSettings {
	questionCount: number;
	questionType: "mcq" | "both" | "frq";
	idPercentage: number;
	pureIdOnly: boolean;
	// Difficulty settings
	difficulties: string[];
	// Codebusters-specific settings
	cipherTypes?: string[];
	division?: "B" | "C" | "any";
	charLengthMin?: number;
	charLengthMax?: number;
	// Subtopics
	subtopics?: string[];
	// Rocks and Minerals filter
	rmTypeFilter?: "rock" | "mineral";
}

export interface AssignmentStepProps {
	darkMode: boolean;
	onNext: () => void;
	onBack: () => void;
	onError: (error: string) => void;
}

export interface AssignmentDetailsStepProps extends AssignmentStepProps {
	details: AssignmentDetails;
	onDetailsChange: (details: Partial<AssignmentDetails>) => void;
	availableEvents: string[];
}

export interface QuestionGenerationStepProps extends AssignmentStepProps {
	settings: QuestionGenerationSettings;
	onSettingsChange: (settings: Partial<QuestionGenerationSettings>) => void;
	supportsPictureQuestions: boolean;
	supportsIdentificationOnly: boolean;
	onGenerateQuestions: () => Promise<void>;
	generatingQuestions: boolean;
	eventName?: string; // For loading subtopics and determining if Rocks and Minerals
}

export interface QuestionPreviewStepProps {
	onNext: () => void;
	onBack: () => void;
	onError: (error: string) => void;
	questions: Question[];
	showAnswers: boolean;
	onShowAnswersChange: (show: boolean) => void;
	onReplaceQuestion: (index: number) => void;
}

export interface RosterSelectionStepProps extends AssignmentStepProps {
	rosterMembers: RosterMember[];
	selectedRoster: string[];
	onRosterChange: (selected: string[]) => void;
	loadingRoster: boolean;
	onCreateAssignment: () => Promise<void>;
	creating: boolean;
}
