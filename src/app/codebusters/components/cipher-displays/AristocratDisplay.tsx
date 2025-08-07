'use client';
import React from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';
import { FrequencyTable } from './FrequencyTable';

interface AristocratDisplayProps {
    text: string;
    quoteIndex: number;
    solution?: { [key: string]: string };
    frequencyNotes?: { [key: string]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
    onFrequencyNoteChange: (quoteIndex: number, letter: string, note: string) => void;
}

export const AristocratDisplay = ({ 
    text, 
    quoteIndex, 
    solution, 
    frequencyNotes,
    isTestSubmitted,
    quotes,
    onSolutionChange,
    onFrequencyNoteChange
}: AristocratDisplayProps) => {
    const { darkMode } = useTheme();
    
    // Create mapping for correct answers
    const correctMapping: { [key: string]: string } = {};
    if (isTestSubmitted && quotes[quoteIndex].key) {
        for (let i = 0; i < 26; i++) {
            const plainLetter = String.fromCharCode(65 + i);
            const cipherLetter = quotes[quoteIndex].key![i];
            correctMapping[cipherLetter] = plainLetter;
        }
    }

    return (
        <div className="font-mono">
            <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
                {text.split('').map((char, i) => {
                    const isLetter = /[A-Z]/.test(char);
                    const value = solution?.[char] || '';
                    const isCorrect = isLetter && value === correctMapping[char];
                    const showCorrectAnswer = isTestSubmitted && isLetter;
                    
                    return (
                        <div key={i} className="flex flex-col items-center mx-0.5">
                            <span className={`text-base sm:text-lg ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{char}</span>
                            {isLetter && (
                                <div className="relative h-12 sm:h-14">
                                    <input
                                        type="text"
                                        id={`aristocrat-${quoteIndex}-${i}`}
                                        name={`aristocrat-${quoteIndex}-${i}`}
                                        maxLength={1}
                                        value={value}
                                        disabled={isTestSubmitted}
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
                                            showCorrectAnswer
                                                ? isCorrect
                                                    ? 'border-green-500 bg-green-100/10'
                                                    : 'border-red-500 bg-red-100/10'
                                                : ''
                                        }`}
                                    />
                                    {showCorrectAnswer && !isCorrect && (
                                        <div className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
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
            <FrequencyTable 
                text={text}
                frequencyNotes={frequencyNotes}
                onNoteChange={(letter, note) => onFrequencyNoteChange(quoteIndex, letter, note)}
                quoteIndex={quoteIndex}
            />
        </div>
    );
};
