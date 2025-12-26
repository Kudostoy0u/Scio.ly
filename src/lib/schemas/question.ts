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

// Type exports

/**
 * Validates an array of questions with strict error handling
 * @param data - The array of question data to validate
 * @returns The validated questions array
 * @throws Error if any question validation fails
 */
