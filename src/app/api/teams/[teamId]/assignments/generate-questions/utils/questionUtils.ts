export interface QuestionCandidate {
	id?: string;
	question?: string;
	question_text?: string;
	questionText?: string;
	question_type?: string;
	questionType?: string;
	correct_answer?: string | number | (string | number)[];
	correctAnswer?: string | number | (string | number)[];
	options?: unknown[];
	answers?: unknown[];
	difficulty?: number | string | null;
	subtopic?: string;
	subtopics?: string[];
	imageData?: string;
	images?: unknown;
	[key: string]: unknown;
}

export function isQuestionCandidate(
	value: unknown,
): value is QuestionCandidate {
	return typeof value === "object" && value !== null;
}

export function sanitizeQuestionArray(value: unknown): QuestionCandidate[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter(isQuestionCandidate);
}
