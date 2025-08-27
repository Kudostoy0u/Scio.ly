'use client';
import React, { useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';
import { ReplacementTable } from './ReplacementTable';

// Helper function for keyword-based alphabet generation (copied from cipher-utils)
const generateKeywordAlphabet = (keyword: string): string => {
    const cleanKeyword = keyword.toUpperCase().replace(/[^A-Z]/g, '');
    const used = new Set<string>();
    const result: string[] = [];
    
    // Add keyword letters first (removing duplicates)
    for (const char of cleanKeyword) {
        if (!used.has(char)) {
            used.add(char);
            result.push(char);
        }
    }
    
    // Add remaining alphabet letters
    for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        if (!used.has(char)) {
            result.push(char);
        }
    }
    
    return result.join('');
};



interface SubstitutionDisplayProps {
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
    hintedLetters: {[questionIndex: number]: {[letter: string]: boolean}};
    _hintCounts: {[questionIndex: number]: number};
    onKeywordSolutionChange?: (quoteIndex: number, keyword: string) => void;
}

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
    onSolutionChange,
    hintedLetters,
    _hintCounts,
    onKeywordSolutionChange
}: SubstitutionDisplayProps) => {
    const { darkMode } = useTheme();
    const [focusedCipherLetter, setFocusedCipherLetter] = useState<string | null>(null);

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
                    case 'Complete Columnar':
            return 'Complete Columnar Cipher';
            case 'Random Xenocrypt':
                return 'Random Xenocrypt Cipher';
            case 'K1 Xenocrypt':
                return 'K1 Xenocrypt Cipher';
            case 'K2 Xenocrypt':
                return 'K2 Xenocrypt Cipher';
            default:
                return 'Substitution Cipher';
        }
    };

    // Create mapping for correct answers (for k1/k2/k3 variants, caesar, atbash, affine)
    const correctMapping: { [key: string]: string } = {};
    if (isTestSubmitted && quotes[quoteIndex]) {
        const quote = quotes[quoteIndex];
        
        // Handle keyword-based ciphers (K1, K2, K3)
        if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'K1 Xenocrypt', 'K2 Xenocrypt'].includes(cipherType) && quote.key) {
            // Reconstruct the substitution mapping from the keyword
            const keyword = quote.key;
            
            if (cipherType.includes('K1')) {
                if (cipherType.includes('Xenocrypt')) {
                    // K1 Xenocrypt: Plain alphabet is keyed + Ñ, cipher alphabet is standard (27 letters)
                    const plainAlphabet = generateKeywordAlphabet(keyword) + 'Ñ';
                    const cipherAlphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
                    
                    // Create substitution mapping: cipherLetter -> plainLetter
                    for (let i = 0; i < 27; i++) {
                        const cipherLetter = cipherAlphabet[i];
                        const plainLetter = plainAlphabet[i];
                        correctMapping[cipherLetter] = plainLetter;
                    }
                } else {
                    // K1 Aristocrat/Patristocrat: Plain alphabet is keyed, cipher alphabet is standard (26 letters)
                    const plainAlphabet = generateKeywordAlphabet(keyword);
                    const cipherAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    
                    // Create substitution mapping: cipherLetter -> plainLetter
                    for (let i = 0; i < 26; i++) {
                        const cipherLetter = cipherAlphabet[i];
                        const plainLetter = plainAlphabet[i];
                        correctMapping[cipherLetter] = plainLetter;
                    }
                }
            } else if (cipherType.includes('K2')) {
                if (cipherType.includes('Xenocrypt')) {
                    // K2 Xenocrypt: Plain alphabet is standard, cipher alphabet is keyed + Ñ (27 letters)
                    const plainAlphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
                    const cipherAlphabet = generateKeywordAlphabet(keyword) + 'Ñ';
                    
                    // Create substitution mapping: cipherLetter -> plainLetter
                    for (let i = 0; i < 27; i++) {
                        const cipherLetter = cipherAlphabet[i];
                        const plainLetter = plainAlphabet[i];
                        correctMapping[cipherLetter] = plainLetter;
                    }
                } else {
                    // K2 Aristocrat/Patristocrat: Plain alphabet is standard, cipher alphabet is keyed (26 letters)
                    const plainAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    const cipherAlphabet = generateKeywordAlphabet(keyword);
                    
                    // Create substitution mapping: cipherLetter -> plainLetter
                    for (let i = 0; i < 26; i++) {
                        const cipherLetter = cipherAlphabet[i];
                        const plainLetter = plainAlphabet[i];
                        correctMapping[cipherLetter] = plainLetter;
                    }
                }
            } else if (cipherType.includes('K3')) {
                // K3: Both alphabets use the same keyword with 1-position shift (26 letters only)
                const alphabet = generateKeywordAlphabet(keyword);
                
                // Create substitution mapping: cipherLetter -> plainLetter
                for (let i = 0; i < 26; i++) {
                    const shiftedIndex = (i + 1) % 26; // Shift by 1 to avoid self-mapping
                    const cipherLetter = alphabet[shiftedIndex];
                    const plainLetter = alphabet[i];
                    correctMapping[cipherLetter] = plainLetter;
                }
            }
        } else if (['Random Aristocrat', 'Random Patristocrat', 'Random Xenocrypt'].includes(cipherType) && quote.key) {
            // Handle random substitution ciphers (old format)
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
        } else if (['Nihilist', 'Fractionated Morse', 'Complete Columnar'].includes(cipherType) && quote.key) {
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
            {quotes[quoteIndex].askForKeyword && (
                <div className={`mb-4 p-3 rounded-lg border-2 ${
                    darkMode 
                        ? 'bg-blue-900/20 border-blue-500/50 text-blue-300' 
                        : 'bg-blue-50 border-blue-300 text-blue-800'
                }`}>
                    <div className="font-semibold mb-1">⚠️ Special Instructions:</div>
                    <div>The decrypted text will not be graded for this quote. Instead, figure out the <strong>key used to encode the cipher</strong>.</div>
                    <div className="text-sm mt-1 opacity-80">Enter the key in the input boxes below.</div>
                </div>
            )}
            
            {/* Keyword Input Section */}
            {quotes[quoteIndex].askForKeyword && (
                <div className="mb-6">
                    <div className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Key:
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: quotes[quoteIndex].key?.length || 0 }, (_, i) => {
                            const currentValue = quotes[quoteIndex].keywordSolution?.[i] || '';
                            const expectedValue = quotes[quoteIndex].key?.[i] || '';
                            const isCorrect = isTestSubmitted && currentValue.toUpperCase() === expectedValue.toUpperCase();
                            const showCorrectAnswer = isTestSubmitted;
                            
                            return (
                                <div key={i} className="flex flex-col items-center">
                                    <input
                                        type="text"
                                        maxLength={1}
                                        value={currentValue}
                                        disabled={isTestSubmitted}
                                        onChange={(e) => {
                                            if (onKeywordSolutionChange) {
                                                const currentKeyword = quotes[quoteIndex].keywordSolution || '';
                                                const newKeyword = currentKeyword.slice(0, i) + e.target.value.toUpperCase() + currentKeyword.slice(i + 1);
                                                onKeywordSolutionChange(quoteIndex, newKeyword);
                                            }
                                        }}
                                        className={`w-8 h-8 text-center border rounded text-sm ${
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
                                        <div className={`text-xs mt-1 ${
                                            darkMode ? 'text-red-400' : 'text-red-600'
                                        }`}>
                                            {expectedValue}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {getCipherInfo()}
            </div>
            <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
                {text.split('').map((char, i) => {
                    const isXenocrypt = cipherType.includes('Xenocrypt');
                    const isLetter = isXenocrypt ? /[A-ZÑ]/.test(char) : /[A-Z]/.test(char);
                    const value = solution?.[char] || '';
                    const isCorrect = isLetter && value === correctMapping[char];
                    const isHinted = isLetter && hintedLetters[quoteIndex]?.[char];
                    const showCorrectAnswer = isTestSubmitted && isLetter;
                    const isSameCipherLetter = isLetter && focusedCipherLetter === char;
                    
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
                                        onFocus={() => setFocusedCipherLetter(char)}
                                        onBlur={() => setFocusedCipherLetter(null)}
                                        className={`w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm ${
                                            isSameCipherLetter
                                                ? 'border-2 border-blue-500'
                                                : darkMode 
                                                    ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                        } ${
                                            showCorrectAnswer
                                                ? isHinted
                                                    ? 'border-yellow-500 bg-yellow-100/10'
                                                    : isCorrect
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
            
            {/* Replacement Table for substitution ciphers */}
            {['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt'].includes(cipherType) && (
                <ReplacementTable
                    text={text}
                    solution={solution}
                    quoteIndex={quoteIndex}
                    isTestSubmitted={isTestSubmitted}
                    cipherType={cipherType}
                    correctMapping={correctMapping}
                    onSolutionChange={onSolutionChange}
                    focusedCipherLetter={focusedCipherLetter}
                    onCipherLetterFocus={setFocusedCipherLetter}
                    onCipherLetterBlur={() => setFocusedCipherLetter(null)}
                />
            )}
            
            {/* Show original quote after submission */}
            {isTestSubmitted && (
                <div className={`mt-8 p-4 rounded ${
                    darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Original Quote:
                    </p>
                    <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {quotes[quoteIndex].quote.replace(/\[.*?\]/g, '')}
                    </p>
                </div>
            )}
        </div>
    );
};
