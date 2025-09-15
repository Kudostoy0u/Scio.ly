'use client';
import React, { useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';

interface NihilistDisplayProps {
    text: string;
    polybiusKey: string;
    cipherKey: string;
    quoteIndex: number;
    solution?: { [key: number]: string };
    isTestSubmitted: boolean;
    quotes: QuoteData[];
    onSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
}

export const NihilistDisplay = ({ 
    text, 
    polybiusKey,
    cipherKey,
    quoteIndex,
    solution,
    isTestSubmitted,
    quotes,
    onSolutionChange
}: NihilistDisplayProps) => {
    const { darkMode } = useTheme();
    const quote = quotes[quoteIndex];
    const [polyGrid, setPolyGrid] = useState<string[][]>(() => Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => '')));

    // Reset local grid when test resets or quote changes
    React.useEffect(() => {
        setPolyGrid(Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => '')));
    }, [quoteIndex, quotes.length, text]);


    // Split by triple-or-more spaces to detect explicit block boundaries
    const blocks = text.trim().split(/\s{3,}/);
    const numberGroups: string[] = [];
    const blockBoundaries: number[] = [];
    
    blocks.forEach((block, blockIndex) => {
        const pairs = block.trim().split(/\s+/).filter(group => group.length > 0);
        numberGroups.push(...pairs);
        

        if (blockIndex < blocks.length - 1) {
            blockBoundaries.push(numberGroups.length - 1);
        }
    });


    const correctMapping: { [key: number]: string } = {};
    if (isTestSubmitted) {
        const originalQuote = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
        for (let i = 0; i < Math.min(numberGroups.length, originalQuote.length); i++) {
            correctMapping[i] = originalQuote[i];
        }
    }

    const getPolybiusSquareLetter = (key: string, r: number, c: number): string => {
        const mapIJ = (ch: string) => ch === 'J' ? 'I' : ch;
        const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const used = new Set<string>();
        const seq: string[] = [];
        const k = (key || '').toUpperCase().replace(/[^A-Z]/g, '');
        for (const ch0 of k) {
            const ch = mapIJ(ch0);
            if (ch !== 'J' && !used.has(ch)) { used.add(ch); seq.push(ch); }
            if (seq.length >= 25) break;
        }
        for (const ch0 of alpha) {
            const ch = mapIJ(ch0);
            if (ch === 'J') continue;
            if (!used.has(ch)) { used.add(ch); seq.push(ch); }
            if (seq.length >= 25) break;
        }
        const idx = r * 5 + c;
        return (seq[idx] || '');
    };

    return (
        <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
            {/* Keys Display */}
            <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-semibold">Polybius Key: </span>
                        <span className="font-mono">{polybiusKey}</span>
                    </div>
                    <div>
                        <span className="font-semibold">Cipher Key: </span>
                        <span className="font-mono">{cipherKey}</span>
                    </div>
                </div>
            </div>

            {/* Decryption Inputs + helper grid (match checkerboard layout) */}
            <div className="mb-4 flex flex-col md:flex-row md:gap-6 items-start">
                {/* Left: inputs */}
                <div className="md:flex-[4] md:min-w-0">
                    <div className="flex flex-wrap gap-2">
                        {numberGroups.map((group, index) => (
                            <React.Fragment key={index}>
                                <div className="flex flex-col items-center">
                                    <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {group}
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={1}
                                        value={solution?.[index] || ''}
                                        onChange={(e) => onSolutionChange(quoteIndex, index, e.target.value.toUpperCase())}
                                        autoComplete="off"
                                        disabled={isTestSubmitted}
                                        className={`w-8 h-8 text-center border rounded text-sm ${
                                            isTestSubmitted
                                                ? (() => {
                                                    const isHinted = Boolean((quotes[quoteIndex] as any).nihilistHinted?.[index]);
                                                    if (isHinted) return 'bg-transparent border-yellow-500';
                                                    return (solution?.[index] || '').toUpperCase() === (correctMapping[index] || '')
                                                        ? 'border-green-500 text-green-800 bg-transparent'
                                                        : 'border-red-500 text-red-800 bg-transparent';
                                                })()
                                                : darkMode
                                                ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500'
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                        }`}
                                    />
                                    {isTestSubmitted && (
                                        <div className={`mt-1 text-[10px] ${
                                            (() => {
                                                const isHinted = Boolean((quotes[quoteIndex] as any).nihilistHinted?.[index]);
                                                const val = (solution?.[index] || '').toUpperCase();
                                                const exp = (correctMapping[index] || '');
                                                if (isHinted) return 'text-transparent';
                                                if (!val || val !== exp) return 'text-red-600';
                                                return 'text-transparent';
                                            })()
                                        }`}>
                                            {(() => {
                                                const isHinted = Boolean((quotes[quoteIndex] as any).nihilistHinted?.[index]);
                                                const val = (solution?.[index] || '').toUpperCase();
                                                const exp = (correctMapping[index] || '');
                                                if (isHinted) return '.';
                                                if (!val || val !== exp) return exp.toUpperCase();
                                                return '.';
                                            })()}
                                        </div>
                                    )}
                                </div>
                                {blockBoundaries.includes(index) && (
                                    <div className="w-6 h-8"></div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                {/* Right: helper 5x5 grid for Polybius mapping */}
                <div className={`mt-4 md:mt-0 md:flex-[1] md:max-w-xs ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                    <div className="inline-block mx-auto md:mx-0">
                        <div className="grid grid-cols-6 gap-1">
                            {/* spacer */}
                            <div className="w-8 h-8" />
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={`col-${i}`} className="w-8 h-8 flex items-center justify-center font-mono text-xs">
                                    {i+1}
                                </div>
                            ))}
                            {Array.from({ length: 5 }).map((_, ri) => (
                                <React.Fragment key={`row-frag-${ri}`}>
                                    <div className="w-8 h-8 flex items-center justify-center font-mono text-xs">
                                        {ri+1}
                                    </div>
                                    {Array.from({ length: 5 }).map((_, ci) => (
                                        isTestSubmitted ? (
                                            <div key={`cell-${ri}-${ci}`} className={`w-8 h-8 border rounded text-center flex items-center justify-center ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                                {/* Show user's entry struck in red if wrong, else green correct */}
                                                {(() => {
                                                    const normalizeIJ = (s: string) => (s || '').toUpperCase().replace(/J/g, 'I');
                                                    const expected = getPolybiusSquareLetter(polybiusKey, ri, ci);
                                                    const expNorm = normalizeIJ(expected);
                                                    const displayExpected = expNorm === 'I' ? 'I/J' : expNorm;
                                                    const user = polyGrid[ri]?.[ci] || '';
                                                    const userNorm = normalizeIJ(user);
                                                    if (user && userNorm === expNorm) {
                                                        return <span className="text-green-600 font-mono text-xs">{displayExpected}</span>;
                                                    }
                                                    if (user && userNorm !== expNorm) {
                                                        return (
                                                            <span className="font-mono text-xs">
                                                                <span className="text-red-600 line-through mr-1">{(userNorm === 'I' ? 'I/J' : userNorm)}</span>
                                                                <span className="text-green-600">{displayExpected}</span>
                                                            </span>
                                                        );
                                                    }
                                                    return <span className="text-red-600 font-mono text-xs">{displayExpected}</span>;
                                                })()}
                                            </div>
                                        ) : (
                                            <input
                                                key={`cell-${ri}-${ci}`}
                                                type="text"
                                                maxLength={2}
                                                value={polyGrid[ri]?.[ci] || ''}
                                                onChange={(e) => {
                                                    const raw = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                                                    const val = raw === '' ? '' : (raw.includes('I') || raw.includes('J') ? 'I/J' : raw);
                                                    setPolyGrid(prev => {
                                                        const next = prev.map(row => [...row]);
                                                        next[ri][ci] = val;
                                                        return next;
                                                    });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Backspace' && (polyGrid[ri]?.[ci] || '') === 'I/J') {
                                                        e.preventDefault();
                                                        setPolyGrid(prev => {
                                                            const next = prev.map(row => [...row]);
                                                            next[ri][ci] = '';
                                                            return next;
                                                        });
                                                    }
                                                }}
                                                className={`w-7 h-7 text-center border rounded text-xs outline-none focus:outline-none ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'}`}
                                            />
                                        )
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        {isTestSubmitted && (
            <div className={`mt-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                <div className="font-semibold">Original quote:</div>
                <div className="whitespace-pre-wrap mt-1">{quote.quote.replace(/\[.*?\]/g, '')}</div>
            </div>
        )}
        </div>
    );
};
