import type { QuoteData } from "../../types";
import type { GradingResult } from "../gradingUtils";

const PORTA_TABLE: { [key: string]: string } = {
	AB: "NOPQRSTUVWXYZABCDEFGHIJKLM",
	CD: "OPQRSTUVWXYZNABCDEFGHIJKLM",
	EF: "PQRSTUVWXYZNOABCDEFGHIJKLM",
	GH: "QRSTUVWXYZNOPABCDEFGHIJKLM",
	IJ: "RSTUVWXYZNOPQABCDEFGHIJKLM",
	KL: "STUVWXYZNOPQRABCDEFGHIJKLM",
	MN: "TUVWXYZNOPQRSABCDEFGHIJKLM",
	OP: "UVWXYZNOPQRSTABCDEFGHIJKLM",
	QR: "VWXYZNOPQRSTUABCDEFGHIJKLM",
	ST: "WXYZNOPQRSTUVABCDEFGHIJKLM",
	UV: "XYZNOPQRSTUVWABCDEFGHIJKLM",
	WX: "YZNOPQRSTUVWXABCDEFGHIJKLM",
	YZ: "ZNOPQRSTUVWXYABCDEFGHIJKLM",
};

const CHAR_TO_PAIR: { [key: string]: string } = {
	A: "AB",
	B: "AB",
	C: "CD",
	D: "CD",
	E: "EF",
	F: "EF",
	G: "GH",
	H: "GH",
	I: "IJ",
	J: "IJ",
	K: "KL",
	L: "KL",
	M: "MN",
	N: "MN",
	O: "OP",
	P: "OP",
	Q: "QR",
	R: "QR",
	S: "ST",
	T: "ST",
	U: "UV",
	V: "UV",
	W: "WX",
	X: "WX",
	Y: "YZ",
	Z: "YZ",
};

const PORTA_HEADER_ROW = "ABCDEFGHIJKLM";

const checkPortaCorrectness = (
	quote: QuoteData,
	cipherLetter: string,
	plainLetter: string,
	encryptedLetters: string,
): boolean => {
	const cipherLetterIndex = encryptedLetters.indexOf(cipherLetter);
	if (cipherLetterIndex === -1 || !quote.portaKeyword) {
		return false;
	}
	const keywordChar =
		quote.portaKeyword[cipherLetterIndex % quote.portaKeyword.length];
	if (!keywordChar) {
		return false;
	}
	const pair = CHAR_TO_PAIR[keywordChar];
	if (!pair) {
		return false;
	}
	const portaRow = PORTA_TABLE[pair];
	if (!portaRow) {
		return false;
	}
	let expectedPlainChar: string | undefined;
	const headerIndex = PORTA_HEADER_ROW.indexOf(cipherLetter);
	if (headerIndex !== -1) {
		expectedPlainChar = portaRow[headerIndex];
	} else {
		const keyRowIndex = portaRow.indexOf(cipherLetter);
		if (keyRowIndex !== -1) {
			expectedPlainChar = PORTA_HEADER_ROW[keyRowIndex];
		}
	}
	return Boolean(
		expectedPlainChar && plainLetter.trim().toUpperCase() === expectedPlainChar,
	);
};

export const gradePorta = (quote: QuoteData): GradingResult => {
	let totalInputs = 0;
	let correctInputs = 0;
	let filledInputs = 0;

	if (quote.solution && Object.keys(quote.solution).length > 0) {
		const inputKeys = Object.keys(quote.solution).filter((key) =>
			key.includes("-"),
		);
		totalInputs = inputKeys.length;
		const encryptedLetters = quote.encrypted.replace(/[^A-Z]/g, "");

		for (const solutionKey of inputKeys) {
			const plainLetter = quote.solution[solutionKey];
			if (plainLetter && plainLetter.trim().length > 0) {
				filledInputs++;
				const [cipherLetter] = solutionKey.split("-");
				if (
					cipherLetter &&
					checkPortaCorrectness(
						quote,
						cipherLetter,
						plainLetter,
						encryptedLetters,
					)
				) {
					correctInputs++;
				}
			}
		}
	}

	return {
		totalInputs,
		correctInputs,
		filledInputs,
		score: 0,
		maxScore: 0,
		attemptedScore: 0,
	};
};
