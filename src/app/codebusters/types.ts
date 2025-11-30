/**
 * Codebusters type definitions for Science Olympiad platform
 * Comprehensive type definitions for the Codebusters cipher system
 */

/**
 * Quote data interface for Codebusters ciphers
 * Contains all necessary data for encrypted quotes and their solutions
 */
export interface QuoteData {
  /** Unique identifier for the quote */
  id?: string;
  /** Author of the original quote */
  author: string;
  /** Original plaintext quote */
  quote: string;
  /** Encrypted version of the quote */
  encrypted: string;
  /** Type of cipher used for encryption */
  cipherType:
    | "Random Aristocrat"
    | "K1 Aristocrat"
    | "K2 Aristocrat"
    | "K3 Aristocrat"
    | "Random Patristocrat"
    | "K1 Patristocrat"
    | "K2 Patristocrat"
    | "K3 Patristocrat"
    | "Caesar"
    | "Atbash"
    | "Affine"
    | "Hill 2x2"
    | "Hill 3x3"
    | "Baconian"
    | "Porta"
    | "Nihilist"
    | "Fractionated Morse"
    | "Complete Columnar"
    | "Random Xenocrypt"
    | "K1 Xenocrypt"
    | "K2 Xenocrypt"
    | "K3 Xenocrypt"
    | "Checkerboard"
    | "Cryptarithm";
  /** Optional cipher key */
  key?: string;
  /** Optional K-shift value for K-ciphers */
  kShift?: number;
  /** Optional matrix for Hill ciphers */
  matrix?: number[][];
  /** Optional decryption matrix for Hill ciphers */
  decryptionMatrix?: number[][];
  /** Optional Porta cipher keyword */
  portaKeyword?: string;
  /** Optional Nihilist Polybius key */
  nihilistPolybiusKey?: string;
  /** Optional Nihilist cipher key */
  nihilistCipherKey?: string;

  /** Optional Checkerboard row key */
  checkerboardRowKey?: string;
  /** Optional Checkerboard column key */
  checkerboardColKey?: string;
  /** Optional Checkerboard Polybius key */
  checkerboardPolybiusKey?: string;
  /** Whether Checkerboard uses I/J combination */
  checkerboardUsesIJ?: boolean;
  /** Optional Columnar cipher key */
  columnarKey?: string;
  /** Optional Fractionated Morse key */
  fractionatedKey?: string;
  /** Optional fractionation table for Fractionated Morse */
  fractionationTable?: { [key: string]: string };
  /** Optional Xenocrypt key */
  xenocryptKey?: string;
  /** Optional Caesar cipher shift value */
  caesarShift?: number;
  /** Optional Affine cipher A coefficient */
  affineA?: number;
  /** Optional Affine cipher B coefficient */
  affineB?: number;
  /** Optional Baconian binary type */
  baconianBinaryType?: string;
  /** Optional block size for block ciphers */
  blockSize?: number;

  cryptarithmData?: {
    equation: string;
    numericExample: string | null;
    digitGroups: Array<{
      digits: string;
      word: string;
    }>;
  };
  solution?: { [key: string]: string };
  cryptarithmHinted?: { [key: number]: boolean }; // positions revealed by hint
  nihilistHinted?: { [key: number]: boolean }; // positions revealed by hint
  checkerboardHinted?: { [key: number]: boolean }; // positions revealed by hint
  baconianHinted?: { [key: number]: boolean }; // positions revealed by hint
  points?: number; // centralized per-question points
  frequencyNotes?: { [key: string]: string };
  hillSolution?: {
    matrix: string[][];
    plaintext: { [key: number]: string };
  };
  nihilistSolution?: { [key: number]: string };
  checkerboardSolution?: { [key: number]: string };
  fractionatedSolution?: { [key: number]: string };
  columnarSolution?: { [key: number]: string };
  xenocryptSolution?: { [key: number]: string };
  cryptarithmSolution?: { [key: number]: string };
  difficulty?: number;
  askForKeyword?: boolean;
  keywordSolution?: string;
  plainAlphabet?: string;
  cipherAlphabet?: string;
  /** Division (B or C) */
  division?: string;
  /** Character length of the quote */
  charLength?: number;
  /** Hint for the cipher */
  hint?: string;
  /** Optional crib word for hints */
  cribWord?: string;
  /** Language of the quote (e.g., "en", "es") */
  language?: string;
}

export interface CipherResult {
  encrypted: string;
  key?: string;
  keyword?: string;
  kShift?: number;
  plainAlphabet?: string;
  cipherAlphabet?: string;
  matrix?: number[][];
  decryptionMatrix?: number[][];
  portaKeyword?: string;
  nihilistPolybiusKey?: string;
  nihilistCipherKey?: string;
  checkerboardRowKey?: string;
  checkerboardColKey?: string;
  checkerboardPolybiusKey?: string;
  checkerboardUsesIJ?: boolean;
  columnarKey?: string;
  fractionatedKey?: string;
  fractionationTable?: { [key: string]: string };
  xenocryptKey?: string;
  caesarShift?: number;
  shift?: number;
  affineA?: number;
  affineB?: number;
  a?: number;
  b?: number;
  blockSize?: number;
  binaryType?: string;
  polybiusKey?: string;
  cipherKey?: string;
  cryptarithmData?: {
    equation: string;
    numericExample: string | null;
    digitGroups: Array<{
      digits: string;
      word: string;
    }>;
  };
}

export interface HillSolution {
  matrix: string[][];
  plaintext: { [key: number]: string };
}
