import { beforeEach, describe, expect, it, vi } from "vitest";

// Types for test helper functions
interface TestQuestion {
	question?: string;
	question_text?: string;
	options?: string[];
	answers?: (number | string)[] | null;
	correct_answer?: string | number;
}

interface FormattedQuestion {
	question_text: string;
	question_type: "multiple_choice" | "free_response";
	options?: string[];
	answers: (number | string)[];
	points: number;
	order_index: number;
	imageData: null;
}

// Mock the database client
vi.mock("@/lib/db", () => ({
	client: {
		unsafe: vi.fn(),
	},
}));

// Mock the buildAbsoluteUrl function
vi.mock("@/lib/utils/url", () => ({
	buildAbsoluteUrl: vi.fn((url: string) => url || null),
}));

describe("Assignment Question Generation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Question Format Validation", () => {
		it("should throw error when question has no answers field", () => {
			const invalidQuestion = {
				question: "Which color has the highest frequency?",
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				// Missing answers field - this should cause an error
			};

			expect(() => {
				validateQuestionFormat(invalidQuestion);
			}).toThrow("Question missing required answers field");
		});

		it("should throw error when question has empty answers array", () => {
			const invalidQuestion = {
				question: "Which color has the highest frequency?",
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				answers: [], // Empty answers array
			};

			expect(() => {
				validateQuestionFormat(invalidQuestion);
			}).toThrow("Question has empty answers array");
		});

		it("should throw error when question has null answers", () => {
			const invalidQuestion = {
				question: "Which color has the highest frequency?",
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				answers: null,
			};

			expect(() => {
				validateQuestionFormat(invalidQuestion);
			}).toThrow("Question has null answers");
		});

		it("should pass validation for valid question with numeric answers", () => {
			const validQuestion = {
				question: "Which color has the highest frequency?",
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				answers: [5], // Violet is correct (index 5)
			};

			expect(() => {
				validateQuestionFormat(validQuestion);
			}).not.toThrow();
		});

		it("should pass validation for valid question with string answers", () => {
			const validQuestion = {
				question: "Which color has the highest frequency?",
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				answers: ["5"], // String representation of index
			};

			expect(() => {
				validateQuestionFormat(validQuestion);
			}).not.toThrow();
		});
	});

	describe("Answer Extraction Logic", () => {
		it("should extract correct answers from answers array", () => {
			const question = {
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				answers: [5], // Violet is correct
			};

			const correctIndices = extractCorrectAnswerIndices(question);
			expect(correctIndices).toEqual([5]);
		});

		it("should extract correct answers from string answers", () => {
			const question = {
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				answers: ["5"], // String representation
			};

			const correctIndices = extractCorrectAnswerIndices(question);
			expect(correctIndices).toEqual([5]);
		});

		it("should extract correct answers from correct_answer field (letter format)", () => {
			const question = {
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				correct_answer: "F", // F = index 5 (Violet)
			};

			const correctIndices = extractCorrectAnswerIndices(question);
			expect(correctIndices).toEqual([5]);
		});

		it("should extract correct answers from correct_answer field (numeric format)", () => {
			const question = {
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				correct_answer: 5,
			};

			const correctIndices = extractCorrectAnswerIndices(question);
			expect(correctIndices).toEqual([5]);
		});

		it("should throw error when no correct answers can be extracted", () => {
			const question = {
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				// No answers or correct_answer field
			};

			expect(() => {
				extractCorrectAnswerIndices(question);
			}).toThrow("No correct answers found for question");
		});

		it("should throw error when correct_answer is invalid letter", () => {
			const question = {
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				correct_answer: "Z", // Invalid letter (beyond available options)
			};

			expect(() => {
				extractCorrectAnswerIndices(question);
			}).toThrow("Invalid correct_answer letter: Z");
		});
	});

	describe("Question Formatting", () => {
		it("should format question with proper answers field", () => {
			const originalQuestion = {
				question: "Which color has the highest frequency?",
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				answers: [5],
			};

			const formattedQuestion = formatAssignmentQuestion(originalQuestion, 0);

			expect(formattedQuestion).toEqual({
				question_text: "Which color has the highest frequency?",
				question_type: "multiple_choice",
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				answers: [5], // This should be present and correct
				points: 1,
				order_index: 0,
				imageData: null,
			});
		});

		it("should throw error if formatted question lacks answers field", () => {
			const originalQuestion = {
				question: "Which color has the highest frequency?",
				options: ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"],
				// Missing answers
			};

			expect(() => {
				formatAssignmentQuestion(originalQuestion, 0);
			}).toThrow("No correct answers found for question");
		});
	});
});

// Helper functions for testing (these would be extracted from the actual route)
function validateQuestionFormat(question: TestQuestion): void {
	if (question.answers === null) {
		throw new Error("Question has null answers");
	}

	if (question.answers === undefined) {
		throw new Error("Question missing required answers field");
	}

	if (Array.isArray(question.answers) && question.answers.length === 0) {
		throw new Error("Question has empty answers array");
	}
}

function extractCorrectAnswerIndices(question: TestQuestion): number[] {
	let correctAnswerIndices: number[] = [];

	if (Array.isArray(question.answers) && question.answers.length > 0) {
		// Standard format: answers array with numeric indices
		correctAnswerIndices = question.answers.map((a) =>
			typeof a === "number" ? a : Number.parseInt(String(a)),
		);
	} else if (
		question.correct_answer !== null &&
		question.correct_answer !== undefined
	) {
		// Fallback: if correct_answer exists, try to extract from it
		if (typeof question.correct_answer === "string") {
			// If it's a letter like "A", convert to index
			const letter = question.correct_answer.trim().toUpperCase();
			const index = letter.charCodeAt(0) - 65; // A=0, B=1, etc.
			if (question.options && index >= 0 && index < question.options.length) {
				correctAnswerIndices = [index];
			} else {
				throw new Error(`Invalid correct_answer letter: ${letter}`);
			}
		} else if (typeof question.correct_answer === "number") {
			correctAnswerIndices = [question.correct_answer];
		}
	}

	if (correctAnswerIndices.length === 0) {
		throw new Error("No correct answers found for question");
	}

	return correctAnswerIndices;
}

function formatAssignmentQuestion(
	originalQuestion: TestQuestion,
	index: number,
): FormattedQuestion {
	const isMcq =
		originalQuestion.options &&
		Array.isArray(originalQuestion.options) &&
		originalQuestion.options.length > 0;

	const correctAnswerIndices = extractCorrectAnswerIndices(originalQuestion);

	const formattedQuestion: FormattedQuestion = {
		question_text: originalQuestion.question || originalQuestion.question_text || "",
		question_type: isMcq ? "multiple_choice" : "free_response",
		options: isMcq ? originalQuestion.options : undefined,
		answers: isMcq
			? correctAnswerIndices
			: Array.isArray(originalQuestion.answers)
				? originalQuestion.answers
				: [originalQuestion.correct_answer || ""],
		points: 1,
		order_index: index,
		imageData: null,
	};

	// Validate the formatted question
	if (
		isMcq &&
		(!formattedQuestion.answers || formattedQuestion.answers.length === 0)
	) {
		throw new Error("Formatted question missing answers field");
	}

	return formattedQuestion;
}
