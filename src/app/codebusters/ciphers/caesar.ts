import { letterToNumber, numberToLetter } from "@/app/codebusters/utils/common";

export const encryptCaesar = (
	text: string,
): { encrypted: string; shift?: number } => {
	const shift = Math.floor(Math.random() * 25) + 1; // 1-25
	const encrypted = text.toUpperCase().replace(/[A-Z]/g, (char) => {
		const num = letterToNumber(char);
		return numberToLetter((num + shift) % 26);
	});
	const reveal = Math.random() < 0.3; // 30% known shift, 70% unknown
	return reveal ? { encrypted, shift } : { encrypted };
};
