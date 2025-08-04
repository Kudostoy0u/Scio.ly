'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from 'next/navigation';
import { FaShareAlt } from 'react-icons/fa';
import * as XLSX from 'xlsx';

import ShareModal from '@/app/components/ShareModal';
import {
  getCurrentTestSession,
  initializeTestSession,
  resumeTestSession,
  updateTimeLeft,
  markTestSubmitted,
  migrateFromLegacyStorage,
  setupVisibilityHandling,
  clearTestSession
} from '@/app/utils/timeManagement';

interface QuoteData {
    author: string;
    quote: string;
    encrypted: string;
    cipherType: 'aristocrat' | 'patristocrat' | 'hill' | 'baconian' | 'porta';
    key?: string;        // For aristocrat/patristocrat
    matrix?: number[][]; // For hill
    portaKeyword?: string; // For porta
    solution?: { [key: string]: string };
    frequencyNotes?: { [key: string]: string };
    hillSolution?: {
        matrix: string[][];
        plaintext: { [key: number]: string };
    };
    difficulty?: number; // New field for difficulty
}

// Helper functions for both ciphers
const mod26 = (n: number): number => ((n % 26) + 26) % 26;
const letterToNumber = (letter: string): number => letter.toUpperCase().charCodeAt(0) - 65;
const numberToLetter = (num: number): string => String.fromCharCode(mod26(num) + 65);

// Format time function
const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

// Aristocrat cipher with unique mapping
const encryptAristocrat = (text: string): { encrypted: string; key: string } => {
    const generateKey = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const result = new Array(26);
        let available = [...alphabet];
        
        // For each position in the alphabet
        for (let i = 0; i < 26; i++) {
            // Remove the current letter from available options
            available = available.filter(char => char !== alphabet[i]);
            
            // Randomly select from remaining letters
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            
            // Restore available letters except the one we just used
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateKey();
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        key[letterToNumber(char)] || char
    );

    return { encrypted, key };
};

// Patristocrat cipher with unique mapping
const encryptPatristocrat = (text: string): { encrypted: string; key: string } => {
    const generateKey = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const result = new Array(26);
        let available = [...alphabet];
        
        // For each position in the alphabet
        for (let i = 0; i < 26; i++) {
            // Remove the current letter from available options
            available = available.filter(char => char !== alphabet[i]);
            
            // Randomly select from remaining letters
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            
            // Restore available letters except the one we just used
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateKey();
    
    // Remove all non-letters and convert to uppercase
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    
    // Encrypt the cleaned text
    const encryptedLetters = cleanText.split('').map(char => 
        key[letterToNumber(char)] || char
    );
    
    // Group into sets of 5 letters
    const groupedText = encryptedLetters.reduce((acc: string[], letter: string, i: number) => {
        const groupIndex = Math.floor(i / 5);
        if (!acc[groupIndex]) {
            acc[groupIndex] = '';
        }
        acc[groupIndex] += letter;
        return acc;
    }, []);

    // Join groups with spaces
    const encrypted = groupedText.join(' ');

    return { encrypted, key };
};

// Hill cipher with 2x2 matrix
const encryptHill = (text: string): { encrypted: string; matrix: number[][] } => {
    // List of verified invertible matrices mod 26
    const invertibleMatrices = [
        [[3, 2], [5, 7]],   // det = 11
        [[5, 3], [7, 2]],   // det = 11
        [[7, 2], [3, 5]],   // det = 29
        [[5, 7], [2, 3]],   // det = 1
        [[3, 5], [2, 7]]    // det = 11
    ];

    // Select a random invertible matrix
    const matrix = invertibleMatrices[Math.floor(Math.random() * invertibleMatrices.length)];
    
    // Clean and pad the text
    const cleanText = text.replace(/[^A-Za-z]/g, '').toUpperCase();
    const paddedText = cleanText.length % 2 === 0 ? cleanText : cleanText + 'X';
    
    let encrypted = '';
    
    // Encrypt pairs of letters
    for (let i = 0; i < paddedText.length; i += 2) {
        const pair = [letterToNumber(paddedText[i]), letterToNumber(paddedText[i + 1])];
        
        // Matrix multiplication
        const encryptedPair = [
            mod26(matrix[0][0] * pair[0] + matrix[0][1] * pair[1]),
            mod26(matrix[1][0] * pair[0] + matrix[1][1] * pair[1])
        ];
        
        encrypted += numberToLetter(encryptedPair[0]) + numberToLetter(encryptedPair[1]);
    }
    
    // Add spaces every 5 characters for readability
    encrypted = encrypted.match(/.{1,5}/g)?.join(' ') || encrypted;
    
    return { encrypted, matrix };
};

// Porta cipher encryption
const encryptPorta = (text: string): { encrypted: string; keyword: string } => {
    // Porta table - each row represents the substitution for a keyword letter
    const portaTable = {
        'A': 'NOPQRSTUVWXYZABCDEFGHIJKLM',
        'B': 'OPQRSTUVWXYZABCDEFGHIJKLMN',
        'C': 'PQRSTUVWXYZABCDEFGHIJKLMNO',
        'D': 'QRSTUVWXYZABCDEFGHIJKLMNOP',
        'E': 'RSTUVWXYZABCDEFGHIJKLMNOPQ',
        'F': 'STUVWXYZABCDEFGHIJKLMNOPQR',
        'G': 'TUVWXYZABCDEFGHIJKLMNOPQRS',
        'H': 'UVWXYZABCDEFGHIJKLMNOPQRST',
        'I': 'VWXYZABCDEFGHIJKLMNOPQRSTU',
        'J': 'WXYZABCDEFGHIJKLMNOPQRSTUV',
        'K': 'XYZABCDEFGHIJKLMNOPQRSTUVW',
        'L': 'YZABCDEFGHIJKLMNOPQRSTUVWX',
        'M': 'ZABCDEFGHIJKLMNOPQRSTUVWXY',
        'N': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'O': 'BCDEFGHIJKLMNOPQRSTUVWXYZA',
        'P': 'CDEFGHIJKLMNOPQRSTUVWXYZAB',
        'Q': 'DEFGHIJKLMNOPQRSTUVWXYZABC',
        'R': 'EFGHIJKLMNOPQRSTUVWXYZABCD',
        'S': 'FGHIJKLMNOPQRSTUVWXYZABCDE',
        'T': 'GHIJKLMNOPQRSTUVWXYZABCDEF',
        'U': 'HIJKLMNOPQRSTUVWXYZABCDEFG',
        'V': 'IJKLMNOPQRSTUVWXYZABCDEFGH',
        'W': 'JKLMNOPQRSTUVWXYZABCDEFGHI',
        'X': 'KLMNOPQRSTUVWXYZABCDEFGHIJ',
        'Y': 'LMNOPQRSTUVWXYZABCDEFGHIJK',
        'Z': 'MNOPQRSTUVWXYZABCDEFGHIJKL'
    };

    // Generate a random 4-letter keyword
    const keyword = Array.from({ length: 4 }, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');

    // Clean the text
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');

    // Encrypt the text
    let encrypted = '';
    for (let i = 0; i < cleanText.length; i++) {
        const keywordChar = keyword[i % keyword.length];
        const textChar = cleanText[i];
        const row = portaTable[keywordChar];
        const col = textChar.charCodeAt(0) - 65;
        encrypted += row[col];
    }

    // Add spaces every 5 characters for readability
    encrypted = encrypted.match(/.{1,5}/g)?.join(' ') || encrypted;

    return { encrypted, keyword };
};

// Baconian cipher with 24-letter alphabet (I/J same, U/V same)
const encryptBaconian = (text: string): { encrypted: string; } => {
    // Baconian cipher mapping (24-letter alphabet)
    const baconianMap: { [key: string]: string } = {
        'A': 'AAAAA', 'B': 'AAAAB', 'C': 'AAABA', 'D': 'AAABB', 'E': 'AABAA',
        'F': 'AABAB', 'G': 'AABBA', 'H': 'AABBB', 'I': 'ABAAA', 'J': 'ABAAA',
        'K': 'ABAAB', 'L': 'ABABA', 'M': 'ABABB', 'N': 'ABBAA', 'O': 'ABBAB',
        'P': 'ABBBA', 'Q': 'ABBBB', 'R': 'BAAAA', 'S': 'BAAAB', 'T': 'BAABA',
        'U': 'BAABB', 'V': 'BAABB', 'W': 'BABAA', 'X': 'BABAB', 'Y': 'BABBA',
        'Z': 'BABBB'
    };

    // Clean and convert the text
    const cleanText = text.toUpperCase().replace(/[^A-Z\s.,!?]/g, '');
    let encrypted = '';
    let letterCount = 0;

    // Process each character
    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        if (/[A-Z]/.test(char)) {
            encrypted += baconianMap[char];
            letterCount++;
            // Add space after every 5 groups (25 letters) for readability
            if (letterCount % 5 === 0) {
                encrypted += ' ';
            } else {
                encrypted += ' ';
            }
        } else {
            // Preserve spaces and punctuation
            encrypted += char;
        }
    }

    return { encrypted: encrypted.trim() };
};

// New helper function to calculate letter frequencies
const getLetterFrequencies = (text: string): { [key: string]: number } => {
    const frequencies: { [key: string]: number } = {};
    // Initialize all letters to 0
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
        frequencies[letter] = 0;
    });
    // Count occurrences
    text.split('').forEach(char => {
        if (/[A-Z]/.test(char)) {
            frequencies[char]++;
        }
    });
    return frequencies;
}; 

// Frequency table component
const FrequencyTable = ({ 
    text, 
    frequencyNotes,
    onNoteChange,
    quoteIndex
}: { 
    text: string;
    frequencyNotes?: { [key: string]: string };
    onNoteChange: (letter: string, note: string) => void;
    quoteIndex: number;
}) => {
    const { darkMode } = useTheme();
    const frequencies = getLetterFrequencies(text);
    
    return (
        <div className={`mt-4 p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Frequency Analysis</p>
            <div className="flex flex-wrap gap-2">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                    <div key={letter} className="flex flex-col items-center min-w-[2rem]">
                        <div className={`text-xs sm:text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{letter}</div>
                        <div className={`text-[10px] sm:text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{frequencies[letter]}</div>
                        <input
                            type="text"
                            id={`frequency-${quoteIndex}-${letter}`}
                            name={`frequency-${quoteIndex}-${letter}`}
                            maxLength={1}
                            value={frequencyNotes?.[letter] || ''}
                            onChange={(e) => onNoteChange(letter, e.target.value)}
                            className={`w-5 h-5 sm:w-6 sm:h-6 text-center border rounded text-xs sm:text-sm mt-1 ${
                                darkMode 
                                    ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                            }`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

// Hill cipher display component
const HillDisplay = ({ 
    text, 
    matrix, 
    quoteIndex,
    solution,
    onSolutionChange,
    isTestSubmitted,
    quotes 
}: { 
    text: string;
    matrix: number[][];
    quoteIndex: number;
    solution?: { matrix: string[][]; plaintext: { [key: number]: string } };
    onSolutionChange: (type: 'matrix' | 'plaintext', value: string[][] | { [key: number]: string }) => void;
    isTestSubmitted: boolean;
    quotes: QuoteData[];
}) => {
    const { darkMode } = useTheme();
    const quote = quotes[quoteIndex];
    
    // Create a mapping of positions to correct letters, preserving spaces and punctuation
    const correctMapping: { [key: number]: string } = {};
    if (isTestSubmitted) {
        const originalQuote = quote.quote.toUpperCase();
        let plainTextIndex = 0;
        
        // Map each encrypted letter position to its corresponding plaintext letter
        for (let i = 0; i < text.length; i++) {
            if (/[A-Z]/.test(text[i])) {
                while (plainTextIndex < originalQuote.length) {
                    if (/[A-Z]/.test(originalQuote[plainTextIndex])) {
                        correctMapping[i] = originalQuote[plainTextIndex];
                        plainTextIndex++;
                        break;
                    }
                    plainTextIndex++;
                }
            }
        }
    }

    return (
        <div className="font-mono">
            {/* Matrix display section */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-6">
                <div>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Encryption Matrix:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {matrix.map((row, i) => 
                            row.map((num, j) => (
                                <div key={`${i}-${j}`} className={`w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center border rounded ${
                                    darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                                }`}>
                                    <span className={`text-base sm:text-lg font-bold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{num}</span>
                                    <span className={`text-[10px] sm:text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>({numberToLetter(num)})</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Decryption Matrix:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {[0, 1].map(i => 
                            [0, 1].map(j => (
                                <input
                                    key={`solution-${i}-${j}`}
                                    type="text"
                                    id={`hill-matrix-${i}-${j}`}
                                    name={`hill-matrix-${i}-${j}`}
                                    maxLength={2}
                                    disabled={isTestSubmitted}
                                    value={solution?.matrix?.[i]?.[j] || ''}
                                    onChange={(e) => {
                                        const newMatrix = solution?.matrix || [['', ''], ['', '']];
                                        newMatrix[i][j] = e.target.value;
                                        onSolutionChange('matrix', newMatrix);
                                    }}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 text-center border rounded text-base sm:text-lg ${
                                        darkMode 
                                            ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                    }`}
                                    placeholder="?"
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Updated Encrypted text and solution section */}
            <div className="flex flex-wrap gap-y-8 text-sm sm:text-base">
                {text.split('').map((char, i) => {
                    const isLetter = /[A-Z]/.test(char);
                    const value = solution?.plaintext?.[i] || '';
                    const correctLetter = isTestSubmitted && isLetter ? correctMapping[i] : '';
                    const isCorrect = value.toUpperCase() === correctLetter;

                    return (
                        <div key={i} className="flex flex-col items-center mx-0.5">
                            <span className={`text-base sm:text-lg ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{char}</span>
                            {isLetter && (
                                <div className="relative h-12 sm:h-14">
                                    <input
                                        type="text"
                                        id={`hill-plaintext-${quoteIndex}-${i}`}
                                        name={`hill-plaintext-${quoteIndex}-${i}`}
                                        maxLength={1}
                                        disabled={isTestSubmitted}
                                        value={value}
                                        onChange={(e) => {
                                            const newValue = e.target.value.toUpperCase();
                                            const newPlaintext = { ...(solution?.plaintext || {}) };
                                            newPlaintext[i] = newValue;
                                            onSolutionChange('plaintext', newPlaintext);
                                        }}
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

            {/* Show original quote after submission */}
            {isTestSubmitted && (
                <div className={`mt-8 p-4 rounded ${
                    darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Original Quote:
                    </p>
                    <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {quote.quote}
                    </p>
                </div>
            )}
        </div>
    );
}; 

export default function CodeBusters() {
    const { darkMode } = useTheme();
    const router = useRouter();
    const [quotes, setQuotes] = useState<QuoteData[]>([]);
    const [isTestSubmitted, setIsTestSubmitted] = useState(false);
    const [testScore, setTestScore] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutes in seconds
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPDFViewer, setShowPDFViewer] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [inputCode, setInputCode] = useState<string>('');
    const [, setIsTimeSynchronized] = useState(false);
    const [, setSyncTimestamp] = useState<number | null>(null);

    // Handle checking answer for aristocrat/patristocrat cipher
    const checkAristocratAnswer = useCallback((quoteIndex: number): boolean => {
        const quote = quotes[quoteIndex];
        if ((quote.cipherType !== 'aristocrat' && quote.cipherType !== 'patristocrat') || !quote.solution) return false;

        // Create a mapping from cipher text to plain text using the key
        const correctMapping: { [key: string]: string } = {};
        for (let i = 0; i < 26; i++) {
            const plainLetter = String.fromCharCode(65 + i);
            const cipherLetter = quote.key![i];
            correctMapping[cipherLetter] = plainLetter;
        }

        // Check if all mappings in the solution are correct
        return Object.entries(quote.solution).every(([cipher, plain]) => 
            correctMapping[cipher] === plain.toUpperCase()
        );
    }, [quotes]);

    // Handle checking answer for Hill cipher
    const checkHillAnswer = useCallback((quoteIndex: number): boolean => {
        const quote = quotes[quoteIndex];
        if (quote.cipherType !== 'hill' || !quote.hillSolution) return false;

        // Convert the plaintext object to a string, preserving spaces and punctuation
        const plaintext = quote.encrypted.split('').map((char, i) => 
            /[A-Z]/.test(char) ? (quote.hillSolution?.plaintext?.[i] || '') : char
        ).join('');

        return plaintext.toUpperCase() === quote.quote.toUpperCase();
    }, [quotes]);

    // Handle checking answer for Porta cipher
    const checkPortaAnswer = useCallback((quoteIndex: number): boolean => {
        const quote = quotes[quoteIndex];
        if (quote.cipherType !== 'porta' || !quote.solution) return false;

        // Create a mapping of positions to correct letters from the original quote
        const originalQuote = quote.quote.toUpperCase();
        const correctMapping: { [key: number]: string } = {};
        let letterIndex = 0;
        
        // Map each position in the encrypted text to its corresponding position in the original quote
        for (let i = 0; i < quote.encrypted.length; i++) {
            if (/[A-Z]/.test(quote.encrypted[i])) {
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

        // Check if all letters in the solution match the correct mapping
        for (let i = 0; i < quote.encrypted.length; i++) {
            if (/[A-Z]/.test(quote.encrypted[i])) {
                const userAnswer = quote.solution[quote.encrypted[i]];
                if (!userAnswer || userAnswer.toUpperCase() !== correctMapping[i]) {
                    return false;
                }
            }
        }

        return true;
    }, [quotes]);

    // Update handleSubmitTest to include Porta cipher checking
    const handleSubmitTest = useCallback(() => {
        let correctCount = 0;
        quotes.forEach((quote, index) => {
            const isCorrect = quote.cipherType === 'aristocrat' || quote.cipherType === 'patristocrat'
                ? checkAristocratAnswer(index)
                : quote.cipherType === 'hill'
                    ? checkHillAnswer(index)
                    : quote.cipherType === 'porta'
                        ? checkPortaAnswer(index)
                        : false;
            if (isCorrect) correctCount++;
        });

        // Calculate score as percentage
        const score = (correctCount / quotes.length) * 100;
        setTestScore(score);
        setIsTestSubmitted(true);
        
        // Mark test as submitted using new time management system
        markTestSubmitted();
    }, [quotes, checkAristocratAnswer, checkHillAnswer, checkPortaAnswer]);

    // Setup visibility handling for time management
    useEffect(() => {
        const cleanup = setupVisibilityHandling();
        return cleanup;
    }, []);

    // Calculate progress for each quote
    const calculateQuoteProgress = (quote: QuoteData): number => {
        if (quote.cipherType === 'aristocrat' || quote.cipherType === 'patristocrat') {
            const totalLetters = [...new Set(quote.encrypted.match(/[A-Z]/g) || [])].length;
            const filledLetters = quote.solution ? Object.keys(quote.solution).length : 0;
            return totalLetters > 0 ? (filledLetters / totalLetters) * 100 : 0;
        } else {
            // For Hill cipher
            const matrixProgress = quote.hillSolution?.matrix.reduce((acc, row) => 
                acc + row.filter(cell => cell !== '').length, 0) || 0;
            const plaintextProgress = Object.keys(quote.hillSolution?.plaintext || {}).length / 
                (quote.encrypted.match(/[A-Z]/g)?.length || 1);
            return ((matrixProgress / 4) * 50) + (plaintextProgress * 50); // Weight matrix and plaintext equally
        }
    };

    // Calculate overall progress
    const totalProgress = quotes.reduce((acc, quote) => 
        acc + calculateQuoteProgress(quote), 0) / (quotes.length || 1);

    // Load data from localStorage on component mount
    useEffect(() => {
        console.log('🔍 Codebusters page loading...');
        const testParamsStr = localStorage.getItem('testParams');
        const savedQuotes = localStorage.getItem('codebustersQuotes');
        const savedIsTestSubmitted = localStorage.getItem('codebustersIsTestSubmitted');
        const savedTestScore = localStorage.getItem('codebustersTestScore');
        
        console.log('🔍 Codebusters localStorage data:', {
            testParamsStr: !!testParamsStr,
            savedQuotes: !!savedQuotes,
            savedIsTestSubmitted: !!savedIsTestSubmitted,
            savedTestScore: !!savedTestScore
        });
        
        // This is the primary loading logic. It relies on data being pre-loaded into localStorage.
        if (testParamsStr) {
            console.log('🔍 Found testParams, processing...');
            if (savedQuotes) {
                console.log('🔍 Found saved quotes, parsing...');
                try {
                    const parsedQuotes = JSON.parse(savedQuotes);
                    console.log('🔍 Successfully parsed quotes:', parsedQuotes.length);
                    setQuotes(parsedQuotes);
                    toast.success('Test loaded successfully!');
                } catch (error) {
                    console.error('Error parsing saved quotes:', error);
                    setError('Could not load test data. It might be corrupted.');
                }
            } else {
                console.log('🔍 No saved quotes found, loading from Excel...');
                // If we have params but no quotes, it's a new test, not a shared one.
                loadQuestionsFromExcel();
            }

            // Initialize time management system
            const testParams = JSON.parse(testParamsStr);
            const eventName = testParams.eventName || 'Codebusters';
            const timeLimit = parseInt(testParams.timeLimit || '30');
            
            console.log('🔍 Initializing time management:', { eventName, timeLimit });
            
            // Check if this is a fresh reset (no share code)
            const hasShareCode = localStorage.getItem('shareCode');
            
            let session;
            
            if (!hasShareCode) {
                console.log('🔍 Fresh test or reset - migrating from legacy storage');
                // Fresh test or reset - try to migrate from legacy storage first
                session = migrateFromLegacyStorage(eventName, timeLimit);
                
                if (!session) {
                    console.log('🔍 No legacy session, checking current session');
                    // Check if we have an existing session
                    session = getCurrentTestSession();
                    
                    if (!session) {
                        console.log('🔍 No current session, initializing new session');
                        // New test - initialize session
                        session = initializeTestSession(eventName, timeLimit, false);
                    } else {
                        console.log('🔍 Resuming existing session');
                        // Resume existing session
                        session = resumeTestSession();
                    }
                }
            } else {
                console.log('🔍 Shared test - using existing session');
                // Shared test - use existing session or create new one
                session = getCurrentTestSession();
                
                if (!session) {
                    console.log('🔍 No session found, initializing shared test session');
                    // Initialize shared test session
                    session = initializeTestSession(eventName, timeLimit, true);
                } else {
                    console.log('🔍 Resuming existing shared session');
                    // Resume existing session
                    session = resumeTestSession();
                }
            }
            
            if (session) {
                setTimeLeft(session.timeState.timeLeft);
                setIsTimeSynchronized(session.timeState.isTimeSynchronized);
                setSyncTimestamp(session.timeState.syncTimestamp);
                setIsTestSubmitted(session.isSubmitted);
                
                console.log('🕐 Codebusters time management initialized:', {
                    timeLeft: session.timeState.timeLeft,
                    isSynchronized: session.timeState.isTimeSynchronized,
                    isSubmitted: session.isSubmitted
                });
            }
        } else {
            console.log('🔍 No test parameters found');
            // No test parameters found - show error
            setError('No test parameters found. Please configure a test from the practice page.');
        }

        if (savedIsTestSubmitted) {
            try {
                setIsTestSubmitted(JSON.parse(savedIsTestSubmitted));
            } catch (error) {
                console.error('Error parsing saved test submitted:', error);
            }
        }

        if (savedTestScore) {
            try {
                setTestScore(JSON.parse(savedTestScore));
            } catch (error) {
                console.error('Error parsing saved test score:', error);
            }
        }

        console.log('🔍 Codebusters page loading complete, setting isLoading to false');
        setIsLoading(false);
    }, []);

    // Function to load questions from Excel file
    const loadQuestionsFromExcel = async () => {
        // Always reset the timer and submission state for a new test
        setTimeLeft(30 * 60); // Default 30 minutes
        setIsTestSubmitted(false);
        setTestScore(null);
        localStorage.removeItem('codebustersTimeLeft');
        localStorage.removeItem('codebustersIsTestSubmitted');
        localStorage.removeItem('codebustersTestScore');

        try {
            // Get test parameters from localStorage
            const testParamsStr = localStorage.getItem('testParams');
            if (!testParamsStr) {
                setError('No test parameters found. Please configure a test from the practice page.');
                return;
            }

            const testParams = JSON.parse(testParamsStr);
            const questionCount = parseInt(testParams.questionCount) || 10;
            const cipherTypes = (testParams.cipherTypes || []).map((type: string) => type.toLowerCase());

            // Load all quotes from Excel file
            const response = await fetch('/quotes.xlsx');
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

            // Filter and process quotes based on test parameters
            const availableQuotes = data.map((row: Record<string, unknown>, index: number) => {
                const quote = String(row.quote || row.Quote || '');
                const author = String(row.author || row.Author || 'Unknown');
                
                return { quote, author, originalIndex: index };
            }).filter(item => item.quote && item.author);

            // Randomly select the specified number of questions
            const selectedQuotes: { quote: string; author: string; originalIndex: number }[] = [];
            const shuffledQuotes = [...availableQuotes].sort(() => Math.random() - 0.5);
            
            const finalQuestionCount = Math.min(questionCount, shuffledQuotes.length);
            
            for (let i = 0; i < finalQuestionCount; i++) {
                selectedQuotes.push(shuffledQuotes[i]);
            }

            // Process selected quotes with specified cipher types
            const processedQuotes: QuoteData[] = [];
            for (const item of selectedQuotes) {
                const availableCipherTypes = cipherTypes && cipherTypes.length > 0 
                    ? cipherTypes 
                    : ['aristocrat', 'patristocrat', 'hill', 'porta', 'baconian'];
                
                const cipherType = availableCipherTypes[Math.floor(Math.random() * availableCipherTypes.length)] as QuoteData['cipherType'];
                
                let encrypted = '';
                let key = '';
                let matrix: number[][] | undefined;
                let portaKeyword = '';
                
                switch (cipherType) {
                    case 'aristocrat':
                        const aristocratResult = encryptAristocrat(item.quote);
                        encrypted = aristocratResult.encrypted;
                        key = aristocratResult.key;
                        break;
                    case 'patristocrat':
                        const patristocratResult = encryptPatristocrat(item.quote);
                        encrypted = patristocratResult.encrypted;
                        key = patristocratResult.key;
                        break;
                    case 'hill':
                        const hillResult = encryptHill(item.quote);
                        encrypted = hillResult.encrypted;
                        matrix = hillResult.matrix;
                        break;
                    case 'porta':
                        const portaResult = encryptPorta(item.quote);
                        encrypted = portaResult.encrypted;
                        portaKeyword = portaResult.keyword;
                        break;
                    case 'baconian':
                        const baconianResult = encryptBaconian(item.quote);
                        encrypted = baconianResult.encrypted;
                        break;
                    default:
                        console.warn(`Unknown cipher type: ${cipherType}`);
                        continue;
                }
                
                processedQuotes.push({
                    author: item.author,
                    quote: item.quote,
                    encrypted,
                    cipherType,
                    key: key || undefined,
                    matrix,
                    portaKeyword: portaKeyword || undefined,
                    difficulty: Math.random() * 0.8 + 0.2,
                });
            }

            setQuotes(processedQuotes);
        } catch (error) {
            console.error('Error loading questions from Excel:', error);
            setError('Failed to load questions from Excel file');
            toast.error('Failed to load questions from Excel file');
        }
    };

    useEffect(() => {
        if (quotes.length > 0) {
            localStorage.setItem('codebustersQuotes', JSON.stringify(quotes));
        }
        localStorage.setItem('codebustersIsTestSubmitted', JSON.stringify(isTestSubmitted));
        if (testScore !== null) {
            localStorage.setItem('codebustersTestScore', JSON.stringify(testScore));
        }
    }, [quotes, isTestSubmitted, testScore]);

    useEffect(() => {
        if (timeLeft === null || isTestSubmitted) return;

        if (timeLeft === 0) {
            handleSubmitTest();
            return;
        }

        if (timeLeft === 300) { // 5 minutes
            toast.warning("Warning: Five minutes left");
        }
        if (timeLeft === 60) {
            toast.warning("Warning: One minute left");
        }
        if (timeLeft === 30) {
            toast.warning("Warning: Thirty seconds left");
        }

        const timer = setInterval(() => {
            const session = getCurrentTestSession();
            if (!session) return;
            
            // Update time based on session state
            if (session.timeState.isTimeSynchronized && session.timeState.syncTimestamp && session.timeState.originalTimeAtSync) {
                // Synchronized test - calculate based on original sync point
                const now = Date.now();
                const elapsedMs = now - session.timeState.syncTimestamp;
                const elapsedSeconds = Math.floor(elapsedMs / 1000);
                const newTimeLeft = Math.max(0, session.timeState.originalTimeAtSync - elapsedSeconds);
                setTimeLeft(newTimeLeft);
                updateTimeLeft(newTimeLeft);
                console.log(`🕐 Timer sync: original=${session.timeState.originalTimeAtSync}s, elapsed=${elapsedSeconds}s, current=${newTimeLeft}s`);
            } else {
                // Non-synchronized test - calculate based on test start time and pauses
                const now = Date.now();
                const totalElapsedMs = now - (session.timeState.testStartTime || now) - session.timeState.totalPausedTime;
                const totalElapsedSeconds = Math.floor(totalElapsedMs / 1000);
                const originalTimeLimit = session.timeLimit * 60;
                const newTimeLeft = Math.max(0, originalTimeLimit - totalElapsedSeconds);
                setTimeLeft(newTimeLeft);
                updateTimeLeft(newTimeLeft);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, isTestSubmitted, handleSubmitTest]);

    // Handle input change for aristocrat/patristocrat solution
    const handleSolutionChange = (quoteIndex: number, cipherLetter: string, plainLetter: string) => {
        setQuotes(prev => prev.map((quote, index) => 
            index === quoteIndex 
                ? { ...quote, solution: { ...quote.solution, [cipherLetter]: plainLetter } }
                : quote
        ));
    };

    // Handle frequency note change
    const handleFrequencyNoteChange = (quoteIndex: number, letter: string, note: string) => {
        setQuotes(prev => prev.map((quote, index) => 
            index === quoteIndex 
                ? { ...quote, frequencyNotes: { ...quote.frequencyNotes, [letter]: note } }
                : quote
        ));
    };

    // Handle Hill cipher solution changes
    const handleHillSolutionChange = (quoteIndex: number, type: 'matrix' | 'plaintext', value: string[][] | { [key: number]: string }) => {
        setQuotes(prev => prev.map((quote, index) => 
            index === quoteIndex 
                ? { 
                    ...quote, 
                    hillSolution: { 
                        ...quote.hillSolution, 
                        [type]: value 
                    } as {
                        matrix: string[][];
                        plaintext: { [key: number]: string };
                    }
                }
                : quote
        ));
    };





    // Component for displaying aristocrat/patristocrat cipher with input boxes
    const AristocratDisplay = ({ text, quoteIndex, solution, frequencyNotes }: { 
        text: string; 
        quoteIndex: number;
        solution?: { [key: string]: string };
        frequencyNotes?: { [key: string]: string };
    }) => {
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
                <div className="flex flex-wrap gap-y-8 text-sm sm:text-base">
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
                                            onChange={(e) => handleSolutionChange(
                                                quoteIndex,
                                                char,
                                                e.target.value
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
                    onNoteChange={(letter, note) => handleFrequencyNoteChange(quoteIndex, letter, note)}
                    quoteIndex={quoteIndex}
                />
            </div>
        );
    };

    // Update PortaDisplay component
    const PortaDisplay = ({ 
        text, 
        keyword,
        quoteIndex,
        solution,
        frequencyNotes,
        isTestSubmitted,
        darkMode 
    }: { 
        text: string;
        keyword: string;
        quoteIndex: number;
        solution?: { [key: string]: string };
        frequencyNotes?: { [key: string]: string };
        isTestSubmitted: boolean;
        darkMode: boolean;
    }) => {
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
                <div className="flex flex-wrap gap-y-8 text-sm sm:text-base">
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
                                            onChange={(e) => handleSolutionChange(
                                                quoteIndex,
                                                char,
                                                e.target.value
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
                    onNoteChange={(letter, note) => handleFrequencyNoteChange(quoteIndex, letter, note)}
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

    // Baconian cipher display component
    const BaconianDisplay = ({ 
        text, 
        quoteIndex,
        solution,
        isTestSubmitted 
    }: { 
        text: string;
        quoteIndex: number;
        solution?: { [key: number]: string };
        isTestSubmitted: boolean;
    }) => {
        const { darkMode } = useTheme();
        
        // Create mapping for correct answers
        const correctMapping: { [key: number]: string } = {};
        if (isTestSubmitted && quotes[quoteIndex].quote) {
            const originalQuote = quotes[quoteIndex].quote.toUpperCase();
            let originalIndex = 0;
            
            // Map each group of 5 letters to its corresponding plaintext letter
            const groups = text.split(' ').filter(group => /^[AB]{5}$/.test(group));
            let currentGroup = 0;
            
            while (originalIndex < originalQuote.length) {
                if (/[A-Z]/.test(originalQuote[originalIndex])) {
                    if (currentGroup < groups.length) {
                        correctMapping[currentGroup] = originalQuote[originalIndex];
                    }
                    currentGroup++;
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
                    {text.split(' ').map((group, i) => {
                        if (!/^[AB]{5}$/.test(group)) {
                            // Handle non-Baconian groups (spaces, punctuation)
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
                                            const newSolution = { ...(solution || {}) };
                                            newSolution[i] = newValue;
                                            handleSolutionChange(quoteIndex, i.toString(), newValue);
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

    return (
        <>
            <div className="relative min-h-screen">
                {/* Background */}
                <div
                    className={`absolute inset-0 ${
                        darkMode ? 'bg-gray-900' : 'bg-gray-50'
                    }`}
                ></div>

                {/* Add styled scrollbar */}
                <style jsx global>{`
                    ::-webkit-scrollbar {
                        width: 8px;
                        transition: background 1s ease;
                        ${darkMode
                            ? 'background: black;'
                            : 'background: white;'
                        }
                    }

                    ::-webkit-scrollbar-thumb {
                        background: ${darkMode
                            ? '#374151'
                            : '#3b82f6'};
                        border-radius: 4px;
                        transition: background 1s ease;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background: ${darkMode
                            ? '#1f2937'
                            : '#2563eb'};
                    }
                `}</style>

                {/* Page Content */}
                <div className="relative flex flex-col items-center p-6">
                    <button
                        onClick={() => {
                            // Get test params before clearing localStorage
                            const testParams = JSON.parse(localStorage.getItem('testParams') || '{}');
                            const eventName = testParams.eventName || 'Codebusters';
                            const timeLimit = parseInt(testParams.timeLimit || '30');
                            
                            // Clear all codebusters-related localStorage items
                            localStorage.removeItem('codebustersQuotes');
                            localStorage.removeItem('codebustersIsTestSubmitted');
                            localStorage.removeItem('codebustersTestScore');
                            localStorage.removeItem('codebustersTimeLeft');
                            localStorage.removeItem('shareCode');
                            
                            // Clear time management session completely
                            clearTestSession();
                            
                            // Initialize a fresh session with the correct time limit
                            initializeTestSession(eventName, timeLimit, false);
                            
                            // Reload the page to start fresh
                            window.location.reload();
                        }}
                        className={`absolute top-4 right-4 p-2 rounded-full transition-transform duration-300 hover:scale-110 ${
                            darkMode ? 'bg-gray-700 text-white shadow-lg' : 'bg-white text-gray-900 shadow-md'
                        }`}
                        title="Reset Test"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-refresh">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                            <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                        </svg>
                    </button>
                    
                    <header className="w-full max-w-3xl flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <h1 className={`text-2xl font-extrabold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                Scio.ly: Codebusters
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            {timeLeft !== null && (
                                <div
                                    className={`text-xl font-semibold ${
                                        timeLeft <= 300
                                            ? 'text-red-600'
                                            : darkMode
                                            ? 'text-white'
                                            : 'text-blue-600'
                                    }`}
                                >
                                    {formatTime(timeLeft)}
                                </div>
                            )}
                        </div>
                    </header>

                    {/* Smooth Progress Bar */}
                    <div
                        className={`${isTestSubmitted ? '' : 'sticky top-6'
                        } z-10 w-full max-w-3xl bg-white border-2 border-gray-300 rounded-full h-5 mb-6 shadow-lg`}
                    >
                        <div
                            className="bg-blue-500 h-4 rounded-full transition-[width] duration-700 ease-in-out shadow-md"
                            style={{ width: `${totalProgress}%` }}
                        ></div>
                    </div>

                    <main
                        className={`w-full max-w-3xl rounded-lg shadow-md p-6 mt-4 ${
                            darkMode ? 'bg-gray-800' : 'bg-white'
                        }`}
                    >
                        
                        {isLoading && (
                            <div className={`text-center py-12 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                                    <p className="text-lg font-medium">Loading Codebusters questions...</p>
                                    <p className="text-sm mt-2 opacity-75">Please wait while we prepare your cipher challenges</p>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className={`text-center py-12 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                <div className="flex flex-col items-center">
                                    <div className="text-6xl mb-4">⚠️</div>
                                    <p className="text-lg font-medium mb-2">Failed to load questions</p>
                                    <p className="text-sm opacity-75 mb-4">{error}</p>
                                    {error.includes('No test parameters found') ? (
                                        <button
                                            onClick={() => router.push('/practice')}
                                            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                                                darkMode
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                        >
                                            Go to Practice Page
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setError(null);
                                                setIsLoading(true);
                                                loadQuestionsFromExcel();
                                            }}
                                            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                                                darkMode
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                        >
                                            Try Again
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {!isLoading && !error && quotes.length === 0 && (
                            <div className={`text-center py-12 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <div className="flex flex-col items-center">
                                    <div className="text-6xl mb-4">📝</div>
                                    <p className="text-lg font-medium mb-2">No questions available</p>
                                    <p className="text-sm opacity-75">Please check back later or try refreshing the page</p>
                                </div>
                            </div>
                        )}
                        
                        {/* Take together button - positioned right above questions */}
                        {!isLoading && !error && quotes.length > 0 && (
                                                    <button
                            onClick={() => {
                                console.log('🔍 CODEBUSTERS - Opening share modal with quotes:', {
                                    quotesLength: quotes.length,
                                    quotes: quotes.slice(0, 2), // Log first 2 quotes for brevity
                                    firstQuote: quotes[0]
                                });
                                setShareModalOpen(true);
                            }}
                            title="Share Test"
                            className="mb-4"
                        >
                                <div className="flex justify-between text-blue-400">
                                    <FaShareAlt className="transition-all duration-500 mt-0.5"/> 
                                    <p>&nbsp;&nbsp;Take together</p>
                                </div>
                            </button>
                        )}
                        
                        {!isLoading && !error && quotes.map((item, index) => (
                            <div 
                                key={index} 
                                className={`relative border p-4 rounded-lg shadow-sm transition-all duration-500 ease-in-out mb-6 ${
                                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-black'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        Question {index + 1}
                                    </h3>
                                    <span className={`px-2 py-1 rounded text-sm ${
                                        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {item.cipherType.charAt(0).toUpperCase() + item.cipherType.slice(1)}
                                    </span>
                                </div>
                                <p className={`mb-4 break-words whitespace-normal overflow-x-auto ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                    {item.author}
                                </p>

                                {(item.cipherType === 'aristocrat' || item.cipherType === 'patristocrat') ? (
                                    <AristocratDisplay 
                                        text={item.encrypted} 
                                        quoteIndex={index}
                                        solution={item.solution}
                                        frequencyNotes={item.frequencyNotes}
                                    />
                                ) : item.cipherType === 'hill' ? (
                                    <HillDisplay
                                        text={item.encrypted}
                                        matrix={item.matrix!}
                                        quoteIndex={index}
                                        solution={item.hillSolution}
                                        onSolutionChange={(type, value) => handleHillSolutionChange(index, type, value)}
                                        isTestSubmitted={isTestSubmitted}
                                        quotes={quotes}
                                    />
                                ) : item.cipherType === 'porta' ? (
                                    <PortaDisplay
                                        text={item.encrypted}
                                        keyword={item.portaKeyword!}
                                        quoteIndex={index}
                                        solution={item.solution}
                                        frequencyNotes={item.frequencyNotes}
                                        isTestSubmitted={isTestSubmitted}
                                        darkMode={darkMode}
                                    />
                                ) : (
                                    <BaconianDisplay
                                        text={item.encrypted}
                                        quoteIndex={index}
                                        solution={item.solution}
                                        isTestSubmitted={isTestSubmitted}
                                    />
                                )}
                                
                                {/* Difficulty Bar */}
                                <div className="absolute bottom-2 right-2 w-20 h-2 rounded-full bg-gray-300">
                                    <div
                                        className={`h-full rounded-full ${
                                            (item.difficulty || 0.5) >= 0.66
                                                ? 'bg-red-500'
                                                : (item.difficulty || 0.5) >= 0.33
                                                ? 'bg-yellow-500'
                                                : 'bg-green-500'
                                        }`}
                                        style={{ width: `${(item.difficulty || 0.5) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Submit Button */}
                        {!isLoading && !error && quotes.length > 0 && (
                            <div className="text-center mt-6">
                                {!isTestSubmitted ? (
                                    <button
                                        onClick={handleSubmitTest}
                                        disabled={isTestSubmitted}
                                        className={`w-full px-4 py-2 font-semibold rounded-lg transform hover:scale-105 ${
                                            darkMode
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                    >
                                        Submit Answers
                                    </button>
                                ) : (
                                    <div className={`text-center p-4 rounded-lg ${
                                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}>
                                        <p className={`text-lg font-semibold ${
                                            darkMode ? 'text-green-400' : 'text-green-600'
                                        }`}>
                                            Test Completed!
                                        </p>
                                        <p className={`text-sm mt-2 ${
                                            darkMode ? 'text-gray-300' : 'text-gray-600'
                                        }`}>
                                            Use the reset button in the top right to start a new test.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>

                    {/* Fixed Back Button */}
                    <button
                        onClick={() => {
                            // Clear unlimited practice-related localStorage items
                            localStorage.removeItem('unlimitedQuestions');
                            localStorage.removeItem('testParams');
                            localStorage.removeItem('codebustersQuotes');
                            localStorage.removeItem('codebustersTimeLeft');
                            localStorage.removeItem('codebustersIsTestSubmitted');
                            localStorage.removeItem('codebustersTestScore');
                            router.push('/practice');
                        }}
                        className={`fixed bottom-8 left-8 z-50 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
                            darkMode
                                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-600/50'
                                : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-blue-500/50'
                        }`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>

                    {/* Add the reference button as sticky at the bottom */}
                    <div className="fixed bottom-8 right-8 z-50">
                        <button
                            onClick={() => setShowPDFViewer(true)}
                            className={`p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
                                darkMode
                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                            }`}
                            title="Codebusters Reference"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Custom PDF Modal */}
                    {showPDFViewer && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setShowPDFViewer(false)}>
                            <div 
                                className="relative w-11/12 h-5/6 max-w-5xl bg-white rounded-lg shadow-2xl flex flex-col" 
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className={`flex justify-between items-center p-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-blue-100 text-gray-800'} rounded-t-lg`}>
                                    <h3 className="text-lg font-semibold">Codebusters Reference</h3>
                                    <button
                                        onClick={() => setShowPDFViewer(false)}
                                        className={`p-2 rounded-full hover:bg-opacity-20 ${darkMode ? 'hover:bg-white text-white' : 'hover:bg-gray-500 text-gray-700'}`}
                                        aria-label="Close"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden bg-white">
                                    <iframe
                                        src="/2024_Div_C_Resource.pdf"
                                        className="w-full h-full border-none"
                                        title="Codebusters Reference PDF"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Share Modal */}
                                <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                inputCode={inputCode}
                setInputCode={setInputCode}
                darkMode={darkMode}
                isCodebusters={true}
                encryptedQuotes={quotes}
            />
                    
                </div>
            </div>
            
            {/* Toast Container */}
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={darkMode ? "dark" : "light"}
            />
        </>
    );
}