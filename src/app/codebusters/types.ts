export interface QuoteData {
    author: string;
    quote: string;
    encrypted: string;
    cipherType: 'Random Aristocrat' | 'K1 Aristocrat' | 'K2 Aristocrat' | 'K3 Aristocrat' | 'Random Patristocrat' | 'K1 Patristocrat' | 'K2 Patristocrat' | 'K3 Patristocrat' | 'Caesar' | 'Atbash' | 'Affine' | 'Hill 2x2' | 'Hill 3x3' | 'Baconian' | 'Porta' | 'Nihilist' | 'Fractionated Morse' | 'Complete Columnar' | 'Random Xenocrypt' | 'K1 Xenocrypt' | 'K2 Xenocrypt' | 'Checkerboard' | 'Cryptarithm';
    key?: string;        // For k1/k2/k3 variants/porta/nihilist
    matrix?: number[][]; // For hill 2x2
    decryptionMatrix?: number[][]; // For hill 3x3
    portaKeyword?: string; // For porta
    nihilistPolybiusKey?: string; // For nihilist polybius key
    nihilistCipherKey?: string; // For nihilist cipher key
    // Checkerboard
    checkerboardKeyword?: string;
    checkerboardR1?: number;
    checkerboardR2?: number;
    columnarKey?: string; // For complete columnar
    fractionatedKey?: string; // For fractionated morse
    fractionationTable?: { [key: string]: string }; // For fractionated morse table
    xenocryptKey?: string; // For xenocrypt
    caesarShift?: number; // For caesar cipher
    affineA?: number; // For affine cipher (a value)
    affineB?: number; // For affine cipher (b value)
    baconianBinaryType?: string; // For baconian cipher binary representation type
    // Cryptarithm
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
    points?: number; // centralized per-question points
    frequencyNotes?: { [key: string]: string };
    hillSolution?: {
        matrix: string[][];
        plaintext: { [key: number]: string };
    };
    nihilistSolution?: { [key: number]: string }; // For nihilist
    checkerboardSolution?: { [key: number]: string }; // For checkerboard
    fractionatedSolution?: { [key: number]: string }; // For fractionated morse
    columnarSolution?: { [key: number]: string }; // For complete columnar
    xenocryptSolution?: { [key: number]: string }; // For xenocrypt
    cryptarithmSolution?: { [key: number]: string }; // For cryptarithm
    difficulty?: number; // New field for difficulty
    askForKeyword?: boolean; // Whether to ask for keyword/key phrase instead of deciphered text
    keywordSolution?: string; // User's input for the keyword when askForKeyword is true
}

export interface CipherResult {
    encrypted: string;
    key?: string;
    matrix?: number[][];
    decryptionMatrix?: number[][];
    portaKeyword?: string;
    nihilistPolybiusKey?: string;
    nihilistCipherKey?: string;
    checkerboardKeyword?: string;
    checkerboardR1?: number;
    checkerboardR2?: number;
    columnarKey?: string;
    fractionatedKey?: string;
    fractionationTable?: { [key: string]: string };
    xenocryptKey?: string;
    caesarShift?: number;
    affineA?: number;
    affineB?: number;
}

export interface HillSolution {
    matrix: string[][];
    plaintext: { [key: number]: string };
} 