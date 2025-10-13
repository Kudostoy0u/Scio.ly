/**
 * Transposition cipher encryption functions
 */

import { getCustomWordBank, FALLBACK_WORDS } from '../../utils/common';
import type { ColumnarTranspositionResult, CryptarithmResult } from '../types/cipherTypes';

/**
 * Encrypts text using Columnar Transposition cipher
 * @param {string} text - Text to encrypt
 * @returns {ColumnarTranspositionResult} Encrypted text and key
 */
export const encryptColumnarTransposition = (text: string): ColumnarTranspositionResult => {
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

/**
 * Encrypts text using Cryptarithm cipher
 * @param {string} text - Text to encrypt
 * @returns {CryptarithmResult} Encrypted text and cryptarithm data
 */
export const encryptCryptarithm = (_text: string): CryptarithmResult => {
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
            [shuffled[usedIndex], shuffled[idx]] = [shuffled[idx], shuffled[usedIndex]];
            usedIndex++;
        }

        for (const letter of letters) {
            if (mapping[letter] !== undefined) continue;
            if (usedIndex >= shuffled.length) return null;
            mapping[letter] = shuffled[usedIndex];
            usedIndex++;
        }

        return mapping;
    };

    const generateCryptarithm = (): {
        equation: string;
        numericExample: string | null;
        digitGroups: Array<{ digits: string; word: string; }>;
    } => {
        const attempts = 50;
        for (let attempt = 0; attempt < attempts; attempt++) {
            const w1 = pickWord();
            const w2 = pickWord();
            const w3 = pickWord();
            
            if (w1.length < 2 || w2.length < 2 || w3.length < 2) continue;
            if (w1.length > 6 || w2.length > 6 || w3.length > 6) continue;
            
            const allLetters = toUniqueLetters(w1 + w2 + w3);
            if (allLetters.length > 10) continue;
            
            const leadingLetters = new Set([w1[0], w2[0], w3[0]]);
            const mapping = assignLetterDigits(allLetters, leadingLetters);
            if (!mapping) continue;
            
            const toNumber = (word: string): number => {
                let num = 0;
                for (const ch of word) {
                    num = num * 10 + mapping[ch];
                }
                return num;
            };
            
            const n1 = toNumber(w1);
            const n2 = toNumber(w2);
            const n3 = toNumber(w3);
            
            if (n1 + n2 === n3) {
                const equation = `${w1} + ${w2} = ${w3}`;
                const numericExample = `${n1} + ${n2} = ${n3}`;
                const digitGroups = [
                    { digits: n1.toString(), word: w1 },
                    { digits: n2.toString(), word: w2 },
                    { digits: n3.toString(), word: w3 }
                ];
                return { equation, numericExample, digitGroups };
            }
        }
        
        // Fallback
        return {
            equation: "SEND + MORE = MONEY",
            numericExample: "9567 + 1085 = 10652",
            digitGroups: [
                { digits: "9567", word: "SEND" },
                { digits: "1085", word: "MORE" },
                { digits: "10652", word: "MONEY" }
            ]
        };
    };

    const cryptarithmData = generateCryptarithm();
    const encrypted = cryptarithmData.equation;

    return { encrypted, cryptarithmData };
};
