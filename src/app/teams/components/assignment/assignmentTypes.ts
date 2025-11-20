export interface Question {
  question_text: string;
  question_type: "multiple_choice" | "free_response" | "codebusters";
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  correct_answer?: string;
  answers?: (string | number)[] | string;
  order_index: number;
  imageData?: string;
  difficulty?: number;
}

export interface RosterMember {
  student_name: string;
  user_id?: string;
  subteam_id?: string;
  isLinked: boolean;
  userEmail?: string;
  username?: string;
}

export interface AssignmentCreatorProps {
  teamId: string;
  subteamId?: string;
  onAssignmentCreated: (assignment: any) => void;
  onCancel: () => void;
  darkMode?: boolean;
  prefillEventName?: string;
}

export interface AssignmentDetails {
  title: string;
  description: string;
  assignmentType: "homework" | "project" | "study" | "other";
  dueDate: string;
  timeLimitMinutes: number;
  eventName: string;
}

export interface QuestionGenerationSettings {
  questionCount: number;
  questionType: "mcq" | "both" | "frq";
  selectedSubtopics: string[];
  idPercentage: number;
  pureIdOnly: boolean;
  // Difficulty settings
  difficulties: string[];
  // Codebusters-specific settings
  cipherTypes?: string[];
  division?: "B" | "C" | "any";
  charLengthMin?: number;
  charLengthMax?: number;
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
  prefillEventName?: string;
  availableEvents: string[];
}

export interface QuestionGenerationStepProps extends AssignmentStepProps {
  settings: QuestionGenerationSettings;
  onSettingsChange: (settings: Partial<QuestionGenerationSettings>) => void;
  availableSubtopics: string[];
  supportsPictureQuestions: boolean;
  supportsIdentificationOnly: boolean;
  onGenerateQuestions: () => Promise<void>;
  generatingQuestions: boolean;
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
