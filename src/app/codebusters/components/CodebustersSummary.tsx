"use client";
import React, { useState, useEffect } from 'react';
import { QuoteData } from '../types';
import SummaryGrid, { SummaryItem } from '@/app/components/SummaryGrid';
import { CheckCircle, Hash, Target, Trophy } from 'lucide-react';
import { calculateCipherGrade } from '../utils/gradingUtils';

interface CodebustersSummaryProps {
  quotes: QuoteData[];
  darkMode: boolean;
  hintedLetters?: {[questionIndex: number]: {[letter: string]: boolean}};
  _hintCounts?: {[questionIndex: number]: number};
  questionPoints?: {[key: number]: number};
}


const calculateGrade = (earnedPoints: number, totalPoints: number): string => {
  if (totalPoints === 0) return 'N/A';
  
  const percentage = (earnedPoints / totalPoints) * 100;
  
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};


function NonCompactCodebustersSummary({ items, cipherTypes, darkMode }: { 
  items: SummaryItem[]; 
  cipherTypes: string[]; 
  darkMode: boolean; 
}) {
  return (
    <div className="sticky top-4 z-10 w-full max-w-[80vw] mx-auto mb-6">
      <div className={`rounded-lg shadow-lg p-4 md:p-5 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <h2 className={`text-lg md:text-xl font-bold mb-3 md:mb-4 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Test Summary
        </h2>

        <SummaryGrid items={items} darkMode={darkMode} showCompactLayout={false} />

        {cipherTypes.length > 0 && (
          <div className="mt-3 md:mt-4">
            <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Cipher Types ({cipherTypes.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {cipherTypes.map((cipherType, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs rounded-full ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}
                >
                  {cipherType.toLowerCase() === 'unknown' ? 'Misc.' : cipherType}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function CompactCodebustersSummary({ items, darkMode }: { 
  items: SummaryItem[]; 
  darkMode: boolean; 
}) {
  return (
    <div className="fixed top-4 right-6 w-80 ml-auto z-10">
      <div className={`rounded-lg shadow-lg p-4 md:p-5 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <SummaryGrid items={items} darkMode={darkMode} showCompactLayout={true} />
      </div>
    </div>
  );
}


function MobileCompactCodebustersSummary({ items, darkMode }: { 
  items: SummaryItem[]; 
  darkMode: boolean; 
}) {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 w-4/5 z-50">
      <div className={`rounded-lg shadow-lg p-4 md:p-5 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <SummaryGrid items={items} darkMode={darkMode} showCompactLayout={true} />
      </div>
    </div>
  );
}

export default function CodebustersSummary({ quotes, darkMode, hintedLetters = {}, _hintCounts = {}, questionPoints = {} }: CodebustersSummaryProps) {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true } as EventListenerOptions);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  let totalPointsEarned = 0;
  let totalPointsAttempted = 0;
  let totalInputs = 0;
  
  quotes.forEach((quote, quoteIndex) => {

    const gradeResult = calculateCipherGrade(quote, quoteIndex, hintedLetters, questionPoints);
    

    totalPointsEarned += gradeResult.score;
    totalPointsAttempted += gradeResult.attemptedScore;
    totalInputs += gradeResult.totalInputs;
  });
  

  const accuracyPercentage = totalPointsAttempted > 0 ? Math.round((totalPointsEarned / totalPointsAttempted) * 100) : 'N/A';
  const cipherTypes = [...new Set(quotes.map(quote => quote.cipherType))];


  const grade = totalInputs > 0 ? calculateGrade(totalPointsEarned, totalPointsAttempted) : 'N/A';

  const items: SummaryItem[] = [
    { 
      label: 'Points Earned', 
      value: Math.round(totalPointsEarned), 
      valueClassName: darkMode ? 'text-green-400' : 'text-green-600',
      icon: CheckCircle
    },
    { 
      label: 'Points Attempted', 
      value: Math.round(totalPointsAttempted), 
      valueClassName: darkMode ? 'text-blue-400' : 'text-blue-600',
      icon: Hash
    },
    { 
      label: 'Correct', 
      value: typeof accuracyPercentage === 'number' ? `${accuracyPercentage}%` : accuracyPercentage, 
      valueClassName: darkMode ? 'text-yellow-400' : 'text-yellow-600',
      icon: Target
    },
    { 
      label: 'Grade', 
      value: grade, 
      valueClassName: darkMode ? 'text-purple-400' : 'text-purple-600',
      icon: Trophy
    },
  ];


  const fadeThreshold = 160;
  const fadeRange = 100; // pixels over which to fade
  const nonCompactOpacity = scrollY > fadeThreshold 
    ? Math.max(0.3, 1 - ((scrollY - fadeThreshold) / fadeRange)) 
    : 1;
  const compactOpacity = scrollY > fadeThreshold 
    ? Math.min(1, ((scrollY - fadeThreshold) / fadeRange)) 
    : 0;




  return (
    <>
      {/* Non-compact layout - fades out but never disappears completely */}
      <div className="hidden md:block" style={{ opacity: nonCompactOpacity }}>
        <NonCompactCodebustersSummary items={items} cipherTypes={cipherTypes} darkMode={darkMode} />
      </div>

      {/* Compact layout - fades in rapidly */}
      <div className="hidden md:block" style={{ opacity: compactOpacity }}>
        <CompactCodebustersSummary items={items} darkMode={darkMode} />
      </div>

      {/* Mobile layout - two separate components with fade transitions */}
      <div className="md:hidden">
        {/* Non-compact layout - fades out but never disappears completely */}
        <div style={{ opacity: nonCompactOpacity }}>
          <NonCompactCodebustersSummary items={items} cipherTypes={cipherTypes} darkMode={darkMode} />
        </div>

        {/* Compact layout - fades in rapidly */}
        <div style={{ opacity: compactOpacity }}>
          <MobileCompactCodebustersSummary items={items} darkMode={darkMode} />
        </div>
      </div>
    </>
  );
}
