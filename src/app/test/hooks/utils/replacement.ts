import api from "@/app/api";
import type { Question } from "@/app/utils/geminiService";
import { buildApiParams } from "@/app/utils/questionUtils";
import { getEventOfflineQuestions } from "@/app/utils/storage";

// Helper function to filter questions by type
function filterQuestionsByType(
	questions: Record<string, unknown>[],
	typesSel: string,
): Record<string, unknown>[] {
	if (typesSel === "multiple-choice") {
		return questions.filter(
			(q) => Array.isArray(q.options) && q.options.length > 0,
		);
	}
	if (typesSel === "free-response") {
		return questions.filter(
			(q) => !Array.isArray(q.options) || q.options.length === 0,
		);
	}
	return questions;
}

// Helper function to get offline questions for an event
async function getOfflineQuestionsForEvent(
	eventName: string,
	typesSel: string,
): Promise<Question[]> {
	const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
	const cached = await getEventOfflineQuestions(slug);
	if (!Array.isArray(cached) || cached.length === 0) {
		return [];
	}
	const filtered = filterQuestionsByType(cached, typesSel);
	return filtered as unknown as Question[];
}

// Helper function to fetch questions from API
async function fetchQuestionsFromAPI(apiUrl: string): Promise<Question[]> {
	try {
		const response = await fetch(apiUrl);
		if (response?.ok) {
			const j = await response.json();
			return (j?.data || []) as Question[];
		}
	} catch {
		// Ignore fetch errors
	}
	return [];
}

export async function fetchReplacementQuestion(
	routerData: Record<string, unknown>,
	data: Question[],
): Promise<Question | null> {
	try {
		const typesSel = (routerData.types as string) || "multiple-choice";
		const requestCount = 50;
		const params = buildApiParams({ ...routerData }, requestCount);
		const apiUrl = `${api.questions}?${params}`;

		const existingQuestions = data.map((q) => q.question);
		const isOffline =
			typeof navigator !== "undefined" ? !navigator.onLine : false;
		let pool: Question[] = [];

		if (isOffline) {
			const eventName = routerData.eventName as string | undefined;
			if (eventName) {
				pool = await getOfflineQuestionsForEvent(eventName, typesSel);
			}
		} else {
			pool = await fetchQuestionsFromAPI(apiUrl);
			// Fallback to offline cache if API fails
			if (pool.length === 0) {
				const eventName = routerData.eventName as string | undefined;
				if (eventName) {
					pool = await getOfflineQuestionsForEvent(eventName, typesSel);
				}
			}
		}

		const candidates = pool.filter(
			(q) => !existingQuestions.includes(q.question),
		);
		if (candidates.length === 0) {
			return null;
		}
		const pick = candidates[Math.floor(Math.random() * candidates.length)];
		return pick || null;
	} catch {
		return null;
	}
}
