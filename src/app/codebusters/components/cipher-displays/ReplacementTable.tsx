'use client';
import React from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { getLetterFrequencies } from '../../utils/substitution';

interface ReplacementTableProps {
    text: string;
    solution?: { [key: string]: string };
    quoteIndex: number;
    isTestSubmitted: boolean;
    cipherType: string;
    correctMapping?: { [key: string]: string };
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
    focusedCipherLetter?: string | null;
    onCipherLetterFocus?: (cipherLetter: string) => void;
    onCipherLetterBlur?: () => void;
    hintedLetters?: { [questionIndex: number]: { [letter: string]: boolean } };
}

export const ReplacementTable = ({ 
    text, 
    solution,
    quoteIndex,
    isTestSubmitted,
    cipherType,
    correctMapping,
    onSolutionChange,
    focusedCipherLetter,
    onCipherLetterFocus,
    onCipherLetterBlur,
    hintedLetters
}: ReplacementTableProps) => {
    const { darkMode } = useTheme();
    const frequencies = getLetterFrequencies(text);
    

    const isXenocrypt = cipherType.includes('Xenocrypt');
    const alphabet = isXenocrypt ? 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    

    const handleReplacementTableChange = (cipherLetter: string, newPlainLetter: string) => {
        if (isTestSubmitted) return;
        

        const existingPlainLetters = Object.values(solution || {}).filter(letter => letter !== '');
        

        if (existingPlainLetters.includes(newPlainLetter) && newPlainLetter !== solution?.[cipherLetter]) {
            return;
        }
        

        onSolutionChange(quoteIndex, cipherLetter, newPlainLetter);
    };



    return (
        <div className={`mt-4 mb-4 p-3 rounded border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
            <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Replacement Table
            </div>
            <div className="overflow-x-auto">
                <table className="text-xs border-collapse min-w-full">
                    <tbody>
                        {/* Cipher letters row */}
                        <tr>
                            <td className={`p-1 border text-center font-bold ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                Cipher
                            </td>
                            {alphabet.split('').map(letter => (
                                <td key={letter} className={`p-1 border text-center font-bold ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                    {letter}
                                </td>
                            ))}
                        </tr>
                        {/* Frequency row */}
                        <tr>
                            <td className={`p-1 border text-center font-bold ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                Frequency
                            </td>
                            {alphabet.split('').map(letter => (
                                <td key={letter} className={`p-1 border text-center ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'}`}>
                                    {frequencies[letter] || 0}
                                </td>
                            ))}
                        </tr>
                        {/* Replacement row - editable cells */}
                        <tr>
                            <td className={`p-1 border text-center font-bold ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                Replacement
                            </td>
                            {alphabet.split('').map(letter => {
                                const userValue = solution?.[letter] || '';
                                const correctValue = correctMapping?.[letter] || '';
                                const isCorrect = userValue === correctValue;
                                const hasUserInput = userValue !== '';
                                const isHinted = Boolean(hintedLetters?.[quoteIndex]?.[letter]);
                                
                                return (
                                    <td key={letter} className={`p-1 border min-w-[2rem] ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                        {isTestSubmitted ? (

                                            <div className="relative w-full h-full flex items-center justify-center">
                                                {hasUserInput && !isCorrect && !isHinted ? (

                                                    <div className="flex items-center justify-center space-x-1">
                                                        <div className={`text-xs line-through ${
                                                            darkMode ? 'text-red-400' : 'text-red-600'
                                                        }`}>
                                                            {userValue}
                                                        </div>
                                                        <div className={`text-xs font-medium ${
                                                            darkMode ? 'text-green-400' : 'text-green-600'
                                                        }`}>
                                                            {correctValue}
                                                        </div>
                                                    </div>
                                                ) : (

                                                    <div className={`text-center text-xs font-medium ${
                                                        isHinted
                                                            ? (darkMode ? 'text-yellow-300' : 'text-yellow-600')
                                                            : isCorrect 
                                                                ? (darkMode ? 'text-green-400' : 'text-green-600')
                                                                : (darkMode ? 'text-red-400' : 'text-red-600')
                                                    }`}>
                                                        {correctValue}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (

                                            <input
                                                type="text"
                                                maxLength={1}
                                                value={userValue}
                                                onChange={(e) => handleReplacementTableChange(letter, e.target.value.toUpperCase())}
                                                onFocus={() => onCipherLetterFocus?.(letter)}
                                                onBlur={onCipherLetterBlur}
                                                autoComplete="off"
                                                className={`w-full text-center text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                    focusedCipherLetter === letter ? 'ring-2 ring-blue-500' : 'border-0'
                                                }`}
                                                placeholder=""
                                            />
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
