/**
 * Checkerboard cipher encryption function
 */

import { createPolybiusSquare, letterToCoordinates } from '../utils/cipherUtils';
import type { CheckerboardResult } from '../types/cipherTypes';

/**
 * Encrypts text using Checkerboard cipher
 * @param {string} text - Text to encrypt
 * @returns {CheckerboardResult} Encrypted text and checkerboard configuration
 */
export const encryptCheckerboard = (text: string): CheckerboardResult => {
    // Generate random keys
    const rowKey = Array.from({length: 5}, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    
    const colKey = Array.from({length: 5}, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    
    const polybiusKeyRaw = Array.from({length: 8}, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');

    // Create Polybius square
    const polybiusSquare = createPolybiusSquare(polybiusKeyRaw);

    // Clean text
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');

    // Convert letters to coordinates
    const positions: Array<{ r: number; c: number }> = [];
    for (const char of cleanText) {
        const coords = letterToCoordinates(char, polybiusSquare);
        const r = parseInt(coords[0]) - 1;
        const c = parseInt(coords[1]) - 1;
        positions.push({ r, c });
    }

    // Convert coordinates to tokens
    const tokens: string[] = [];
    for (const pos of positions) {
        // Row-first token using raw key letters (no I/J merging for labels)
        const r = rowKey[pos.r];
        const c = colKey[pos.c];
        tokens.push(r + c);
    }

    // Determine block size distribution: 20% -> 0, 20% -> 4, 40% -> 5, 20% -> 6
    const roll = Math.random();
    const blockSize = roll < 0.2 ? 0 : roll < 0.4 ? 4 : roll < 0.8 ? 5 : 6;
    let encrypted = '';
    
    if (blockSize === 0) {
        // Map spaces in original quote to gaps between tokens
        const original = text;
        let ti = 0;
        for (let i = 0; i < original.length && ti < tokens.length; i++) {
            const ch = original[i];
            if (/^[A-Za-z]$/.test(ch)) {
                if (encrypted.length > 0 && !encrypted.endsWith(' ')) encrypted += ' ';
                encrypted += tokens[ti++];
            } else if (ch === ' ') {
                if (!encrypted.endsWith('   ')) encrypted += '   ';
            }
        }
        while (ti < tokens.length) {
            if (encrypted.length > 0 && !encrypted.endsWith(' ')) encrypted += ' ';
            encrypted += tokens[ti++];
        }
    } else {
        const grouped: string[] = [];
        for (let i = 0; i < tokens.length; i += blockSize) {
            grouped.push(tokens.slice(i, i + blockSize).join(' '));
        }
        encrypted = grouped.join('   '); // triple-space between blocks for clarity
    }

    return {
        encrypted,
        checkerboardRowKey: rowKey,
        checkerboardColKey: colKey,
        checkerboardPolybiusKey: polybiusKeyRaw,
        checkerboardUsesIJ: true,
        blockSize
    };
};
