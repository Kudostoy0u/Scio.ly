
export const mod26 = (n: number): number => ((n % 26) + 26) % 26;
export const letterToNumber = (letter: string): number => {
    const upperLetter = letter.toUpperCase();
    if (upperLetter === 'Ñ') return 26; // ñ is position 26 (after z)
    return upperLetter.charCodeAt(0) - 65;
};
export const numberToLetter = (num: number): string => {
    if (num === 26) return 'Ñ'; // ñ is position 26
    return String.fromCharCode(mod26(num) + 65);
};


const generateKeywordAlphabet = (keyword: string): string => {
    const cleanKeyword = keyword.toUpperCase().replace(/[^A-Z]/g, '');
    const used = new Set<string>();
    const result: string[] = [];
    

    for (const char of cleanKeyword) {
        if (!used.has(char)) {
            used.add(char);
            result.push(char);
        }
    }
    

    for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        if (!used.has(char)) {
            result.push(char);
        }
    }
    
    return result.join('');
};



const FALLBACK_WORDS = ['KEYWORD', 'CIPHER', 'SECRET', 'PUZZLE', 'MESSAGE'];


let CUSTOM_WORD_BANK: string[] | null = null;
export const setCustomWordBank = (words: string[]): void => {
    try {
        CUSTOM_WORD_BANK = Array.isArray(words) ? words.map(w => (w || '').toString().toUpperCase()) : null;
    } catch {
        CUSTOM_WORD_BANK = null;
    }
};
export const getCustomWordBank = (): string[] | null => CUSTOM_WORD_BANK;

const generateRandomKeyword = (): string => {
    const bank = getCustomWordBank();
    const list = bank && bank.length > 0 ? bank : FALLBACK_WORDS;
    return list[Math.floor(Math.random() * list.length)].toUpperCase();
};


const generateRandomMatrix = (size: number): number[][] => {
    const matrix: number[][] = [];
    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            matrix[i][j] = Math.floor(Math.random() * 26);
        }
    }
    return matrix;
};

const calculateDeterminant = (matrix: number[][]): number => {
    const size = matrix.length;
    if (size === 2) {
        return mod26(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]);
    } else if (size === 3) {
        return mod26(
            matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
            matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
            matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
        );
    }
    return 0;
};

const isCoprimeWith26 = (det: number): boolean => {
    const coprimeValues = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
    return coprimeValues.includes(det);
};

const generateValidMatrix = (size: number): number[][] => {
    let matrix: number[][];
    let det: number;
    
    do {
        matrix = generateRandomMatrix(size);
        det = calculateDeterminant(matrix);
    } while (!isCoprimeWith26(det));
    
    return matrix;
};

const calculateDecryptionMatrix = (matrix: number[][]): number[][] => {
    const size = matrix.length;
    const det = calculateDeterminant(matrix);
    

    let detInverse = 0;
    for (let i = 1; i < 26; i++) {
        if (mod26(det * i) === 1) {
            detInverse = i;
            break;
        }
    }
    
    if (size === 2) {

        const adjugate = [
            [mod26(matrix[1][1]), mod26(-matrix[0][1])],
            [mod26(-matrix[1][0]), mod26(matrix[0][0])]
        ];
        
        return [
            [mod26(adjugate[0][0] * detInverse), mod26(adjugate[0][1] * detInverse)],
            [mod26(adjugate[1][0] * detInverse), mod26(adjugate[1][1] * detInverse)]
        ];
    } else if (size === 3) {

        const cofactors = [
            [mod26(matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]), 
             mod26(-(matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])), 
             mod26(matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])],
            [mod26(-(matrix[0][1] * matrix[2][2] - matrix[0][2] * matrix[2][1])), 
             mod26(matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]), 
             mod26(-(matrix[0][0] * matrix[2][1] - matrix[0][1] * matrix[2][0]))],
            [mod26(matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]), 
             mod26(-(matrix[0][0] * matrix[1][2] - matrix[0][2] * matrix[1][0])), 
             mod26(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0])]
        ];
        

        return [
            [mod26(cofactors[0][0] * detInverse), mod26(cofactors[1][0] * detInverse), mod26(cofactors[2][0] * detInverse)],
            [mod26(cofactors[0][1] * detInverse), mod26(cofactors[1][1] * detInverse), mod26(cofactors[2][1] * detInverse)],
            [mod26(cofactors[0][2] * detInverse), mod26(cofactors[1][2] * detInverse), mod26(cofactors[2][2] * detInverse)]
        ];
    }
    
    return matrix;
};


export const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};


export const encryptK1Aristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = generateKeywordAlphabet(keyword);
    const cipherAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    

    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        substitutionMap[char] || char
    );

    return { encrypted, key: keyword };
};


export const encryptK2Aristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cipherAlphabet = generateKeywordAlphabet(keyword);
    

    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        substitutionMap[char] || char
    );

    return { encrypted, key: keyword };
};


export const encryptK3Aristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = generateKeywordAlphabet(keyword);
    const cipherAlphabet = generateKeywordAlphabet(keyword);
    

    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        const shiftedIndex = (i + 1) % 26;
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[shiftedIndex];
    }
    
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        substitutionMap[char] || char
    );

    return { encrypted, key: keyword };
};


export const encryptK1Patristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = generateKeywordAlphabet(keyword);
    const cipherAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    

    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    

    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    

    const encryptedLetters = cleanText.split('').map(char => 
        substitutionMap[char] || char
    );
    

    const groupedText = encryptedLetters.reduce((acc: string[], letter: string, i: number) => {
        const groupIndex = Math.floor(i / 5);
        if (!acc[groupIndex]) {
            acc[groupIndex] = '';
        }
        acc[groupIndex] += letter;
        return acc;
    }, []);


    const encrypted = groupedText.join(' ');

    return { encrypted, key: keyword };
};


export const encryptK2Patristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cipherAlphabet = generateKeywordAlphabet(keyword);
    

    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    

    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    

    const encryptedLetters = cleanText.split('').map(char => 
        substitutionMap[char] || char
    );
    

    const groupedText = encryptedLetters.reduce((acc: string[], letter: string, i: number) => {
        const groupIndex = Math.floor(i / 5);
        if (!acc[groupIndex]) {
            acc[groupIndex] = '';
        }
        acc[groupIndex] += letter;
        return acc;
    }, []);


    const encrypted = groupedText.join(' ');

    return { encrypted, key: keyword };
};


export const encryptK3Patristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = generateKeywordAlphabet(keyword);
    const cipherAlphabet = generateKeywordAlphabet(keyword);
    

    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        const shiftedIndex = (i + 1) % 26;
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[shiftedIndex];
    }
    

    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    

    const encryptedLetters = cleanText.split('').map(char => 
        substitutionMap[char] || char
    );
    

    const groupedText = encryptedLetters.reduce((acc: string[], letter: string, i: number) => {
        const groupIndex = Math.floor(i / 5);
        if (!acc[groupIndex]) {
            acc[groupIndex] = '';
        }
        acc[groupIndex] += letter;
        return acc;
    }, []);


    const encrypted = groupedText.join(' ');

    return { encrypted, key: keyword };
};


export const encryptRandomAristocrat = (text: string): { encrypted: string; key: string } => {
    const generateRandomKey = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const shuffled = [...alphabet].sort(() => Math.random() - 0.5);
        return shuffled.join('');
    };

    const key = generateRandomKey();
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        key[letterToNumber(char)] || char
    );

    return { encrypted, key };
};


export const encryptRandomPatristocrat = (text: string): { encrypted: string; key: string } => {
    const generateRandomKey = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const shuffled = [...alphabet].sort(() => Math.random() - 0.5);
        return shuffled.join('');
    };

    const key = generateRandomKey();
    

    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    

    const encryptedLetters = cleanText.split('').map(char => 
        key[letterToNumber(char)] || char
    );
    

    const groupedText = encryptedLetters.reduce((acc: string[], letter: string, i: number) => {
        const groupIndex = Math.floor(i / 5);
        if (!acc[groupIndex]) {
            acc[groupIndex] = '';
        }
        acc[groupIndex] += letter;
        return acc;
    }, []);


    const encrypted = groupedText.join(' ');

    return { encrypted, key };
};


export const encryptCaesar = (text: string): { encrypted: string; shift: number } => {
    const shift = Math.floor(Math.random() * 25) + 1; // 1-25
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => {
        const num = letterToNumber(char);
        return numberToLetter((num + shift) % 26);
    });
    
    return { encrypted, shift };
};


export const encryptAtbash = (text: string): { encrypted: string } => {
    const atbashMap = 'ZYXWVUTSRQPONMLKJIHGFEDCBA';
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        atbashMap[letterToNumber(char)] || char
    );
    
    return { encrypted };
};


export const encryptAffine = (text: string): { encrypted: string; a: number; b: number } => {

    const possibleA = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
    const a = possibleA[Math.floor(Math.random() * possibleA.length)];
    const b = Math.floor(Math.random() * 26);
    
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => {
        const num = letterToNumber(char);
        return numberToLetter((a * num + b) % 26);
    });
    
    return { encrypted, a, b };
};


export const encryptHill2x2 = (text: string): { encrypted: string; matrix: number[][] } => {

    const matrix = generateValidMatrix(2);
    

    const cleanText = text.replace(/[^A-Za-z]/g, '').toUpperCase();
    const paddedText = cleanText.length % 2 === 0 ? cleanText : cleanText + 'X';
    
    let encrypted = '';
    

    for (let i = 0; i < paddedText.length; i += 2) {
        const pair = [letterToNumber(paddedText[i]), letterToNumber(paddedText[i + 1])];
        

        const encryptedPair = [
            mod26(matrix[0][0] * pair[0] + matrix[0][1] * pair[1]),
            mod26(matrix[1][0] * pair[0] + matrix[1][1] * pair[1])
        ];
        

        encrypted += numberToLetter(encryptedPair[0]) + numberToLetter(encryptedPair[1]);
    }
    

    return { encrypted, matrix };
};


export const encryptHill3x3 = (text: string): { encrypted: string; matrix: number[][]; decryptionMatrix: number[][] } => {

    const matrix = generateValidMatrix(3);
    


    const decryptionMatrix = calculateDecryptionMatrix(matrix);
    

    const cleanText = text.replace(/[^A-Za-z]/g, '').toUpperCase();
    const paddedText = cleanText.length % 3 === 0 ? cleanText : cleanText + 'X'.repeat(3 - (cleanText.length % 3));
    
    let encrypted = '';
    

    for (let i = 0; i < paddedText.length; i += 3) {
        const triplet = [
            letterToNumber(paddedText[i]), 
            letterToNumber(paddedText[i + 1]), 
            letterToNumber(paddedText[i + 2])
        ];
        

        const encryptedTriplet = [
            mod26(matrix[0][0] * triplet[0] + matrix[0][1] * triplet[1] + matrix[0][2] * triplet[2]),
            mod26(matrix[1][0] * triplet[0] + matrix[1][1] * triplet[1] + matrix[1][2] * triplet[2]),
            mod26(matrix[2][0] * triplet[0] + matrix[2][1] * triplet[1] + matrix[2][2] * triplet[2])
        ];
        

        encrypted += numberToLetter(encryptedTriplet[0]) + numberToLetter(encryptedTriplet[1]) + numberToLetter(encryptedTriplet[2]);
    }
    

    encrypted = encrypted.match(/.{1,6}/g)?.join(' ') || encrypted;
    
    return { encrypted, matrix, decryptionMatrix };
};


export const encryptPorta = (text: string): { encrypted: string; keyword: string } => {

    const portaKeywords = (getCustomWordBank() && getCustomWordBank()!.length > 0 ? getCustomWordBank()! : FALLBACK_WORDS).map(w => w.toUpperCase());



    const portaTable = {
        'AB': 'NOPQRSTUVWXYZABCDEFGHIJKLM',
        'CD': 'OPQRSTUVWXYZNABCDEFGHIJKLM', 
        'EF': 'PQRSTUVWXYZNOABCDEFGHIJKLM',
        'GH': 'QRSTUVWXYZNOPABCDEFGHIJKLM',
        'IJ': 'RSTUVWXYZNOPQABCDEFGHIJKLM',
        'KL': 'STUVWXYZNOPQRABCDEFGHIJKLM',
        'MN': 'TUVWXYZNOPQRSABCDEFGHIJKLM',
        'OP': 'UVWXYZNOPQRSTABCDEFGHIJKLM',
        'QR': 'VWXYZNOPQRSTUABCDEFGHIJKLM',
        'ST': 'WXYZNOPQRSTUVABCDEFGHIJKLM',
        'UV': 'XYZNOPQRSTUVWABCDEFGHIJKLM',
        'WX': 'YZNOPQRSTUVWXABCDEFGHIJKLM',
        'YZ': 'ZNOPQRSTUVWXYABCDEFGHIJKLM'
    };


    const keyword = portaKeywords[Math.floor(Math.random() * portaKeywords.length)];


    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');


    let encrypted = '';
    for (let i = 0; i < cleanText.length; i++) {
        const keywordChar = keyword[i % keyword.length];
        const textChar = cleanText[i];
        


        const charToPair: { [key: string]: string } = {
            'A': 'AB', 'B': 'AB',
            'C': 'CD', 'D': 'CD',
            'E': 'EF', 'F': 'EF',
            'G': 'GH', 'H': 'GH',
            'I': 'IJ', 'J': 'IJ',
            'K': 'KL', 'L': 'KL',
            'M': 'MN', 'N': 'MN',
            'O': 'OP', 'P': 'OP',
            'Q': 'QR', 'R': 'QR',
            'S': 'ST', 'T': 'ST',
            'U': 'UV', 'V': 'UV',
            'W': 'WX', 'X': 'WX',
            'Y': 'YZ', 'Z': 'YZ'
        };
        
        const pair = charToPair[keywordChar];
        const portaRow = portaTable[pair];
        

        const charCode = textChar.charCodeAt(0);
        
        let cipherChar;
        if (charCode >= 65 && charCode <= 77) {

            const headerRow = 'ABCDEFGHIJKLM';
            const headerIndex = headerRow.indexOf(textChar);
            cipherChar = portaRow[headerIndex];
        } else {

            const keyRowIndex = portaRow.indexOf(textChar);
            const headerRow = 'ABCDEFGHIJKLM';
            cipherChar = headerRow[keyRowIndex];
        }
        encrypted += cipherChar;
    }


    const blockSizes = [3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6]; // weighted distribution
    const blockSize = blockSizes[Math.floor(Math.random() * blockSizes.length)];
    encrypted = encrypted.match(new RegExp(`.{1,${blockSize}}`, 'g'))?.join(' ') || encrypted;

    return { encrypted, keyword };
};

import { selectRandomScheme } from './schemes/baconian-schemes';
import { convertBinaryPattern } from './schemes/pattern-converter';


export const encryptBaconian = (text: string): { encrypted: string; binaryType: string } => {

    const baconianMap: { [key: string]: string } = {
        'A': 'AAAAA', 'B': 'AAAAB', 'C': 'AAABA', 'D': 'AAABB', 'E': 'AABAA',
        'F': 'AABAB', 'G': 'AABBA', 'H': 'AABBB', 'I': 'ABAAA', 'J': 'ABAAA',
        'K': 'ABAAB', 'L': 'ABABA', 'M': 'ABABB', 'N': 'ABBAA', 'O': 'ABBAB',
        'P': 'ABBBA', 'Q': 'ABBBB', 'R': 'BAAAA', 'S': 'BAAAB', 'T': 'BAABA',
        'U': 'BAABB', 'V': 'BAABB', 'W': 'BABAA', 'X': 'BABAB', 'Y': 'BABBA',
        'Z': 'BABBB'
    };


    const cleanedText = text.toUpperCase().replace(/[^A-Z]/g, '');
    

    let binaryPattern = '';
    for (let i = 0; i < cleanedText.length; i++) {
        const letter = cleanedText[i];
        if (baconianMap[letter]) {
            binaryPattern += baconianMap[letter];
        }
    }


    const selectedScheme = selectRandomScheme();


    const convertedPattern = convertBinaryPattern(binaryPattern, selectedScheme);
    

    let encrypted = '';
    for (let i = 0; i < convertedPattern.length; i += 5) {
        if (i > 0) encrypted += ' ';
        encrypted += convertedPattern.slice(i, i + 5);
    }

    return { encrypted: encrypted.trim(), binaryType: selectedScheme.type };
};


export const encryptNihilist = (text: string): { encrypted: string; polybiusKey: string; cipherKey: string } => {

    const generatePolybiusKey = (): string => {
        const list = getCustomWordBank() && getCustomWordBank()!.length > 0 ? getCustomWordBank()! : FALLBACK_WORDS;
        return list[Math.floor(Math.random() * list.length)];
    };

    const generateCipherKey = (): string => {
        const list = getCustomWordBank() && getCustomWordBank()!.length > 0 ? getCustomWordBank()! : FALLBACK_WORDS;
        return list[Math.floor(Math.random() * list.length)];
    };

    const polybiusKey = generatePolybiusKey();
    const cipherKey = generateCipherKey();


    const createPolybiusSquare = (key: string): string[][] => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const usedLetters = new Set<string>();
        const square: string[][] = [];
        

        for (let i = 0; i < 5; i++) {
            square[i] = [];
            for (let j = 0; j < 5; j++) {
                square[i][j] = '';
            }
        }


        let keyIndex = 0;
        let alphabetIndex = 0;
        
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                if (keyIndex < key.length) {
                    const keyChar = key[keyIndex].toUpperCase();
                    if (!usedLetters.has(keyChar)) {
                        square[i][j] = keyChar;
                        usedLetters.add(keyChar);
                        keyIndex++;
                    } else {
                        keyIndex++;
                        j--;
                    }
                } else {

                    while (alphabetIndex < alphabet.length) {
                        const alphaChar = alphabet[alphabetIndex];
                        if (!usedLetters.has(alphaChar)) {
                            square[i][j] = alphaChar;
                            usedLetters.add(alphaChar);
                            alphabetIndex++;
                            break;
                        }
                        alphabetIndex++;
                    }
                }
            }
        }

        return square;
    };


    const letterToCoordinates = (letter: string, square: string[][]): string => {
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                if (square[i][j] === letter) {
                    return `${i + 1}${j + 1}`;
                }
            }
        }
        return '00';
    };




    const polybiusSquare = createPolybiusSquare(polybiusKey);


    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    const plaintextNumbers: number[] = [];
    
    for (const char of cleanText) {
        const coords = letterToCoordinates(char, polybiusSquare);
        plaintextNumbers.push(parseInt(coords));
    }


    const keyNumbers: number[] = [];
    for (const char of cipherKey.toUpperCase()) {
        const coords = letterToCoordinates(char, polybiusSquare);
        keyNumbers.push(parseInt(coords));
    }


    const runningKey: number[] = [];
    for (let i = 0; i < plaintextNumbers.length; i++) {
        runningKey.push(keyNumbers[i % keyNumbers.length]);
    }


    const ciphertextNumbers: number[] = [];
    for (let i = 0; i < plaintextNumbers.length; i++) {
        ciphertextNumbers.push(plaintextNumbers[i] + runningKey[i]);
    }


    const blockSizes = [3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6]; // weighted distribution
    const blockSize = blockSizes[Math.floor(Math.random() * blockSizes.length)];
    

    const numberString = ciphertextNumbers.join(' ');
    

    const blocks: string[] = [];
    const pairs = numberString.split(' ');
    
    for (let i = 0; i < pairs.length; i += blockSize) {
        const block = pairs.slice(i, i + blockSize).join(' ');
        if (block.trim()) {
            blocks.push(block);
        }
    }
    
    const encrypted = blocks.join('  '); // double space between blocks for clear separation

    return { encrypted, polybiusKey, cipherKey };
};


export const encryptFractionatedMorse = (text: string): { encrypted: string; key: string; fractionationTable: { [key: string]: string } } => {

    const morseMap: { [key: string]: string } = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
        'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
        'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
        'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
        'Y': '-.--', 'Z': '--..'
    };
    

    const words = text.toUpperCase().split(/\s+/).map(word => word.replace(/[^A-Z]/g, '')).filter(word => word.length > 0);


    let morseString = '';
    for (let wi = 0; wi < words.length; wi++) {
        const word = words[wi];
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            if (morseMap[char]) {
                morseString += morseMap[char] + 'x';
            }
        }

        if (wi < words.length - 1) {
            morseString += 'x';
        }
    }
    

    morseString = morseString.replace(/xxx/g, 'xx');
    

    while (morseString.length % 3 !== 0) {
        morseString += 'x';
    }
    

    const triplets: string[] = [];
    for (let i = 0; i < morseString.length; i += 3) {
        const triplet = morseString.slice(i, i + 3);
        triplets.push(triplet);
    }
    

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const shuffledAlphabet = [...alphabet].sort(() => Math.random() - 0.5);
    

    const tripletToLetter: { [key: string]: string } = {};
    const letterToTriplet: { [key: string]: string } = {};
    let alphabetIndex = 0;
    

    let encrypted = '';
    for (const triplet of triplets) {

        if (tripletToLetter[triplet]) {
            encrypted += tripletToLetter[triplet];
        } else {

            const letter = shuffledAlphabet[alphabetIndex];
            tripletToLetter[triplet] = letter;
            letterToTriplet[letter] = triplet;
            encrypted += letter;
            alphabetIndex++;
        }
    }
    

    const key = Object.keys(tripletToLetter).join('|');
    

    const filteredFractionationTable: { [key: string]: string } = {};
    Object.entries(tripletToLetter).forEach(([triplet, letter]) => {
        if (triplet !== 'xxx' && !triplet.includes('xxx')) {
            filteredFractionationTable[triplet] = letter;
        }
    });
    
    return { encrypted, key, fractionationTable: filteredFractionationTable };
};


export const encryptColumnarTransposition = (text: string): { encrypted: string; key: string } => {
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    const keyLength = Math.floor(Math.random() * 5) + 3; // 3-7 characters
    

    const key = Array.from({length: keyLength}, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    

    const matrix: string[][] = [];
    for (let i = 0; i < Math.ceil(cleanText.length / keyLength); i++) {
        matrix[i] = [];
        for (let j = 0; j < keyLength; j++) {
            const index = i * keyLength + j;
            matrix[i][j] = index < cleanText.length ? cleanText[index] : 'X';
        }
    }
    

    const keyArray = key.split('');
    const keyOrder = keyArray
        .map((char, index) => ({ char, index }))
        .sort((a, b) => a.char.localeCompare(b.char))
        .map(item => item.index);
    

    let encrypted = '';
    for (const colIndex of keyOrder) {
        for (let i = 0; i < matrix.length; i++) {
            encrypted += matrix[i][colIndex];
        }
    }
    
    return { encrypted, key };
};


export const encryptRandomXenocrypt = (text: string): { encrypted: string; key: string } => {
    const generateRandomXenocryptKey = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split(''); // 27 letters including ñ
        const result = new Array(27);
        let available = [...alphabet];
        
        for (let i = 0; i < 27; i++) {
            available = available.filter(char => char !== alphabet[i]);
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateRandomXenocryptKey();

    const normalizedText = text.toUpperCase()
        .replace(/Á/g, 'A')
        .replace(/É/g, 'E')
        .replace(/Í/g, 'I')
        .replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U')
        .replace(/Ü/g, 'U');

    
    const encrypted = normalizedText.replace(/[A-ZÑ]/g, char => 
        key[letterToNumber(char)] || char
    );

    return { encrypted, key };
};


export const encryptK1Xenocrypt = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = generateKeywordAlphabet(keyword) + 'Ñ';
    const cipherAlphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
    

    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 27; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    

    const normalizedText = text.toUpperCase()
        .replace(/Á/g, 'A')
        .replace(/É/g, 'E')
        .replace(/Í/g, 'I')
        .replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U')
        .replace(/Ü/g, 'U');

    
    const encrypted = normalizedText.replace(/[A-ZÑ]/g, char => 
        substitutionMap[char] || char
    );

    return { encrypted, key: keyword };
};


export const encryptK2Xenocrypt = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
    const cipherAlphabet = generateKeywordAlphabet(keyword) + 'Ñ';
    

    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 27; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    

    const normalizedText = text.toUpperCase()
        .replace(/Á/g, 'A')
        .replace(/É/g, 'E')
        .replace(/Í/g, 'I')
        .replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U')
        .replace(/Ü/g, 'U');

    
    const encrypted = normalizedText.replace(/[A-ZÑ]/g, char => 
        substitutionMap[char] || char
    );

    return { encrypted, key: keyword };
};


export const getLetterFrequencies = (text: string): { [key: string]: number } => {
    const frequencies: { [key: string]: number } = {};
    

    const isXenocrypt = text.includes('Ñ');
    const alphabet = isXenocrypt ? 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    

    alphabet.split('').forEach(letter => {
        frequencies[letter] = 0;
    });
    

    text.split('').forEach(char => {
        if (isXenocrypt) {
            if (/[A-ZÑ]/.test(char)) {
                frequencies[char]++;
            }
        } else {
            if (/[A-Z]/.test(char)) {
                frequencies[char]++;
            }
        }
    });
    

    if (isXenocrypt && !frequencies.hasOwnProperty('Ñ')) {
        frequencies['Ñ'] = 0;
    }
    
    return frequencies;
}; 



export const encryptCheckerboard = (text: string): {
    encrypted: string;
    checkerboardKeyword: string;
    checkerboardR1: number;
    checkerboardR2: number;
} => {
    // 1) build mixed alphabet from a keyword (i/j combined for 25 letters or keep 26; we keep 26 and allow j)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const keywords = (getCustomWordBank() && getCustomWordBank()!.length > 0 ? getCustomWordBank()! : FALLBACK_WORDS).map(w => w.toUpperCase());
    const checkerboardKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    const used = new Set<string>();
    const mixed: string[] = [];
    for (const ch of checkerboardKeyword.toUpperCase()) {
        if (/[A-Z]/.test(ch) && !used.has(ch)) {
            used.add(ch);
            mixed.push(ch);
        }
    }
    for (const ch of alphabet) {
        if (!used.has(ch)) {
            used.add(ch);
            mixed.push(ch);
        }
    }

    // 2) choose two distinct straddle digits r1 and r2
    const digits = [0,1,2,3,4,5,6,7,8,9];
    const checkerboardR1 = digits.splice(Math.floor(Math.random() * digits.length), 1)[0];
    const checkerboardR2 = digits.splice(Math.floor(Math.random() * digits.length), 1)[0];

    // 3) layout board: columns 0..9; top row skips columns r1 and r2

    const topRow: (string | null)[] = new Array(10).fill(null);
    const rowR1: string[] = new Array(10).fill('');
    const rowR2: string[] = new Array(10).fill('');

    let mixedIndex = 0;

    for (let c = 0; c < 10 && mixedIndex < mixed.length; c++) {
        if (c === checkerboardR1 || c === checkerboardR2) continue;
        topRow[c] = mixed[mixedIndex++];
        if (mixedIndex >= mixed.length) break;
    }

    for (let c = 0; c < 10 && mixedIndex < mixed.length; c++) {
        rowR1[c] = mixed[mixedIndex++] || '';
    }
    for (let c = 0; c < 10 && mixedIndex < mixed.length; c++) {
        rowR2[c] = mixed[mixedIndex++] || '';
    }


    const letterToCode: Record<string, string> = {};
    for (let c = 0; c < 10; c++) {
        const ch = topRow[c];
        if (ch && ch.length === 1) {
            letterToCode[ch] = String(c);
        }
    }
    for (let c = 0; c < 10; c++) {
        const ch = rowR1[c];
        if (ch && ch.length === 1) {
            letterToCode[ch] = `${checkerboardR1}${c}`;
        }
    }
    for (let c = 0; c < 10; c++) {
        const ch = rowR2[c];
        if (ch && ch.length === 1) {
            letterToCode[ch] = `${checkerboardR2}${c}`;
        }
    }


    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    let encryptedDigits = '';
    for (const ch of cleanText) {
        const code = letterToCode[ch];
        if (code) encryptedDigits += code;
    }
    return { encrypted: encryptedDigits, checkerboardKeyword, checkerboardR1, checkerboardR2 };
};



export const encryptCryptarithm = (_text: string): {
    encrypted: string;
    cryptarithmData: {
        equation: string;
        numericExample: string | null;
        digitGroups: Array<{
            digits: string;
            word: string;
        }>;
    };
} => {
    const shuffleArray = <T,>(arr: T[]): T[] => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    const custom = getCustomWordBank();
    const wordBank = (custom && custom.length > 0 ? custom : FALLBACK_WORDS).map(w => w.toUpperCase());

    const pickWord = (): string => wordBank[Math.floor(Math.random() * wordBank.length)];

    const toUniqueLetters = (w: string): string[] => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const ch of w) {
            if (/^[A-Z]$/.test(ch) && !seen.has(ch)) {
                seen.add(ch);
                out.push(ch);
            }
        }
        return out;
    };

    const assignLetterDigits = (
        letters: string[],
        leadingLetters: Set<string>
    ): Record<string, number> | null => {
        const digits = [0,1,2,3,4,5,6,7,8,9];

        const shuffled = [...digits].sort(() => Math.random() - 0.5);
        const mapping: Record<string, number> = {};
        let usedIndex = 0;

        for (const lead of Array.from(leadingLetters)) {

            let idx = usedIndex;
            while (idx < shuffled.length && shuffled[idx] === 0) idx++;
            if (idx >= shuffled.length) return null;
            mapping[lead] = shuffled[idx];
            // swap to front to mark used
            [shuffled[usedIndex], shuffled[idx]] = [shuffled[idx], shuffled[usedIndex]];
            usedIndex++;
        }

        for (const letter of letters) {
            if (mapping[letter] !== undefined) continue;
            if (usedIndex >= shuffled.length) return null;
            mapping[letter] = shuffled[usedIndex];
            usedIndex++;
        }

        for (const lead of Array.from(leadingLetters)) {
            if (mapping[lead] === 0) return null;
        }
        return mapping;
    };

    const wordToNumber = (w: string, map: Record<string, number>): number => {
        let s = '';
        for (const ch of w) {
            const digit = map[ch];
            if (digit === undefined || digit === null) return NaN;
            s += digit.toString();
        }
        return parseInt(s, 10);
    };

    const findCompatibleResultWord = (
        resultDigits: string,
        letterToDigit: Record<string, number>,
        candidateWords: string[]
    ): string | null => {

        const digitToLetterKnown: Record<string, string> = {};
        Object.entries(letterToDigit).forEach(([letter, digit]) => {
            digitToLetterKnown[digit.toString()] = letter;
        });

        const usedLetters = new Set(Object.keys(letterToDigit));


        const shuffledCandidates = shuffleArray(candidateWords);
        for (const candidate of shuffledCandidates) {
            if (candidate.length !== resultDigits.length) continue;
            const varDigitToLetter: Record<string, string> = {};
            const seenResultLetters = new Set<string>(usedLetters);
            let ok = true;
            for (let i = 0; i < resultDigits.length && ok; i++) {
                const d = resultDigits[i];
                const expectedKnown = digitToLetterKnown[d];
                const letter = candidate[i];
                if (expectedKnown) {
                    if (letter !== expectedKnown) { ok = false; break; }
                    continue;
                }
                // unknown digit: enforce same digit -> same letter, different digits -> different letters, and not clashing with used letters
                if (!(d in varDigitToLetter)) {
                    if (seenResultLetters.has(letter)) { ok = false; break; }
                    varDigitToLetter[d] = letter;
                    seenResultLetters.add(letter);
                } else {
                    if (varDigitToLetter[d] !== letter) { ok = false; break; }
                }
            }
            if (ok) return candidate;
        }
        return null;
    };


    for (let attempt = 0; attempt < 5000; attempt++) {

        const a = pickWord();
        const b = pickWord();
        if (a === b) continue;

        if (a.length < 3 || b.length < 3) continue;
        if (a.length > 8 || b.length > 8) continue;
        const lettersA = toUniqueLetters(a);
        const lettersB = toUniqueLetters(b);
        const allLetters = Array.from(new Set([...lettersA, ...lettersB]));
        if (allLetters.length > 10) continue;

        const leadingLetters = new Set<string>([a[0], b[0]]);
        const letterToDigit = assignLetterDigits(allLetters, leadingLetters);
        if (!letterToDigit) continue;

        const numA = wordToNumber(a, letterToDigit);
        const numB = wordToNumber(b, letterToDigit);
        if (!Number.isFinite(numA) || !Number.isFinite(numB)) continue;


        const useAddition = Math.random() < 0.7;
        let resultNum: number;
        let op = '+';
        let displayA = a;
        let displayB = b;
        if (useAddition) {
            resultNum = numA + numB;
        } else {

            if (numA === numB) continue;
            if (numA < numB) {
                resultNum = numB - numA;
                op = '-';
                displayA = b;
                displayB = a;
            } else {
                resultNum = numA - numB;
                op = '-';
                displayA = a;
                displayB = b;
            }
        }

        const resultDigits = resultNum.toString();


        const resultWord = findCompatibleResultWord(resultDigits, letterToDigit, wordBank);
        if (!resultWord) continue;


        const digitTakenBy: Record<number, string> = {};
        Object.entries(letterToDigit).forEach(([letter, d]) => { digitTakenBy[d] = letter; });
        let mappingConsistent = true;
        for (let i = 0; i < resultDigits.length; i++) {
            const d = parseInt(resultDigits[i], 10);
            const L = resultWord[i];
            const existing = letterToDigit[L];
            if (existing !== undefined) {
                if (existing !== d) { mappingConsistent = false; break; }
                continue;
            }
            if (digitTakenBy[d] && digitTakenBy[d] !== L) { mappingConsistent = false; break; }

            if (i === 0 && d === 0) { mappingConsistent = false; break; }
            letterToDigit[L] = d;
            digitTakenBy[d] = L;
        }
        if (!mappingConsistent) continue;


        const spaced = (w: string) => w.split('').join(' ');
        const sA = spaced(displayA);
        const sB = spaced(displayB);
        const sR = spaced(resultWord);
        const totalWidth = Math.max(sA.length, sB.length, sR.length);
        const padLeft = (s: string, width: number) => ' '.repeat(Math.max(0, width - s.length)) + s;
        const line1 = '  ' + padLeft(sA, totalWidth);
        const line2 = `${op} ` + padLeft(sB, totalWidth);
        const line3 = ''.padStart(2 + totalWidth, '-');
        const line4 = '  ' + padLeft(sR, totalWidth);
        const eq = `${line1}\n${line2}\n${line3}\n${line4}`;


        // choose not to include equation words in the plaintext groups


        const cryptLettersSet = new Set<string>([...displayA, ...displayB, ...resultWord].filter(ch => /[A-Z]/.test(ch)));
        const isSubsetWord = (w: string) => w.length >= 4 && w.split('').every(ch => cryptLettersSet.has(ch));
        const candidateValues = wordBank.filter(w => isSubsetWord(w) && w !== displayA && w !== displayB && w !== resultWord);
        if (candidateValues.length === 0) continue;

        const shuffledVals = shuffleArray(candidateValues);
        const values: string[] = [];
        const seenVals = new Set<string>();
        for (const w of shuffledVals) {
            if (seenVals.has(w)) continue;
            const n = wordToNumber(w, letterToDigit);
            if (!Number.isFinite(n)) continue;
            values.push(w);
            seenVals.add(w);
            if (values.length >= 3) break;
        }
        if (values.length < 3) continue;
        const extraGroups = values.map(w => ({ digits: w.split('').map(ch => String(letterToDigit[ch])).join(' '), word: spaced(w) }));

        return {
            encrypted: 'Solve the cryptarithm.',
            cryptarithmData: {
                equation: eq,
                numericExample: null,
                digitGroups: shuffleArray(extraGroups)
            }
        };
    }


    return encryptCryptarithm(_text);
};