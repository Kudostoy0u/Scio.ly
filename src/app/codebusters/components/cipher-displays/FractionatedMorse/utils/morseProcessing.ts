// Helper function to create morse map
export function createMorseMap(): { [key: string]: string } {
	return {
		A: ".-",
		B: "-...",
		C: "-.-.",
		D: "-..",
		E: ".",
		F: "..-.",
		G: "--.",
		H: "....",
		I: "..",
		J: ".---",
		K: "-.-",
		L: ".-..",
		M: "--",
		N: "-.",
		O: "---",
		P: ".--.",
		Q: "--.-",
		R: ".-.",
		S: "...",
		T: "-",
		U: "..-",
		V: "...-",
		W: ".--",
		X: "-..-",
		Y: "-.--",
		Z: "--..",
	};
}

// Helper function to create reverse morse map
export function createReverseMorseMap(morseMap: { [key: string]: string }): {
	[key: string]: string;
} {
	const reverseMap: { [key: string]: string } = {};
	for (const [letter, morse] of Object.entries(morseMap)) {
		reverseMap[morse] = letter;
	}
	return reverseMap;
}

const MORSE_PATTERN_REGEX = /[.-]/;

function addLetterToPlaintext(
	morse: string,
	morseStartIndex: number,
	chunkStartIndex: number,
	plaintextLetters: string[],
	reverseMorseMap: { [key: string]: string },
): void {
	const letter = reverseMorseMap[morse];
	if (!letter) {
		return;
	}
	const inputIndex = chunkStartIndex + Math.floor(morseStartIndex / 3);
	if (inputIndex < plaintextLetters.length) {
		plaintextLetters[inputIndex] += letter;
	}
}

function addSlashAtIndex(
	morseIndex: number,
	chunkStartIndex: number,
	plaintextLetters: string[],
): void {
	const inputIndex = chunkStartIndex + Math.floor(morseIndex / 3);
	if (inputIndex >= plaintextLetters.length) {
		return;
	}
	const existing = plaintextLetters[inputIndex];
	if (existing && !existing.includes("/")) {
		plaintextLetters[inputIndex] = `${existing}/`;
	}
}

export function calculatePlaintextLetters(
	triplets: string[],
	incompleteTriplets: Set<number> = new Set(),
): string[] {
	const morseMap = createMorseMap();
	const reverseMorseMap = createReverseMorseMap(morseMap);
	const plaintextLetters: string[] = Array.from(
		{ length: triplets.length },
		() => "",
	);
	const isFilledTriplet = (index: number) =>
		!incompleteTriplets.has(index) && triplets[index]?.length === 3;

	let chunkStart = 0;
	while (chunkStart < triplets.length) {
		if (!isFilledTriplet(chunkStart)) {
			chunkStart++;
			continue;
		}

		let chunkEnd = chunkStart;
		while (chunkEnd < triplets.length && isFilledTriplet(chunkEnd)) {
			chunkEnd++;
		}

		const morseString = triplets.slice(chunkStart, chunkEnd).join("");
		let currentMorse = "";
		let morseStartIndex = 0;

		for (let i = 0; i < morseString.length; i++) {
			const char = morseString[i];
			if (char === undefined) {
				continue;
			}

			if (char === "x") {
				if (currentMorse.length > 0) {
					addLetterToPlaintext(
						currentMorse,
						morseStartIndex,
						chunkStart,
						plaintextLetters,
						reverseMorseMap,
					);
					currentMorse = "";
				}

				if (morseString[i + 1] === "x") {
					addSlashAtIndex(i, chunkStart, plaintextLetters);
					i++;
				}
				continue;
			}

			if (currentMorse.length === 0) {
				morseStartIndex = i;
			}
			currentMorse += char;
		}

		if (currentMorse.length > 0) {
			addLetterToPlaintext(
				currentMorse,
				morseStartIndex,
				chunkStart,
				plaintextLetters,
				reverseMorseMap,
			);
		}

		chunkStart = chunkEnd;
	}

	const filteredPlaintextLetters = plaintextLetters.map((letters) =>
		letters === "xxx" || letters.includes("xxx") ? "" : letters,
	);

	return filteredPlaintextLetters;
}

export function removeTrailingPartialTriplets(triplets: string[]): void {
	const morseJoined = triplets.join("");
	const lastSeparator = morseJoined.lastIndexOf("x");
	if (lastSeparator !== -1) {
		const trailing = morseJoined.slice(lastSeparator + 1);
		const isTrailingPartial = MORSE_PATTERN_REGEX.test(trailing);
		if (isTrailingPartial) {
			const dropFrom = Math.floor((lastSeparator + 1) / 3);
			triplets.splice(dropFrom);
		}
	}
}
