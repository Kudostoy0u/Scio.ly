import type { QuoteData } from "../types";

export const parseBaconianTokens = (
	encrypted: string,
): {
	groupParsedIdxs: number[];
	groupTokens: string[];
} => {
	const groupTokens = encrypted
		.trim()
		.split(/\s+/)
		.filter((token) => token.length > 0);
	const groupParsedIdxs = groupTokens.map((_, idx) => idx);
	return { groupParsedIdxs, groupTokens };
};

export const getBaconianStartIndex = (
	letterOnlyPlain: string,
	quote: QuoteData,
): number => {
	const words = (quote.quote.match(/[A-Za-z]+/g) || [])
		.map((w) => w.toUpperCase())
		.filter((w) => w.length >= 3)
		.sort((a, b) => a.length - b.length);
	const cribWord = words[0];
	const cribStart = cribWord ? letterOnlyPlain.indexOf(cribWord) : 0;
	return cribStart >= 0 ? cribStart + (cribWord ? cribWord.length : 0) : 0;
};

export const findBaconianTargetIndex = (
	letterOnlyPlain: string,
	quote: QuoteData,
	groupTokens: string[],
	groupParsedIdxs: number[],
): number => {
	const startLetterIdx = getBaconianStartIndex(letterOnlyPlain, quote);
	const currentSolution = (quote.solution || {}) as { [key: number]: string };
	for (let k = startLetterIdx; k < groupTokens.length; k++) {
		const parsedIdx = groupParsedIdxs[k];
		if (
			parsedIdx !== undefined &&
			(!currentSolution[parsedIdx] || currentSolution[parsedIdx].length === 0)
		) {
			return k;
		}
	}
	return -1;
};

export const updateBaconianQuote = (
	q: QuoteData,
	groupTokens: string[],
	groupParsedIdxs: number[],
	targetToken: string,
	correctPlainLetter: string,
): QuoteData => {
	const prevSol = (q.solution || {}) as { [key: number]: string };
	const prevHinted = q.baconianHinted || {};
	const updated: { [key: number]: string } = { ...prevSol };
	const updatedHinted: { [key: number]: boolean } = { ...prevHinted };
	groupTokens.forEach((tok, orderIdx) => {
		if (tok === targetToken) {
			const pIdx = groupParsedIdxs[orderIdx];
			if (pIdx !== undefined) {
				updated[pIdx] = correctPlainLetter;
				updatedHinted[pIdx] = true;
			}
		}
	});
	return {
		...q,
		solution: updated,
		baconianHinted: updatedHinted,
	} as QuoteData;
};

export const revealBaconianLetter = (
	questionIndex: number,
	quote: QuoteData,
	quotes: QuoteData[],
	setQuotes: (quotes: QuoteData[]) => void,
): boolean => {
	if (quote.cipherType !== "Baconian") {
		return false;
	}
	const { groupParsedIdxs, groupTokens } = parseBaconianTokens(quote.encrypted);
	const letterOnlyPlain = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
	const targetGroupOrderIdx = findBaconianTargetIndex(
		letterOnlyPlain,
		quote,
		groupTokens,
		groupParsedIdxs,
	);
	if (targetGroupOrderIdx === -1) {
		return true;
	}
	const correctPlainLetter = letterOnlyPlain[targetGroupOrderIdx];
	const targetToken = groupTokens[targetGroupOrderIdx];
	if (correctPlainLetter === undefined || targetToken === undefined) {
		return true;
	}
	const newQuotes = quotes.map((q, idx) => {
		if (idx !== questionIndex) {
			return q;
		}
		return updateBaconianQuote(
			q,
			groupTokens,
			groupParsedIdxs,
			targetToken,
			correctPlainLetter,
		);
	});
	if (newQuotes) {
		setQuotes(newQuotes);
	}
	return true;
};
