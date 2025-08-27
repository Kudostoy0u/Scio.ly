import React, { useMemo } from 'react';
import { QuoteData } from '../types';
import {
  HillDisplay,
  PortaDisplay,
  SubstitutionDisplay,
  FractionatedMorseDisplay,
  BaconianDisplay,
  ColumnarTranspositionDisplay,
  NihilistDisplay,
  CheckerboardDisplay,
  CryptarithmDisplay
} from './cipher-displays';

// Function to process author field
const processAuthor = (author: string): string => {
  const commaIndex = author.indexOf(',');
  if (commaIndex !== -1) {
    const textAfterComma = author.substring(commaIndex + 1).trim();
    if (textAfterComma.length > 28) {

      // Previously logged the removed portion; removed to avoid console spam on re-renders
      return author.substring(0, commaIndex);
    }
  }
  return author;
};

interface QuestionCardProps {
  item: QuoteData;
  index: number;
  darkMode: boolean;
  isTestSubmitted: boolean;
  quotes: QuoteData[];
  activeHints: {[questionIndex: number]: boolean};
  getHintContent: (quote: QuoteData) => string;
  handleHintClick: (questionIndex: number) => void;
  setSelectedCipherType: (type: string) => void;
  setInfoModalOpen: (open: boolean) => void;
  handleSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
  handleBaconianSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
  handleHillSolutionChange: (quoteIndex: number, type: 'matrix' | 'plaintext', value: string[][] | { [key: number]: string }) => void;
  handleNihilistSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
  handleCheckerboardSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
  handleKeywordSolutionChange: (quoteIndex: number, keyword: string) => void;
  hintedLetters: {[questionIndex: number]: {[letter: string]: boolean}};
  _hintCounts: {[questionIndex: number]: number};
  questionPoints?: {[key: number]: number};
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  item,
  index,
  darkMode,
  isTestSubmitted,
  quotes,
  activeHints,
  getHintContent,
  handleHintClick,
  setSelectedCipherType,
  setInfoModalOpen,
  handleSolutionChange,
  handleBaconianSolutionChange,
  handleHillSolutionChange,
  handleNihilistSolutionChange,
  handleCheckerboardSolutionChange,
  handleKeywordSolutionChange,
  hintedLetters,
  _hintCounts,
  questionPoints = {}
}) => {
  // Function to get suggested points for a question (same as print functionality)
  const getSuggestedPoints = (quote: QuoteData) => {
    return Math.round((quote.difficulty || 0.5) * 50);
  };

  // Process the author field once per author change to avoid extra work on re-renders
  const processedAuthor = useMemo(() => processAuthor(item.author), [item.author]);

  return (
    <div 
      className={`relative border p-4 rounded-lg transition-all duration-500 ease-in-out mb-6 question ${
        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-black'
      }`}
      data-question-card
      data-question-index={index}
    >
      <div className="flex justify-between items-start">
        <h3 
          data-question-header
          className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}
        >
          Question {index + 1} [{questionPoints[index] || getSuggestedPoints(item)} pts]
        </h3>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-sm ${
            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}>
            {item.cipherType.charAt(0).toUpperCase() + item.cipherType.slice(1)}
          </span>
          <button
            onClick={() => { if (isTestSubmitted) return; handleHintClick(index); }}
            disabled={isTestSubmitted}
            className={`w-5 h-5 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center transition-all duration-200 ${
              isTestSubmitted
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-110'
            } ${
              darkMode 
                ? 'bg-gray-600 border-gray-500 text-white' 
                : 'text-gray-600'
            }`}
            title={isTestSubmitted ? 'Hints are disabled after submission' : 'Get a hint'}
          >
            <svg 
              width="10" 
              height="10" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <circle cx="12" cy="17" r="1"/>
            </svg>
          </button>
          <button
            onClick={() => {
              setSelectedCipherType(item.cipherType);
              setInfoModalOpen(true);
            }}
            className={`w-5 h-5 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
              darkMode 
                ? 'bg-gray-600 border-gray-500 text-white' 
                : 'text-gray-600'
            }`}
            title="Cipher information"
          >
            <svg 
              width="10" 
              height="10" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
          </button>
        </div>
      </div>
      <p className={`mb-4 break-words whitespace-normal overflow-x-auto ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
        {processedAuthor}
      </p>

      {/* Hint Card */}
      {activeHints[index] && !isTestSubmitted && (
        <div className={`mb-4 p-3 rounded-lg border-l-4 ${
          darkMode 
            ? 'bg-blue-900/30 border-blue-400 text-blue-200' 
            : 'bg-blue-50 border-blue-500 text-blue-700'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M9 12l2 2 4-4"/>
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
              <path d="M13 12h3"/>
              <path d="M8 12H5"/>
            </svg>
            <span className="font-semibold text-sm">Hint</span>
          </div>
          <p className="text-sm font-mono">
            {getHintContent(item)}
          </p>
        </div>
      )}

      {(item.cipherType === 'Hill 2x2' || item.cipherType === 'Hill 3x3') ? (
        <HillDisplay
          text={item.encrypted}
          matrix={item.matrix!}
          quoteIndex={index}
          solution={item.hillSolution}
          onSolutionChange={(type, value) => handleHillSolutionChange(index, type, value)}
          isTestSubmitted={isTestSubmitted}
          quotes={quotes}
        />
      ) : item.cipherType === 'Porta' ? (
        <PortaDisplay
          text={item.encrypted}
          keyword={item.portaKeyword!}
          quoteIndex={index}
          solution={item.solution}
          isTestSubmitted={isTestSubmitted}
          quotes={quotes}
          onSolutionChange={handleSolutionChange}
        />
      ) : item.cipherType === 'Baconian' ? (
        <BaconianDisplay
          text={item.encrypted}
          quoteIndex={index}
          solution={item.solution}
          isTestSubmitted={isTestSubmitted}
          quotes={quotes}
          onBaconianSolutionChange={handleBaconianSolutionChange}
          activeHints={activeHints}
        />
      ) : item.cipherType === 'Fractionated Morse' ? (
        <FractionatedMorseDisplay
          text={item.encrypted}
          quoteIndex={index}
          solution={item.solution}
          fractionationTable={item.fractionationTable}
          isTestSubmitted={isTestSubmitted}
          quotes={quotes}
          onSolutionChange={handleSolutionChange}
          hintedLetters={hintedLetters}
        />
      ) : item.cipherType === 'Complete Columnar' ? (
        <ColumnarTranspositionDisplay
          text={item.encrypted}
          quoteIndex={index}
          solution={item.solution}
          isTestSubmitted={isTestSubmitted}
          quotes={quotes}
          onSolutionChange={handleSolutionChange}
        />
      ) : item.cipherType === 'Nihilist' ? (
        <NihilistDisplay
          text={item.encrypted}
          polybiusKey={item.nihilistPolybiusKey!}
          cipherKey={item.nihilistCipherKey!}
          quoteIndex={index}
          solution={item.nihilistSolution}
          isTestSubmitted={isTestSubmitted}
          quotes={quotes}
          onSolutionChange={handleNihilistSolutionChange}
        />
      ) : item.cipherType === 'Checkerboard' ? (
        <CheckerboardDisplay
          text={item.encrypted}
          keyword={item.checkerboardKeyword!}
          r1={item.checkerboardR1!}
          r2={item.checkerboardR2!}
          quoteIndex={index}
          solution={item.checkerboardSolution}
          isTestSubmitted={isTestSubmitted}
          quotes={quotes}
          onSolutionChange={handleCheckerboardSolutionChange}
        />
      ) : item.cipherType === 'Cryptarithm' ? (
        <CryptarithmDisplay
          text={item.encrypted}
          quoteIndex={index}
          solution={item.solution}
          isTestSubmitted={isTestSubmitted}
          quotes={quotes}
          onSolutionChange={handleSolutionChange}
          cryptarithmData={item.cryptarithmData}
        />
      ) : ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt'].includes(item.cipherType) ? (
        <SubstitutionDisplay
          text={item.encrypted}
          quoteIndex={index}
          solution={item.solution}
          isTestSubmitted={isTestSubmitted}
          cipherType={item.cipherType}
          key={item.key}
          caesarShift={item.caesarShift}
          affineA={item.affineA}
          affineB={item.affineB}
          quotes={quotes}
          onSolutionChange={handleSolutionChange}
          onKeywordSolutionChange={handleKeywordSolutionChange}
          hintedLetters={hintedLetters}
          _hintCounts={_hintCounts}
        />
      ) : (
        <div className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Unknown cipher type: {item.cipherType}
        </div>
      )}
      
      {/* Difficulty Bar */}
      <div className="absolute right-2 w-20 h-2 rounded-full bg-gray-300">
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
  );
};
