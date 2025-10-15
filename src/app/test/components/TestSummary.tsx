'use client';
import React, { useState, useEffect } from 'react';
import { Question } from '@/app/utils/geminiService';
import SummaryGrid, { SummaryItem } from '@/app/components/SummaryGrid';
import { CheckCircle, MessageCircle, Target, Trophy } from 'lucide-react';
import { getLetterGradeFromPercentage } from '@/lib/utils/grade';

interface TestSummaryProps {
  data: Question[];
  userAnswers: Record<number, (string | null)[] | null>;
  gradingResults: { [key: string]: number };
  darkMode: boolean;
  isAssignmentMode?: boolean;
}


// Grade is now derived directly from accuracy percentage using a standard HS scale


function NonCompactSummary({ items, subtopics, darkMode }: { 
  items: SummaryItem[]; 
  subtopics: string[]; 
  darkMode: boolean; 
}) {
  return (
    <div className="sticky top-4 z-10 w-full max-w-[90vw] md:max-w-3xl min-w-[50vw] mb-6">
      <div className={`rounded-lg shadow-lg p-4 md:p-5 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <h2 className={`text-lg md:text-xl font-bold mb-3 md:mb-4 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Test Summary
        </h2>

        <SummaryGrid items={items} darkMode={darkMode} showCompactLayout={false} />

        {/* Subtopics Covered */}
        {subtopics.length > 0 && (
          <div className="mt-3 md:mt-4">
            <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Subtopics Covered ({subtopics.length})</h3>
            <div className="flex flex-wrap gap-2">
              {subtopics.map((subtopic, index) => (
                <span key={index} className={`px-2 py-1 text-xs rounded-full ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                  {subtopic.toLowerCase() === 'unknown' ? 'Misc.' : subtopic}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function CompactSummary({ items, darkMode }: { 
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


function MobileCompactSummary({ items, darkMode }: { 
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

export default function TestSummary({ data, userAnswers, gradingResults, darkMode, isAssignmentMode = false }: TestSummaryProps) {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true } as EventListenerOptions);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  

  const answeredQuestions = Object.keys(userAnswers).length;
  const correctQuestions = Object.values(gradingResults).filter(score => score >= 1).length;
  
  // For assignment mode, use total questions instead of attempted questions
  const totalQuestions = isAssignmentMode ? data.length : answeredQuestions;
  const accuracyPercentage = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;

  const grade = getLetterGradeFromPercentage(accuracyPercentage);
  

  const allSubtopics = data.flatMap(question => {

    if (question.subtopics && Array.isArray(question.subtopics)) {
      return question.subtopics;
    }

    else if (question.subtopic) {
      return [question.subtopic];
    }
    return [];
  });
  const subtopics = [...new Set(allSubtopics)].filter(Boolean);
  

  useEffect(() => {
    if (data.length > 0 && subtopics.length === 0) {
      import('@/lib/utils/logger').then(m => {
        const logger = m.default;
        logger.log('Debug: First question structure:', data[0]);
        logger.log('Debug: All questions subtopic fields:', data.map(q => ({ 
          subtopic: (q as any).subtopic, 
          subtopics: (q as any).subtopics 
        })));
      }).catch(()=>{});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length]);

  const items: SummaryItem[] = [
    { 
      label: 'Correct',
      value: correctQuestions, 
      valueClassName: darkMode ? 'text-green-400' : 'text-green-600',
      icon: CheckCircle
    },
    { 
      label: isAssignmentMode ? 'Total Questions' : 'Attempted', 
      value: isAssignmentMode ? data.length : answeredQuestions, 
      valueClassName: darkMode ? 'text-blue-400' : 'text-blue-600',
      icon: MessageCircle
    },
    { 
      label: 'Accuracy', 
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
        <NonCompactSummary items={items} subtopics={subtopics} darkMode={darkMode} />
      </div>

      {/* Compact layout - fades in rapidly */}
      <div className="hidden md:block" style={{ opacity: compactOpacity }}>
        <CompactSummary items={items} darkMode={darkMode} />
      </div>

      {/* Mobile layout - two separate components with fade transitions */}
      <div className="md:hidden">
        {/* Non-compact layout - fades out but never disappears completely */}
        <div style={{ opacity: nonCompactOpacity }}>
          <NonCompactSummary items={items} subtopics={subtopics} darkMode={darkMode} />
        </div>

        {/* Compact layout - fades in rapidly */}
        <div style={{ opacity: compactOpacity }}>
          <MobileCompactSummary items={items} darkMode={darkMode} />
        </div>
      </div>
    </>
  );
}
