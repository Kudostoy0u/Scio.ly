/**
 * Hill cipher encryption functions
 */

import { mod26 } from '../utils/cipherUtils';
import type { HillCipherResult } from '../types/cipherTypes';

/**
 * Encrypts text using a 2x2 Hill cipher
 * @param {string} text - Text to encrypt
 * @returns {HillCipherResult} Encrypted text and matrices
 */
export const encryptHill2x2 = (text: string): HillCipherResult => {
    // Generate random 2x2 matrix with determinant coprime to 26
    let matrix: number[][];
    let det: number;
    do {
        matrix = [
            [Math.floor(Math.random() * 26), Math.floor(Math.random() * 26)],
            [Math.floor(Math.random() * 26), Math.floor(Math.random() * 26)]
        ];
        det = mod26(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]);
    } while (det === 0 || gcd(det, 26) !== 1);

    // Calculate decryption matrix
    const detInv = modInverse(det, 26);
    const decryptionMatrix = [
        [mod26(matrix[1][1] * detInv), mod26(-matrix[0][1] * detInv)],
        [mod26(-matrix[1][0] * detInv), mod26(matrix[0][0] * detInv)]
    ];

    // Clean and pad text
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    const paddedText = cleanText.length % 2 === 1 ? cleanText + 'X' : cleanText;

    // Encrypt pairs
    let encrypted = '';
    for (let i = 0; i < paddedText.length; i += 2) {
        const pair = [
            paddedText.charCodeAt(i) - 65,
            paddedText.charCodeAt(i + 1) - 65
        ];
        
        const encryptedPair = [
            mod26(matrix[0][0] * pair[0] + matrix[0][1] * pair[1]),
            mod26(matrix[1][0] * pair[0] + matrix[1][1] * pair[1])
        ];
        
        encrypted += String.fromCharCode(encryptedPair[0] + 65) + 
                    String.fromCharCode(encryptedPair[1] + 65);
    }

    return { encrypted, matrix, decryptionMatrix };
};

/**
 * Encrypts text using a 3x3 Hill cipher
 * @param {string} text - Text to encrypt
 * @returns {HillCipherResult} Encrypted text and matrices
 */
export const encryptHill3x3 = (text: string): HillCipherResult => {
    // Generate random 3x3 matrix with determinant coprime to 26
    let matrix: number[][];
    let det: number;
    do {
        matrix = Array.from({ length: 3 }, () => 
            Array.from({ length: 3 }, () => Math.floor(Math.random() * 26))
        );
        det = mod26(
            matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
            matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
            matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
        );
    } while (det === 0 || gcd(det, 26) !== 1);

    // Calculate decryption matrix (adjugate * det inverse)
    const detInv = modInverse(det, 26);
    const adjugate = [
        [
            mod26((matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) * detInv),
            mod26((matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) * detInv),
            mod26((matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) * detInv)
        ],
        [
            mod26((matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) * detInv),
            mod26((matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) * detInv),
            mod26((matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) * detInv)
        ],
        [
            mod26((matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) * detInv),
            mod26((matrix[0][1] * matrix[2][0] - matrix[0][0] * matrix[2][1]) * detInv),
            mod26((matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) * detInv)
        ]
    ];
    const decryptionMatrix = adjugate;

    // Clean and pad text
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    const paddedText = cleanText + 'X'.repeat((3 - (cleanText.length % 3)) % 3);

    // Encrypt triplets
    let encrypted = '';
    for (let i = 0; i < paddedText.length; i += 3) {
        const triplet = [
            paddedText.charCodeAt(i) - 65,
            paddedText.charCodeAt(i + 1) - 65,
            paddedText.charCodeAt(i + 2) - 65
        ];
        
        const encryptedTriplet = [
            mod26(matrix[0][0] * triplet[0] + matrix[0][1] * triplet[1] + matrix[0][2] * triplet[2]),
            mod26(matrix[1][0] * triplet[0] + matrix[1][1] * triplet[1] + matrix[1][2] * triplet[2]),
            mod26(matrix[2][0] * triplet[0] + matrix[2][1] * triplet[1] + matrix[2][2] * triplet[2])
        ];
        
        encrypted += String.fromCharCode(encryptedTriplet[0] + 65) + 
                    String.fromCharCode(encryptedTriplet[1] + 65) + 
                    String.fromCharCode(encryptedTriplet[2] + 65);
    }

    return { encrypted, matrix, decryptionMatrix };
};

/**
 * Calculates the greatest common divisor
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} GCD of a and b
 */
function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

/**
 * Calculates the modular inverse
 * @param {number} a - Number to find inverse for
 * @param {number} m - Modulus
 * @returns {number} Modular inverse of a mod m
 */
function modInverse(a: number, m: number): number {
    a = mod26(a);
    for (let x = 1; x < m; x++) {
        if (mod26(a * x) === 1) {
            return x;
        }
    }
    return 1;
}
