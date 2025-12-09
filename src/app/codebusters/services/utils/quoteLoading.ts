import { getEventOfflineQuestions } from "@/app/utils/storage";
import logger from "@/lib/utils/logging/logger";
import { isLangObject } from "./langGuards";

export interface Quote {
	id: string;
	author: string;
	quote: string;
}

export async function loadOfflineQuotes(
	nonXenocryptCount: number,
	xenocryptCount: number,
): Promise<{
	englishQuotes: Quote[];
	spanishQuotes: Quote[];
}> {
	const stored = await getEventOfflineQuestions("codebusters");
	const storedEn = isLangObject(stored)
		? stored.en
		: Array.isArray(stored)
			? stored
			: [];
	const storedEs = isLangObject(stored) ? stored.es : [];
	const englishQuotes: Quote[] = [];
	const spanishQuotes: Quote[] = [];
	if (nonXenocryptCount > 0) {
		englishQuotes.push(
			...(storedEn.length < nonXenocryptCount
				? storedEn
				: storedEn.slice(0, nonXenocryptCount)),
		);
	}
	if (xenocryptCount > 0) {
		spanishQuotes.push(
			...(storedEs.length < xenocryptCount
				? storedEs
				: storedEs.slice(0, xenocryptCount)),
		);
	}
	return { englishQuotes, spanishQuotes };
}

export async function loadOnlineQuotes(
	nonXenocryptCount: number,
	xenocryptCount: number,
	charLengthParams: string,
): Promise<{
	englishQuotes: Quote[];
	spanishQuotes: Quote[];
}> {
	const englishQuotes: Quote[] = [];
	const spanishQuotes: Quote[] = [];
	if (nonXenocryptCount > 0) {
		const englishResponse = await fetch(
			`/api/quotes?language=en&limit=${Math.min(nonXenocryptCount, 200)}${charLengthParams}`,
		);
		if (englishResponse.ok) {
			const englishData = await englishResponse.json();
			englishQuotes.push(
				...(englishData.data?.quotes || englishData.quotes || []),
			);
		}
	}
	if (xenocryptCount > 0) {
		const spanishResponse = await fetch(
			`/api/quotes?language=es&limit=${Math.min(xenocryptCount, 200)}${charLengthParams}`,
		);
		if (spanishResponse.ok) {
			const spanishData = await spanishResponse.json();
			spanishQuotes.push(
				...(spanishData.data?.quotes || spanishData.quotes || []),
			);
		}
	}
	return { englishQuotes, spanishQuotes };
}

export async function validateAndFallbackQuotes(
	quotes: Quote[],
	requiredCount: number,
	language: "en" | "es",
	testParams: { charLengthMin?: number; charLengthMax?: number },
): Promise<Quote[]> {
	if (quotes.length >= requiredCount) {
		return quotes;
	}
	try {
		const fallbackResponse = await fetch(
			`/api/quotes?language=${language}&limit=${Math.min(requiredCount, 200)}`,
		);
		if (fallbackResponse.ok) {
			const fallbackData = await fallbackResponse.json();
			const fallbackQuotes =
				fallbackData.data?.quotes || fallbackData.quotes || [];
			if (fallbackQuotes.length >= requiredCount) {
				logger.log(
					`✅ Fallback successful: Found ${fallbackQuotes.length} ${language === "en" ? "English" : "Spanish"} quotes without length restrictions`,
				);
				return fallbackQuotes;
			}
		}
	} catch {
		// Ignore fallback errors
	}
	const errorMessage = `Not enough ${language === "en" ? "English" : "Spanish"} quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${quotes.length}, needed: ${requiredCount}.`;
	throw new Error(errorMessage);
}

export async function loadQuotesForQuestions(
	nonXenocryptCount: number,
	xenocryptCount: number,
	testParams: { charLengthMin?: number; charLengthMax?: number },
): Promise<{
	englishQuotes: Quote[];
	spanishQuotes: Quote[];
}> {
	const charLengthParams =
		testParams.charLengthMin && testParams.charLengthMax
			? `&charLengthMin=${testParams.charLengthMin}&charLengthMax=${testParams.charLengthMax}`
			: "";

	const isOffline = !navigator.onLine;
	let englishQuotes: Quote[] = [];
	let spanishQuotes: Quote[] = [];

	if (isOffline) {
		const result = await loadOfflineQuotes(nonXenocryptCount, xenocryptCount);
		englishQuotes = result.englishQuotes;
		spanishQuotes = result.spanishQuotes;
	} else {
		try {
			const result = await loadOnlineQuotes(
				nonXenocryptCount,
				xenocryptCount,
				charLengthParams,
			);
			englishQuotes = result.englishQuotes;
			spanishQuotes = result.spanishQuotes;
		} catch {
			const result = await loadOfflineQuotes(nonXenocryptCount, xenocryptCount);
			englishQuotes = result.englishQuotes;
			spanishQuotes = result.spanishQuotes;
		}
	}

	if (nonXenocryptCount > 0 && englishQuotes.length < nonXenocryptCount) {
		logger.warn(
			`⚠️ Not enough English quotes in selected range. Need ${nonXenocryptCount}, got ${englishQuotes.length}. Trying fallback...`,
		);
		englishQuotes = await validateAndFallbackQuotes(
			englishQuotes,
			nonXenocryptCount,
			"en",
			testParams,
		);
	}

	if (xenocryptCount > 0 && spanishQuotes.length < xenocryptCount) {
		logger.warn(
			`⚠️ Not enough Spanish quotes in selected range. Need ${xenocryptCount}, got ${spanishQuotes.length}. Trying fallback...`,
		);
		spanishQuotes = await validateAndFallbackQuotes(
			spanishQuotes,
			xenocryptCount,
			"es",
			testParams,
		);
	}

	return { englishQuotes, spanishQuotes };
}
