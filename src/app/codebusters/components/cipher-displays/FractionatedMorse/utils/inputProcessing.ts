const MORSE_CHAR_REGEX = /[.\-x]/i;

// Helper function to filter and process input value
export function processInputValue(inputValue: string): string {
	const filteredValue = inputValue
		.split("")
		.filter((char) => MORSE_CHAR_REGEX.test(char))
		.join("")
		.toUpperCase();
	let finalValue = filteredValue.replace(/X/g, "x");
	finalValue = finalValue.replace(/xxx/g, "xx");
	return finalValue;
}

// Helper function to check if letter is already used
export function isLetterAlreadyUsed(
	newLetter: string,
	currentValue: string,
	usedTriplets: string[],
	solution: Record<string, string> | undefined,
): boolean {
	if (newLetter === currentValue) {
		return false;
	}
	const existingLetters = usedTriplets
		.map((t) => solution?.[`replacement_${t}`] || "")
		.filter((letter) => letter !== "");
	return existingLetters.includes(newLetter);
}
