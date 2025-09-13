'use client';
import React, { useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';
import { ReplacementTable } from './ReplacementTable';


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
                return `Caesar Cipher${caesarShift !== undefined ? ` (Shift: ${caesarShift})` : ''}`;
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
            case 'K3 Xenocrypt':
                return 'K3 Xenocrypt Cipher';
            default:
                return 'Substitution Cipher';
        }
    };


    const correctMapping: { [key: string]: string } = {};
    if (isTestSubmitted && quotes[quoteIndex]) {
        const quote = quotes[quoteIndex];
        

        if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'K1 Xenocrypt', 'K2 Xenocrypt', 'K3 Xenocrypt'].includes(cipherType) && quote.key) {

            const keyword = quote.key;
            
            // Prefer stored alphabets if present for exact mapping
            if (quote.plainAlphabet && quote.cipherAlphabet) {
                const pa = quote.plainAlphabet;
                const ca = quote.cipherAlphabet;
                const len = Math.min(pa.length, ca.length);
                for (let i = 0; i < len; i++) {
                    const cipherLetter = ca[i];
                    const plainLetter = pa[i];
                    correctMapping[cipherLetter] = plainLetter;
                }
            } else if (cipherType.includes('K1')) {
                const kShift = (quotes[quoteIndex] as any).kShift ?? 0;
                if (cipherType.includes('Xenocrypt')) {

                    const plainAlphabet = generateKeywordAlphabet(keyword) + 'Ñ';
                    const baseCipher = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
                    const cipherAlphabet = baseCipher.slice(kShift) + baseCipher.slice(0, kShift);
                    

                    for (let i = 0; i < 27; i++) {
                        const cipherLetter = cipherAlphabet[i];
                        const plainLetter = plainAlphabet[i];
                        correctMapping[cipherLetter] = plainLetter;
                    }
                } else {

                    const plainAlphabet = generateKeywordAlphabet(keyword);
                    const baseCipher = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    const cipherAlphabet = baseCipher.slice(kShift) + baseCipher.slice(0, kShift);
                    

                    for (let i = 0; i < 26; i++) {
                        const cipherLetter = cipherAlphabet[i];
                        const plainLetter = plainAlphabet[i];
                        correctMapping[cipherLetter] = plainLetter;
                    }
                }
            } else if (cipherType.includes('K2')) {
                const kShift = (quotes[quoteIndex] as any).kShift ?? 0;
                if (cipherType.includes('Xenocrypt')) {

                    const plainAlphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
                    const baseCipher = generateKeywordAlphabet(keyword) + 'Ñ';
                    const cipherAlphabet = baseCipher.slice(kShift) + baseCipher.slice(0, kShift);
                    

                    for (let i = 0; i < 27; i++) {
                        const cipherLetter = cipherAlphabet[i];
                        const plainLetter = plainAlphabet[i];
                        correctMapping[cipherLetter] = plainLetter;
                    }
                } else {

                    const plainAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    const baseCipher = generateKeywordAlphabet(keyword);
                    const cipherAlphabet = baseCipher.slice(kShift) + baseCipher.slice(0, kShift);
                    

                    for (let i = 0; i < 26; i++) {
                        const cipherLetter = cipherAlphabet[i];
                        const plainLetter = plainAlphabet[i];
                        correctMapping[cipherLetter] = plainLetter;
                    }
                }
            } else if (cipherType.includes('K3')) {
                const kShift = (quotes[quoteIndex] as any).kShift ?? 1;
                if (cipherType.includes('Xenocrypt')) {
                    const baseAlphabet = generateKeywordAlphabet(keyword);
                    const alphabet = baseAlphabet + 'Ñ';
                    const len = 27;
                    for (let i = 0; i < len; i++) {
                        const shiftedIndex = (i + kShift) % len;
                        const cipherLetter = alphabet[shiftedIndex];
                        const plainLetter = alphabet[i];
                        correctMapping[cipherLetter] = plainLetter;
                    }
                } else {
                    const alphabet = generateKeywordAlphabet(keyword);
                    const len = 26;
                    for (let i = 0; i < len; i++) {
                        const shiftedIndex = (i + kShift) % len;
                        const cipherLetter = alphabet[shiftedIndex];
                        const plainLetter = alphabet[i];
                        correctMapping[cipherLetter] = plainLetter;
                    }
                }
            }
        } else if (['Random Aristocrat', 'Random Patristocrat', 'Random Xenocrypt'].includes(cipherType) && quote.key) {

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

            for (let i = 0; i < 26; i++) {
                const plainLetter = String.fromCharCode(65 + i);
                const cipherLetter = quote.key[i];
                correctMapping[cipherLetter] = plainLetter;
            }
        } else if (['Nihilist', 'Fractionated Morse', 'Complete Columnar'].includes(cipherType) && quote.key) {

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
                                        autoComplete="off"
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
            {['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt', 'K3 Xenocrypt'].includes(cipherType) && (
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
                    hintedLetters={hintedLetters}
                />
            )}
            
            {/* Show original quote and keyword after submission */}
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
                    {quotes[quoteIndex].key && (
                        <div className="mt-3">
                            <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Keyword:
                            </p>
                            <p className={`font-mono text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                {quotes[quoteIndex].key}
                            </p>
                        </div>
                    )}
                    {(quotes[quoteIndex].plainAlphabet || quotes[quoteIndex].cipherAlphabet) && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {quotes[quoteIndex].plainAlphabet && (
                                <div>
                                    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Plain Alphabet:</p>
                                    <p className={`font-mono text-xs break-all ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                        {quotes[quoteIndex].plainAlphabet}
                                    </p>
                                </div>
                            )}
                            {quotes[quoteIndex].cipherAlphabet && (
                                <div>
                                    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Cipher Alphabet:</p>
                                    <p className={`font-mono text-xs break-all ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                        {quotes[quoteIndex].cipherAlphabet}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
