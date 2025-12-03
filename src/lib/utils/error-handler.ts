/**
 * Standardized Error Handling for Teams API Routes
 *
 * Provides consistent error response formatting and logging across all teams routes.
 */

import logger from "@/lib/utils/logger";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standard error response format
 */
export interface ErrorResponse {
	error: string;
	details?: string | string[];
	code?: string;
}

/**
 * HTTP status codes for common errors
 */
export const HTTP_STATUS = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Error codes for client-side error handling
 */
export const ERROR_CODES = {
	VALIDATION_ERROR: "VALIDATION_ERROR",
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	NOT_FOUND: "NOT_FOUND",
	CONFLICT: "CONFLICT",
	DATABASE_ERROR: "DATABASE_ERROR",
	INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
	error: string,
	status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
	details?: string | string[],
	code?: string,
): NextResponse<ErrorResponse> {
	const response: ErrorResponse = {
		error,
		...(details && { details }),
		...(code && { code }),
	};

	return NextResponse.json(response, { status });
}

/**
 * Handles Zod validation errors
 */
export function handleValidationError(
	error: ZodError,
): NextResponse<ErrorResponse> {
	const details = error.issues.map((issue) => {
		const path = issue.path.join(".");
		return path ? `${path}: ${issue.message}` : issue.message;
	});

	logger.warn("Validation error", { errors: error.issues });

	return createErrorResponse(
		"Validation failed",
		HTTP_STATUS.BAD_REQUEST,
		details,
		ERROR_CODES.VALIDATION_ERROR,
	);
}

/**
 * Handles authentication errors
 */
export function handleUnauthorizedError(
	message = "Unauthorized",
): NextResponse<ErrorResponse> {
	return createErrorResponse(
		message,
		HTTP_STATUS.UNAUTHORIZED,
		undefined,
		ERROR_CODES.UNAUTHORIZED,
	);
}

/**
 * Handles authorization errors
 */
export function handleForbiddenError(
	message = "Forbidden",
): NextResponse<ErrorResponse> {
	return createErrorResponse(
		message,
		HTTP_STATUS.FORBIDDEN,
		undefined,
		ERROR_CODES.FORBIDDEN,
	);
}

/**
 * Handles not found errors
 */
export function handleNotFoundError(
	resource = "Resource",
): NextResponse<ErrorResponse> {
	return createErrorResponse(
		`${resource} not found`,
		HTTP_STATUS.NOT_FOUND,
		undefined,
		ERROR_CODES.NOT_FOUND,
	);
}

/**
 * Handles conflict errors (e.g., duplicate entries)
 */
export function handleConflictError(
	message: string,
): NextResponse<ErrorResponse> {
	return createErrorResponse(
		message,
		HTTP_STATUS.CONFLICT,
		undefined,
		ERROR_CODES.CONFLICT,
	);
}

/**
 * Handles database errors
 */
export function handleDatabaseError(
	error: unknown,
	context?: string,
): NextResponse<ErrorResponse> {
	const errorMessage =
		error instanceof Error ? error.message : "Unknown database error";

	logger.error("Database error", {
		error: errorMessage,
		context,
		stack: error instanceof Error ? error.stack : undefined,
	});

	// Don't expose internal database errors to clients
	return createErrorResponse(
		"Database operation failed",
		HTTP_STATUS.INTERNAL_SERVER_ERROR,
		undefined,
		ERROR_CODES.DATABASE_ERROR,
	);
}

/**
 * Handles general errors with logging
 */
export function handleError(
	error: unknown,
	context?: string,
	userMessage?: string,
): NextResponse<ErrorResponse> {
	if (error instanceof ZodError) {
		return handleValidationError(error);
	}

	const errorMessage = error instanceof Error ? error.message : "Unknown error";
	const errorStack = error instanceof Error ? error.stack : undefined;

	logger.error("API error", {
		error: errorMessage,
		context,
		stack: errorStack,
	});

	return createErrorResponse(
		userMessage || "An error occurred",
		HTTP_STATUS.INTERNAL_SERVER_ERROR,
		undefined,
		ERROR_CODES.INTERNAL_ERROR,
	);
}

/**
 * Validates that required environment variables are set
 */
export function validateEnvironment(): NextResponse<ErrorResponse> | null {
	if (!process.env.DATABASE_URL) {
		return createErrorResponse(
			"Database configuration error",
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
			"DATABASE_URL environment variable is missing",
			ERROR_CODES.DATABASE_ERROR,
		);
	}

	return null;
}

/**
 * Wraps an async route handler with error handling
 */
export function withErrorHandling<T extends unknown[]>(
	handler: (...args: T) => Promise<NextResponse>,
) {
	return async (...args: T): Promise<NextResponse> => {
		try {
			// Check environment
			const envError = validateEnvironment();
			if (envError) {
				return envError;
			}

			return await handler(...args);
		} catch (error) {
			return handleError(error, "Route handler");
		}
	};
}
