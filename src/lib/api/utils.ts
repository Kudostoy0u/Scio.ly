import { NextResponse } from "next/server";
import { z } from "zod";

export class ApiError extends Error {
	public statusCode: number;
	public code?: string;

	constructor(statusCode: number, message: string, code?: string) {
		super(message);
		this.name = "ApiError";
		this.statusCode = statusCode;
		this.code = code;
	}
}

export const handleApiError = (error: unknown): NextResponse => {
	if (error instanceof ApiError) {
		return NextResponse.json(
			{
				success: false,
				error: error.message,
				code: error.code,
			},
			{ status: error.statusCode },
		);
	}

	if (error instanceof z.ZodError) {
		return NextResponse.json(
			{
				success: false,
				error: "Invalid request data",
				details: error.issues,
			},
			{ status: 400 },
		);
	}

	return NextResponse.json(
		{
			success: false,
			error: "Internal server error",
		},
		{ status: 500 },
	);
};

export const createValidationSchema = <T extends z.ZodRawShape>(schema: T) => {
	return z.object(schema);
};

export const createSuccessResponse = <T>(data: T, message?: string) => {
	return NextResponse.json({
		success: true,
		data,
		...(message && { message }),
	});
};

export const createErrorResponse = (
	error: string,
	statusCode = 500,
	code?: string,
) => {
	return NextResponse.json(
		{
			success: false,
			error,
			...(code && { code }),
		},
		{ status: statusCode },
	);
};

export const parseQueryParams = <T extends z.ZodRawShape>(
	searchParams: URLSearchParams,
	schema: z.ZodObject<T>,
) => {
	const rawParams: Record<string, string | undefined> = {};

	for (const [key, value] of searchParams.entries()) {
		rawParams[key] = value;
	}

	return schema.parse(rawParams);
};

export const parseRequestBody = async <T extends z.ZodRawShape>(
	request: Request,
	schema: z.ZodObject<T>,
) => {
	const body = await request.json();
	return schema.parse(body);
};

export const createRateLimiter = (maxRequests: number, windowMs: number) => {
	const requests = new Map<string, { count: number; resetTime: number }>();

	return (identifier: string) => {
		const now = Date.now();
		const userRequests = requests.get(identifier);

		if (!userRequests || now > userRequests.resetTime) {
			requests.set(identifier, { count: 1, resetTime: now + windowMs });
			return true;
		}

		if (userRequests.count >= maxRequests) {
			return false;
		}

		userRequests.count++;
		return true;
	};
};

export const logApiRequest = (
	_method: string,
	_path: string,
	_params?: Record<string, unknown>,
) => {
	// Logging disabled
};

export const logApiResponse = (
	_method: string,
	_path: string,
	_statusCode: number,
	_duration: number,
) => {
	// Logging disabled
};

export const createCacheKey = (
	prefix: string,
	params: Record<string, unknown>,
) => {
	const sortedParams = Object.keys(params)
		.sort()
		.map((key) => `${key}:${params[key]}`)
		.join("|");

	return `${prefix}:${sortedParams}`;
};

export const sanitizeInput = (input: string): string => {
	return input
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#x27;");
};

/**
 * Create a successful API response (alias for consistency)
 */
export const successResponse = <T>(data: T, message?: string) => {
	return createSuccessResponse(data, message);
};

/**
 * Common error responses
 */
export const ApiErrors = {
	unauthorized: () => createErrorResponse("Unauthorized", 401),
	forbidden: () => createErrorResponse("Forbidden", 403),
	notFound: (resource?: string) =>
		createErrorResponse(resource ? `${resource} not found` : "Not found", 404),
	badRequest: (message = "Bad request") => createErrorResponse(message, 400),
	missingFields: (fields: string[]) =>
		createErrorResponse(`Missing required fields: ${fields.join(", ")}`, 400),
	serverError: (message = "Internal server error") =>
		createErrorResponse(message, 500),
	tooManyRequests: () =>
		createErrorResponse("Too many requests - Please try again later", 429),
} as const;

/**
 * Validate required fields in request body
 */
export function validateFields<T extends Record<string, unknown>>(
	body: unknown,
	requiredFields: (keyof T)[],
): { valid: true; data: T } | { valid: false; error: NextResponse } {
	if (!body || typeof body !== "object") {
		return {
			valid: false,
			error: ApiErrors.badRequest("Invalid request body"),
		};
	}

	const missingFields = requiredFields.filter(
		(field) =>
			!(field in body) ||
			(body as Record<string, unknown>)[field as string] == null,
	);

	if (missingFields.length > 0) {
		return {
			valid: false,
			error: ApiErrors.missingFields(missingFields as string[]),
		};
	}

	return { valid: true, data: body as T };
}
