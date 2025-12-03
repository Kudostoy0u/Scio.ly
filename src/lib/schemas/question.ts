import { parseDifficulty } from "@/lib/types/difficulty";
import { z } from "zod";

/**
 * Strict Zod schemas for question validation
 * Ensures all question data is properly typed and validated
 */

// Difficulty schema with strict validation
export const DifficultySchema = z
	.union([z.number(), z.string()])
	.transform((value) => {
		try {
			return parseDifficulty(value);
		} catch (error) {
			throw new z.ZodError([
				{
					code: z.ZodIssueCode.custom,
					message:
						error instanceof Error ? error.message : "Invalid difficulty value",
					path: ["difficulty"],
				},
			]);
		}
	})
	.refine((value) => value >= 0 && value <= 1, {
		message: "Difficulty must be between 0 and 1",
	});

// Base question schema
export const BaseQuestionSchema = z.object({
	id: z.string().uuid().optional(),
	question: z.string().min(1, "Question text is required"),
	type: z.enum(["mcq", "frq", "codebusters"]),
	answers: z
		.array(z.union([z.number(), z.string()]))
		.min(1, "At least one answer is required"),
	difficulty: DifficultySchema,
	points: z.number().int().positive().default(1),
	order: z.number().int().nonnegative().optional(),
	imageData: z.string().nullable().optional(),
});

// MCQ question schema
export const MCQQuestionSchema = BaseQuestionSchema.extend({
	type: z.literal("mcq"),
	options: z
		.array(z.string())
		.min(2, "MCQ questions must have at least 2 options"),
	answers: z
		.array(z.number().int().nonnegative())
		.min(1, "MCQ must have at least one answer"),
});

// FRQ question schema
export const FRQQuestionSchema = BaseQuestionSchema.extend({
	type: z.literal("frq"),
	options: z.array(z.string()).optional(),
	answers: z.array(z.string()).min(1, "FRQ must have at least one answer"),
});

// Codebusters question schema
export const CodebustersQuestionSchema = BaseQuestionSchema.extend({
	type: z.literal("codebusters"),
	author: z.string().optional(),
	quote: z.string().optional(),
	cipherType: z.string().optional(),
	division: z.string().optional(),
	charLength: z.number().int().positive().optional(),
	encrypted: z.string().optional(),
	key: z.string().optional(),
	hint: z.string().optional(),
	solution: z.string().optional(),
});

// Union schema for all question types
export const QuestionSchema = z.discriminatedUnion("type", [
	MCQQuestionSchema,
	FRQQuestionSchema,
	CodebustersQuestionSchema,
]);

// Frontend question schema (for API responses)
export const FrontendQuestionSchema = z.object({
	id: z.string().optional(),
	question: z.string().min(1, "Question text is required"),
	type: z.enum(["mcq", "frq", "codebusters"]),
	options: z.array(z.string()).optional(),
	answers: z
		.array(z.union([z.number(), z.string()]))
		.min(1, "At least one answer is required"),
	points: z.union([z.number(), z.string()]).transform((val) => {
		if (typeof val === "string") {
			const parsed = Number.parseInt(val, 10);
			if (Number.isNaN(parsed)) {
				throw new Error(`Invalid points value: "${val}". Must be a number.`);
			}
			return parsed;
		}
		return val;
	}),
	order: z.union([z.number(), z.string()]).transform((val) => {
		if (typeof val === "string") {
			const parsed = Number.parseInt(val, 10);
			if (Number.isNaN(parsed)) {
				throw new Error(`Invalid order value: "${val}". Must be a number.`);
			}
			return parsed;
		}
		return val;
	}),
	imageData: z.string().nullable().optional(),
	difficulty: DifficultySchema,
});

// Assignment question schema (for database operations)
export const AssignmentQuestionSchema = z.object({
	question_text: z.string().min(1, "Question text is required"),
	question_type: z.enum(["multiple_choice", "free_response", "codebusters"]),
	options: z.array(z.string()).optional(),
	answers: z
		.array(z.union([z.number(), z.string()]))
		.min(1, "At least one answer is required"),
	points: z.number().int().positive().default(1),
	order_index: z.number().int().nonnegative(),
	imageData: z.string().nullable().optional(),
	difficulty: DifficultySchema,
});

// Question generation request schema
export const QuestionGenerationRequestSchema = z.object({
	event_name: z.string().min(1, "Event name is required"),
	question_count: z.number().int().positive().max(50).default(10),
	question_types: z.array(z.enum(["multiple_choice", "free_response"])).min(1),
	subtopics: z.array(z.string()).default([]),
	time_limit_minutes: z.number().int().positive().default(30),
	division: z.enum(["B", "C", "both"]).default("both"),
	id_percentage: z.number().int().nonnegative().default(0),
	pure_id_only: z.boolean().default(false),
	difficulties: z
		.array(z.enum(["easy", "medium", "hard", "any"]))
		.min(1, "At least one difficulty level is required"),
});

// Type exports
export type BaseQuestion = z.infer<typeof BaseQuestionSchema>;
export type MCQQuestion = z.infer<typeof MCQQuestionSchema>;
export type FRQQuestion = z.infer<typeof FRQQuestionSchema>;
export type CodebustersQuestion = z.infer<typeof CodebustersQuestionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type AssignmentQuestion = z.infer<typeof AssignmentQuestionSchema>;
export type QuestionGenerationRequest = z.infer<
	typeof QuestionGenerationRequestSchema
>;

/**
 * Validates a question object with strict error handling
 * @param data - The question data to validate
 * @returns The validated question
 * @throws ZodError if validation fails
 */
export function validateQuestion(data: unknown): Question {
	try {
		return QuestionSchema.parse(data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorMessages = error.issues?.map(
				(err) => `${err.path.join(".")}: ${err.message}`,
			) || ["Unknown validation error"];
			throw new Error(
				`Question validation failed:\n${errorMessages.join("\n")}`,
			);
		}
		throw error;
	}
}

/**
 * Validates an array of questions with strict error handling
 * @param data - The array of question data to validate
 * @returns The validated questions array
 * @throws Error if any question validation fails
 */
export function validateQuestions(data: unknown[]): Question[] {
	const validatedQuestions: Question[] = [];

	for (let i = 0; i < data.length; i++) {
		try {
			const validatedQuestion = validateQuestion(data[i]);
			validatedQuestions.push(validatedQuestion);
		} catch (error) {
			throw new Error(
				`Question ${i + 1} validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	return validatedQuestions;
}
