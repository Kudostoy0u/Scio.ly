import {
	FALLBACK_WORDS,
	getCustomWordBank,
} from "@/app/codebusters/utils/common";

// Helper function to get Porta table pair for a character
function getPortaPair(char: string): keyof typeof PORTA_TABLE | undefined {
	const charToPair: { [key: string]: keyof typeof PORTA_TABLE } = {
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
	return charToPair[char];
}

// Helper function to encrypt a single character using Porta cipher
function encryptPortaChar(
	textChar: string,
	portaRow: string,
): string | undefined {
	const charCode = textChar.charCodeAt(0);
	const headerRow = "ABCDEFGHIJKLM";
	if (charCode >= 65 && charCode <= 77) {
		const headerIndex = headerRow.indexOf(textChar);
		return portaRow[headerIndex];
	}
	const keyRowIndex = portaRow.indexOf(textChar);
	return headerRow[keyRowIndex];
}

// Porta cipher table - keys must be letter pairs
const PORTA_TABLE = {
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
} as const;

export const encryptPorta = (
	text: string,
): { encrypted: string; keyword: string } => {
	const customWordBank = getCustomWordBank();
	const wordBank =
		customWordBank && customWordBank.length > 0
			? customWordBank
			: FALLBACK_WORDS;
	const portaKeywords = wordBank.map((w) => w.toUpperCase());

	const keywordIndex = Math.floor(Math.random() * portaKeywords.length);
	const keyword = portaKeywords[keywordIndex];
	if (!keyword) {
		throw new Error("Failed to select keyword for Porta cipher");
	}

	const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");

	let encrypted = "";
	for (let i = 0; i < cleanText.length; i++) {
		const keywordChar = keyword[i % keyword.length];
		const textChar = cleanText[i];
		if (!(keywordChar && textChar)) {
			continue;
		}

		const pair = getPortaPair(keywordChar);
		if (!pair) {
			continue;
		}
		const portaRow = PORTA_TABLE[pair];
		if (!portaRow) {
			continue;
		}

		const cipherChar = encryptPortaChar(textChar, portaRow);
		if (cipherChar) {
			encrypted += cipherChar;
		}
	}

	const blockSizes = [3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6];
	const blockSize = blockSizes[Math.floor(Math.random() * blockSizes.length)];
	encrypted =
		encrypted.match(new RegExp(`.{1,${blockSize}}`, "g"))?.join(" ") ||
		encrypted;

	return { encrypted, keyword };
};
