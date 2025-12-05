import { RateLimitPresets, applyRateLimit } from "@/lib/api/rateLimit";
import {
	ApiErrors,
	handleApiError,
	successResponse,
	validateFields,
} from "@/lib/api/utils";
import type { NextRequest } from "next/server";

/**
 * Contact form API endpoint for Scio.ly platform
 * Handles contact form submissions with rate limiting and Discord webhook integration
 */

/**
 * Contact request interface for form validation
 */
interface ContactRequest extends Record<string, unknown> {
	/** Contact person's name */
	name: string;
	/** Contact person's email address */
	email: string;
	/** Optional topic/category for the message */
	topic?: string;
	/** Contact message content */
	message: string;
}

/**
 * POST /api/contact - Contact form submission endpoint
 * Processes contact form submissions with rate limiting and Discord webhook integration
 *
 * @param {NextRequest} req - The incoming request with contact form data
 * @returns {Promise<Response>} Success response with confirmation or error response
 * @throws {Error} When form processing fails
 * @example
 * ```typescript
 * const response = await fetch('/api/contact', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *     topic: 'Support',
 *     message: 'I need help with...'
 *   })
 * });
 * ```
 */
export async function POST(req: NextRequest) {
	try {
		// Apply rate limiting to prevent spam
		const rateLimitError = applyRateLimit(req, RateLimitPresets.standard);
		if (rateLimitError) {
			return rateLimitError;
		}

		// Validate request body for required fields
		const body = await req.json();
		const validation = validateFields<ContactRequest>(body, [
			"name",
			"email",
			"message",
		]);
		if (!validation.valid) {
			return validation.error;
		}

		const { name, email, topic, message } = validation.data;

		const webhookUrl = process.env.DISCORD_CONTACT_WEBHOOK;
		if (!webhookUrl) {
			return ApiErrors.serverError("Contact webhook not configured");
		}

		const embed = {
			title: "New Contact Form Submission",
			color: 0x0099ff,
			fields: [
				{ name: "Name", value: String(name), inline: true },
				{ name: "Email", value: String(email), inline: true },
				{ name: "Topic", value: String(topic || "general"), inline: true },
				{ name: "Message", value: String(message), inline: false },
			],
			timestamp: new Date().toISOString(),
		};

		const resp = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ embeds: [embed] }),
		});

		if (!resp.ok) {
			return ApiErrors.serverError("Failed to send message");
		}

		return successResponse({ sent: true }, "Message sent successfully!");
	} catch (error) {
		return handleApiError(error);
	}
}
