// Helper function to get Caesar cipher info
function getCaesarCipherInfo(caesarShift?: number): string {
	return caesarShift !== undefined
		? `Caesar Cipher (Shift: ${caesarShift})`
		: "Caesar Cipher";
}

// Helper function to get Affine cipher info
function getAffineCipherInfo(affineA?: number, affineB?: number): string {
	return `Affine Cipher (a=${affineA || "?"}, b=${affineB || "?"})`;
}

// Helper function to get cipher info
export function getCipherInfo(
	cipherType: string,
	caesarShift?: number,
	affineA?: number,
	affineB?: number,
): string {
	const cipherInfoMap: { [key: string]: string } = {
		"Random Aristocrat": "Random Aristocrat Cipher",
		"K1 Aristocrat": "K1 Aristocrat Cipher",
		"K2 Aristocrat": "K2 Aristocrat Cipher",
		"K3 Aristocrat": "K3 Aristocrat Cipher",
		"Random Patristocrat": "Random Patristocrat Cipher",
		"K1 Patristocrat": "K1 Patristocrat Cipher",
		"K2 Patristocrat": "K2 Patristocrat Cipher",
		"K3 Patristocrat": "K3 Patristocrat Cipher",
		Atbash: "Atbash Cipher",
		Nihilist: "Nihilist Substitution Cipher",
		"Fractionated Morse": "Fractionated Morse Cipher",
		"Complete Columnar": "Complete Columnar Cipher",
		"Random Xenocrypt": "Random Xenocrypt Cipher",
		"K1 Xenocrypt": "K1 Xenocrypt Cipher",
		"K2 Xenocrypt": "K2 Xenocrypt Cipher",
		"K3 Xenocrypt": "K3 Xenocrypt Cipher",
	};

	if (cipherInfoMap[cipherType]) {
		return cipherInfoMap[cipherType];
	}

	if (cipherType === "Caesar") {
		return getCaesarCipherInfo(caesarShift);
	}

	if (cipherType === "Affine") {
		return getAffineCipherInfo(affineA, affineB);
	}

	return "Substitution Cipher";
}
