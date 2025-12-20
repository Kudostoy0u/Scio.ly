import {
	getAvailableCipherTypes,
	mapSubtopicsToCipherTypes,
} from "@/app/codebusters/services/utils/cipherMapping";
import { encryptQuoteByType } from "@/app/codebusters/services/utils/encryptionMapping";
import {
	createQuestionFromQuote,
	selectQuoteForCipher,
} from "@/app/codebusters/services/utils/questionCreation";
import type { QuoteData } from "@/app/codebusters/types";
import { setCustomWordBank } from "@/app/codebusters/utils/common";
import { getQuotesByLanguage } from "@/lib/db/utils";

const WORD_SPLIT_REGEX = /\s+/;

interface QuoteRecord {
	id: string;
	author: string;
	quote: string;
}

interface CodebustersGenerationParams {
	questionCount: number;
	cipherTypes?: string[];
	division?: "B" | "C" | "any";
	charLengthMin?: number;
	charLengthMax?: number;
}

const normalizeCipherTypes = (cipherTypes: string[]): string[] => {
	const lowered = cipherTypes.map((cipher) => cipher.toLowerCase());
	return mapSubtopicsToCipherTypes(lowered);
};

const normalizeCipherName = (cipherType: string): string => {
	return cipherType
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
};

const isXenocryptType = (cipherType: string): boolean => {
	return cipherType.includes("Xenocrypt");
};

const extractWordsFromQuotes = (quotes: QuoteRecord[]): string[] => {
	const words = new Set<string>();
	for (const quoteObj of quotes) {
		const quoteWords = quoteObj.quote
			.toUpperCase()
			.replace(/[^A-Z\s]/g, "")
			.split(WORD_SPLIT_REGEX)
			.filter((w) => w.length >= 2 && w.length <= 8);
		for (const word of quoteWords) {
			words.add(word);
		}
	}
	return Array.from(words);
};

const loadWordBankFromQuotes = (
	englishQuotes: QuoteRecord[],
	spanishQuotes: QuoteRecord[],
) => {
	const allWords = [
		...extractWordsFromQuotes(englishQuotes),
		...extractWordsFromQuotes(spanishQuotes),
	];
	if (allWords.length > 0) {
		setCustomWordBank(allWords);
	}
};

const loadQuotes = async (
	language: "en" | "es",
	limit: number,
	charLengthMin?: number,
	charLengthMax?: number,
): Promise<QuoteRecord[]> => {
	const range =
		charLengthMin && charLengthMax
			? {
					min: Math.min(charLengthMin, charLengthMax),
					max: Math.max(charLengthMin, charLengthMax),
				}
			: undefined;

	const rawQuotes = await getQuotesByLanguage(language, limit, range);
	return rawQuotes.map((quote) => {
		const quoteRecord = quote as QuoteRecord;
		return {
			id: quoteRecord.id,
			author: quoteRecord.author,
			quote: quoteRecord.quote,
		};
	});
};

const ensureQuoteCount = async (
	language: "en" | "es",
	requiredCount: number,
	charLengthMin?: number,
	charLengthMax?: number,
): Promise<QuoteRecord[]> => {
	if (requiredCount <= 0) {
		return [];
	}
	let quotes = await loadQuotes(
		language,
		requiredCount,
		charLengthMin,
		charLengthMax,
	);
	if (quotes.length >= requiredCount) {
		return quotes;
	}
	quotes = await loadQuotes(language, requiredCount);
	if (quotes.length < requiredCount) {
		throw new Error(
			`Not enough ${language === "en" ? "English" : "Spanish"} quotes available for Codebusters assignment generation.`,
		);
	}
	return quotes;
};

export async function generateCodebustersQuestions({
	questionCount,
	cipherTypes = [],
	division = "any",
	charLengthMin,
	charLengthMax,
}: CodebustersGenerationParams): Promise<QuoteData[]> {
	const normalizedCipherTypes = normalizeCipherTypes(cipherTypes);
	const availableCipherTypes = getAvailableCipherTypes(
		normalizedCipherTypes,
		division,
	);

	if (availableCipherTypes.length === 0) {
		throw new Error("No Codebusters cipher types are available to generate.");
	}

	const questionCipherTypes: QuoteData["cipherType"][] = Array.from(
		{ length: questionCount },
		() =>
			availableCipherTypes[
				Math.floor(Math.random() * availableCipherTypes.length)
			] as QuoteData["cipherType"],
	);

	const xenocryptCount = questionCipherTypes.filter((type) =>
		isXenocryptType(type),
	).length;
	const nonXenocryptCount = Math.max(0, questionCount - xenocryptCount);

	const [englishQuotes, spanishQuotes] = await Promise.all([
		ensureQuoteCount("en", nonXenocryptCount, charLengthMin, charLengthMax),
		ensureQuoteCount("es", xenocryptCount, charLengthMin, charLengthMax),
	]);

	loadWordBankFromQuotes(englishQuotes, spanishQuotes);

	const processedQuotes: QuoteData[] = [];
	let englishIndex = 0;
	let spanishIndex = 0;

	for (let i = 0; i < questionCount; i++) {
		const cipherType = questionCipherTypes[i];
		if (!cipherType) {
			break;
		}

		const normalizedCipherType = normalizeCipherName(cipherType);
		const quoteSelection = selectQuoteForCipher(
			cipherType,
			englishQuotes,
			spanishQuotes,
			englishIndex,
			spanishIndex,
		);

		if (!quoteSelection) {
			break;
		}

		englishIndex = quoteSelection.newEnglishIndex;
		spanishIndex = quoteSelection.newSpanishIndex;

		const cipherResult = encryptQuoteByType(
			normalizedCipherType,
			quoteSelection.quoteData.quote,
		);
		const questionEntry = createQuestionFromQuote(
			quoteSelection.quoteData,
			normalizedCipherType,
			cipherResult,
		);

		questionEntry.division = division === "any" ? undefined : division;
		questionEntry.charLength = quoteSelection.quoteData.quote.length;

		processedQuotes.push(questionEntry);
	}

	if (processedQuotes.length === 0) {
		throw new Error("Failed to generate Codebusters questions.");
	}

	return processedQuotes;
}
