import React from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuoteData } from '../../types';

interface CheckerboardDisplayProps {
  text: string;
  keyword: string;
  r1: number;
  r2: number;
  quoteIndex: number;
  solution?: { [key: number]: string };
  isTestSubmitted: boolean;
  quotes: QuoteData[];
  onSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
}

export const CheckerboardDisplay = ({
  text,
  keyword,
  r1,
  r2,
  quoteIndex,
  solution,
  isTestSubmitted,
  quotes,
  onSolutionChange
}: CheckerboardDisplayProps) => {
  const { darkMode } = useTheme();
  const quote = quotes[quoteIndex];


  const digits = text.replace(/\s+/g, '').split('');
  const tokens: string[] = [];
  for (let i = 0; i < digits.length; i++) {
    const d = digits[i];
    if (parseInt(d, 10) === r1 || parseInt(d, 10) === r2) {
      if (i + 1 < digits.length) {
        tokens.push(d + digits[i + 1]);
        i++;
      } else {
        tokens.push(d); // fallback
      }
    } else {
      tokens.push(d);
    }
  }


  const correctMapping: { [key: number]: string } = {};
  if (isTestSubmitted) {
    const original = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
    for (let i = 0; i < Math.min(tokens.length, original.length); i++) {
      correctMapping[i] = original[i];
    }
  }

  return (
    <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
      {/* Parameters and brief board description */}
      <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold">Keyword: </span>
            <span className="font-mono">{keyword}</span>
          </div>
          <div>
            <span className="font-semibold">Row digits: </span>
            <span className="font-mono">{r1}, {r2}</span>
          </div>
          <div className="text-xs">
            Top row uses single digits; rows {r1} and {r2} prefix two-digit codes.
          </div>
        </div>
      </div>

      {/* Token inputs */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {tokens.map((tok, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {tok}
              </div>
              <input
                type="text"
                maxLength={1}
                value={solution?.[idx] || ''}
                onChange={(e) => onSolutionChange(quoteIndex, idx, e.target.value.toUpperCase())}
                autoComplete="off"
                disabled={isTestSubmitted}
                className={`w-8 h-8 text-center border rounded text-sm ${
                  isTestSubmitted
                    ? correctMapping[idx] === solution?.[idx]
                      ? 'bg-green-100 border-green-500 text-green-800'
                      : 'bg-red-100 border-red-500 text-red-800'
                    : darkMode
                    ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                }`}
              />
              {isTestSubmitted && (
                <div className={`mt-1 text-[10px] ${
                  (solution?.[idx] || '').toUpperCase() === (correctMapping[idx] || '')
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}>
                  {(correctMapping[idx] || '').toUpperCase()}
                </div>
              )}
            </div>
          ))}
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


