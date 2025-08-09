'use client';
import React, { useMemo } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';

interface BaconianDisplayProps {
    text: string;
    quoteIndex: number;
    solution?: { [key: number]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onBaconianSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
}

export const BaconianDisplay = ({ 
    text, 
    quoteIndex,
    solution,
    isTestSubmitted,
    quotes,
    onBaconianSolutionChange
}: BaconianDisplayProps) => {
    const { darkMode } = useTheme();
    
    // Precompute groups/tokens once per text
    const parsedGroups = useMemo(() => {
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
        return groups;
    }, [text]);
    
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
                {parsedGroups.map((group, i) => {
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
                                            // Sync the same letter across all identical 5-bit groups
                                            if (/^[AB]{5}$/.test(group)) {
                                                const targetGroup = group;
                                                parsedGroups.forEach((g, idx) => {
                                                    if (g === targetGroup) {
                                                        onBaconianSolutionChange(quoteIndex, idx, newValue);
                                                    }
                                                });
                                            } else {
                                                onBaconianSolutionChange(quoteIndex, i, newValue);
                                            }
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
                })}
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
