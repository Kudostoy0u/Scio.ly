/**
 * Types and interfaces for cipher utilities
 */

export interface HillCipherResult {
	encrypted: string;
	matrix: number[][];
	decryptionMatrix: number[][];
}

export interface BaconianCipherResult {
	encrypted: string;
	binaryType: string;
}

export interface NihilistCipherResult {
	encrypted: string;
	polybiusKey: string;
	cipherKey: string;
}

export interface FractionatedMorseResult {
	encrypted: string;
	key: string;
	fractionationTable: { [key: string]: string };
}

export interface ColumnarTranspositionResult {
	encrypted: string;
	key: string;
}

export interface CryptarithmResult {
	encrypted: string;
	cryptarithmData: {
		equation: string;
		numericExample: string | null;
		digitGroups: Array<{
			digits: string;
			word: string;
		}>;
		operation?: "+" | "-";
	};
}

export interface CheckerboardResult {
	encrypted: string;
	checkerboardRowKey: string;
	checkerboardColKey: string;
	checkerboardPolybiusKey: string;
	checkerboardUsesIJ: boolean;
	blockSize: number;
}
