'use client';
import React from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';

interface ColumnarTranspositionDisplayProps {
    text: string;
    quoteIndex: number;
    solution?: { [key: string]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
}

export const ColumnarTranspositionDisplay = ({ 
    text, 
    quoteIndex,
    solution,
    isTestSubmitted,
    quotes,
    onSolutionChange
}: ColumnarTranspositionDisplayProps) => {
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
