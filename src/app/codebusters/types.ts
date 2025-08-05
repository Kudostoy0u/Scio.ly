export interface QuoteData {
    author: string;
    quote: string;
    encrypted: string;
    cipherType: 'Random Aristocrat' | 'K1 Aristocrat' | 'K2 Aristocrat' | 'K3 Aristocrat' | 'Random Patristocrat' | 'K1 Patristocrat' | 'K2 Patristocrat' | 'K3 Patristocrat' | 'Caesar' | 'Atbash' | 'Affine' | 'Hill' | 'Baconian' | 'Porta' | 'Nihilist' | 'Fractionated Morse' | 'Columnar Transposition' | 'Xenocrypt';
    key?: string;        // For k1/k2/k3 variants/porta/nihilist
    matrix?: number[][]; // For hill
    portaKeyword?: string; // For porta
    nihilistKey?: string; // For nihilist
    columnarKey?: string; // For columnar transposition
    fractionatedKey?: string; // For fractionated morse
    fractionationTable?: { [key: string]: string }; // For fractionated morse table
    xenocryptKey?: string; // For xenocrypt
    caesarShift?: number; // For caesar cipher
    affineA?: number; // For affine cipher (a value)
    affineB?: number; // For affine cipher (b value)
    solution?: { [key: string]: string };
    frequencyNotes?: { [key: string]: string };
    hillSolution?: {
        matrix: string[][];
        plaintext: { [key: number]: string };
    };
    nihilistSolution?: { [key: number]: string }; // For nihilist
    fractionatedSolution?: { [key: number]: string }; // For fractionated morse
    columnarSolution?: { [key: number]: string }; // For columnar transposition
    xenocryptSolution?: { [key: number]: string }; // For xenocrypt
    difficulty?: number; // New field for difficulty
}

export interface CipherResult {
    encrypted: string;
    key?: string;
    matrix?: number[][];
    portaKeyword?: string;
    nihilistKey?: string;
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