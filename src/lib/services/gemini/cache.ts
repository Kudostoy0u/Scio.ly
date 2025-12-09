import { createHash } from "node:crypto";

import { dbPg, geminiExplanationsCache } from "@/lib/db";
import logger from "@/lib/utils/logging/logger";
import { and, eq, sql } from "drizzle-orm";

/**
 * Generate a unique hash for a question based on its content
 * Used when question doesn't have an ID
 */
export function generateQuestionHash(
	question: Record<string, unknown>,
	event: string,
): string {
	const hash = createHash("sha256");

	// Hash the key components of the question
	const questionText = String(question.question || "");
	const options = JSON.stringify(question.options || []);
	const answers = JSON.stringify(question.answers || []);

	// Include event in hash since explanations may vary by event
	const content = `${questionText}|${options}|${answers}|${event}`;

	hash.update(content);
	return hash.digest("hex");
}

/**
 * Get a cached explanation for a question
 */
export async function getCachedExplanation(
	question: Record<string, unknown>,
	event: string,
	userAnswer?: string,
): Promise<string | null> {
	try {
		const questionId = question.id as string | undefined;
		const questionHash = questionId
			? null
			: generateQuestionHash(question, event);

		// Build the query based on available identifiers
		const conditions = [];

		if (questionId) {
			conditions.push(eq(geminiExplanationsCache.questionId, questionId));
		} else if (questionHash) {
			conditions.push(eq(geminiExplanationsCache.questionHash, questionHash));
		} else {
			logger.warn("No valid identifier for cache lookup");
			return null;
		}

		conditions.push(eq(geminiExplanationsCache.event, event));

		// Include user answer in cache key if provided
		if (userAnswer) {
			conditions.push(eq(geminiExplanationsCache.userAnswer, userAnswer));
		} else {
			// Match null user answers
			conditions.push(sql`${geminiExplanationsCache.userAnswer} IS NULL`);
		}

		const result = await dbPg
			.select({
				id: geminiExplanationsCache.id,
				explanation: geminiExplanationsCache.explanation,
				hitCount: geminiExplanationsCache.hitCount,
			})
			.from(geminiExplanationsCache)
			.where(and(...conditions))
			.limit(1);

		if (result.length > 0 && result[0]) {
			const cached = result[0];
			logger.info(`Cache hit for question (hit count: ${cached.hitCount})`);

			// Update hit count asynchronously
			void updateHitCount(cached.id);

			return cached.explanation;
		}

		logger.info("Cache miss for question");
		return null;
	} catch (error) {
		logger.error("Error reading from cache:", error);
		// Don't fail the request if cache read fails
		return null;
	}
}

/**
 * Store an explanation in the cache
 */
export async function cacheExplanation(
	question: Record<string, unknown>,
	event: string,
	explanation: string,
	userAnswer?: string,
): Promise<void> {
	try {
		const questionId = question.id as string | undefined;
		const questionHash = questionId
			? null
			: generateQuestionHash(question, event);

		await dbPg.insert(geminiExplanationsCache).values({
			questionId: questionId || null,
			questionHash: questionHash,
			event,
			userAnswer: userAnswer || null,
			explanation,
			hitCount: 1,
		});

		logger.info("Explanation cached successfully");
	} catch (error) {
		logger.error("Error caching explanation:", error);
		// Don't fail the request if cache write fails
	}
}

/**
 * Update hit count for a cached explanation
 */
async function updateHitCount(cacheId: string): Promise<void> {
	try {
		await dbPg
			.update(geminiExplanationsCache)
			.set({
				hitCount: sql`${geminiExplanationsCache.hitCount} + 1`,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(geminiExplanationsCache.id, cacheId));
	} catch (error) {
		logger.error("Error updating cache hit count:", error);
	}
}
