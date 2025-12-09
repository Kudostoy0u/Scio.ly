import type { QuoteData } from "@/app/codebusters/types";

export const processAuthor = (author: string): string => {
	const commaIndex = author.indexOf(",");
	if (commaIndex !== -1) {
		const textAfterComma = author.substring(commaIndex + 1).trim();
		if (textAfterComma.length > 28) {
			return author.substring(0, commaIndex);
		}
	}
	return author;
};

export function extractAllLetters(
	digitGroups: Array<{ word: string }>,
): string {
	return digitGroups.map((g) => g.word.replace(/\s/g, "")).join("");
}

export function extractAllDigits(
	digitGroups: Array<{ digits: string }>,
): string[] {
	const allDigitsArr: string[] = [];
	for (const g of digitGroups) {
		const digits = g.digits.split(" ").filter(Boolean);
		for (const d of digits) {
			allDigitsArr.push(d);
		}
	}
	return allDigitsArr;
}

export function findUnfilledIndices(
	allLetters: string,
	current: Record<number, string>,
): number[] {
	const unfilled: number[] = [];
	for (let i = 0; i < allLetters.length; i++) {
		if (!current[i]) {
			unfilled.push(i);
		}
	}
	return unfilled;
}

export function findPositionsToFill(
	allDigitsArr: string[],
	targetDigit: string,
): number[] {
	const positionsToFill: number[] = [];
	for (let pos = 0; pos < allDigitsArr.length; pos++) {
		const d = allDigitsArr[pos];
		if (d === targetDigit) {
			positionsToFill.push(pos);
		}
	}
	return positionsToFill;
}

export function shouldEnableBaconianSync(binaryType: string): boolean {
	const emojiSchemes = [
		"Happy vs Sad",
		"Fire vs Ice",
		"Day vs Night",
		"Land vs Sea",
		"Tech vs Nature",
		"Sweet vs Spicy",
		"Star vs Heart",
		"Sun vs Moon",
		"Music vs Art",
		"Food vs Drink",
		"Sport vs Game",
		"Animal vs Plant",
		"City vs Country",
		"Past vs Future",
		"Light vs Dark",
		"Hot vs Cold",
		"Big vs Small",
		"Fast vs Slow",
		"Old vs New",
	];

	const symbolSchemes = [
		"Stars vs Hearts",
		"Squares vs Circles",
		"Arrows vs Lines",
		"Shapes vs Numbers",
	];

	const hasMultipleValues =
		emojiSchemes.includes(binaryType) || symbolSchemes.includes(binaryType);

	return !(
		binaryType === "Vowels/Consonants" ||
		binaryType === "Odd/Even" ||
		hasMultipleValues
	);
}

export function isSubstitutionType(cipherType: string): boolean {
	const substitutionTypes = [
		"K1 Aristocrat",
		"K2 Aristocrat",
		"K3 Aristocrat",
		"Random Aristocrat",
		"K1 Patristocrat",
		"K2 Patristocrat",
		"K3 Patristocrat",
		"Random Patristocrat",
		"Caesar",
		"Atbash",
		"Affine",
		"Random Xenocrypt",
		"K1 Xenocrypt",
		"K2 Xenocrypt",
	];
	return substitutionTypes.includes(cipherType);
}

export function processCryptarithmHint(
	item: QuoteData,
	index: number,
	quotes: QuoteData[],
	handleCryptarithmSolutionChange: (
		index: number,
		pos: number,
		value: string,
	) => void,
): void {
	if (!item.cryptarithmData) {
		return;
	}

	const allLetters = extractAllLetters(item.cryptarithmData.digitGroups);
	const allDigitsArr = extractAllDigits(item.cryptarithmData.digitGroups);
	const current = item.cryptarithmSolution || {};
	const unfilled = findUnfilledIndices(allLetters, current);

	if (unfilled.length === 0) {
		return;
	}

	const targetIndex = Math.floor(Math.random() * unfilled.length);
	const target = unfilled[targetIndex];
	if (target === undefined) {
		return;
	}

	const targetDigit = allDigitsArr[target];
	const letterAtTarget = allLetters[target];
	if (letterAtTarget === undefined || targetDigit === undefined) {
		return;
	}

	const correct = letterAtTarget.toUpperCase();
	const positionsToFill = findPositionsToFill(allDigitsArr, targetDigit);

	for (const pos of positionsToFill) {
		handleCryptarithmSolutionChange(index, pos, correct);
	}

	const currentQuote = quotes[index];
	if (currentQuote) {
		quotes[index] = {
			...currentQuote,
			cryptarithmHinted: {
				...(currentQuote.cryptarithmHinted || {}),
				...Object.fromEntries(positionsToFill.map((p) => [p, true])),
			},
		};
	}
}
