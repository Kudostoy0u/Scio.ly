import type { Question } from "@/app/utils/geminiService";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeQuestionsFull } from "./normalize";

// Mock the dependencies
vi.mock("../../utils/normalizeTestText", () => ({
	normalizeQuestionText: (text: string) => text.trim(),
	normalizeTestText: (text: string) => text.trim(),
}));

vi.mock("../../utils/questionMedia", () => ({
	normalizeQuestionMedia: (questions: unknown[]) => questions,
}));

describe("normalizeQuestionsFull", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Suppress console.error for tests
		vi.spyOn(console, "error").mockImplementation(() => {
			// Intentionally suppress console errors in tests
		});
	});

	describe("Answer Field Preservation", () => {
		it("should preserve numeric answers for MCQ questions", () => {
			const questions = [
				{
					question: "What is 2+2?",
					options: ["3", "4", "5", "6"],
					answers: [1], // Index 1 = '4'
					difficulty: 1,
				},
			];

			const result = normalizeQuestionsFull(questions as Question[]);

			expect(result).toHaveLength(1);
			expect(result[0]?.answers).toEqual([1]);
			expect(result[0]?.answers).toBeInstanceOf(Array);
		});

		it("should preserve multiple numeric answers for multi-select MCQ", () => {
			const questions = [
				{
					question: "Select all prime numbers",
					options: ["1", "2", "3", "4"],
					answers: [1, 2], // Indices 1 and 2 = '2' and '3'
					difficulty: 2,
				},
			];

			const result = normalizeQuestionsFull(questions as Question[]);

			expect(result).toHaveLength(1);
			expect(result[0]?.answers).toEqual([1, 2]);
		});

		it("should preserve string answers for FRQ questions", () => {
			const questions = [
				{
					question: "What is the capital of France?",
					answers: ["Paris"],
					difficulty: 1,
				},
			];

			const result = normalizeQuestionsFull(questions as Question[]);

			expect(result).toHaveLength(1);
			expect(result[0]?.answers).toEqual(["Paris"]);
		});

		it("should preserve answers exactly as-is without modification", () => {
			const questions = [
				{
					question: "Test question",
					options: ["A", "B", "C"],
					answers: [0],
					difficulty: 1,
				},
			];

			const result = normalizeQuestionsFull(questions as Question[]);

			// Answers should be the exact same reference
			expect(result[0]?.answers).toEqual([0]);
			expect(typeof result[0]?.answers?.[0]).toBe("number");
		});
	});

	describe("Missing Answers Validation", () => {
		it("should log error for questions with undefined answers", () => {
			const consoleErrorSpy = vi.spyOn(console, "error");

			const questions = [
				{
					question: "Invalid question",
					options: ["A", "B"],
					answers: undefined as unknown as (string | number)[],
					difficulty: 1,
				},
			] as Question[];

			normalizeQuestionsFull(questions);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Question 1 missing valid answers field"),
				expect.any(Object),
			);
		});

		it("should log error for questions with empty answers array", () => {
			const consoleErrorSpy = vi.spyOn(console, "error");

			const questions = [
				{
					question: "Invalid question",
					options: ["A", "B"],
					answers: [],
					difficulty: 1,
				},
			];

			normalizeQuestionsFull(questions);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Question 1 missing valid answers field"),
				expect.any(Object),
			);
		});

		it("should log error for questions with null answers", () => {
			const consoleErrorSpy = vi.spyOn(console, "error");

			const questions = [
				{
					question: "Invalid question",
					options: ["A", "B"],
					answers: null as unknown as (string | number)[],
					difficulty: 1,
				},
			] as Question[];

			normalizeQuestionsFull(questions);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Question 1 missing valid answers field"),
				expect.any(Object),
			);
		});
	});

	describe("Text Normalization", () => {
		it("should normalize question text while preserving answers", () => {
			const questions = [
				{
					question: "  What is 2+2?  ",
					options: ["3", "4"],
					answers: [1],
					difficulty: 1,
				},
			];

			const result = normalizeQuestionsFull(questions as Question[]);

			expect(result[0]?.question).toBe("What is 2+2?");
			expect(result[0]?.answers).toEqual([1]);
		});

		it("should normalize option text while preserving answers", () => {
			const questions = [
				{
					question: "Test",
					options: ["  Option A  ", "  Option B  "],
					answers: [0],
					difficulty: 1,
				},
			];

			const result = normalizeQuestionsFull(questions as Question[]);

			expect(result[0]?.options).toEqual(["Option A", "Option B"]);
			expect(result[0]?.answers).toEqual([0]);
		});
	});

	describe("Edge Cases", () => {
		it("should handle non-array input gracefully", () => {
			const consoleErrorSpy = vi.spyOn(console, "error");

			// Intentionally passing invalid input to test error handling
			const result = normalizeQuestionsFull(null as unknown as Question[]);

			expect(result).toEqual([]);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("normalizeQuestionsFull received non-array"),
				null,
			);
		});

		it("should handle empty array", () => {
			const result = normalizeQuestionsFull([]);

			expect(result).toEqual([]);
		});

		it("should process multiple questions correctly", () => {
			const questions = [
				{
					question: "Q1",
					options: ["A", "B"],
					answers: [0],
					difficulty: 1,
				},
				{
					question: "Q2",
					options: ["C", "D"],
					answers: [1],
					difficulty: 2,
				},
				{
					question: "Q3",
					answers: ["Free response answer"],
					difficulty: 3,
				},
			];

			const result = normalizeQuestionsFull(questions as Question[]);

			expect(result).toHaveLength(3);
			expect(result[0]?.answers).toEqual([0]);
			expect(result[1]?.answers).toEqual([1]);
			expect(result[2]?.answers).toEqual(["Free response answer"]);
		});

		it("should preserve question fields other than text and options", () => {
			const questions = [
				{
					id: "test-id",
					question: "Test",
					options: ["A", "B"],
					answers: [0],
					difficulty: 0.5,
					division: "C",
					event: "Astronomy",
					subtopics: ["Stars"],
					imageData: "/image.png",
				},
			];

			const result = normalizeQuestionsFull(questions as Question[]);

			expect(result[0]?.id).toBe("test-id");
			expect(result[0]?.difficulty).toBe(0.5);
			expect(result[0]?.division).toBe("C");
			expect(result[0]?.event).toBe("Astronomy");
			expect(result[0]?.subtopics).toEqual(["Stars"]);
			expect(result[0]?.imageData).toBe("/image.png");
			expect(result[0]?.answers).toEqual([0]);
		});
	});

	describe("Assignment Questions", () => {
		it("should preserve answers for assignment questions with numeric indices", () => {
			const assignmentQuestions = [
				{
					id: "assignment-q-1",
					question: "Designer Genes MCQ",
					options: ["Metaphase I", "Metaphase II", "Anaphase I", "Anaphase II"],
					answers: [3], // Numeric index, not letter
					difficulty: 3,
					division: "C",
					event: "Designer Genes",
				},
			];

			const result = normalizeQuestionsFull(assignmentQuestions);

			expect(result[0]?.answers).toEqual([3]);
			expect(result[0]?.answers?.[0]).toBe(3);
			expect(typeof result[0]?.answers?.[0]).toBe("number");
		});

		it("should handle complex assignment question structure", () => {
			const questions = [
				{
					id: "23c5d7dd-be75-4db3-a690-773004e34493",
					question:
						"Centromeres of sister chromatids uncouple and separate during which phase?",
					options: ["Metaphase I", "Metaphase II", "Anaphase I", "Anaphase II"],
					answers: [3],
					difficulty: 0.4,
					division: "C",
					event: "Designer Genes",
					subtopics: ["Meiosis", "Cell Division"],
					tournament: "Yosemite Invitational 2021",
				},
			];

			const result = normalizeQuestionsFull(questions as Question[]);

			expect(result).toHaveLength(1);
			expect(result[0]?.answers).toEqual([3]);
			expect(result[0]?.question).toBe(
				"Centromeres of sister chromatids uncouple and separate during which phase?",
			);
			expect(result[0]?.options).toEqual([
				"Metaphase I",
				"Metaphase II",
				"Anaphase I",
				"Anaphase II",
			]);
		});
	});
});
