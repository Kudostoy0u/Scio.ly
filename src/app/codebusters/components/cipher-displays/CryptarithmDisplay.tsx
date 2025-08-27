import React, { useState, useEffect } from 'react';
import { QuoteData } from '../../types';
import { useTheme } from '@/app/contexts/ThemeContext';

interface CryptarithmDisplayProps {
  text: string;
  quoteIndex: number;
  solution: { [key: string]: string } | undefined;
  isTestSubmitted: boolean;
  quotes: QuoteData[];
  onSolutionChange: (quoteIndex: number, letter: string, digit: string) => void;
  cryptarithmData?: {
    equation: string;
    numericExample: string;
    digitGroups: Array<{
      digits: string;
      word: string;
    }>;
    hint?: string;
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
  const [mapping, setMapping] = useState<{ [key: string]: string }>(solution || {});
  const [decodedMessage, setDecodedMessage] = useState<string>('');

  // Extract unique letters from the cryptarithm
  const uniqueLetters = React.useMemo(() => {
    const letters = new Set<string>();
    if (cryptarithmData?.equation) {
      cryptarithmData.equation.split('').forEach(char => {
        if (/[A-Z]/.test(char)) {
          letters.add(char);
        }
      });
    }
    return Array.from(letters).sort();
  }, [cryptarithmData]);

  // Update mapping when solution changes
  useEffect(() => {
    if (solution) {
      setMapping(solution);
    }
  }, [solution]);

  // Decode the message when mapping changes
  useEffect(() => {
    if (cryptarithmData?.digitGroups && Object.keys(mapping).length > 0) {
      const decoded = cryptarithmData.digitGroups.map(group => {
        const decodedWord = group.digits.split(' ').map(digit => {
          // Find the letter that maps to this digit
          const letter = Object.keys(mapping).find(key => mapping[key] === digit);
          return letter || '?';
        }).join('');
        return decodedWord;
      }).join(' ');
      setDecodedMessage(decoded);
    }
  }, [mapping, cryptarithmData]);

  const handleMappingChange = (letter: string, digit: string) => {
    const newMapping = { ...mapping };
    if (digit === '') {
      delete newMapping[letter];
    } else {
      newMapping[letter] = digit;
    }
    setMapping(newMapping);
    onSolutionChange(quoteIndex, letter, digit);
  };

  const clearMapping = () => {
    setMapping({});
    uniqueLetters.forEach(letter => {
      onSolutionChange(quoteIndex, letter, '');
    });
  };

  return (
    <div className="space-y-4">
      {/* Cryptarithm Equation */}
      {cryptarithmData && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
          <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Cryptarithm Formula</h4>
          <div className={`font-mono text-center mb-2 whitespace-pre-line ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {cryptarithmData.equation}
          </div>
          {cryptarithmData.numericExample && (
            <div className={`font-mono text-center text-sm whitespace-pre-line ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {cryptarithmData.numericExample}
            </div>
          )}
          {cryptarithmData.hint && (
            <div className={`mt-2 text-sm italic ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              Hint: {cryptarithmData.hint}
            </div>
          )}
        </div>
      )}

      {/* Values to Decode */}
      {cryptarithmData?.digitGroups && (
        <div className={`${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'} p-4 rounded-lg`}>
          <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Values to decode for solution</h4>
          <div className="space-y-3">
            {cryptarithmData.digitGroups.map((group, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {group.digits}
                </div>
                <div className="flex gap-1">
                  {group.word.split('').map((letter, letterIndex) => (
                    <div
                      key={letterIndex}
                      className={`w-8 h-8 ${darkMode ? 'bg-yellow-800 border-yellow-700' : 'bg-yellow-200 border-yellow-300'} border rounded flex items-center justify-center text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Letter to Digit Mapping Grid */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-lg border`}>
        <div className="flex justify-between items-center mb-3">
          <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Letter → Digit Mapping</h4>
          {!isTestSubmitted && (
            <button
              onClick={clearMapping}
              className={`px-3 py-1 text-sm rounded transition-colors ${darkMode ? 'bg-red-900/30 hover:bg-red-900/50 text-red-300' : 'bg-red-100 hover:bg-red-200 text-red-700'}`}
            >
              Clear All
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`border p-2 text-center text-sm font-medium ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                  Letter
                </th>
                {Array.from({ length: 10 }, (_, i) => (
                  <th key={i} className={`border p-2 text-center text-sm font-medium ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                    {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueLetters.map(letter => (
                <tr key={letter}>
                  <td className={`border p-2 text-center font-semibold ${darkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`}>
                    {letter}
                  </td>
                  {Array.from({ length: 10 }, (_, digit) => (
                    <td key={digit} className={`border p-1 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                      <input
                        type="radio"
                        name={`letter-${letter}`}
                        value={digit.toString()}
                        checked={mapping[letter] === digit.toString()}
                        onChange={(e) => handleMappingChange(letter, e.target.value)}
                        disabled={isTestSubmitted}
                        className="sr-only"
                        id={`${letter}-${digit}`}
                      />
                      <label
                        htmlFor={`${letter}-${digit}`}
                        className={`block w-full h-8 flex items-center justify-center text-sm cursor-pointer transition-colors ${
                          mapping[letter] === digit.toString()
                            ? 'bg-blue-500 text-white'
                            : `${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`
                        } ${isTestSubmitted ? 'cursor-not-allowed' : ''}`}
                      >
                        {mapping[letter] === digit.toString() ? '✓' : ''}
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decoded Message */}
      {decodedMessage && decodedMessage !== '??? ??? ???' && (
        <div className={`${darkMode ? 'bg-green-900/20' : 'bg-green-50'} p-4 rounded-lg`}>
          <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Decoded Message</h4>
          <div className={`font-mono text-lg ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
            {decodedMessage}
          </div>
        </div>
      )}

      {/* Answer Input */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Your Answer:
        </label>
        <input
          type="text"
          value={decodedMessage}
          onChange={(e) => {
            setDecodedMessage(e.target.value);
            // Update the solution with the decoded message
            if (e.target.value.trim()) {
              onSolutionChange(quoteIndex, 'ANSWER', e.target.value.trim());
            }
          }}
          disabled={isTestSubmitted}
          className={`w-full p-3 border rounded-lg text-lg font-mono ${
            isTestSubmitted
              ? `${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'} cursor-not-allowed`
              : `${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`
          }`}
          placeholder="Enter your decoded message..."
        />
      </div>
    </div>
  );
};
