/**
 * Baconian cipher encryption function
 */

import { selectRandomScheme } from '../../schemes/baconian-schemes';
import { convertBinaryPattern } from '../../schemes/pattern-converter';
import type { BaconianCipherResult } from '../types/cipherTypes';

/**
 * Encrypts text using Baconian cipher
 * @param {string} text - Text to encrypt
 * @returns {BaconianCipherResult} Encrypted text and binary type
 */
export const encryptBaconian = (text: string): BaconianCipherResult => {
    const baconianMap: { [key: string]: string } = {
        'A': 'AAAAA', 'B': 'AAAAB', 'C': 'AAABA', 'D': 'AAABB', 'E': 'AABAA',
        'F': 'AABAB', 'G': 'AABBA', 'H': 'AABBB', 'I': 'ABAAA', 'J': 'ABAAA',
        'K': 'ABAAB', 'L': 'ABABA', 'M': 'ABABB', 'N': 'ABBAA', 'O': 'ABBAB',
        'P': 'ABBBA', 'Q': 'ABBBB', 'R': 'BAAAA', 'S': 'BAAAB', 'T': 'BAABA',
        'U': 'BAABB', 'V': 'BAABB', 'W': 'BABAA', 'X': 'BABAB', 'Y': 'BABBA',
        'Z': 'BABBB'
    };

    // Clean text and convert to binary
    const cleanedText = text.toUpperCase().replace(/[^A-Z]/g, '');
    let binaryPattern = '';
    
    for (let i = 0; i < cleanedText.length; i++) {
        const letter = cleanedText[i];
        if (baconianMap[letter]) {
            binaryPattern += baconianMap[letter];
        }
    }

    // Select random scheme and convert pattern
    const selectedScheme = selectRandomScheme();
    const convertedPattern = convertBinaryPattern(binaryPattern, selectedScheme);
    
    return { encrypted: convertedPattern, binaryType: selectedScheme.type };
};
