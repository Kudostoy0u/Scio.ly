'use client';
import React from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';
import { FrequencyTable } from './FrequencyTable';

interface PortaDisplayProps {
    text: string;
    keyword: string;
    quoteIndex: number;
    solution?: { [key: string]: string };
    frequencyNotes?: { [key: string]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
    onFrequencyNoteChange: (quoteIndex: number, letter: string, note: string) => void;
}

export const PortaDisplay = ({ 
    text, 
    keyword,
    quoteIndex,
    solution,
    frequencyNotes,
    isTestSubmitted,
    quotes,
    onSolutionChange,
    onFrequencyNoteChange
}: PortaDisplayProps) => {
    const { darkMode } = useTheme();
    
    // Create mapping for correct answers
    const originalQuote = quotes[quoteIndex].quote.toUpperCase();
    const correctMapping: { [key: number]: string } = {};
    let letterIndex = 0;
    
    // Map each position in the encrypted text to its corresponding position in the original quote
    for (let i = 0; i < text.length; i++) {
        if (/[A-Z]/.test(text[i])) {
            while (letterIndex < originalQuote.length) {
                if (/[A-Z]/.test(originalQuote[letterIndex])) {
                    correctMapping[i] = originalQuote[letterIndex];
                    letterIndex++;
                    break;
                }
                letterIndex++;
            }
        }
    }
    
    return (
        <div className="font-mono">
            <div className={`mb-4 p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Keyword: <span className="font-bold">{keyword}</span>
                </p>
            </div>
            <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
                {text.split('').map((char, i) => {
                    const isLetter = /[A-Z]/.test(char);
                    const value = solution?.[char] || '';
                    const correctLetter = correctMapping[i];
                    const isCorrect = isLetter && value.toUpperCase() === correctLetter;
                    
                    return (
                        <div key={i} className="flex flex-col items-center mx-0.5">
                            <span className={`text-base sm:text-lg ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{char}</span>
                            {isLetter && (
                                <div className="relative h-12 sm:h-14">
                                    <input
                                        type="text"
                                        id={`porta-${quoteIndex}-${i}`}
                                        name={`porta-${quoteIndex}-${i}`}
                                        maxLength={1}
                                        disabled={isTestSubmitted}
                                        value={value}
                                        onChange={(e) => onSolutionChange(
                                            quoteIndex,
                                            char,
                                            e.target.value.toUpperCase()
                                        )}
                                        className={`w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm ${
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
                                        <div className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
                                            darkMode ? 'text-red-400' : 'text-red-600'
                                        }`}>
                                            {correctLetter}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!isLetter && <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />}
                        </div>
                    );
                })}
            </div>
            <FrequencyTable 
                text={text}
                frequencyNotes={frequencyNotes}
                onNoteChange={(letter, note) => onFrequencyNoteChange(quoteIndex, letter, note)}
                quoteIndex={quoteIndex}
            />
            
            {/* Show original quote after submission */}
            {isTestSubmitted && (
                <div className={`mt-8 p-4 rounded ${
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
