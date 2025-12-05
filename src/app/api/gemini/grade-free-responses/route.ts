import { geminiService } from "@/lib/services/gemini";
import type {
	ApiResponse,
	GeminiGradeFreeResponsesRequest,
} from "@/lib/types/api";
import { type NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
	try {
		const body: GeminiGradeFreeResponsesRequest = await request.json();

		if (!(body.responses && Array.isArray(body.responses))) {
			const response: ApiResponse = {
				success: false,
				error: "Missing required field: responses (array)",
			};
			return NextResponse.json(response, { status: 400 });
		}

		if (!geminiService.isAvailable()) {
			const response: ApiResponse = {
				success: false,
				error: "Gemini AI not available",
			};
			return NextResponse.json(response, { status: 503 });
		}

		try {
			const result = await geminiService.gradeFreeResponses(body.responses);

			const response: ApiResponse = {
				success: true,
				data: result,
			};

			return NextResponse.json(response);
		} catch (_error) {
			const response: ApiResponse = {
				success: false,
				error: "Failed to grade free responses",
			};
			return NextResponse.json(response, { status: 500 });
		}
	} catch (_error) {
		const response: ApiResponse = {
			success: false,
			error: "Invalid request body",
		};
		return NextResponse.json(response, { status: 400 });
	}
}
