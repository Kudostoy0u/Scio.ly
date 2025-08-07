'use client';
import React, { useMemo } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';

interface FractionatedMorseDisplayProps {
    text: string;
    quoteIndex: number;
    solution?: { [key: string]: string };
    fractionationTable?: { [key: string]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
}

export const FractionatedMorseDisplay = ({ 
    text, 
    quoteIndex,
    solution,
    fractionationTable,
    isTestSubmitted,
    quotes,
    onSolutionChange
}: FractionatedMorseDisplayProps) => {
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
