'use client';
import React from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';
import { ReplacementTable } from './ReplacementTable';

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
    _hintCounts
}: SubstitutionDisplayProps) => {
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
                    case 'Complete Columnar':
            return 'Complete Columnar Cipher';
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
            <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {getCipherInfo()}
            </div>
            <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
                {text.split('').map((char, i) => {
                    const isLetter = /[A-Z]/.test(char);
                    const value = solution?.[char] || '';
                    const isCorrect = isLetter && value === correctMapping[char];
                    const isHinted = isLetter && hintedLetters[quoteIndex]?.[char];
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
            {['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Xenocrypt'].includes(cipherType) && (
                <ReplacementTable
                    text={text}
                    solution={solution}
                    quoteIndex={quoteIndex}
                    isTestSubmitted={isTestSubmitted}
                    onSolutionChange={onSolutionChange}
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
                        {quotes[quoteIndex].quote}
                    </p>
                </div>
            )}
        </div>
    );
};
