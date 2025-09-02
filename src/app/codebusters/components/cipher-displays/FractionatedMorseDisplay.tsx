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


    const correctMapping: { [key: string]: string } = {};
    if (isTestSubmitted && quotes[quoteIndex] && fractionationTable) {
        const quote = quotes[quoteIndex];
        

        if (quote.cipherType === 'Fractionated Morse') {
            Object.entries(fractionationTable).forEach(([triplet, letter]) => {
                correctMapping[letter] = triplet;
            });
        } else if (quote.key) {

            for (let i = 0; i < 26; i++) {
                const plainLetter = String.fromCharCode(65 + i);
                const cipherLetter = quote.key![i];
                correctMapping[cipherLetter] = plainLetter;
            }
        }
    }


    const usedTriplets = useMemo(() => 
        fractionationTable ? Object.keys(fractionationTable).filter(triplet => triplet !== 'xxx' && !triplet.includes('xxx')).sort() : [], 
        [fractionationTable]
    );
    

    const cipherToTriplet: { [key: string]: string } = {};
    if (fractionationTable) {
        Object.entries(fractionationTable).forEach(([triplet, letter]) => {
            cipherToTriplet[letter] = triplet;
        });
    }
    

    const tripletToCipher: { [key: string]: string } = {};
    if (fractionationTable) {
        Object.entries(fractionationTable).forEach(([triplet, letter]) => {
            tripletToCipher[triplet] = letter;
        });
    }


    const handleReplacementTableChange = (triplet: string, newLetter: string) => {
        if (!fractionationTable) return;
        


        if (newLetter) {

            onSolutionChange(quoteIndex, newLetter.toUpperCase(), triplet);
        } else {


            const previousLetter = solution?.[`replacement_${triplet}`];
            if (previousLetter) {

                onSolutionChange(quoteIndex, previousLetter.toUpperCase(), '');
            }
        }
    };


    const updateReplacementTableFromTriplet = (cipherLetter: string, triplet: string) => {
        if (!fractionationTable) return;
        
        console.log('Updating replacement table from triplet:', { cipherLetter, triplet, fractionationTable });
        

        const matchingTriplet = usedTriplets.find(t => t === triplet);
        if (matchingTriplet) {
            console.log('Found matching triplet:', matchingTriplet);

            onSolutionChange(quoteIndex, `replacement_${matchingTriplet}`, cipherLetter);
        } else {
            console.log('No matching triplet found for:', triplet);
            console.log('Available triplets:', usedTriplets);
        }
    };


    const clearReplacementTableFromTriplet = (cipherLetter: string, incompleteTriplet: string) => {
        if (!fractionationTable) return;
        
        console.log('Clearing replacement table from incomplete triplet:', { cipherLetter, incompleteTriplet });
        

        const matchingTriplet = usedTriplets.find(t => {
            const currentReplacement = solution?.[`replacement_${t}`];
            return currentReplacement === cipherLetter;
        });
        
        if (matchingTriplet) {
            console.log('Found triplet to clear:', matchingTriplet);

            onSolutionChange(quoteIndex, `replacement_${matchingTriplet}`, '');
        }
    };


    const calculatePlaintextLetters = (triplets: string[]): string[] => {
        const morseMap: { [key: string]: string } = {
            'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
            'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
            'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
            'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
            'Y': '-.--', 'Z': '--..'
        };
        

        const reverseMorseMap: { [key: string]: string } = {};
        Object.entries(morseMap).forEach(([letter, morse]) => {
            reverseMorseMap[morse] = letter;
        });


        const plaintextLetters: string[] = [];
        for (let i = 0; i < triplets.length; i++) {
            plaintextLetters.push('');
        }
        

        let morseString = '';
        for (const triplet of triplets) {
            morseString += triplet;
        }
        
        let currentIndex = 0;
        let currentMorse = '';
        let morseStartIndex = 0;
        

        for (let i = 0; i < morseString.length; i++) {
            const char = morseString[i];
            
            if (char === 'x') {

                if (currentMorse.length > 0) {
                    const letter = reverseMorseMap[currentMorse];
                    if (letter) {

                        const inputIndex = Math.floor(morseStartIndex / 3);
                        if (inputIndex < plaintextLetters.length) {
                            plaintextLetters[inputIndex] += letter;
                        }
                    }
                    currentMorse = '';
                }
                

                if (i + 1 < morseString.length && morseString[i + 1] === 'x' && i + 2 < morseString.length) {

                    const inputIndex = Math.floor(currentIndex / 3);
                    if (inputIndex < plaintextLetters.length && !plaintextLetters[inputIndex].includes('/')) {
                        plaintextLetters[inputIndex] += '/';
                    }
                    i++;
                    currentIndex++;
                }
                
                currentIndex++;
            } else {

                if (currentMorse.length === 0) {
                    morseStartIndex = currentIndex;
                }
                currentMorse += char;
                currentIndex++;
            }
        }
        

        if (currentMorse.length > 0) {
            const letter = reverseMorseMap[currentMorse];
            if (letter) {
                const inputIndex = Math.floor(morseStartIndex / 3);
                if (inputIndex < plaintextLetters.length) {
                    plaintextLetters[inputIndex] += letter;
                }
            }
        }
        

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

                    const triplets: string[] = [];
                    const incompleteTriplets: Set<number> = new Set();
                    text.split('').forEach((char, index) => {
                        if (/[A-Z]/.test(char)) {

                            const triplet = (isTestSubmitted && correctMapping[char]) ? correctMapping[char] : (solution?.[char] || '');
                            if (triplet.length === 3) {
                                triplets.push(triplet);
                            } else {

                                const placeholder = triplet.length === 0 ? 'xxx' : triplet + 'x'.repeat(3 - triplet.length);
                                triplets.push(placeholder);
                                incompleteTriplets.add(index);
                            }
                        }
                    });
                    

                    const plaintextLetters = calculatePlaintextLetters(triplets);
                    
                    return text.split('').map((char, i) => {
                        const isLetter = /[A-Z]/.test(char);
                        const value = solution?.[char] || '';
                        const isCorrect = isTestSubmitted && correctMapping[char] && value.toLowerCase() === correctMapping[char].toLowerCase();
                        const isHinted = isLetter && hintedLetters[quoteIndex]?.[char];
                        const showCorrectAnswer = isTestSubmitted && isLetter;
                        const isSameCipherLetter = isLetter && focusedCipherLetter === char;
                        


                        const plaintextLetter = isLetter && !incompleteTriplets.has(i) ? plaintextLetters[i] || '' : '';
                        

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

                                                const filteredValue = inputValue.split('').filter(char => 
                                                    /[.\-x]/i.test(char)
                                                ).join('').toUpperCase();
                                                

                                                let finalValue = filteredValue.replace(/X/g, 'x');
                                                

                                                finalValue = finalValue.replace(/xxx/g, 'xx');
                                                

                                                if (finalValue !== inputValue) {
                                                    e.target.value = finalValue;
                                                }
                                                
                                                console.log('Cipher input change:', { char, finalValue, length: finalValue.length });
                                                

                                                onSolutionChange(quoteIndex, char, finalValue);
                                                

                                                if (finalValue.length === 3) {
                                                    console.log('Complete triplet detected, updating replacement table');
                                                    updateReplacementTableFromTriplet(char, finalValue);
                                                } else if (finalValue.length < 3) {

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


                                    const replacementValue = solution?.[`replacement_${triplet}`] || '';
                                    const correctValue = fractionationTable?.[triplet] || '';
                                    const isCorrect = replacementValue === correctValue;
                                    const hasUserInput = replacementValue !== '';
                                    
                                    return (
                                        <td key={triplet} className={`p-1 border min-w-[2rem] ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                            {isTestSubmitted ? (

                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    {hasUserInput && !isCorrect ? (

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

                                                <input
                                                    type="text"
                                                    maxLength={1}
                                                    value={replacementValue}
                                                    onFocus={() => {}}
                                                    onBlur={() => {}}
                                                    onChange={(e) => {
                                                        const newLetter = e.target.value.toUpperCase();
                                                        

                                                        const existingLetters = usedTriplets.map(t => 
                                                            solution?.[`replacement_${t}`] || ''
                                                        ).filter(letter => letter !== '');
                                                        

                                                        if (existingLetters.includes(newLetter) && newLetter !== replacementValue) {
                                                            console.log('Letter already used:', newLetter);
                                                            return;
                                                        }
                                                        
                                                        console.log('Updating replacement table:', { triplet, newLetter, existingLetters });
                                                        

                                                        onSolutionChange(quoteIndex, `replacement_${triplet}`, newLetter);

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

                </div>
            )}
        </div>
    );
};
