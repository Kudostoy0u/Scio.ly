import {
	createSuccessResponse,
	handleApiError,
	logApiRequest,
	logApiResponse,
	parseQueryParams,
	sanitizeInput,
} from "@/lib/api/utils";
import { getQuotesByLanguage } from "@/lib/db/utils";
import logger from "@/lib/utils/logging/logger";
import type { NextRequest } from "next/server";
import { z } from "zod";

const QuoteFiltersSchema = z.object({
	language: z.string().min(1, "Language is required").default("en"),
	limit: z.coerce.number().int().positive().max(200).optional().default(50),
	charLengthMin: z.coerce.number().int().positive().optional(),
	charLengthMax: z.coerce.number().int().positive().optional(),
});

const fetchQuotes = async (
	language: string,
	limit: number,
	charLengthRange?: { min: number; max: number },
) => {
	logger.log("[fetchQuotes] Starting:", {
		language,
		limit,
		charLengthRange,
	});

	try {
		const sanitizedLanguage = sanitizeInput(language);
		logger.log("[fetchQuotes] Sanitized language:", sanitizedLanguage);

		logger.log("[fetchQuotes] Calling getQuotesByLanguage...");
		const quotes = await getQuotesByLanguage(
			sanitizedLanguage,
			limit,
			charLengthRange,
		);
		logger.log("[fetchQuotes] Received quotes:", {
			count: quotes?.length || 0,
			isArray: Array.isArray(quotes),
		});

		if (!quotes || quotes.length === 0) {
			const errorMsg = `No quotes found for language: ${sanitizedLanguage}${charLengthRange ? ` with character length range ${charLengthRange.min}-${charLengthRange.max}` : ""}`;
			logger.error("[fetchQuotes] No quotes found:", errorMsg);
			throw new Error(errorMsg);
		}

		logger.log("[fetchQuotes] Mapping quotes...");
		const mappedQuotes = quotes.map((quote) => {
			const quoteRecord = quote as {
				id: string;
				author: string;
				quote: string;
			};
			return {
				id: quoteRecord.id,
				author: quoteRecord.author,
				quote: quoteRecord.quote,
			};
		});
		logger.log("[fetchQuotes] Successfully mapped quotes:", {
			count: mappedQuotes.length,
		});

		return mappedQuotes;
	} catch (error) {
		logger.error("[fetchQuotes] Error:", {
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			name: error instanceof Error ? error.name : typeof error,
		});
		throw error;
	}
};

export async function GET(request: NextRequest) {
	const startTime = Date.now();
	const params = Object.fromEntries(request.nextUrl.searchParams);

	logger.log("[GET /api/quotes] Request:", {
		params,
		timestamp: new Date().toISOString(),
	});

	logApiRequest("GET", "/api/quotes", params);

	try {
		const searchParams = request.nextUrl.searchParams;
		logger.log("[GET /api/quotes] Parsing query params:", {
			rawParams: Array.from(searchParams.entries()),
		});

		const filters = parseQueryParams(searchParams, QuoteFiltersSchema);
		logger.log("[GET /api/quotes] Parsed filters:", filters);

		let charLengthRange: { min: number; max: number } | undefined;
		if (filters.charLengthMin && filters.charLengthMax) {
			charLengthRange = {
				min: Math.min(filters.charLengthMin, filters.charLengthMax),
				max: Math.max(filters.charLengthMin, filters.charLengthMax),
			};
			logger.log("[GET /api/quotes] Character length range:", charLengthRange);
		}

		logger.log("[GET /api/quotes] Fetching quotes:", {
			language: filters.language,
			limit: filters.limit,
			charLengthRange,
		});

		const quotes = await fetchQuotes(
			filters.language,
			filters.limit,
			charLengthRange,
		);

		logger.log("[GET /api/quotes] Success:", {
			quoteCount: quotes.length,
			duration: Date.now() - startTime,
		});

		const response = createSuccessResponse({ quotes });
		logApiResponse("GET", "/api/quotes", 200, Date.now() - startTime);
		return response;
	} catch (error) {
		const duration = Date.now() - startTime;
		const errorDetails = {
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			name: error instanceof Error ? error.name : typeof error,
			duration,
			params,
		};

		logger.error("[GET /api/quotes] Error:", errorDetails);

		if (error instanceof z.ZodError) {
			logger.error("[GET /api/quotes] Validation error details:", {
				issues: error.issues,
			});
		}

		const response = handleApiError(error);
		const responseBody = await response
			.clone()
			.json()
			.catch(() => ({
				error: "Unable to parse response body",
			}));
		logger.error("[GET /api/quotes] Error response:", {
			status: response.status,
			body: responseBody,
		});

		logApiResponse("GET", "/api/quotes", response.status, duration);
		return response;
	}
}
