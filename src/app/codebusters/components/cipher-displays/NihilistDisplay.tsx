'use client';
import React from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';

interface NihilistDisplayProps {
    text: string;
    polybiusKey: string;
    cipherKey: string;
    quoteIndex: number;
    solution?: { [key: number]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
}

export const NihilistDisplay = ({ 
    text, 
    polybiusKey,
    cipherKey,
    quoteIndex,
    solution,
    isTestSubmitted,
    quotes,
    onSolutionChange
}: NihilistDisplayProps) => {
    const { darkMode } = useTheme();
    const quote = quotes[quoteIndex];

    // Split the ciphertext into blocks and preserve block structure
    const blocks = text.split('  '); // Split by double spaces to preserve blocks
    const numberGroups: string[] = [];
    const blockBoundaries: number[] = []; // Track where blocks end
    
    blocks.forEach((block, blockIndex) => {
        const pairs = block.split(' ').filter(group => group.length === 2);
        numberGroups.push(...pairs);
        
        // Mark the end of each block (except the last one)
        if (blockIndex < blocks.length - 1) {
            blockBoundaries.push(numberGroups.length - 1);
        }
    });

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
                        <React.Fragment key={index}>
                            <div className="flex flex-col items-center">
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
                                {isTestSubmitted && (
                                    <div className={`mt-1 text-[10px] ${
                                        (solution?.[index] || '').toUpperCase() === (correctMapping[index] || '')
                                            ? 'text-green-600'
                                            : 'text-gray-500'
                                    }`}>
                                        {(correctMapping[index] || '').toUpperCase()}
                                    </div>
                                )}
                            </div>
                            {/* Add empty gap after each block boundary */}
                            {blockBoundaries.includes(index) && (
                                <div className="w-6 h-8"></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        {isTestSubmitted && (
            <div className={`mt-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                <div className="font-semibold">Original quote:</div>
                <div className="whitespace-pre-wrap mt-1">{quote.quote.replace(/\[.*?\]/g, '')}</div>
            </div>
        )}
        </div>
    );
};
