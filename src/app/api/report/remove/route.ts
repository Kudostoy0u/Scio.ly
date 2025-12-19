import {
	ApiErrors,
	handleApiError,
	successResponse,
	validateFields,
} from "@/lib/api/utils";
import { db } from "@/lib/db";
import { questions as questionsTable } from "@/lib/db/schema";
import { blacklists as blacklistsTable } from "@/lib/db/schema";
import { geminiService } from "@/lib/services/gemini";
import type { ApiResponse } from "@/lib/types/api";
import logger from "@/lib/utils/logging/logger";
import { type SQL, and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const maxDuration = 60;

export interface RemoveRequest extends Record<string, unknown> {
	question: Record<string, unknown>;
	event: string;
}

export async function POST(request: NextRequest) {
	const startTime = Date.now();

	try {
		// Enhanced request logging for developer mode
		logger.dev.request(
			"POST",
			"/api/report/remove",
			undefined,
			Object.fromEntries(request.headers.entries()),
		);

		const body = await request.json();
		const validation = validateFields<RemoveRequest>(body, [
			"question",
			"event",
		]);

		if (!validation.valid) {
			logger.dev.structured("warn", "Request validation failed", {
				errors: validation.error,
				body: JSON.stringify(body, null, 2),
			});
			return validation.error;
		}

		const { question, event } = validation.data;

		logger.info(`Report remove request received for event: ${event}`);
		logger.dev.structured("info", "Report remove request processing started", {
			event,
			questionId: question.id,
			questionText: question.question
				? `${String(question.question).substring(0, 100)}...`
				: "No question text",
			tournament: question.tournament,
			division: question.division,
			subject: question.subject,
			subtopic: question.subtopic,
		});

		let shouldRemove = false;
		let aiReason = "Question analysis not available";
		const aiAnalysisStartTime = Date.now();

		if (geminiService.isAvailable()) {
			logger.info("Sending request to Gemini AI for question analysis");
			logger.dev.structured("info", "Initiating AI removal analysis", {
				service: "Gemini",
				operation: "analyzeQuestionForRemoval",
				questionId: question.id,
				event,
			});

			try {
				const result = await geminiService.analyzeQuestionForRemoval(
					question,
					event,
				);
				const aiAnalysisDuration = Date.now() - aiAnalysisStartTime;

				logger.info("Gemini AI question removal analysis response received");
				logger.dev.ai(
					"Gemini",
					"analyzeQuestionForRemoval",
					question,
					result,
					aiAnalysisDuration,
				);

				shouldRemove = result.shouldRemove;
				aiReason = result.reason || "AI analysis completed";

				logger.info(`AI Decision: ${shouldRemove ? "remove" : "keep"}`, {
					reason: aiReason,
				});
				logger.dev.structured("info", "AI removal analysis completed", {
					decision: shouldRemove ? "remove" : "keep",
					reason: aiReason,
					issues: result.issues || [],
					confidence: result.confidence,
					analysisTime: `${aiAnalysisDuration}ms`,
				});
			} catch (error) {
				const aiAnalysisDuration = Date.now() - aiAnalysisStartTime;
				shouldRemove = false;
				aiReason = "AI analysis failed";
				logger.error("Gemini AI question analysis error:", error);
				logger.dev.error("AI analysis failed", error as Error, {
					questionId: question.id,
					event,
					analysisTime: `${aiAnalysisDuration}ms`,
				});
			}
		} else {
			logger.warn("Gemini AI client not available");
			logger.dev.structured("warn", "AI service unavailable", {
				service: "Gemini",
				reason: "Client not available",
			});
		}

		if (shouldRemove) {
			const dbOperationStartTime = Date.now();
			logger.dev.structured("info", "Starting database removal operations", {
				questionId: question.id,
				event,
				reason: aiReason,
			});

			const questionDataJson = JSON.stringify(question);

			try {
				// Blacklist the question
				logger.dev.db(
					"INSERT",
					"blacklists",
					"INSERT INTO blacklists (event, questionData) VALUES (?, ?)",
					[event, questionDataJson],
				);
				await db
					.insert(blacklistsTable)
					.values({ event, questionData: JSON.parse(questionDataJson) });

				logger.dev.structured("info", "Question blacklisted successfully", {
					event,
					questionId: question.id,
				});

				const questionId = question.id as string | undefined;
				if (questionId) {
					try {
						logger.dev.db(
							"DELETE",
							"questions",
							"DELETE FROM questions WHERE id = ?",
							[questionId],
						);
						await db
							.delete(questionsTable)
							.where(eq(questionsTable.id, questionId));
						logger.info("Removed question from main table by id");
						logger.dev.structured("info", "Question deleted by ID", {
							questionId,
						});
					} catch (error) {
						logger.warn(
							"Question might not exist in main table (id path):",
							error,
						);
						logger.dev.error("Question deletion by ID failed", error as Error, {
							questionId,
						});
					}
				} else {
					// Content-based deletion
					const conditions: SQL[] = [
						eq(questionsTable.question, String(question.question || "")),
						eq(questionsTable.event, event),
					];
					if (question.tournament) {
						conditions.push(
							eq(questionsTable.tournament, String(question.tournament)),
						);
					}
					if (question.division) {
						conditions.push(
							eq(questionsTable.division, String(question.division)),
						);
					}

					logger.dev.structured(
						"info",
						"Attempting content-based question deletion",
						{
							conditions: {
								question: `${String(question.question || "").substring(0, 50)}...`,
								event,
								tournament: question.tournament,
								division: question.division,
							},
						},
					);

					try {
						logger.dev.db(
							"SELECT",
							"questions",
							"SELECT id FROM questions WHERE ...",
							[],
						);
						const found = await db
							.select({ id: questionsTable.id })
							.from(questionsTable)
							.where(and(...conditions))
							.limit(1);
						const targetId = found[0]?.id as string | undefined;

						if (targetId) {
							logger.dev.db(
								"DELETE",
								"questions",
								"DELETE FROM questions WHERE id = ?",
								[targetId],
							);
							await db
								.delete(questionsTable)
								.where(eq(questionsTable.id, targetId));
							logger.info("Removed question from main table by content");
							logger.dev.structured("info", "Question deleted by content", {
								targetId,
							});
						} else {
							logger.warn("Could not locate question in main table by content");
							logger.dev.structured(
								"warn",
								"Question not found for content-based deletion",
								{
									searchConditions: conditions.length,
								},
							);
						}
					} catch (error) {
						logger.error("Error during content-based deletion attempt:", error);
						logger.dev.error("Content-based deletion failed", error as Error, {
							questionId: question.id,
							event,
						});
					}
				}

				const dbOperationDuration = Date.now() - dbOperationStartTime;
				logger.info("Question successfully removed and blacklisted");
				logger.dev.structured(
					"info",
					"Database operations completed successfully",
					{
						questionId: question.id,
						event,
						totalDbTime: `${dbOperationDuration}ms`,
					},
				);

				const response = successResponse<ApiResponse["data"]>(
					{ reason: aiReason, removed: true },
					"Question removed and blacklisted",
				);

				const totalDuration = Date.now() - startTime;
				logger.dev.response(200, response, totalDuration);

				return response;
			} catch (error) {
				const dbOperationDuration = Date.now() - dbOperationStartTime;
				logger.error("Database error removing question:", error);
				logger.dev.error("Database operations failed", error as Error, {
					questionId: question.id,
					event,
					dbOperationTime: `${dbOperationDuration}ms`,
				});

				const response = ApiErrors.serverError("Failed to remove question");
				const totalDuration = Date.now() - startTime;
				logger.dev.response(500, response, totalDuration);

				return response;
			}
		} else {
			logger.info("Question removal not justified by AI");
			logger.dev.structured("info", "Question removal rejected by AI", {
				questionId: question.id,
				event,
				reason: aiReason,
			});

			const response = successResponse<ApiResponse["data"]>(
				{ reason: aiReason, removed: false },
				"Question removal not justified",
			);

			const totalDuration = Date.now() - startTime;
			logger.dev.response(200, response, totalDuration);

			return response;
		}
	} catch (error) {
		const totalDuration = Date.now() - startTime;
		logger.error("POST /api/report/remove error:", error);
		logger.dev.error("Report remove API error", error as Error, {
			endpoint: "/api/report/remove",
			method: "POST",
			totalDuration: `${totalDuration}ms`,
		});

		const response = handleApiError(error);
		logger.dev.response(response.status || 500, response, totalDuration);

		return response;
	}
}
