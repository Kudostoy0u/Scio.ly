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

    // Function to calculate plaintext letters from morse code triplets
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

        const plaintextLetters: string[] = [];
        
        for (let i = 0; i < triplets.length; i++) {
            const triplet = triplets[i];
            let letters = '';
            
            // Check if this is the first triplet or if previous triplet ended with x
            const isFirstTriplet = i === 0;
            const prevTriplet = i > 0 ? triplets[i - 1] : '';
            const prevEndedWithX = prevTriplet && prevTriplet[2] === 'x';

            // Special case: previous ended with x AND current triplet has x in middle
            // Then we should produce two letters: one from the start of current triplet up to the x,
            // and one from after the x continuing until the next x.
            if (prevEndedWithX && triplet[1] === 'x') {
                let firstLetter = '';
                const firstMorse = (triplet[0] || '');
                const mappedFirst = reverseMorseMap[firstMorse];
                if (mappedFirst) firstLetter = mappedFirst;

                // build second morse starting from position 2 of current triplet
                let secondMorse = triplet[2] || '';
                for (let j = i + 1; j < triplets.length; j++) {
                    const nextTriplet = triplets[j] || '';
                    const xPos = nextTriplet.indexOf('x');
                    if (xPos !== -1) {
                        secondMorse += nextTriplet.slice(0, xPos);
                        break;
                    } else {
                        secondMorse += nextTriplet;
                    }
                }
                const mappedSecond = reverseMorseMap[secondMorse];

                const combined = `${firstLetter}${mappedSecond || ''}`;
                if (combined) {
                    plaintextLetters.push(combined);
                    continue;
                }
            }
            
            if (isFirstTriplet || prevEndedWithX) {
                // Start collecting morse code from this position
                let morseCode = '';
                let startPos = 0;
                
                // If previous triplet ended with x, start from the beginning of current triplet
                // Otherwise, start from the beginning of current triplet
                if (prevEndedWithX) {
                    morseCode = triplet;
                    startPos = i;
                } else {
                    morseCode = triplet;
                    startPos = i;
                }
                
                // Continue collecting morse code until we hit any 'x' in future triplets
                for (let j = startPos + 1; j < triplets.length; j++) {
                    const nextTriplet = triplets[j] || '';
                    const xPos = nextTriplet.indexOf('x');
                    if (xPos !== -1) {
                        // Add everything before the x and stop
                        morseCode += nextTriplet.slice(0, xPos);
                        break;
                    } else {
                        // No x in this triplet, include whole triplet
                        morseCode += nextTriplet;
                    }
                }
                
                // Convert morse code to letter
                const letter = reverseMorseMap[morseCode];
                if (letter) {
                    letters += letter;
                }
            }

            // If we've already produced a plaintext letter from the "start"/previous-x logic,
            // skip the other cases to avoid producing duplicates (e.g., LL or HH).
            if (letters) {
                plaintextLetters.push(letters);
                continue;
            }
            
            // Check if current triplet has an x in the middle (position 1) and doesn't start with x
            if (triplet[1] === 'x' && triplet[0] !== 'x') {
                // Take the part after the x (position 2) and continue until next x
                let morseCode = triplet[2];
                
                for (let j = i + 1; j < triplets.length; j++) {
                    const nextTriplet = triplets[j];
                    
                    // Check if this triplet has an x
                    const xPos = nextTriplet.indexOf('x');
                    if (xPos !== -1) {
                        // Add the part before the x
                        morseCode += nextTriplet.slice(0, xPos);
                        break;
                    } else {
                        // Add the entire triplet
                        morseCode += nextTriplet;
                    }
                }
                
                // Convert morse code to letter
                const letter = reverseMorseMap[morseCode];
                if (letter) {
                    letters += letter;
                }
            }
            
            // Check if current triplet has x in first and last positions (x.x pattern)
            if (triplet[0] === 'x' && triplet[2] === 'x') {
                // This represents just the middle character (position 1)
                const morseCode = triplet[1];
                const letter = reverseMorseMap[morseCode];
                if (letter) {
                    letters += letter;
                }
                
                // Check if next triplet starts with x (word boundary)
                const nextTriplet = i < triplets.length - 1 ? triplets[i + 1] : '';
                if (nextTriplet && nextTriplet[0] === 'x') {
                    letters += '/';
                }
            }
            // Check if current triplet has x in first position (x.. pattern) - but not x.x
            else if (triplet[0] === 'x') {
                // Take the part after the x (positions 1 and 2) and continue until next x
                let morseCode = triplet.slice(1);
                
                for (let j = i + 1; j < triplets.length; j++) {
                    const nextTriplet = triplets[j];
                    
                    // Check if this triplet has an x
                    const xPos = nextTriplet.indexOf('x');
                    if (xPos !== -1) {
                        // Add the part before the x
                        morseCode += nextTriplet.slice(0, xPos);
                        break;
                    } else {
                        // Add the entire triplet
                        morseCode += nextTriplet;
                    }
                }
                
                // Convert morse code to letter
                const letter = reverseMorseMap[morseCode];
                if (letter) {
                    letters += letter;
                }
            }
            // Check if previous triplet ended with x and current triplet has x in last position
            else if (prevEndedWithX && triplet[2] === 'x') {
                // Start with the first two characters of current triplet (stop at the x in current triplet)
                const morseCode = triplet.slice(0, 2);
                
                // Convert morse code to letter
                const letter = reverseMorseMap[morseCode];
                if (letter) {
                    letters += letter;
                }
                
                // Check if next triplet starts with x (word boundary)
                const nextTriplet = i < triplets.length - 1 ? triplets[i + 1] : '';
                if (nextTriplet && nextTriplet[0] === 'x') {
                    letters += '/';
                }
            }
            // Check if previous triplet ended with x and current triplet has no x in last position
            else if (prevEndedWithX && triplet[2] !== 'x') {
                // Start with the entire current triplet and continue until next x
                let morseCode = triplet;
                
                for (let j = i + 1; j < triplets.length; j++) {
                    const nextTriplet = triplets[j];
                    
                    // Check if this triplet has an x
                    const xPos = nextTriplet.indexOf('x');
                    if (xPos !== -1) {
                        // Add the part before the x
                        morseCode += nextTriplet.slice(0, xPos);
                        break;
                    } else {
                        // Add the entire triplet
                        morseCode += nextTriplet;
                    }
                }
                
                // Convert morse code to letter
                const letter = reverseMorseMap[morseCode];
                if (letter) {
                    letters += letter;
                }
            }
            
            // Check for double x in current triplet (word boundary)
            if (triplet.includes('xx')) {
                // Case: triplet starts with 'xx' (e.g., "xx.") -> show '/' then map morse after the second x
                if (triplet[0] === 'x' && triplet[1] === 'x') {
                    if (!letters.includes('/')) letters += '/';
                    // Collect morse after the second x
                    let morseCodeAfter = triplet.slice(2) || '';
                    for (let j = i + 1; j < triplets.length; j++) {
                        const nextTriplet = triplets[j] || '';
                        const xPos = nextTriplet.indexOf('x');
                        if (xPos !== -1) {
                            morseCodeAfter += nextTriplet.slice(0, xPos);
                            break;
                        } else {
                            morseCodeAfter += nextTriplet;
                        }
                    }
                    const mappedAfter = reverseMorseMap[morseCodeAfter];
                    if (mappedAfter) letters += mappedAfter;
                }
                // If pattern is like ".xx" or "-xx" handle specially:
                // - if previous triplet ended with x, show the mapped first symbol plus '/'
                // - otherwise show just '/'
                else if ((triplet[1] === 'x' && triplet[2] === 'x') && (triplet[0] === '.' || triplet[0] === '-')) {
                    if (prevEndedWithX) {
                        const mapped = reverseMorseMap[triplet[0]];
                        if (mapped) letters += mapped;
                        if (!letters.includes('/')) letters += '/';
                    } else {
                        if (!letters.includes('/')) letters += '/';
                    }
                } else {
                    if (!letters.includes('/')) letters += '/';
                }
            }

            // If current triplet ends with x and next triplet starts with x, mark a word boundary
            const nextTripletForBoundary = i < triplets.length - 1 ? triplets[i + 1] : '';
            if (triplet[2] === 'x' && nextTripletForBoundary && nextTripletForBoundary[0] === 'x') {
                // Avoid duplicating a slash if already present
                if (!letters.includes('/')) letters += '/';
            }
            
            plaintextLetters.push(letters);
        }
        
        return plaintextLetters;
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
                    text.split('').forEach(char => {
                        if (/[A-Z]/.test(char)) {
                            // Use correct mapping if available (for red text), otherwise use user solution
                            const triplet = (isTestSubmitted && correctMapping[char]) ? correctMapping[char] : (solution?.[char] || '');
                            if (triplet.length === 3) {
                                triplets.push(triplet);
                            } else {
                                triplets.push(''); // Placeholder for incomplete triplets
                            }
                        }
                    });
                    
                    // Calculate plaintext letters
                    const plaintextLetters = calculatePlaintextLetters(triplets);
                    
                    return text.split('').map((char, i) => {
                        const isLetter = /[A-Z]/.test(char);
                        const value = solution?.[char] || '';
                        const isCorrect = isTestSubmitted && correctMapping[char] && value.toLowerCase() === correctMapping[char].toLowerCase();
                        const showCorrectAnswer = isTestSubmitted && isLetter;
                        const isSameCipherLetter = isLetter && focusedCipherLetter === char;
                        
                        // Get the plaintext letter for this position
                        const plaintextLetter = isLetter ? plaintextLetters[i] || '' : '';
                        
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
                                                isSameCipherLetter
                                                    ? 'border-2 border-blue-500'
                                                    : darkMode 
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
