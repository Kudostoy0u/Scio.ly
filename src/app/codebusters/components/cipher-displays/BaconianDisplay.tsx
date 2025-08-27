'use client';
import React, { useMemo } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';

interface BaconianDisplayProps {
    text: string; // Keep for interface compatibility but mark as unused
    quoteIndex: number;
    solution?: { [key: number]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onBaconianSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
    activeHints: {[questionIndex: number]: boolean};
}

export const BaconianDisplay = ({ 
    text, // eslint-disable-line @typescript-eslint/no-unused-vars
    quoteIndex,
    solution,
    isTestSubmitted,
    quotes,
    onBaconianSolutionChange,
    activeHints
}: BaconianDisplayProps) => {
    const { darkMode } = useTheme();
    
    // Get the original quote and convert it to binary
    const baconianData = useMemo(() => {
        const quote = quotes[quoteIndex]?.quote || '';
        const binaryType = quotes[quoteIndex]?.baconianBinaryType || 'A/B';
        
        // Clean the quote and convert to uppercase
        const cleanedQuote = quote.toUpperCase().replace(/[^A-Z]/g, '');
        
        // Convert each letter to its 5-bit binary representation
        const letterToBinary: { [key: string]: string } = {
            'A': 'AAAAA', 'B': 'AAAAB', 'C': 'AAABA', 'D': 'AAABB', 'E': 'AABAA',
            'F': 'AABAB', 'G': 'AABBA', 'H': 'AABBB', 'I': 'ABAAA', 'J': 'ABAAA', // I/J same
            'K': 'ABAAB', 'L': 'ABABA', 'M': 'ABABB', 'N': 'ABBAA', 'O': 'ABBAB',
            'P': 'ABBBA', 'Q': 'ABBBB', 'R': 'BAAAA', 'S': 'BAAAB', 'T': 'BAABA',
            'U': 'BAABB', 'V': 'BAABB', // U/V same
            'W': 'BABAA', 'X': 'BABAB', 'Y': 'BABBA', 'Z': 'BABBB'
        };
        
        // Convert each letter to binary
        const binaryGroups: string[] = [];
        for (let i = 0; i < cleanedQuote.length; i++) {
            const letter = cleanedQuote[i];
            if (letterToBinary[letter]) {
                binaryGroups.push(letterToBinary[letter]);
            }
        }
        
        // Apply binary type filter to convert A/B to the appropriate symbols
        const applyBinaryFilter = (binaryGroup: string): string => {
            if (binaryType === 'A/B') {
                return binaryGroup; // Keep as A/B
            } else if (binaryType === 'Vowels/Consonants') {
                return binaryGroup.replace(/A/g, 'A').replace(/B/g, 'B');
            } else if (binaryType === 'Odd/Even') {
                return binaryGroup.replace(/A/g, 'A').replace(/B/g, 'B');
            } else if (binaryType === 'Emoji Pairs') {
                const happyEmojis = ['😊', '😄', '😃', '😁', '😆', '😅', '😂', '🤣', '😉', '😋'];
                const sadEmojis = ['😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩'];
                return binaryGroup.split('').map((char, index) => {
                    if (char === 'A') {
                        return happyEmojis[index % happyEmojis.length];
                    } else {
                        return sadEmojis[index % sadEmojis.length];
                    }
                }).join('');
            } else if (binaryType === 'Emoji Sets') {
                const desertEmojis = ['🌵', '🏜️', '🐪', '☀️', '🔥', '💨'];
                const animalEmojis = ['🐯', '🦁', '🐻', '🐨', '🐼', '🦊'];
                return binaryGroup.split('').map((char, index) => {
                    if (char === 'A') {
                        return desertEmojis[index % desertEmojis.length];
                    } else {
                        return animalEmojis[index % animalEmojis.length];
                    }
                }).join('');
            } else if (binaryType === 'Weather/Nature') {
                const weatherEmojis = ['☀', '⛅', '☁', '🌧', '⚡', '❄'];
                const natureEmojis = ['🌿', '🌱', '🌲', '🌳', '🌴', '🌵', '🌸', '🌺', '🌻', '🌼'];
                return binaryGroup.split('').map((char, index) => {
                    if (char === 'A') {
                        return weatherEmojis[index % weatherEmojis.length];
                    } else {
                        return natureEmojis[index % natureEmojis.length];
                    }
                }).join('');
            } else if (binaryType === 'Food/Drink') {
                const foodEmojis = ['🍕', '🍔', '🍟', '🌭', '🌮', '🌯', '🥪', '🥙', '🍖', '🍗'];
                const drinkEmojis = ['☕', '🍺', '🍷', '🍸', '🍹', '🥤', '🧃', '🥛', '🍼', '🧋'];
                return binaryGroup.split('').map((char, index) => {
                    if (char === 'A') {
                        return foodEmojis[index % foodEmojis.length];
                    } else {
                        return drinkEmojis[index % drinkEmojis.length];
                    }
                }).join('');
            } else if (binaryType === 'Monetary Single') {
                return binaryGroup.replace(/A/g, '฿').replace(/B/g, '¥');
            } else if (binaryType === 'Monetary Double') {
                return binaryGroup.replace(/A/g, '฿฿').replace(/B/g, '¥¥');
            } else if (binaryType === 'Accented/Non-accented') {
                return binaryGroup.replace(/A/g, 'á').replace(/B/g, 'a');
            } else if (binaryType === 'Height Characters') {
                return binaryGroup.replace(/A/g, '#').replace(/B/g, '@');
            }
            return binaryGroup; // fallback to A/B
        };
        
        const filteredGroups = binaryGroups.map(applyBinaryFilter);
        
        return {
            originalQuote: cleanedQuote,
            binaryGroups: filteredGroups,
            binaryType
        };
    }, [quotes, quoteIndex]);
    
    return (
        <div className="font-mono baconian-cipher" style={{ fontFamily: 'monospace, "EmojiFont", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", "EmojiSymbols", "EmojiOne Mozilla", "Twemoji Mozilla", "Segoe UI Symbol"' }}>
            <div className={`mb-4 p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Note: Using 24-letter alphabet (I/J same, U/V same)
                </p>
                {activeHints[quoteIndex] && baconianData.binaryType && (
                    <p className={`text-sm mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                        Binary Type: {baconianData.binaryType}
                    </p>
                )}
            </div>
            
            <div className="flex flex-wrap gap-4">
                {baconianData.binaryGroups.map((group, i) => {
                    const value = solution?.[i] || '';
                    const correctLetter = baconianData.originalQuote[i] || '';
                    const isCorrect = value === correctLetter;
                    
                    return (
                        <div key={i} className="flex flex-col items-center">
                            <div className={`text-xs sm:text-sm mb-1 font-mono ${
                                darkMode ? 'text-gray-400' : 'text-gray-600'
                            } ${['Emoji Pairs', 'Emoji Sets', 'Weather/Nature', 'Food/Drink'].includes(baconianData.binaryType) ? 'baconian-emoji' : ''}`}>
                                {Array.from(group).map((char, j) => (
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
