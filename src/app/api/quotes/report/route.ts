import {
	ApiErrors,
	handleApiError,
	successResponse,
	validateFields,
} from "@/lib/api/utils";
import { db } from "@/lib/db";
import {
	longquotes as longquotesTable,
	quotes as quotesTable,
} from "@/lib/db/schema";
import { geminiService } from "@/lib/services/gemini";
import type { ApiResponse } from "@/lib/types/api";
import logger from "@/lib/utils/logger";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const maxDuration = 60;

export interface QuoteReportRequest extends Record<string, unknown> {
	quote: Record<string, unknown>;
	cipherType: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex quote report processing with AI validation
export async function POST(request: NextRequest) {
	const startTime = Date.now();

	try {
		logger.dev.request(
			"POST",
			"/api/quotes/report",
			undefined,
			Object.fromEntries(request.headers.entries()),
		);

		const body = await request.json();
		const validation = validateFields<QuoteReportRequest>(body, [
			"quote",
			"cipherType",
		]);

		if (!validation.valid) {
			logger.dev.structured("warn", "Request validation failed", {
				errors: validation.error,
				body: JSON.stringify(body, null, 2),
			});
			return validation.error;
		}

		const { quote, cipherType } = validation.data;

		logger.info(`Quote report request received for cipher type: ${cipherType}`);
		logger.dev.structured("info", "Quote report request processing started", {
			cipherType,
			quoteId: quote.id,
			quoteText: quote.quote
				? `${String(quote.quote).substring(0, 100)}...`
				: "No quote text",
			author: quote.author,
			language: quote.language,
		});

		let action: "remove" | "edit" | "keep" = "keep";
		let aiReason = "Quote analysis not available";
		let editedQuote: Record<string, unknown> | undefined;
		const aiAnalysisStartTime = Date.now();

		if (geminiService.isAvailable()) {
			logger.info("Sending request to Gemini AI for quote validation");
			logger.dev.structured("info", "Initiating AI quote validation", {
				service: "Gemini",
				operation: "validateQuote",
				quoteId: quote.id,
				cipherType,
			});

			try {
				const result = await geminiService.validateQuote(quote, cipherType);
				const aiAnalysisDuration = Date.now() - aiAnalysisStartTime;

				logger.info("Gemini AI quote validation response received");
				logger.dev.ai(
					"Gemini",
					"validateQuote",
					quote,
					result,
					aiAnalysisDuration,
				);

				action = result.action;
				aiReason = result.reason || "AI analysis completed";
				if (result.editedQuote) {
					editedQuote = result.editedQuote;
				}

				logger.info(`AI Decision: ${action}`, { reason: aiReason });
				logger.dev.structured("info", "AI quote validation completed", {
					action,
					reason: aiReason,
					issues: result.issues || [],
					hasEditedQuote: !!editedQuote,
					analysisTime: `${aiAnalysisDuration}ms`,
				});
			} catch (error) {
				const aiAnalysisDuration = Date.now() - aiAnalysisStartTime;
				action = "keep";
				aiReason = "AI analysis failed";
				logger.error("Gemini AI quote validation error:", error);
				logger.dev.error("AI validation failed", error as Error, {
					quoteId: quote.id,
					cipherType,
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

		const dbOperationStartTime = Date.now();

		if (action === "remove") {
			logger.dev.structured("info", "Starting quote removal operations", {
				quoteId: quote.id,
				cipherType,
				reason: aiReason,
			});

			try {
				const originalQuoteText = String(quote.quote || "");
				const originalAuthor = String(quote.author || "");
				const quoteId = quote.id as string | undefined;

				let deleted = false;

				// If we have an ID, try to delete by ID first
				if (quoteId && quoteId.startsWith("assignment-") === false) {
					// Try quotes table first
					try {
						await db.delete(quotesTable).where(eq(quotesTable.id, quoteId));
						logger.info("Deleted quote from quotes table by ID", { quoteId });
						logger.dev.structured(
							"info",
							"Quote deleted by ID from quotes table",
							{ quoteId },
						);
						deleted = true;
					} catch (error) {
						logger.warn(
							"Quote not found in quotes table by ID, trying longquotes:",
							error,
						);
						logger.dev.error(
							"Quote deletion by ID failed from quotes table",
							error as Error,
							{
								quoteId,
							},
						);

						// Try longquotes table
						try {
							await db
								.delete(longquotesTable)
								.where(eq(longquotesTable.id, quoteId));
							logger.info("Deleted quote from longquotes table by ID", {
								quoteId,
							});
							logger.dev.structured(
								"info",
								"Quote deleted by ID from longquotes table",
								{
									quoteId,
								},
							);
							deleted = true;
						} catch (error2) {
							logger.warn(
								"Quote not found in longquotes table by ID, trying by content:",
								error2,
							);
							logger.dev.error(
								"Quote deletion by ID failed from longquotes table",
								error2 as Error,
								{
									quoteId,
								},
							);
						}
					}
				}

				// If delete by ID failed or ID is missing, try to find by content
				if (!deleted && originalQuoteText && originalAuthor) {
					try {
						// Try quotes table by content
						await db
							.delete(quotesTable)
							.where(
								and(
									eq(quotesTable.quote, originalQuoteText),
									eq(quotesTable.author, originalAuthor),
								),
							);
						logger.info("Deleted quote from quotes table by content");
						logger.dev.structured(
							"info",
							"Quote deleted from quotes table by content",
							{
								cipherType,
							},
						);
						deleted = true;
					} catch (error) {
						logger.warn(
							"Quote not found in quotes table by content, trying longquotes:",
							error,
						);
						logger.dev.error(
							"Quote deletion failed in quotes table by content",
							error as Error,
						);

						// Try longquotes table by content
						try {
							await db
								.delete(longquotesTable)
								.where(
									and(
										eq(longquotesTable.quote, originalQuoteText),
										eq(longquotesTable.author, originalAuthor),
									),
								);
							logger.info("Deleted quote from longquotes table by content");
							logger.dev.structured(
								"info",
								"Quote deleted from longquotes table by content",
								{
									cipherType,
								},
							);
							deleted = true;
						} catch (error2) {
							logger.error(
								"Could not locate quote in either table for deletion:",
								error2,
							);
							logger.dev.error(
								"Quote deletion failed in longquotes table by content",
								error2 as Error,
							);
						}
					}
				}

				if (!deleted) {
					throw new Error(
						`Failed to delete quote. ID: ${quoteId || "missing"}, Quote: "${originalQuoteText.substring(0, 50)}...", Author: "${originalAuthor}"`,
					);
				}

				const dbOperationDuration = Date.now() - dbOperationStartTime;
				logger.info("Quote successfully deleted from database");
				logger.dev.structured(
					"info",
					"Database operations completed successfully",
					{
						quoteId: quote.id,
						cipherType,
						totalDbTime: `${dbOperationDuration}ms`,
					},
				);

				const response = successResponse<ApiResponse["data"]>(
					{ reason: aiReason, action: "removed" },
					"Quote removed",
				);

				const totalDuration = Date.now() - startTime;
				logger.dev.response(200, response, totalDuration);

				return response;
			} catch (error) {
				const dbOperationDuration = Date.now() - dbOperationStartTime;
				logger.error("Database error removing quote:", error);
				logger.dev.error("Database operations failed", error as Error, {
					quoteId: quote.id,
					cipherType,
					dbOperationTime: `${dbOperationDuration}ms`,
				});

				const response = ApiErrors.serverError("Failed to remove quote");
				const totalDuration = Date.now() - startTime;
				logger.dev.response(500, response, totalDuration);

				return response;
			}
		} else if (action === "edit" && editedQuote) {
			const originalQuoteText = String(quote.quote || "");
			const originalAuthor = String(quote.author || "");
			const originalLanguage = String(quote.language || "en");
			const editedQuoteText = String(editedQuote.quote || "");
			const editedAuthor = String(editedQuote.author || originalAuthor);
			const editedLanguage = String(editedQuote.language || originalLanguage);

			logger.dev.structured("info", "Starting quote edit operations", {
				quoteId: quote.id,
				cipherType,
				reason: aiReason,
				originalQuote: {
					quote: originalQuoteText,
					author: originalAuthor,
					language: originalLanguage,
				},
				editedQuote: {
					quote: editedQuoteText,
					author: editedAuthor,
					language: editedLanguage,
				},
			});

			logger.info("Quote edit details", {
				original: {
					quote: originalQuoteText,
					author: originalAuthor,
					language: originalLanguage,
				},
				edited: {
					quote: editedQuoteText,
					author: editedAuthor,
					language: editedLanguage,
				},
			});

			try {
				const payload = {
					quote: editedQuoteText,
					author: editedAuthor,
					language: editedLanguage,
				};

				const quoteId = quote.id as string | undefined;

				let updated = false;

				// If we have an ID, try to update by ID first
				if (quoteId && quoteId.startsWith("assignment-") === false) {
					// Try quotes table first
					try {
						await db
							.update(quotesTable)
							.set(payload)
							.where(eq(quotesTable.id, quoteId));
						logger.info("Applied edit to quotes table by ID", {
							quoteId,
							originalQuote: originalQuoteText,
							editedQuote: editedQuoteText,
							originalAuthor,
							editedAuthor,
						});
						logger.dev.structured("info", "Quote updated in quotes table", {
							quoteId,
							cipherType,
							originalQuote: originalQuoteText,
							editedQuote: editedQuoteText,
							originalAuthor,
							editedAuthor,
						});
						updated = true;
					} catch (error) {
						logger.warn(
							"Quote not found in quotes table by ID, trying longquotes:",
							error,
						);
						logger.dev.error(
							"Quote update failed in quotes table",
							error as Error,
							{
								quoteId,
							},
						);

						// Try longquotes table
						try {
							await db
								.update(longquotesTable)
								.set(payload)
								.where(eq(longquotesTable.id, quoteId));
							logger.info("Applied edit to longquotes table by ID", {
								quoteId,
								originalQuote: originalQuoteText,
								editedQuote: editedQuoteText,
								originalAuthor,
								editedAuthor,
							});
							logger.dev.structured(
								"info",
								"Quote updated in longquotes table",
								{
									quoteId,
									cipherType,
									originalQuote: originalQuoteText,
									editedQuote: editedQuoteText,
									originalAuthor,
									editedAuthor,
								},
							);
							updated = true;
						} catch (error2) {
							logger.warn(
								"Quote not found in longquotes table by ID, trying by content:",
								error2,
							);
							logger.dev.error(
								"Quote update failed in longquotes table",
								error2 as Error,
								{
									quoteId,
								},
							);
						}
					}
				}

				// If update by ID failed or ID is missing, try to find by content
				if (!updated && originalQuoteText && originalAuthor) {
					try {
						// Try quotes table by content
						await db
							.update(quotesTable)
							.set(payload)
							.where(
								and(
									eq(quotesTable.quote, originalQuoteText),
									eq(quotesTable.author, originalAuthor),
								),
							);
						logger.info("Applied edit to quotes table by content", {
							originalQuote: originalQuoteText,
							editedQuote: editedQuoteText,
							originalAuthor,
							editedAuthor,
						});
						logger.dev.structured(
							"info",
							"Quote updated in quotes table by content",
							{
								cipherType,
								originalQuote: originalQuoteText,
								editedQuote: editedQuoteText,
								originalAuthor,
								editedAuthor,
							},
						);
						updated = true;
					} catch (error) {
						logger.warn(
							"Quote not found in quotes table by content, trying longquotes:",
							error,
						);
						logger.dev.error(
							"Quote update failed in quotes table by content",
							error as Error,
						);

						// Try longquotes table by content
						try {
							await db
								.update(longquotesTable)
								.set(payload)
								.where(
									and(
										eq(longquotesTable.quote, originalQuoteText),
										eq(longquotesTable.author, originalAuthor),
									),
								);
							logger.info("Applied edit to longquotes table by content", {
								originalQuote: originalQuoteText,
								editedQuote: editedQuoteText,
								originalAuthor,
								editedAuthor,
							});
							logger.dev.structured(
								"info",
								"Quote updated in longquotes table by content",
								{
									cipherType,
									originalQuote: originalQuoteText,
									editedQuote: editedQuoteText,
									originalAuthor,
									editedAuthor,
								},
							);
							updated = true;
						} catch (error2) {
							logger.error(
								"Could not locate quote in either table by content:",
								error2,
							);
							logger.dev.error(
								"Quote update failed in longquotes table by content",
								error2 as Error,
							);
						}
					}
				}

				if (!updated) {
					throw new Error(
						`Failed to update quote. ID: ${quoteId || "missing"}, Quote: "${originalQuoteText.substring(0, 50)}...", Author: "${originalAuthor}"`,
					);
				}

				const dbOperationDuration = Date.now() - dbOperationStartTime;
				logger.info("Quote edit successfully applied to database");
				logger.dev.structured(
					"info",
					"Database operations completed successfully",
					{
						quoteId,
						cipherType,
						totalDbTime: `${dbOperationDuration}ms`,
					},
				);

				const response = successResponse<ApiResponse["data"]>(
					{
						reason: aiReason,
						action: "edited",
						editedQuote: {
							quote: editedQuoteText,
							author: editedAuthor,
							language: editedLanguage,
						},
					},
					"Quote has been edited",
				);

				const totalDuration = Date.now() - startTime;
				logger.dev.response(200, response, totalDuration);

				return response;
			} catch (error) {
				const dbOperationDuration = Date.now() - dbOperationStartTime;
				logger.error("Database error saving quote edit:", error);
				logger.dev.error("Database operations failed", error as Error, {
					quoteId: quote.id,
					cipherType,
					dbOperationTime: `${dbOperationDuration}ms`,
				});

				const response = ApiErrors.serverError("Failed to save quote edit");
				const totalDuration = Date.now() - startTime;
				logger.dev.response(500, response, totalDuration);

				return response;
			}
		} else {
			logger.info("Quote is appropriate - no action taken");
			logger.dev.structured("info", "Quote validation - no action needed", {
				quoteId: quote.id,
				cipherType,
				reason: aiReason,
			});

			const response = successResponse<ApiResponse["data"]>(
				{ reason: aiReason, action: "kept" },
				"Quote is appropriate",
			);

			const totalDuration = Date.now() - startTime;
			logger.dev.response(200, response, totalDuration);

			return response;
		}
	} catch (error) {
		const totalDuration = Date.now() - startTime;
		logger.error("POST /api/quotes/report error:", error);
		logger.dev.error("Quote report API error", error as Error, {
			endpoint: "/api/quotes/report",
			method: "POST",
			totalDuration: `${totalDuration}ms`,
		});

		const response = handleApiError(error);
		logger.dev.response(response.status || 500, response, totalDuration);

		return response;
	}
}
