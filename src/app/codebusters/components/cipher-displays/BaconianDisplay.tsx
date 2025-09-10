import React, { useMemo, useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { baconianSchemes } from '../../schemes/baconian-schemes';
import { renderBinaryGroup, getCssClassForFormatting, getDisplayLetter } from '../../schemes/display-renderer';
import { QuoteData } from '../../types';

interface BaconianDisplayProps {
    quotes: QuoteData[];
    quoteIndex: number;
    solution?: { [key: number]: string };
    activeHints: {[questionIndex: number]: boolean};
    isTestSubmitted?: boolean;
    onSolutionChange?: (quoteIndex: number, groupIndex: number, value: string) => void;

    syncEnabled?: boolean;

}

export const BaconianDisplay: React.FC<BaconianDisplayProps> = ({ 
    quotes, 
    quoteIndex, 
    solution, 
    activeHints,
    isTestSubmitted = false,
    onSolutionChange,
    syncEnabled = true
}) => {
    const { darkMode } = useTheme();
    const [focusedGroupIndex, setFocusedGroupIndex] = useState<number | null>(null);

    const toGraphemes = (str: string): string[] => {
        try {
            // Use grapheme segmentation so multi-codepoint emojis count as a single symbol
            // Fallback to Array.from if Intl.Segmenter is unavailable
            const seg: any = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
            return Array.from(seg.segment(str), (s: any) => s.segment);
        } catch {
            return Array.from(str);
        }
    };

    const baconianData = useMemo(() => {
        const quote = quotes[quoteIndex];
        if (!quote) return { originalQuote: '', originalBinaryGroups: [], binaryGroups: [], binaryType: '' };

        const cleanedQuote = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
        

        const letterToBinary: { [key: string]: string } = {
            'A': 'AAAAA', 'B': 'AAAAB', 'C': 'AAABA', 'D': 'AAABB', 'E': 'AABAA',
            'F': 'AABAB', 'G': 'AABBA', 'H': 'AABBB', 'I': 'ABAAA', 'J': 'ABAAA',
            'K': 'ABAAB', 'L': 'ABABA', 'M': 'ABABB', 'N': 'ABBAA', 'O': 'ABBAB',
            'P': 'ABBBA', 'Q': 'ABBBB', 'R': 'BAAAA', 'S': 'BAAAB', 'T': 'BAABA',
            'U': 'BAABB', 'V': 'BAABB', 'W': 'BABAA', 'X': 'BABAB', 'Y': 'BABBA',
            'Z': 'BABBB'
        };


        const binaryGroups: string[] = [];
        for (let i = 0; i < cleanedQuote.length; i++) {
            const letter = cleanedQuote[i];
            if (letterToBinary[letter]) {
                binaryGroups.push(letterToBinary[letter]);
            }
        }
        

        const applyBinaryFilter = (binaryGroup: string): string => {

            const allSchemes = [
                ...baconianSchemes.schemes.traditional,
                ...baconianSchemes.schemes.emoji,
                ...baconianSchemes.schemes.symbols,
                ...baconianSchemes.schemes.formatting
            ];
            const scheme = allSchemes.find(s => s.type === quote.baconianBinaryType);
            
            if (scheme) {
                return renderBinaryGroup(binaryGroup, scheme);
            }
            
            return binaryGroup;
        };
        
        // Prefer pre-generated encrypted groups from the question (stable and synchronized with grading)
        const storedGroups = (quote.encrypted || '').trim().length > 0 
            ? (quote.encrypted as string).trim().split(/\s+/)
            : null;
        let filteredGroups = storedGroups && storedGroups.length > 0
            ? storedGroups
            : binaryGroups.map(applyBinaryFilter);

        // Ensure groups align exactly with 5-bit Baconian groups
        // If the stored groups length doesn't match, regenerate deterministically from the pattern
        if (filteredGroups.length !== binaryGroups.length) {
            filteredGroups = binaryGroups.map(applyBinaryFilter);
        }

        // Clamp to the exact number of plaintext groups so no extras render or get graded
        filteredGroups = filteredGroups.slice(0, binaryGroups.length);
        
        return {
            originalQuote: cleanedQuote,
            originalBinaryGroups: binaryGroups,
            binaryGroups: filteredGroups,
            binaryType: quote.baconianBinaryType || ''
        };
    }, [quotes, quoteIndex]);


    const handleInputChange = (groupIndex: number, value: string) => {
        if (!onSolutionChange) return;
        
        const upperValue = value.toUpperCase();
        

        if (syncEnabled) {
            const currentOriginalGroup = baconianData.originalBinaryGroups?.[groupIndex];
            

            if (currentOriginalGroup && baconianData.originalBinaryGroups) {

                baconianData.originalBinaryGroups.forEach((group, index) => {
                    if (group === currentOriginalGroup) {
                        onSolutionChange(quoteIndex, index, upperValue);
                    }
                });
            } else {

                onSolutionChange(quoteIndex, groupIndex, upperValue);
            }
        } else {

            onSolutionChange(quoteIndex, groupIndex, upperValue);
        }
    };
    
    return (
        <div className="font-mono" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <div className={`mb-4 p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Note: Using 24-letter alphabet (I/J same, U/V same)
                </p>
                <div className="flex items-center gap-2 mt-1">
                    {activeHints[quoteIndex] && baconianData.binaryType && (
                        <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                            Binary Type: {baconianData.binaryType}
                        </p>
                    )}
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
                {baconianData.binaryGroups.map((group, i) => {
                    const value = solution?.[i] || '';
                    const correctLetter = baconianData.originalQuote[i] || '';
                    const isCorrect = value === correctLetter;
                    

                    const shouldHighlight = syncEnabled && focusedGroupIndex !== null && 
                        baconianData.originalBinaryGroups?.[focusedGroupIndex] === baconianData.originalBinaryGroups?.[i];
                    
                    return (
                        <div key={i} className="flex flex-col items-center">
                            <div className={`text-xs sm:text-sm mb-1 font-mono ${
                                darkMode ? 'text-gray-400' : 'text-gray-600'
                            } ${baconianData.binaryType && baconianSchemes.schemes.emoji.some(s => s.type === baconianData.binaryType) ? 'baconian-emoji' : ''}`}>
                                {toGraphemes(group).slice(0, 5).map((char, j) => {

                                    const allSchemes = [
                                        ...baconianSchemes.schemes.traditional,
                                        ...baconianSchemes.schemes.emoji,
                                        ...baconianSchemes.schemes.symbols,
                                        ...baconianSchemes.schemes.formatting
                                    ];
                                    const scheme = allSchemes.find(s => s.type === baconianData.binaryType);
                                    
                                    if (scheme && scheme.renderType === 'formatting') {
                                        const cssClass = getCssClassForFormatting(char, scheme);
                                        const position = `${i}-${j}`;
                                        const displayLetter = getDisplayLetter(char, position, scheme);
                                        

                                        let inlineStyle = {};
                                        if (scheme.type === 'Highlight vs Plain' && char === 'A') {
                                            inlineStyle = {
                                                backgroundColor: darkMode ? '#fef3c7' : '#fef9c3', // yellow-200 for light, yellow-100 for dark
                                                padding: '1px 2px',
                                                borderRadius: '2px'
                                            };
                                        }
                                        
                                        return (
                                            <span key={j} className={`mx-0.5 ${cssClass}`} style={inlineStyle}>
                                                {displayLetter}
                                            </span>
                                        );
                                    } else {
                                        return <span key={j} className="mx-0.5">{char}</span>;
                                    }
                                })}
                            </div>
                            <div className="relative h-12 sm:h-14">
                                <input
                                    type="text"
                                    id={`baconian-${quoteIndex}-${i}`}
                                    value={value}
                                    disabled={isTestSubmitted}
                                    onChange={(e) => handleInputChange(i, e.target.value)}
                                    onFocus={() => setFocusedGroupIndex(i)}
                                    onBlur={() => setFocusedGroupIndex(null)}
                                    className={`w-8 h-8 text-center border rounded text-sm font-mono ${
                                        focusedGroupIndex === i
                                            ? 'border-2 border-blue-500'
                                            : shouldHighlight
                                                ? 'border-2 border-blue-300'
                                                : darkMode 
                                                    ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500' 
                                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                    } ${
                                        isTestSubmitted
                                            ? isCorrect
                                                ? 'border-green-500 bg-green-100/10'
                                                : 'border-red-500 bg-red-100/10'
                                            : ''
                                    }`}
                                    maxLength={1}
                                    autoComplete="off"
                                    data-quote-index={quoteIndex}
                                    data-group-index={i}
                                />
                                {isTestSubmitted && !isCorrect && (
                                    <div className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
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
                <div className={`mt-8 p-4 rounded ${
                    darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Original Quote:
                    </p>
                    <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {quotes[quoteIndex].quote.replace(/\[.*?\]/g, '')}
                    </p>
                </div>
            )}
        </div>
    );
};
