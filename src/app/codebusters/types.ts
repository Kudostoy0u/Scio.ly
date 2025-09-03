export interface QuoteData {
    author: string;
    quote: string;
    encrypted: string;
    cipherType: 'Random Aristocrat' | 'K1 Aristocrat' | 'K2 Aristocrat' | 'K3 Aristocrat' | 'Random Patristocrat' | 'K1 Patristocrat' | 'K2 Patristocrat' | 'K3 Patristocrat' | 'Caesar' | 'Atbash' | 'Affine' | 'Hill 2x2' | 'Hill 3x3' | 'Baconian' | 'Porta' | 'Nihilist' | 'Fractionated Morse' | 'Complete Columnar' | 'Random Xenocrypt' | 'K1 Xenocrypt' | 'K2 Xenocrypt' | 'K3 Xenocrypt' | 'Checkerboard' | 'Cryptarithm';
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
    baconianBinaryType?: string;

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
    nihilistSolution?: { [key: number]: string };
    checkerboardSolution?: { [key: number]: string };
    fractionatedSolution?: { [key: number]: string };
    columnarSolution?: { [key: number]: string };
    xenocryptSolution?: { [key: number]: string };
    cryptarithmSolution?: { [key: number]: string };
    difficulty?: number;
    askForKeyword?: boolean;
    keywordSolution?: string;
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