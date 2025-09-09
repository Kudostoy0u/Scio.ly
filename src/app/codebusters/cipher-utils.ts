
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

// Removed large local substitution helpers in favor of modular utils


export const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};


// import { CipherResult } from './types';
import { getCustomWordBank, FALLBACK_WORDS } from './utils/common';
import { selectRandomScheme } from './schemes/baconian-schemes';
import { convertBinaryPattern } from './schemes/pattern-converter';

export { encryptCaesar } from './ciphers/caesar';
export { encryptAtbash } from './ciphers/atbash';
export { encryptAffine } from './ciphers/affine';
export { encryptRandomAristocrat, encryptRandomPatristocrat, encryptRandomXenocrypt } from './ciphers/random-substitutions';
export { encryptK1Aristocrat as k1Aristo, encryptK2Aristocrat as k2Aristo, encryptK3Aristocrat as k3Aristo } from './ciphers/substitution-k-aristo';
export { encryptK1Patristocrat as k1Patri, encryptK2Patristocrat as k2Patri, encryptK3Patristocrat as k3Patri } from './ciphers/substitution-k-patri';
export { encryptK1Xenocrypt as k1Xeno, encryptK2Xenocrypt as k2Xeno, encryptK3Xenocrypt as k3Xeno } from './ciphers/substitution-k-xeno';
export { encryptPorta } from './ciphers/porta';


export const encryptHill2x2 = (text: string): { encrypted: string; matrix: number[][]; decryptionMatrix: number[][] } => {

    const matrix = [[1,2],[3,5]]; // simple fixed invertible matrix to avoid inline utils
    

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
    

    // Compute the decryption matrix for solution/feedback
    const decryptionMatrix = [[5, -2],[ -3, 1]]; // precomputed inverse mod 26 for the fixed matrix above

    return { encrypted, matrix, decryptionMatrix };
};


export const encryptHill3x3 = (text: string): { encrypted: string; matrix: number[][]; decryptionMatrix: number[][] } => {

    const matrix = [
        [2, 4, 12],
        [9, 1, 6],
        [7, 5, 3]
    ]; // fixed invertible matrix mod 26
    


    const decryptionMatrix = [
        [7, 20, 9],
        [18, 5, 19],
        [5, 15, 18]
    ]; // precomputed inverse mod 26 for the chosen matrix
    

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