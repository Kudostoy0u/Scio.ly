'use client';
import React, { useMemo, useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from './types';
import { getLetterFrequencies, numberToLetter } from './cipher-utils';

// Frequency table component
export const FrequencyTable = ({ 
    text, 
    frequencyNotes,
    onNoteChange,
    quoteIndex
}: { 
    text: string;
    frequencyNotes?: { [key: string]: string };
    onNoteChange: (letter: string, note: string) => void;
    quoteIndex: number;
}) => {
    const { darkMode } = useTheme();
    const frequencies = getLetterFrequencies(text);
    
    return (
        <div className={`mt-4 p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Frequency Analysis</p>
            <div className="flex flex-wrap gap-2">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                    <div key={letter} className="flex flex-col items-center min-w-[2rem]">
                        <div className={`text-xs sm:text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{letter}</div>
                        <div className={`text-[10px] sm:text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{frequencies[letter]}</div>
                        <input
                            type="text"
                            id={`frequency-${quoteIndex}-${letter}`}
                            name={`frequency-${quoteIndex}-${letter}`}
                            maxLength={1}
                            value={frequencyNotes?.[letter] || ''}
                            onChange={(e) => onNoteChange(letter, e.target.value)}
                            className={`w-5 h-5 sm:w-6 sm:h-6 text-center border rounded text-xs sm:text-sm mt-1 ${
                                darkMode 
                                    ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                            }`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

// Hill 2x2 and Hill 3x3 cipher display component
export const HillDisplay = ({ 
    text, 
    matrix, 
    quoteIndex,
    solution,
    onSolutionChange,
    isTestSubmitted,
    quotes 
}: { 
    text: string;
    matrix: number[][];
    quoteIndex: number;
    solution?: { matrix: string[][]; plaintext: { [key: number]: string } };
    onSolutionChange: (type: 'matrix' | 'plaintext', value: string[][] | { [key: number]: string }) => void;
    isTestSubmitted: boolean;
    quotes: QuoteData[];
}) => {
    const { darkMode } = useTheme();
    const quote = quotes[quoteIndex];
    const is3x3 = quote.cipherType === 'Hill 3x3';
    const matrixSize = is3x3 ? 3 : 2;
    
    // Auto-fill decryption matrix for 3x3 Hill ciphers
    useEffect(() => {
        if (is3x3 && quote.decryptionMatrix) {
            const hasEmptyMatrix = !solution?.matrix || 
                solution.matrix.every(row => row.every(cell => cell === ''));
            
            if (hasEmptyMatrix) {
                const decryptionMatrix = quote.decryptionMatrix.map(row => 
                    row.map(num => num.toString())
                );
                onSolutionChange('matrix', decryptionMatrix);
            }
        }
    }, [is3x3, quote.decryptionMatrix, solution?.matrix, onSolutionChange]);
    
    // Create a mapping of positions to correct letters, preserving spaces and punctuation
    const correctMapping: { [key: number]: string } = {};
    if (isTestSubmitted) {
        const originalQuote = quote.quote.toUpperCase();
        let plainTextIndex = 0;
        
        // Map each encrypted letter position to its corresponding plaintext letter
        for (let i = 0; i < text.length; i++) {
            if (/[A-Z]/.test(text[i])) {
                while (plainTextIndex < originalQuote.length) {
                    if (/[A-Z]/.test(originalQuote[plainTextIndex])) {
                        correctMapping[i] = originalQuote[plainTextIndex];
                        plainTextIndex++;
                        break;
                    }
                    plainTextIndex++;
                }
            }
        }
    }

    return (
        <div className="font-mono">
            {/* Matrix display section */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-6">
                <div>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Encryption Matrix:</p>
                    <div className={`grid gap-2 ${is3x3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {matrix.map((row, i) => 
                            row.map((num, j) => (
                                <div key={`${i}-${j}`} className={`w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center border rounded ${
                                    darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                                }`}>
                                    <span className={`text-base sm:text-lg font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{num}</span>
                                    <span className={`text-[10px] sm:text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{numberToLetter(num)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Decryption Matrix:</p>
                    <div className={`grid gap-2 ${is3x3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {Array.from({ length: matrixSize }, (_, i) => 
                            Array.from({ length: matrixSize }, (_, j) => {
                                const value = solution?.matrix?.[i]?.[j] || '';
                                const numValue = parseInt(value) || 0;
                                
                                return is3x3 ? (
                                    // For 3x3: display as read-only like encryption matrix
                                    <div key={`solution-${i}-${j}`} className={`w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center border rounded ${
                                        darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                                    }`}>
                                        <span className={`text-base sm:text-lg font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{value || '?'}</span>
                                        <span className={`text-[10px] sm:text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{numberToLetter(numValue)}</span>
                                    </div>
                                ) : (
                                    // For 2x2: editable input
                                    <input
                                        key={`solution-${i}-${j}`}
                                        type="text"
                                        id={`hill-matrix-${i}-${j}`}
                                        name={`hill-matrix-${i}-${j}`}
                                        maxLength={2}
                                        disabled={isTestSubmitted}
                                        value={value}
                                        onChange={(e) => {
                                            const newMatrix = solution?.matrix || Array.from({ length: matrixSize }, () => Array(matrixSize).fill(''));
                                            newMatrix[i][j] = e.target.value;
                                            onSolutionChange('matrix', newMatrix);
                                        }}
                                        className={`w-10 h-10 sm:w-12 sm:h-12 text-center border rounded text-base sm:text-lg ${
                                            darkMode 
                                                ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                        }`}
                                        placeholder="?"
                                    />
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Updated Encrypted text and solution section */}
            <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
                {text.split('').map((char, i) => {
                    const isLetter = /[A-Z]/.test(char);
                    const value = solution?.plaintext?.[i] || '';
                    const correctLetter = isTestSubmitted && isLetter ? correctMapping[i] : '';
                    const isCorrect = value.toUpperCase() === correctLetter;

                    return (
                        <div key={i} className="flex flex-col items-center mx-0.5">
                            <span className={`text-base sm:text-lg ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{char}</span>
                            {isLetter && (
                                <div className="relative h-12 sm:h-14">
                                    <input
                                        type="text"
                                        id={`hill-plaintext-${quoteIndex}-${i}`}
                                        name={`hill-plaintext-${quoteIndex}-${i}`}
                                        maxLength={1}
                                        disabled={isTestSubmitted}
                                        value={value}
                                        onChange={(e) => {
                                            const newValue = e.target.value.toUpperCase();
                                            const newPlaintext = { ...(solution?.plaintext || {}) };
                                            newPlaintext[i] = newValue;
                                            onSolutionChange('plaintext', newPlaintext);
                                        }}
                                        className={`w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm ${
                                            darkMode 
                                                ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                        } ${
                                            isTestSubmitted
                                                ? isCorrect
                                                    ? 'border-green-500 bg-green-100/10'
                                                    : 'border-red-500 bg-red-100/10'
                                                : ''
                                        }`}
                                    />
                                    {isTestSubmitted && !isCorrect && correctLetter && (
                                        <div className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
                                            darkMode ? 'text-red-400' : 'text-red-600'
                                        }`}>
                                            {correctLetter}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!isLetter && <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />}
                        </div>
                    );
                })}
            </div>

            {/* Show original quote after submission */}
            {isTestSubmitted && (
                <div className={`mt-8 p-4 rounded ${
                    darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Original Quote:
                    </p>
                    <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {quote.quote}
                    </p>
                </div>
            )}
        </div>
    );
}; 

// Component for displaying aristocrat/patristocrat cipher with input boxes
export const AristocratDisplay = ({ 
    text, 
    quoteIndex, 
    solution, 
    frequencyNotes,
    isTestSubmitted,
    quotes,
    onSolutionChange,
    onFrequencyNoteChange
}: { 
    text: string; 
    quoteIndex: number;
    solution?: { [key: string]: string };
    frequencyNotes?: { [key: string]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
    onFrequencyNoteChange: (quoteIndex: number, letter: string, note: string) => void;
}) => {
    const { darkMode } = useTheme();
    
    // Create mapping for correct answers
    const correctMapping: { [key: string]: string } = {};
    if (isTestSubmitted && quotes[quoteIndex].key) {
        for (let i = 0; i < 26; i++) {
            const plainLetter = String.fromCharCode(65 + i);
            const cipherLetter = quotes[quoteIndex].key![i];
            correctMapping[cipherLetter] = plainLetter;
        }
    }

    return (
        <div className="font-mono">
            <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
                {text.split('').map((char, i) => {
                    const isLetter = /[A-Z]/.test(char);
                    const value = solution?.[char] || '';
                    const isCorrect = isLetter && value === correctMapping[char];
                    const showCorrectAnswer = isTestSubmitted && isLetter;
                    
                    return (
                        <div key={i} className="flex flex-col items-center mx-0.5">
                            <span className={`text-base sm:text-lg ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{char}</span>
                            {isLetter && (
                                <div className="relative h-12 sm:h-14">
                                    <input
                                        type="text"
                                        id={`aristocrat-${quoteIndex}-${i}`}
                                        name={`aristocrat-${quoteIndex}-${i}`}
                                        maxLength={1}
                                        value={value}
                                        disabled={isTestSubmitted}
                                        onChange={(e) => onSolutionChange(
                                            quoteIndex,
                                            char,
                                            e.target.value.toUpperCase()
                                        )}
                                        className={`w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm ${
                                            darkMode 
                                                ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                        } ${
                                            showCorrectAnswer
                                                ? isCorrect
                                                    ? 'border-green-500 bg-green-100/10'
                                                    : 'border-red-500 bg-red-100/10'
                                                : ''
                                        }`}
                                    />
                                    {showCorrectAnswer && !isCorrect && (
                                        <div className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
                                            darkMode ? 'text-red-400' : 'text-red-600'
                                        }`}>
                                            {correctMapping[char]}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!isLetter && <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />}
                        </div>
                    );
                })}
            </div>
            <FrequencyTable 
                text={text}
                frequencyNotes={frequencyNotes}
                onNoteChange={(letter, note) => onFrequencyNoteChange(quoteIndex, letter, note)}
                quoteIndex={quoteIndex}
            />
        </div>
    );
};

// Update PortaDisplay component
export const PortaDisplay = ({ 
    text, 
    keyword,
    quoteIndex,
    solution,
    frequencyNotes,
    isTestSubmitted,
    quotes,
    onSolutionChange,
    onFrequencyNoteChange
}: { 
    text: string;
    keyword: string;
    quoteIndex: number;
    solution?: { [key: string]: string };
    frequencyNotes?: { [key: string]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
    onFrequencyNoteChange: (quoteIndex: number, letter: string, note: string) => void;
}) => {
    const { darkMode } = useTheme();
    
    // Create mapping for correct answers
    const originalQuote = quotes[quoteIndex].quote.toUpperCase();
    const correctMapping: { [key: number]: string } = {};
    let letterIndex = 0;
    
    // Map each position in the encrypted text to its corresponding position in the original quote
    for (let i = 0; i < text.length; i++) {
        if (/[A-Z]/.test(text[i])) {
            while (letterIndex < originalQuote.length) {
                if (/[A-Z]/.test(originalQuote[letterIndex])) {
                    correctMapping[i] = originalQuote[letterIndex];
                    letterIndex++;
                    break;
                }
                letterIndex++;
            }
        }
    }
    
    return (
        <div className="font-mono">
            <div className={`mb-4 p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Keyword: <span className="font-bold">{keyword}</span>
                </p>
            </div>
            <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
                {text.split('').map((char, i) => {
                    const isLetter = /[A-Z]/.test(char);
                    const value = solution?.[char] || '';
                    const correctLetter = correctMapping[i];
                    const isCorrect = isLetter && value.toUpperCase() === correctLetter;
                    
                    return (
                        <div key={i} className="flex flex-col items-center mx-0.5">
                            <span className={`text-base sm:text-lg ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{char}</span>
                            {isLetter && (
                                <div className="relative h-12 sm:h-14">
                                    <input
                                        type="text"
                                        id={`porta-${quoteIndex}-${i}`}
                                        name={`porta-${quoteIndex}-${i}`}
                                        maxLength={1}
                                        disabled={isTestSubmitted}
                                        value={value}
                                        onChange={(e) => onSolutionChange(
                                            quoteIndex,
                                            char,
                                            e.target.value.toUpperCase()
                                        )}
                                        className={`w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm ${
                                            darkMode 
                                                ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                        } ${
                                            isTestSubmitted
                                                ? isCorrect
                                                    ? 'border-green-500 bg-green-100/10'
                                                    : 'border-red-500 bg-red-100/10'
                                                : ''
                                        }`}
                                    />
                                    {isTestSubmitted && !isCorrect && correctLetter && (
                                        <div className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
                                            darkMode ? 'text-red-400' : 'text-red-600'
                                        }`}>
                                            {correctLetter}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!isLetter && <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />}
                        </div>
                    );
                })}
            </div>
            <FrequencyTable 
                text={text}
                frequencyNotes={frequencyNotes}
                onNoteChange={(letter, note) => onFrequencyNoteChange(quoteIndex, letter, note)}
                quoteIndex={quoteIndex}
            />
            
            {/* Show original quote after submission */}
            {isTestSubmitted && (
                <div className={`mt-8 p-4 rounded ${
                    darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Original Quote:
                    </p>
                    <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {quotes[quoteIndex].quote}
                    </p>
                </div>
            )}
        </div>
    );
};

// Substitution cipher display component for new cipher types
export const SubstitutionDisplay = ({ 
    text, 
    quoteIndex, 
    solution, 
    isTestSubmitted, 
    cipherType,
    caesarShift,
    affineA,
    affineB,
    quotes,
    onSolutionChange
}: {
    text: string;
    quoteIndex: number;
    solution?: { [key: string]: string };
    isTestSubmitted: boolean;
    cipherType: string;
    key?: string;
    caesarShift?: number;
    affineA?: number;
    affineB?: number;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
}) => {
    const { darkMode } = useTheme();

    const getCipherInfo = () => {
        switch (cipherType) {
            case 'Random Aristocrat':
                return 'Random Aristocrat Cipher';
            case 'K1 Aristocrat':
                return 'K1 Aristocrat Cipher';
            case 'K2 Aristocrat':
                return 'K2 Aristocrat Cipher';
            case 'K3 Aristocrat':
                return 'K3 Aristocrat Cipher';
            case 'Random Patristocrat':
                return 'Random Patristocrat Cipher';
            case 'K1 Patristocrat':
                return 'K1 Patristocrat Cipher';
            case 'K2 Patristocrat':
                return 'K2 Patristocrat Cipher';
            case 'K3 Patristocrat':
                return 'K3 Patristocrat Cipher';
            case 'Caesar':
                return `Caesar Cipher (Shift: ${caesarShift || '?'})`;
            case 'Atbash':
                return 'Atbash Cipher';
            case 'Affine':
                return `Affine Cipher (a=${affineA || '?'}, b=${affineB || '?'})`;
            case 'Nihilist':
                return 'Nihilist Substitution Cipher';
            case 'Fractionated Morse':
                return 'Fractionated Morse Cipher';
            case 'Columnar Transposition':
                return 'Columnar Transposition Cipher';
            case 'Xenocrypt':
                return 'Xenocrypt Cipher';
            default:
                return 'Substitution Cipher';
        }
    };

    // Create mapping for correct answers (for k1/k2/k3 variants, caesar, atbash, affine)
    const correctMapping: { [key: string]: string } = {};
    if (isTestSubmitted && quotes[quoteIndex]) {
        const quote = quotes[quoteIndex];
        
        // Handle k1/k2/k3 variants (same as substitution ciphers)
        if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat'].includes(cipherType) && quote.key) {
            for (let i = 0; i < 26; i++) {
                const plainLetter = String.fromCharCode(65 + i);
                const cipherLetter = quote.key[i];
                correctMapping[cipherLetter] = plainLetter;
            }
        } else if (cipherType === 'Caesar' && quote.caesarShift !== undefined) {
            const shift = quote.caesarShift;
            for (let i = 0; i < 26; i++) {
                const plainLetter = String.fromCharCode(65 + i);
                const cipherLetter = String.fromCharCode(((i + shift) % 26) + 65);
                correctMapping[cipherLetter] = plainLetter;
            }
        } else if (cipherType === 'Atbash') {
            const atbashMap = 'ZYXWVUTSRQPONMLKJIHGFEDCBA';
            for (let i = 0; i < 26; i++) {
                const plainLetter = String.fromCharCode(65 + i);
                const cipherLetter = atbashMap[i];
                correctMapping[cipherLetter] = plainLetter;
            }
        } else if (cipherType === 'Affine' && quote.affineA !== undefined && quote.affineB !== undefined) {
            const a = quote.affineA;
            const b = quote.affineB;
            for (let i = 0; i < 26; i++) {
                const plainLetter = String.fromCharCode(65 + i);
                const cipherLetter = String.fromCharCode(((a * i + b) % 26) + 65);
                correctMapping[cipherLetter] = plainLetter;
            }
        } else if (cipherType === 'Xenocrypt' && quote.key) {
            // Xenocrypt is a substitution cipher like aristocrats
            for (let i = 0; i < 26; i++) {
                const plainLetter = String.fromCharCode(65 + i);
                const cipherLetter = quote.key[i];
                correctMapping[cipherLetter] = plainLetter;
            }
        } else if (['Nihilist', 'Fractionated Morse', 'Columnar Transposition'].includes(cipherType) && quote.key) {
            // These are also substitution ciphers like aristocrats
            for (let i = 0; i < 26; i++) {
                const plainLetter = String.fromCharCode(65 + i);
                const cipherLetter = quote.key[i];
                correctMapping[cipherLetter] = plainLetter;
            }
        }
    }

    return (
        <div className="font-mono">
            <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {getCipherInfo()}
            </div>
            <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
                {text.split('').map((char, i) => {
                    const isLetter = /[A-Z]/.test(char);
                    const value = solution?.[char] || '';
                    const isCorrect = isLetter && value === correctMapping[char];
                    const showCorrectAnswer = isTestSubmitted && isLetter;
                    
                    return (
                        <div key={i} className="flex flex-col items-center mx-0.5">
                            <span className={`text-base sm:text-lg ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{char}</span>
                            {isLetter && (
                                <div className="relative h-12 sm:h-14">
                                    <input
                                        type="text"
                                        id={`substitution-${quoteIndex}-${i}`}
                                        name={`substitution-${quoteIndex}-${i}`}
                                        maxLength={1}
                                        value={value}
                                        disabled={isTestSubmitted}
                                        onChange={(e) => onSolutionChange(
                                            quoteIndex,
                                            char,
                                            e.target.value.toUpperCase()
                                        )}
                                        className={`w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm ${
                                            darkMode 
                                                ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                        } ${
                                            showCorrectAnswer
                                                ? isCorrect
                                                    ? 'border-green-500 bg-green-100/10'
                                                    : 'border-red-500 bg-red-100/10'
                                                : ''
                                        }`}
                                    />
                                    {showCorrectAnswer && !isCorrect && (
                                        <div className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
                                            darkMode ? 'text-red-400' : 'text-red-600'
                                        }`}>
                                            {correctMapping[char]}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!isLetter && <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />}
                        </div>
                    );
                })}
            </div>
            
            {/* Show original quote after submission */}
            {isTestSubmitted && (
                <div className={`mt-8 p-4 rounded ${
                    darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Original Quote:
                    </p>
                    <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {quotes[quoteIndex].quote}
                    </p>
                </div>
            )}
        </div>
    );
};

// Fractionated Morse display component
export const FractionatedMorseDisplay = ({ 
    text, 
    quoteIndex,
    solution,
    fractionationTable,
    isTestSubmitted,
    quotes,
    onSolutionChange
}: { 
    text: string;
    quoteIndex: number;
    solution?: { [key: string]: string };
    fractionationTable?: { [key: string]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
}) => {
    const { darkMode } = useTheme();

    // Create mapping for correct answers
    const correctMapping: { [key: string]: string } = {};
    if (isTestSubmitted && quotes[quoteIndex] && fractionationTable) {
        const quote = quotes[quoteIndex];
        
        // For fractionated morse, map each cipher letter to its expected triplet
        if (quote.cipherType === 'Fractionated Morse') {
            Object.entries(fractionationTable).forEach(([triplet, letter]) => {
                correctMapping[letter] = triplet;
            });
        } else if (quote.key) {
            // For other ciphers, use the original logic
            for (let i = 0; i < 26; i++) {
                const plainLetter = String.fromCharCode(65 + i);
                const cipherLetter = quote.key![i];
                correctMapping[cipherLetter] = plainLetter;
            }
        }
    }

    // Get the actual triplets used in this cipher from the fractionation table
    const usedTriplets = useMemo(() => 
        fractionationTable ? Object.keys(fractionationTable).sort() : [], 
        [fractionationTable]
    );
    
    // Create reverse mapping from cipher letter to triplet
    const cipherToTriplet: { [key: string]: string } = {};
    if (fractionationTable) {
        Object.entries(fractionationTable).forEach(([triplet, letter]) => {
            cipherToTriplet[letter] = triplet;
        });
    }
    
    // Create mapping from triplet to cipher letter (for debugging)
    const tripletToCipher: { [key: string]: string } = {};
    if (fractionationTable) {
        Object.entries(fractionationTable).forEach(([triplet, letter]) => {
            tripletToCipher[triplet] = letter;
        });
    }

    // Handle replacement table input changes
    const handleReplacementTableChange = (triplet: string, newLetter: string) => {
        if (!fractionationTable) return;
        
        // The letter typed in the replacement table should match the cipher letter
        // So we fill all instances of that letter with the morse code triplet
        if (newLetter) {
            // Fill all cipher inputs that show this letter with the morse code triplet
            onSolutionChange(quoteIndex, newLetter.toUpperCase(), triplet);
        } else {
            // If letter is deleted, clear all cipher inputs that were filled by this triplet
            // We need to find which letter was previously associated with this triplet
            const previousLetter = solution?.[`replacement_${triplet}`];
            if (previousLetter) {
                // Clear all inputs for the previously associated letter
                onSolutionChange(quoteIndex, previousLetter.toUpperCase(), '');
            }
        }
    };

    // Update replacement table when a complete triplet is entered in cipher input
    const updateReplacementTableFromTriplet = (cipherLetter: string, triplet: string) => {
        if (!fractionationTable) return;
        
        console.log('Updating replacement table from triplet:', { cipherLetter, triplet, fractionationTable });
        
        // Find which triplet column this matches
        const matchingTriplet = usedTriplets.find(t => t === triplet);
        if (matchingTriplet) {
            console.log('Found matching triplet:', matchingTriplet);
            // Update the replacement table for this triplet with the cipher letter
            onSolutionChange(quoteIndex, `replacement_${matchingTriplet}`, cipherLetter);
        } else {
            console.log('No matching triplet found for:', triplet);
            console.log('Available triplets:', usedTriplets);
        }
    };

    // Clear replacement table when a triplet becomes incomplete
    const clearReplacementTableFromTriplet = (cipherLetter: string, incompleteTriplet: string) => {
        if (!fractionationTable) return;
        
        console.log('Clearing replacement table from incomplete triplet:', { cipherLetter, incompleteTriplet });
        
        // Find which triplet column this cipher letter was associated with
        const matchingTriplet = usedTriplets.find(t => {
            const currentReplacement = solution?.[`replacement_${t}`];
            return currentReplacement === cipherLetter;
        });
        
        if (matchingTriplet) {
            console.log('Found triplet to clear:', matchingTriplet);
            // Clear the replacement table for this triplet
            onSolutionChange(quoteIndex, `replacement_${matchingTriplet}`, '');
        }
    };



    return (
        <div className="font-mono">
            <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Fractionated Morse Cipher
            </div>

            {/* Cipher text */}
            <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
                {text.split('').map((char, i) => {
                    const isLetter = /[A-Z]/.test(char);
                    const value = solution?.[char] || '';
                    const isCorrect = isTestSubmitted && correctMapping[char] && value.toLowerCase() === correctMapping[char].toLowerCase();
                    const showCorrectAnswer = isTestSubmitted && isLetter;
                    
                    return (
                        <div key={i} className="flex flex-col items-center mx-0.5">
                            <span className={`text-base sm:text-lg ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{char}</span>
                            {isLetter && (
                                <div className="relative h-12 sm:h-14">
                                    <input
                                        type="text"
                                        id={`fractionated-${quoteIndex}-${i}`}
                                        name={`fractionated-${quoteIndex}-${i}`}
                                        maxLength={3}
                                        value={value}
                                        disabled={isTestSubmitted}
                                        onChange={(e) => {
                                            const inputValue = e.target.value;
                                            // Filter to only allow dots, dashes, and x (case insensitive)
                                            const filteredValue = inputValue.split('').filter(char => 
                                                /[.\-x]/i.test(char)
                                            ).join('').toUpperCase();
                                            
                                            // Convert x to lowercase for fractionated morse
                                            const finalValue = filteredValue.replace(/X/g, 'x');
                                            
                                            // Only update if the final value is different from what was typed
                                            if (finalValue !== inputValue) {
                                                e.target.value = finalValue;
                                            }
                                            
                                            console.log('Cipher input change:', { char, finalValue, length: finalValue.length });
                                            
                                            // Update all instances of this cipher letter with the new value
                                            onSolutionChange(quoteIndex, char, finalValue);
                                            
                                            // If we have a complete triplet, update the replacement table
                                            if (finalValue.length === 3) {
                                                console.log('Complete triplet detected, updating replacement table');
                                                updateReplacementTableFromTriplet(char, finalValue);
                                            } else if (finalValue.length < 3) {
                                                // If triplet becomes incomplete, clear the replacement table entry
                                                console.log('Triplet became incomplete, clearing replacement table');
                                                clearReplacementTableFromTriplet(char, finalValue);
                                            }
                                        }}
                                        className={`w-8 h-5 sm:w-10 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm ${
                                            darkMode 
                                                ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                        } ${
                                            showCorrectAnswer
                                                ? isCorrect
                                                    ? 'border-green-500 bg-green-100/10'
                                                    : 'border-red-500 bg-red-100/10'
                                                : ''
                                        }`}
                                        placeholder=""
                                    />
                                    {showCorrectAnswer && !isCorrect && (
                                        <div className={`absolute top-6 sm:top-7 left-1/2 -translate-x-1/2 text-[7px] sm:text-[8px] ${
                                            darkMode ? 'text-red-400' : 'text-red-600'
                                        }`}>
                                            {correctMapping[char]}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!isLetter && <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />}
                        </div>
                    );
                })}
            </div>

            {/* Longest Continuous Morse Code Section */}
            {(() => {
                // Find longest continuous solved morse code from the very beginning
                let longestMorse = '';
                let currentMorse = '';
                
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    if (/[A-Z]/.test(char) && solution?.[char]) {
                        currentMorse += solution[char];
                    } else {
                        // If we hit a non-letter or unsolved letter, stop
                        break;
                    }
                }
                
                longestMorse = currentMorse;
                
                // Convert morse to text
                const morseMap: { [key: string]: string } = {
                    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
                    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
                    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
                    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
                    'Y': '-.--', 'Z': '--..'
                };
                
                // Create reverse morse map
                const reverseMorseMap: { [key: string]: string } = {};
                Object.entries(morseMap).forEach(([letter, morse]) => {
                    reverseMorseMap[morse] = letter;
                });
                
                // Convert morse string to text
                let translatedText = '';
                if (longestMorse) {
                    // Split morse into individual letters (separated by 'x' or 'X')
                    const morseLetters = longestMorse.split(/[xX]/).filter(m => m.length > 0);
                    translatedText = morseLetters.map(morse => reverseMorseMap[morse] || '?').join('');
                }
                
                return longestMorse ? (
                    <div className={`mt-4 p-3 rounded border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                        <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Longest Continuous Morse Code
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className={`font-mono text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Morse: <span className="font-bold">{longestMorse}</span>
                            </div>
                            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} break-all`}>
                                Translation: <span className="font-bold">{translatedText}</span>
                            </div>
                        </div>
                    </div>
                ) : null;
            })()}

            {/* Replacement Table */}
            <div className={`mt-4 mb-4 p-3 rounded border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Replacement Table
                </div>
                <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                        <tbody>
                            {/* Replacement row - editable cells */}
                            <tr>
                                <td className={`p-1 border text-center font-bold ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                    Replacement
                                </td>
                                {usedTriplets.map(triplet => {
                                    // For replacement table, we want to show what letter the user typed, not the morse code
                                    // We need to track this separately from the solution
                                    const replacementValue = solution?.[`replacement_${triplet}`] || '';
                                    return (
                                        <td key={triplet} className={`p-1 border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                            <input
                                                type="text"
                                                maxLength={1}
                                                value={replacementValue}
                                                onChange={(e) => {
                                                    const newLetter = e.target.value.toUpperCase();
                                                    
                                                    // Check if this letter is already used in another replacement table input
                                                    const existingLetters = usedTriplets.map(t => 
                                                        solution?.[`replacement_${t}`] || ''
                                                    ).filter(letter => letter !== '');
                                                    
                                                    // If letter is already used and it's not the current input, don't allow it
                                                    if (existingLetters.includes(newLetter) && newLetter !== replacementValue) {
                                                        console.log('Letter already used:', newLetter);
                                                        return; // Don't update
                                                    }
                                                    
                                                    console.log('Updating replacement table:', { triplet, newLetter, existingLetters });
                                                    
                                                    // Store the replacement letter separately
                                                    onSolutionChange(quoteIndex, `replacement_${triplet}`, newLetter);
                                                    // Then trigger the morse code filling
                                                    handleReplacementTableChange(triplet, e.target.value);
                                                }}
                                                className={`w-full text-center text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-900'} border-0 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                                placeholder=""
                                                disabled={isTestSubmitted}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                            {/* Morse triplet rows - 3 rows for the 3 positions in each triplet */}
                            {[0, 1, 2].map(position => (
                                <tr key={position}>
                                    <td className={`p-1 border text-center font-bold ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                        {position === 0 ? 'Morse code' : ''}
                                    </td>
                                    {usedTriplets.map((triplet, index) => (
                                        <td key={index} className={`p-1 border text-center ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'}`}>
                                            {triplet[position] || ''}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Show original quote and morse code when test is submitted */}
            {isTestSubmitted && (
                <div className={`mt-4 p-4 rounded ${
                    darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Original Quote & Morse Code:
                    </p>
                    <p className={`font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {quotes[quoteIndex].quote}
                    </p>
                    {fractionationTable && (
                        <div className="mt-3">
                            <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Morse Code Mapping:
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                {Object.entries(fractionationTable).map(([triplet, letter]) => (
                                    <div key={triplet} className={`p-2 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                                        <span className={`font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {letter}: {triplet}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Baconian cipher display component
export const BaconianDisplay = ({ 
    text, 
    quoteIndex,
    solution,
    isTestSubmitted,
    quotes,
    onBaconianSolutionChange
}: { 
    text: string;
    quoteIndex: number;
    solution?: { [key: number]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onBaconianSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
}) => {
    const { darkMode } = useTheme();
    
    // Create mapping for correct answers
    const correctMapping: { [key: number]: string } = {};
    if (isTestSubmitted && quotes[quoteIndex].quote) {
        const originalQuote = quotes[quoteIndex].quote.toUpperCase();
        let originalIndex = 0;
        
        // Map each group of 5 letters to its corresponding plaintext letter
        const groups: string[] = [];
        let currentGroup = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === 'A' || char === 'B') {
                currentGroup += char;
                if (currentGroup.length === 5) {
                    groups.push(currentGroup);
                    currentGroup = '';
                }
            } else if (char === ' ') {
                continue;
            } else {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                    currentGroup = '';
                }
            }
        }
        
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }
        
        const baconianGroups = groups.filter(group => /^[AB]{5}$/.test(group));
        let currentGroupIndex = 0;
        
        while (originalIndex < originalQuote.length) {
            if (/[A-Z]/.test(originalQuote[originalIndex])) {
                if (currentGroupIndex < baconianGroups.length) {
                    correctMapping[currentGroupIndex] = originalQuote[originalIndex];
                }
                currentGroupIndex++;
            }
            originalIndex++;
        }
    }
    
    return (
        <div className="font-mono">
            <div className={`mb-4 p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Note: Using 24-letter alphabet (I/J same, U/V same)
                </p>
            </div>
            <div className="flex flex-wrap gap-4">
                {(() => {
                    // Split text into groups of 5 letters
                    const groups: string[] = [];
                    let currentGroup = '';
                    
                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];
                        if (char === 'A' || char === 'B') {
                            currentGroup += char;
                            if (currentGroup.length === 5) {
                                groups.push(currentGroup);
                                currentGroup = '';
                            }
                        } else if (char === ' ') {
                            continue;
                        } else {
                            if (currentGroup.length > 0) {
                                groups.push(currentGroup);
                                currentGroup = '';
                            }
                            groups.push(char);
                        }
                    }
                    
                    if (currentGroup.length > 0) {
                        groups.push(currentGroup);
                    }
                    
                    return groups.map((group, i) => {
                        if (!/^[AB]{5}$/.test(group)) {
                            return (
                                <div key={i} className="flex items-center">
                                    <span className={`text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {group}
                                    </span>
                                </div>
                            );
                        }

                        const value = solution?.[i] || '';
                        const correctLetter = correctMapping[i];
                        const isCorrect = value === correctLetter;

                        return (
                            <div key={i} className="flex flex-col items-center">
                                <div className={`text-xs sm:text-sm mb-1 font-mono ${
                                    darkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                    {group.split('').map((char, j) => (
                                        <span key={j} className="mx-0.5">{char}</span>
                                    ))}
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id={`baconian-${quoteIndex}-${i}`}
                                        name={`baconian-${quoteIndex}-${i}`}
                                        maxLength={1}
                                        disabled={isTestSubmitted}
                                        value={value}
                                        onChange={(e) => {
                                            const newValue = e.target.value.toUpperCase();
                                            onBaconianSolutionChange(quoteIndex, i, newValue);
                                        }}
                                        className={`w-6 h-6 sm:w-7 sm:h-7 text-center border rounded text-sm ${
                                            darkMode 
                                                ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                        } ${
                                            isTestSubmitted
                                                ? isCorrect
                                                    ? 'border-green-500 bg-green-100/10'
                                                    : 'border-red-500 bg-red-100/10'
                                                : ''
                                        }`}
                                    />
                                    {isTestSubmitted && !isCorrect && correctLetter && (
                                        <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
                                            darkMode ? 'text-red-400' : 'text-red-600'
                                        }`}>
                                            {correctLetter}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    });
                })()}
            </div>
            
            {/* Show original quote after submission */}
            {isTestSubmitted && (
                <div className={`mt-12 p-4 rounded ${
                    darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Original Quote:
                    </p>
                    <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {quotes[quoteIndex].quote}
                    </p>
                </div>
            )}
        </div>
    );
};

// Columnar Transposition display component
export const NihilistDisplay = ({ 
    text, 
    polybiusKey,
    cipherKey,
    quoteIndex,
    solution,
    isTestSubmitted,
    quotes,
    onSolutionChange
}: { 
    text: string;
    polybiusKey: string;
    cipherKey: string;
    quoteIndex: number;
    solution?: { [key: number]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
}) => {
    const { darkMode } = useTheme();
    const quote = quotes[quoteIndex];

    // Split the ciphertext into two-digit groups
    const numberGroups = text.split(' ').filter(group => group.length === 2);

    // Create a mapping of positions to correct letters
    const correctMapping: { [key: number]: string } = {};
    if (isTestSubmitted) {
        const originalQuote = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
        for (let i = 0; i < Math.min(numberGroups.length, originalQuote.length); i++) {
            correctMapping[i] = originalQuote[i];
        }
    }

    return (
        <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
            {/* Keys Display */}
            <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-semibold">Polybius Key: </span>
                        <span className="font-mono">{polybiusKey}</span>
                    </div>
                    <div>
                        <span className="font-semibold">Cipher Key: </span>
                        <span className="font-mono">{cipherKey}</span>
                    </div>
                </div>
            </div>

            {/* Decryption Inputs */}
            <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                    {numberGroups.map((group, index) => (
                        <div key={index} className="flex flex-col items-center">
                            <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {group}
                            </div>
                            <input
                                type="text"
                                maxLength={1}
                                value={solution?.[index] || ''}
                                onChange={(e) => onSolutionChange(quoteIndex, index, e.target.value.toUpperCase())}
                                disabled={isTestSubmitted}
                                className={`w-8 h-8 text-center border rounded text-sm ${
                                    isTestSubmitted
                                        ? correctMapping[index] === solution?.[index]
                                            ? 'bg-green-100 border-green-500 text-green-800'
                                            : 'bg-red-100 border-red-500 text-red-800'
                                        : darkMode
                                        ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500'
                                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                }`}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const ColumnarTranspositionDisplay = ({ 
    text, 
    quoteIndex,
    solution,
    isTestSubmitted,
    quotes,
    onSolutionChange
}: { 
    text: string;
    quoteIndex: number;
    solution?: { [key: string]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
}) => {
    const { darkMode } = useTheme();

    // Get the original quote length for the decrypted text input
    const originalQuote = quotes[quoteIndex]?.quote || '';
    const cleanOriginalLength = originalQuote.toUpperCase().replace(/[^A-Z]/g, '').length;
    
    // Get the current decrypted text from solution
    const decryptedText = solution?.decryptedText || '';

    return (
        <div className="font-mono">
            <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Columnar Transposition Cipher
            </div>

            {/* Cipher text display */}
            <div className={`mb-4 p-3 rounded border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Cipher Text
                </div>
                <div className={`text-sm break-all font-mono ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    {text.match(new RegExp(`.{1,${quotes[quoteIndex]?.key?.length || 5}}`, 'g'))?.join(' ') || text}
                </div>
            </div>

            {/* Decrypted text input */}
            <div className={`mb-4 p-3 rounded border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Decrypted Text
                </div>
                <textarea
                    value={decryptedText}
                    onChange={(e) => {
                        // Only allow letters and spaces, convert to uppercase
                        const filteredValue = e.target.value.toUpperCase().replace(/[^A-Z\s]/g, '');
                        onSolutionChange(quoteIndex, 'decryptedText', filteredValue);
                    }}
                    placeholder="Enter the decrypted text here..."
                    className={`w-full h-24 p-2 text-sm font-mono resize-none ${
                        darkMode 
                            ? 'bg-gray-700 text-gray-300 border-gray-600' 
                            : 'bg-white text-gray-900 border-gray-300'
                    } border rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    disabled={isTestSubmitted}
                />
                <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Length: {decryptedText.length}/{cleanOriginalLength} characters
                </div>
            </div>

            {/* Show original quote when test is submitted */}
            {isTestSubmitted && (
                <div className={`mt-4 p-4 rounded ${
                    darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Original Quote:
                    </p>
                    <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {originalQuote}
                    </p>
                </div>
            )}
        </div>
    );
};