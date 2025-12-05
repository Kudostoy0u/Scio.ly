import type { BaconianScheme } from "./baconian-schemes";

// Helper function to convert category type
function convertCategoryType(pattern: string, scheme: BaconianScheme): string {
	const vowels = "AEIOU";
	const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
	const odd = "ACEGIKMOQSUWY";
	const even = "BDFHJLNPRTVXZ";

	const zeroSet = scheme.zero as string;
	const oneSet = scheme.one as string;

	const pick = (set: string) =>
		set[Math.floor(Math.random() * set.length)] ?? "";
	let out = "";
	for (const bit of pattern) {
		if (scheme.type === "Vowels/Consonants") {
			out += bit === "A" ? pick(vowels) : pick(consonants);
		} else if (scheme.type === "Odd/Even") {
			out += bit === "A" ? pick(odd) : pick(even);
		} else {
			out += bit === "A" ? pick(zeroSet) : pick(oneSet);
		}
	}
	return out;
}

// Helper function to convert set type
function convertSetType(pattern: string, scheme: BaconianScheme): string {
	const zeroSet = Array.isArray(scheme.zero) ? scheme.zero : [scheme.zero];
	const oneSet = Array.isArray(scheme.one) ? scheme.one : [scheme.one];
	return pattern
		.split("")
		.map((char, index) => {
			if (char === "A") {
				return zeroSet[index % zeroSet.length];
			}
			return oneSet[index % oneSet.length];
		})
		.join("");
}

// Helper function to convert formatting type
function convertFormattingType(
	pattern: string,
	scheme: BaconianScheme,
): string {
	if (scheme.type === "Accented vs Plain") {
		const plainLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		const accentedLetters = "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß";
		return pattern
			.split("")
			.map((char) => {
				if (char === "A") {
					return (
						accentedLetters[
							Math.floor(Math.random() * accentedLetters.length)
						] ?? ""
					);
				}
				return (
					plainLetters[Math.floor(Math.random() * plainLetters.length)] ?? ""
				);
			})
			.join("");
	}

	return pattern;
}

export function convertBinaryPattern(
	pattern: string,
	scheme: BaconianScheme,
): string {
	switch (scheme.renderType) {
		case "direct":
			return pattern
				.replace(/A/g, scheme.zero as string)
				.replace(/B/g, scheme.one as string);

		case "category":
			return convertCategoryType(pattern, scheme);

		case "set":
			return convertSetType(pattern, scheme);

		case "formatting":
			return convertFormattingType(pattern, scheme);

		default:
			return pattern;
	}
}
