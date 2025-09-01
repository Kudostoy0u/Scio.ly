import React from 'react';
import { QuoteData } from '../../types';
import { useTheme } from '@/app/contexts/ThemeContext';

interface CryptarithmDisplayProps {
  text: string;
  quoteIndex: number;
  solution: { [key: number]: string } | undefined;
  isTestSubmitted: boolean;
  quotes: QuoteData[];
  onSolutionChange: (quoteIndex: number, position: number, letter: string) => void;
  cryptarithmData?: {
    equation: string;
    numericExample: string | null;
    digitGroups: Array<{
      digits: string;
      word: string;
    }>;
  };
}

export const CryptarithmDisplay: React.FC<CryptarithmDisplayProps> = ({
  text: _text,
  quoteIndex,
  solution,
  isTestSubmitted,
  quotes: _quotes,
  onSolutionChange,
  cryptarithmData
}) => {
  const { darkMode } = useTheme();
  const [focusedDigit, setFocusedDigit] = React.useState<string | null>(null);
  const [focusedPos, setFocusedPos] = React.useState<number | null>(null);

  // Flatten all digit groups into a single inline sequence with word-boundary markers
  const inlineDigits = React.useMemo(() => {
    if (!cryptarithmData?.digitGroups) return { digits: [] as string[], boundaries: new Set<number>() };
    const digits: string[] = [];
    const boundaries = new Set<number>();
    let idx = 0;
    cryptarithmData.digitGroups.forEach((group, gi) => {
      const parts = group.digits.split(' ').filter(Boolean);
      for (const d of parts) {
        digits.push(d);
        idx++;
      }
      if (gi < cryptarithmData.digitGroups.length - 1 && idx > 0) {
        boundaries.add(idx - 1); // add extra gap after this word
      }
    });
    return { digits, boundaries };
  }, [cryptarithmData]);

  // Build digit -> positions map for syncing
  const digitToPositions = React.useMemo(() => {
    const map: { [digit: string]: number[] } = {};
    inlineDigits.digits.forEach((d, i) => {
      if (!map[d]) map[d] = [];
      map[d].push(i);
    });
    return map;
  }, [inlineDigits]);

  // Create a mapping of positions to correct letters
  const correctMapping: { [key: number]: string } = {};
  if (isTestSubmitted && cryptarithmData?.digitGroups) {
    const allLetters = cryptarithmData.digitGroups.map(group => group.word.replace(/\s/g, '')).join('');
    for (let i = 0; i < allLetters.length; i++) {
      correctMapping[i] = allLetters[i];
    }
  }

  return (
    <div className="space-y-4">
      {/* Cryptarithm Equation */}
      {cryptarithmData && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
          <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Cryptarithm Formula</h4>
          <div className={`font-mono text-center mb-2 whitespace-pre ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {cryptarithmData.equation}
          </div>

          {/* Hints removed for Cryptarithm */}
        </div>
      )}

      {/* Digit values inline (with larger gaps at word boundaries) */}
      {inlineDigits.digits.length > 0 && (
        <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-300'} mt-4 mb-6`}> 
          <h4 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Values to decode for solution</h4>
          <div className="flex flex-wrap gap-2">
            {inlineDigits.digits.map((digit, i) => {
              const position = i;
              const isCorrect = correctMapping[position] === (solution?.[position] || '');
              const isHinted = ( (_quotes[quoteIndex] as any)?.cryptarithmHinted || {} )[position] === true;
              const isSameDigitFocused = focusedDigit !== null && focusedDigit === digit;
              return (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center">
                    <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {digit}
                    </div>
                    <input
                      type="text"
                      maxLength={1}
                      value={solution?.[position] || ''}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        const digit = inlineDigits.digits[position];
                        const positions = digitToPositions[digit] || [position];
                        positions.forEach(p => onSolutionChange(quoteIndex, p, val));
                      }}
                      onFocus={() => { setFocusedDigit(digit); setFocusedPos(position); }}
                      onBlur={() => { setFocusedDigit(null); setFocusedPos(null); }}
                      disabled={isTestSubmitted}
                      className={`w-8 h-8 text-center border rounded text-sm focus:outline-none focus:ring-0 ${
                        isTestSubmitted
                          ? (isHinted
                              ? 'border-yellow-500 text-yellow-800 bg-transparent'
                              : (isCorrect
                                  ? 'border-green-500 text-green-800 bg-transparent'
                                  : 'border-red-500 text-red-800 bg-transparent'))
                          : darkMode
                          ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      } ${isSameDigitFocused 
                        ? 'border-2' 
                        : ''}`}
                      style={isSameDigitFocused
                        ? (position === focusedPos
                            ? { borderColor: '#3b82f6', borderWidth: 2 }
                            : { borderColor: '#60a5fa', borderWidth: 2 })
                        : undefined}
                    />
                    {isTestSubmitted && (
                      <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {correctMapping[position]}
                      </div>
                    )}
                  </div>
                  {inlineDigits.boundaries.has(i) && (
                    <div className="w-4 sm:w-6" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
