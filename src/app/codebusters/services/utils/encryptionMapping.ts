import {
	encryptAffine,
	encryptAtbash,
	encryptBaconian,
	encryptCaesar,
	encryptCheckerboard,
	encryptColumnarTransposition,
	encryptCryptarithm,
	encryptFractionatedMorse,
	encryptHill2x2,
	encryptHill3x3,
	k1Aristo as encryptK1Aristocrat,
	k1Patri as encryptK1Patristocrat,
	k1Xeno as encryptK1Xenocrypt,
	k2Aristo as encryptK2Aristocrat,
	k2Patri as encryptK2Patristocrat,
	k2Xeno as encryptK2Xenocrypt,
	k3Aristo as encryptK3Aristocrat,
	k3Patri as encryptK3Patristocrat,
	k3Xeno as encryptK3Xenocrypt,
	encryptNihilist,
	encryptPorta,
	encryptRandomAristocrat,
	encryptRandomPatristocrat,
	encryptRandomXenocrypt,
} from "@/app/codebusters/cipher-utils";
import type { CipherResult } from "@/app/codebusters/types";

export function encryptQuoteByType(
	cipherType: string,
	cleanedQuote: string,
): CipherResult {
	const cipherMap: Record<string, (quote: string) => CipherResult> = {
		"K1 Aristocrat": encryptK1Aristocrat,
		"K2 Aristocrat": encryptK2Aristocrat,
		"K3 Aristocrat": encryptK3Aristocrat,
		"K1 Patristocrat": encryptK1Patristocrat,
		"K2 Patristocrat": encryptK2Patristocrat,
		"K3 Patristocrat": encryptK3Patristocrat,
		"Random Aristocrat": encryptRandomAristocrat,
		"Random Patristocrat": encryptRandomPatristocrat,
		Caesar: encryptCaesar,
		Atbash: encryptAtbash,
		Affine: encryptAffine,
		"Hill 2x2": encryptHill2x2,
		"Hill 3x3": encryptHill3x3,
		Porta: encryptPorta,
		Baconian: encryptBaconian,
		Nihilist: encryptNihilist,
		"Fractionated Morse": encryptFractionatedMorse,
		"Complete Columnar": encryptColumnarTransposition,
		"Random Xenocrypt": encryptRandomXenocrypt,
		"K1 Xenocrypt": encryptK1Xenocrypt,
		"K2 Xenocrypt": encryptK2Xenocrypt,
		"K3 Xenocrypt": encryptK3Xenocrypt,
		Checkerboard: encryptCheckerboard,
		Cryptarithm: encryptCryptarithm,
	};
	const encryptFunction = cipherMap[cipherType];
	if (!encryptFunction) {
		throw new Error(`Unknown cipher type: ${cipherType}`);
	}
	return encryptFunction(cleanedQuote);
}
