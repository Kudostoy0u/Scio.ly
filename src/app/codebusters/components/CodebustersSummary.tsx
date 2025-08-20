"use client";
import React, { useState, useEffect } from 'react';
import { QuoteData } from '../types';
import SummaryGrid, { SummaryItem } from '@/app/components/SummaryGrid';
import { CheckCircle, Hash, Target, Trophy } from 'lucide-react';

interface CodebustersSummaryProps {
  quotes: QuoteData[];
  darkMode: boolean;
}

// Function to calculate grade based on points
const calculateGrade = (earnedPoints: number, totalPoints: number): string => {
  if (totalPoints === 0) return 'N/A';
  
  const percentage = (earnedPoints / totalPoints) * 100;
  
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

// Non-compact layout component
function NonCompactCodebustersSummary({ items, cipherTypes, darkMode }: { 
  items: SummaryItem[]; 
  cipherTypes: string[]; 
  darkMode: boolean; 
}) {
  return (
    <div className="sticky top-4 z-10 w-full max-w-3xl mx-auto mb-6">
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

// Compact layout component
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

// Mobile compact layout component
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

export default function CodebustersSummary({ quotes, darkMode }: CodebustersSummaryProps) {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true } as EventListenerOptions);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalCiphers = quotes.length;
  
  // Calculate fractional scores for each cipher
  const cipherScores = quotes.map(quote => {
    if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Xenocrypt'].includes(quote.cipherType)) {
      // For substitution ciphers, score based on how many letters are substituted
      if (!quote.solution || Object.keys(quote.solution).length === 0) {
        return 0;
      }
      
      // Count how many unique letters are in the encrypted text
      const uniqueLetters = new Set(quote.encrypted.replace(/[^A-Z]/g, ''));
      const totalLetters = uniqueLetters.size;
      
      if (totalLetters === 0) return 0;
      
      // Count how many letters have meaningful substitutions
      const meaningfulSubstitutions = Object.values(quote.solution).filter(value => 
        value && value.trim().length === 1 && /^[A-Z]$/.test(value.trim())
      ).length;
      
      return Math.min(1, meaningfulSubstitutions / totalLetters);
      
    } else if (quote.cipherType === 'Hill 2x2' || quote.cipherType === 'Hill 3x3') {
      // For Hill ciphers, score based on matrix completion and plaintext
      if (!quote.hillSolution) return 0;
      
      let matrixScore = 0;
      let plaintextScore = 0;
      
      // Score matrix completion (each cell is worth equal weight)
      const totalMatrixCells = quote.hillSolution.matrix.flat().length;
      const filledMatrixCells = quote.hillSolution.matrix.flat().filter(cell => 
        cell && cell.trim().length > 0 && /^[A-Z]$/.test(cell.trim())
      ).length;
      matrixScore = totalMatrixCells > 0 ? filledMatrixCells / totalMatrixCells : 0;
      
      // Score plaintext completion
      const plaintextValues = Object.values(quote.hillSolution.plaintext);
      const totalPlaintextSlots = plaintextValues.length;
      const filledPlaintextSlots = plaintextValues.filter(value => 
        value && value.trim().length > 0
      ).length;
      plaintextScore = totalPlaintextSlots > 0 ? filledPlaintextSlots / totalPlaintextSlots : 0;
      
      // Average of matrix and plaintext scores
      return (matrixScore + plaintextScore) / 2;
      
    } else if (quote.cipherType === 'Columnar Transposition') {
      // For columnar transposition, score based on decrypted text completion
      if (!quote.solution?.decryptedText) return 0;
      
      const decryptedText = quote.solution.decryptedText.trim();
      if (decryptedText.length === 0) return 0;
      
      // Score based on how much of the expected length is filled
      const expectedLength = quote.encrypted.replace(/[^A-Z]/g, '').length;
      return Math.min(1, decryptedText.length / expectedLength);
      
    } else if (quote.cipherType === 'Nihilist') {
      // For nihilist, score based on solution completion
      if (!quote.nihilistSolution || Object.keys(quote.nihilistSolution).length === 0) {
        return 0;
      }
      
      const solutionValues = Object.values(quote.nihilistSolution);
      const totalSlots = solutionValues.length;
      const filledSlots = solutionValues.filter(value => 
        value && value.trim().length > 0
      ).length;
      
      return totalSlots > 0 ? filledSlots / totalSlots : 0;
      
    } else if (quote.cipherType === 'Baconian') {
      // For baconian, score based on solution completion
      if (!quote.solution || Object.keys(quote.solution).length === 0) {
        return 0;
      }
      
      const solutionValues = Object.values(quote.solution);
      const totalSlots = solutionValues.length;
      const filledSlots = solutionValues.filter(value => 
        value && value.trim().length > 0
      ).length;
      
      return totalSlots > 0 ? filledSlots / totalSlots : 0;
      
    } else if (quote.cipherType === 'Porta') {
      // For porta, score based on solution completion
      if (!quote.solution || Object.keys(quote.solution).length === 0) {
        return 0;
      }
      
      const solutionValues = Object.values(quote.solution);
      const totalSlots = solutionValues.length;
      const filledSlots = solutionValues.filter(value => 
        value && value.trim().length > 0
      ).length;
      
      return totalSlots > 0 ? filledSlots / totalSlots : 0;
      
    } else if (quote.cipherType === 'Fractionated Morse') {
      // For fractionated morse, score based on solution completion
      if (!quote.solution || Object.keys(quote.solution).length === 0) {
        return 0;
      }
      
      const solutionValues = Object.values(quote.solution);
      const totalSlots = solutionValues.length;
      const filledSlots = solutionValues.filter(value => 
        value && value.trim().length > 0
      ).length;
      
      return totalSlots > 0 ? filledSlots / totalSlots : 0;
      
    } else if (quote.cipherType === 'Checkerboard') {
      // For checkerboard, score based on solution completion
      if (!quote.checkerboardSolution || Object.keys(quote.checkerboardSolution).length === 0) {
        return 0;
      }
      
      const solutionValues = Object.values(quote.checkerboardSolution);
      const totalSlots = solutionValues.length;
      const filledSlots = solutionValues.filter(value => 
        value && value.trim().length > 0
      ).length;
      
      return totalSlots > 0 ? filledSlots / totalSlots : 0;
    }
    
    return 0;
  });
  
  const totalPoints = totalCiphers;
  const earnedPoints = cipherScores.reduce((sum, score) => sum + score, 0);
  const solvedCiphers = Math.round(earnedPoints); // Round to nearest whole number for display
  const accuracyPercentage = totalCiphers > 0 ? Math.round((earnedPoints / totalCiphers) * 100) : 0;
  const cipherTypes = [...new Set(quotes.map(quote => quote.cipherType))];

  // Calculate grade
  const grade = calculateGrade(earnedPoints, totalPoints);

  const items: SummaryItem[] = [
    { 
      label: 'Solved', 
      value: solvedCiphers, 
      valueClassName: darkMode ? 'text-green-400' : 'text-green-600',
      icon: CheckCircle
    },
    { 
      label: 'Total', 
      value: totalCiphers, 
      valueClassName: darkMode ? 'text-blue-400' : 'text-blue-600',
      icon: Hash
    },
    { 
      label: 'Correct', 
      value: `${accuracyPercentage}%`, 
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

  // Calculate opacity for desktop fade transitions
  const fadeThreshold = 160;
  const fadeRange = 100; // pixels over which to fade
  const nonCompactOpacity = scrollY > fadeThreshold 
    ? Math.max(0.3, 1 - ((scrollY - fadeThreshold) / fadeRange)) 
    : 1;
  const compactOpacity = scrollY > fadeThreshold 
    ? Math.min(1, ((scrollY - fadeThreshold) / fadeRange)) 
    : 0;

  // Mobile transition logic - show compact layout if user has scrolled to top AND is currently scrolled down
  // Note: This is now handled by the fade transitions instead of conditional rendering

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
