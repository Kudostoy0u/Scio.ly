import { useCallback } from "react";
import {
	encryptAffine,
	encryptAtbash,
	encryptBaconian,
	encryptCaesar,
	encryptCheckerboard,
	encryptColumnarTransposition,
	encryptCryptarithm,
	encryptFractionatedMorse,
	encryptHill2x2,
	encryptHill3x3,
	k1Aristo as encryptK1Aristocrat,
	k1Patri as encryptK1Patristocrat,
	k1Xeno as encryptK1Xenocrypt,
	k2Aristo as encryptK2Aristocrat,
	k2Patri as encryptK2Patristocrat,
	k2Xeno as encryptK2Xenocrypt,
	k3Aristo as encryptK3Aristocrat,
	k3Patri as encryptK3Patristocrat,
	k3Xeno as encryptK3Xenocrypt,
	encryptNihilist,
	encryptPorta,
	encryptRandomAristocrat,
	encryptRandomPatristocrat,
	encryptRandomXenocrypt,
} from "../cipher-utils";
import { getAvailableCipherTypes } from "../services/utils/cipherMapping";
import type { CipherResult, QuoteData } from "../types";
import { cleanQuote } from "../utils/quoteCleaner";

interface CodebustersParams {
	questionCount: number;
	charLengthMin: number;
	charLengthMax: number;
	division?: string;
	cipherTypes?: string[];
}

export function useQuestionGeneration() {
	const encryptQuoteByType = useCallback(
		(cipherType: string, cleanedQuote: string): CipherResult => {
			const cipherMap: Record<string, (quote: string) => CipherResult> = {
				"K1 Aristocrat": encryptK1Aristocrat,
				"K2 Aristocrat": encryptK2Aristocrat,
				"K3 Aristocrat": encryptK3Aristocrat,
				"K1 Patristocrat": encryptK1Patristocrat,
				"K2 Patristocrat": encryptK2Patristocrat,
				"K3 Patristocrat": encryptK3Patristocrat,
				"Random Aristocrat": encryptRandomAristocrat,
				"Random Patristocrat": encryptRandomPatristocrat,
				Caesar: encryptCaesar,
				Atbash: encryptAtbash,
				Affine: encryptAffine,
				"Hill 2x2": encryptHill2x2,
				"Hill 3x3": encryptHill3x3,
				Porta: encryptPorta,
				Baconian: encryptBaconian,
				Nihilist: encryptNihilist,
				"Fractionated Morse": encryptFractionatedMorse,
				"Complete Columnar": encryptColumnarTransposition,
				"Random Xenocrypt": encryptRandomXenocrypt,
				"K1 Xenocrypt": encryptK1Xenocrypt,
				"K2 Xenocrypt": encryptK2Xenocrypt,
				"K3 Xenocrypt": encryptK3Xenocrypt,
				Checkerboard: encryptCheckerboard,
				Cryptarithm: encryptCryptarithm,
			};
			const encryptFunction = cipherMap[cipherType] || encryptCaesar;
			return encryptFunction(cleanedQuote);
		},
		[],
	);

	const createQuestionFromQuote = useCallback(
		(
			quote: { id?: string; quote: string; author: string },
			cipherType: string,
			cipherResult: CipherResult,
			index: number,
			division: string,
		): QuoteData => {
			return {
				id: quote.id || `assignment-${index}`,
				author: quote.author,
				quote: quote.quote,
				encrypted: cipherResult.encrypted,
				cipherType: cipherType as QuoteData["cipherType"],
				difficulty: 0.5,
				division: division,
				charLength: quote.quote.length,
				key: cipherResult.key || "",
				hint: "",
				solution: {},
				points: 10,
				...(cipherResult.matrix && { matrix: cipherResult.matrix }),
				...(cipherResult.keyword && { portaKeyword: cipherResult.keyword }),
				...(cipherResult.shift && { caesarShift: cipherResult.shift }),
				...(cipherResult.a &&
					cipherResult.b && {
						affineA: cipherResult.a,
						affineB: cipherResult.b,
					}),
				...(cipherResult.fractionationTable && {
					fractionationTable: cipherResult.fractionationTable,
				}),
			};
		},
		[],
	);

	const generateCodebustersQuestionsFromParams = useCallback(
		async (params: CodebustersParams): Promise<QuoteData[]> => {
			const quotesResponse = await fetch(
				`/api/quotes?language=en&limit=${params.questionCount * 2}&charLengthMin=${params.charLengthMin}&charLengthMax=${params.charLengthMax}`,
			);
			if (!quotesResponse.ok) {
				throw new Error("Failed to fetch quotes");
			}
			const quotesData = await quotesResponse.json();
			const quotes = quotesData.data?.quotes || quotesData.quotes || [];
			if (quotes.length === 0) {
				throw new Error("No quotes available");
			}
			const generatedQuestions: QuoteData[] = [];
			const availableCipherTypes = getAvailableCipherTypes(
				params.cipherTypes || [],
				params.division || "any",
			);
			for (let i = 0; i < params.questionCount; i++) {
				const quote = quotes[i % quotes.length];
				if (!quote?.quote) {
					continue;
				}
				const cipherType =
					availableCipherTypes[
						Math.floor(Math.random() * availableCipherTypes.length)
					];
				if (!cipherType) {
					continue;
				}
				const cleanedQuote = cleanQuote(quote.quote);
				const cipherResult = encryptQuoteByType(cipherType, cleanedQuote);
				const division = params.division || "C";
				if (!division) {
					continue;
				}
				const question = createQuestionFromQuote(
					quote,
					cipherType,
					cipherResult,
					i,
					division,
				);
				generatedQuestions.push(question);
			}
			return generatedQuestions;
		},
		[encryptQuoteByType, createQuestionFromQuote],
	);

	return {
		generateCodebustersQuestionsFromParams,
	};
}
