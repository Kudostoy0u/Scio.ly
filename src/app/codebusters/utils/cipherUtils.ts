// Helper function to check if cipher type is substitution
export const isSubstitutionCipher = (
	cipherType: string | undefined,
): boolean => {
	const substitutionTypes = [
		"K1 Aristocrat",
		"K2 Aristocrat",
		"K3 Aristocrat",
		"K1 Patristocrat",
		"K2 Patristocrat",
		"K3 Patristocrat",
		"Random Aristocrat",
		"Random Patristocrat",
		"Caesar",
		"Atbash",
		"Affine",
		"Xenocrypt",
	];
	return substitutionTypes.includes(cipherType || "");
};
