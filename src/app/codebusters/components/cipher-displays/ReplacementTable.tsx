'use client';
import React from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { getLetterFrequencies } from '../../cipher-utils';

interface ReplacementTableProps {
    text: string;
    solution?: { [key: string]: string };
    quoteIndex: number;
    isTestSubmitted: boolean;
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
    focusedCipherLetter?: string | null;
    onCipherLetterFocus?: (cipherLetter: string) => void;
    onCipherLetterBlur?: () => void;
}

export const ReplacementTable = ({ 
    text, 
    solution,
    quoteIndex,
    isTestSubmitted,
    onSolutionChange,
    focusedCipherLetter,
    onCipherLetterFocus,
    onCipherLetterBlur
}: ReplacementTableProps) => {
    const { darkMode } = useTheme();
    const frequencies = getLetterFrequencies(text);
    
    // Handle replacement table input changes
    const handleReplacementTableChange = (cipherLetter: string, newPlainLetter: string) => {
        if (isTestSubmitted) return;
        
        // Check if this plain letter is already used in another replacement table input
        const existingPlainLetters = Object.values(solution || {}).filter(letter => letter !== '');
        
        // If letter is already used and it's not the current input, don't allow it
        if (existingPlainLetters.includes(newPlainLetter) && newPlainLetter !== solution?.[cipherLetter]) {
            return; // Don't update
        }
        
        // Update the solution for this cipher letter
        onSolutionChange(quoteIndex, cipherLetter, newPlainLetter);
    };



    return (
        <div className={`mt-4 mb-4 p-3 rounded border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
            <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Replacement Table
            </div>
            <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                    <tbody>
                        {/* Cipher letters row */}
                        <tr>
                            <td className={`p-1 border text-center font-bold ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                Cipher
                            </td>
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
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
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                                <td key={letter} className={`p-1 border text-center ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'}`}>
                                    {frequencies[letter]}
                                </td>
                            ))}
                        </tr>
                        {/* Replacement row - editable cells */}
                        <tr>
                            <td className={`p-1 border text-center font-bold ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                Replacement
                            </td>
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                                <td key={letter} className={`p-1 border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                    <input
                                        type="text"
                                        maxLength={1}
                                        value={solution?.[letter] || ''}
                                        onChange={(e) => handleReplacementTableChange(letter, e.target.value.toUpperCase())}
                                        onFocus={() => onCipherLetterFocus?.(letter)}
                                        onBlur={onCipherLetterBlur}
                                        className={`w-full text-center text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-900'} focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                            focusedCipherLetter === letter ? 'border-2 border-blue-500' : 'border-0'
                                        }`}
                                        placeholder=""
                                        disabled={isTestSubmitted}
                                    />
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
