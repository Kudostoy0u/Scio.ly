'use client';
import React, { useMemo, useState } from 'react';
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
    hintedLetters?: {[questionIndex: number]: {[letter: string]: boolean}};
}

export const FractionatedMorseDisplay = ({ 
    text, 
    quoteIndex,
    solution,
    fractionationTable,
    isTestSubmitted,
    quotes,
    onSolutionChange,
    hintedLetters = {}
}: FractionatedMorseDisplayProps) => {
    const { darkMode } = useTheme();
    const [focusedCipherLetter, setFocusedCipherLetter] = useState<string | null>(null);

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
        fractionationTable ? Object.keys(fractionationTable).filter(triplet => triplet !== 'xxx' && !triplet.includes('xxx')).sort() : [], 
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

    // Function to calculate plaintext letters from morse code triplets using linear sweep
    const calculatePlaintextLetters = (triplets: string[]): string[] => {
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

        // Initialize all positions with empty strings
        const plaintextLetters: string[] = [];
        for (let i = 0; i < triplets.length; i++) {
            plaintextLetters.push('');
        }
        
        // Concatenate all triplets into a single morse code string
        let morseString = '';
        for (const triplet of triplets) {
            morseString += triplet;
        }
        
        let currentIndex = 0;
        let currentMorse = '';
        let morseStartIndex = 0; // Track the start index of current morse code
        
        // Process the morse string linearly
        for (let i = 0; i < morseString.length; i++) {
            const char = morseString[i];
            
            if (char === 'x') {
                // Check if we have accumulated morse code to decode
                if (currentMorse.length > 0) {
                    const letter = reverseMorseMap[currentMorse];
                    if (letter) {
                        // Calculate which input position this corresponds to based on the start index
                        const inputIndex = Math.floor(morseStartIndex / 3);
                        if (inputIndex < plaintextLetters.length) {
                            plaintextLetters[inputIndex] += letter;
                        }
                    }
                    currentMorse = '';
                }
                
                // Check for double x (word boundary) - but not at the end of the string
                if (i + 1 < morseString.length && morseString[i + 1] === 'x' && i + 2 < morseString.length) {
                    // Calculate which input position this corresponds to
                    const inputIndex = Math.floor(currentIndex / 3);
                    if (inputIndex < plaintextLetters.length && !plaintextLetters[inputIndex].includes('/')) {
                        plaintextLetters[inputIndex] += '/';
                    }
                    i++; // Skip the next x
                    currentIndex++;
                }
                
                currentIndex++;
            } else {
                // Start accumulating morse code (if this is the first character)
                if (currentMorse.length === 0) {
                    morseStartIndex = currentIndex;
                }
                currentMorse += char;
                currentIndex++;
            }
        }
        
        // Handle any remaining morse code at the end
        if (currentMorse.length > 0) {
            const letter = reverseMorseMap[currentMorse];
            if (letter) {
                const inputIndex = Math.floor(morseStartIndex / 3);
                if (inputIndex < plaintextLetters.length) {
                    plaintextLetters[inputIndex] += letter;
                }
            }
        }
        
        // Remove any inputs that map to just "xxx" (triple x) or contain triple x patterns
        const filteredPlaintextLetters = plaintextLetters.map(letters => 
            letters === 'xxx' || letters.includes('xxx') ? '' : letters
        );
        
        return filteredPlaintextLetters;
    };

    return (
        <div className="font-mono">
            <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Fractionated Morse Cipher
            </div>

            {/* Cipher text */}
            <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
                {(() => {
                    // Get all triplets from the solution or correct mapping
                    const triplets: string[] = [];
                    const incompleteTriplets: Set<number> = new Set();
                    text.split('').forEach((char, index) => {
                        if (/[A-Z]/.test(char)) {
                            // Use correct mapping if available (for red text), otherwise use user solution
                            const triplet = (isTestSubmitted && correctMapping[char]) ? correctMapping[char] : (solution?.[char] || '');
                            if (triplet.length === 3) {
                                triplets.push(triplet);
                            } else {
                                // Use placeholder values for incomplete triplets to make decoding more sensible
                                const placeholder = triplet.length === 0 ? 'xxx' : triplet + 'x'.repeat(3 - triplet.length);
                                triplets.push(placeholder);
                                incompleteTriplets.add(index);
                            }
                        }
                    });
                    
                    // Calculate plaintext letters
                    const plaintextLetters = calculatePlaintextLetters(triplets);
                    
                    return text.split('').map((char, i) => {
                        const isLetter = /[A-Z]/.test(char);
                        const value = solution?.[char] || '';
                        const isCorrect = isTestSubmitted && correctMapping[char] && value.toLowerCase() === correctMapping[char].toLowerCase();
                        const isHinted = isLetter && hintedLetters[quoteIndex]?.[char];
                        const showCorrectAnswer = isTestSubmitted && isLetter;
                        const isSameCipherLetter = isLetter && focusedCipherLetter === char;
                        
                        // Get the plaintext letter for this position
                        // Don't show decoded text for incomplete triplets
                        const plaintextLetter = isLetter && !incompleteTriplets.has(i) ? plaintextLetters[i] || '' : '';
                        
                        // Debug logging
                        if (isLetter && plaintextLetter) {
                            console.log(`Plaintext for ${char}: ${plaintextLetter}, triplet: ${triplets[i]}`);
                        }
                        
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
                                            onFocus={() => setFocusedCipherLetter(char)}
                                            onBlur={() => setFocusedCipherLetter(null)}
                                            onChange={(e) => {
                                                const inputValue = e.target.value;
                                                // Filter to only allow dots, dashes, and x (case insensitive)
                                                const filteredValue = inputValue.split('').filter(char => 
                                                    /[.\-x]/i.test(char)
                                                ).join('').toUpperCase();
                                                
                                                // Convert x to lowercase for fractionated morse
                                                let finalValue = filteredValue.replace(/X/g, 'x');
                                                
                                                // Remove any triple x patterns
                                                finalValue = finalValue.replace(/xxx/g, 'xx');
                                                
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
                                            placeholder=""
                                        />
                                        {showCorrectAnswer && !isCorrect && (
                                            <div className={`absolute top-6 sm:top-7 left-1/2 -translate-x-1/2 text-[7px] sm:text-[8px] ${
                                                darkMode ? 'text-red-400' : 'text-red-600'
                                            }`}>
                                                {correctMapping[char]}
                                            </div>
                                        )}
                                        {/* Plaintext letter display */}
                                        {plaintextLetter && (
                                            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] font-bold ${
                                                darkMode ? 'text-blue-400' : 'text-blue-600'
                                            }`}>
                                                {plaintextLetter}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!isLetter && <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />}
                            </div>
                        );
                    });
                })()}
            </div>



            {/* Replacement Table */}
            <div className={`mt-4 mb-4 p-3 rounded border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Replacement Table
                </div>
                <div className="overflow-x-auto">
                    <table className="text-xs border-collapse min-w-full">
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
                                    const correctValue = fractionationTable?.[triplet] || '';
                                    const isCorrect = replacementValue === correctValue;
                                    const hasUserInput = replacementValue !== '';
                                    
                                    return (
                                        <td key={triplet} className={`p-1 border min-w-[2rem] ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                            {isTestSubmitted ? (
                                                // Show correct mappings after submission
                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    {hasUserInput && !isCorrect ? (
                                                        // Show both wrong and correct answers side by side
                                                        <div className="flex items-center justify-center space-x-1">
                                                            <div className={`text-xs line-through ${
                                                                darkMode ? 'text-red-400' : 'text-red-600'
                                                            }`}>
                                                                {replacementValue}
                                                            </div>
                                                            <div className={`text-xs font-medium ${
                                                                darkMode ? 'text-green-400' : 'text-green-600'
                                                            }`}>
                                                                {correctValue}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Show only correct answer
                                                        <div className={`text-center text-xs font-medium ${
                                                            isCorrect 
                                                                ? (darkMode ? 'text-green-400' : 'text-green-600')
                                                                : (darkMode ? 'text-red-400' : 'text-red-600')
                                                        }`}>
                                                            {correctValue}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                // Normal input during test
                                                <input
                                                    type="text"
                                                    maxLength={1}
                                                    value={replacementValue}
                                                    onFocus={() => {}}
                                                    onBlur={() => {}}
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
                                                    className={`w-full text-center text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-900'} focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                        'border-0'
                                                    }`}
                                                    placeholder=""
                                                />
                                            )}
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
