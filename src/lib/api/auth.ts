import { NextResponse } from "next/server";

// Regex patterns for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates authentication for API routes
 * Returns user if authenticated, or error response if not
 */
/**
 * Validates request body against expected schema
 */
export function validateRequestBody<T>(
	body: unknown,
	requiredFields: (keyof T)[],
): { valid: boolean; error?: NextResponse } {
	if (!body || typeof body !== "object") {
		return {
			valid: false,
			error: NextResponse.json(
				{ success: false, error: "Invalid request body" },
				{ status: 400 },
			),
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
			error: NextResponse.json(
				{
					success: false,
					error: `Missing required fields: ${missingFields.join(", ")}`,
				},
				{ status: 400 },
			),
		};
	}

	return { valid: true };
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
	return input
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#x27;")
		.replace(/\//g, "&#x2F;")
		.trim();
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
	return EMAIL_REGEX.test(email);
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
	return UUID_REGEX.test(uuid);
}
