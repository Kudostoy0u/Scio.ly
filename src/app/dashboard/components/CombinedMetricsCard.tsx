'use client';

import NumberAnimation from './NumberAnimation';

interface CombinedMetricsCardProps {
  dailyQuestions: number;
  weeklyQuestions: number;
  allTimeQuestions: number;
  dailyCorrect: number;
  weeklyCorrect: number;
  allTimeCorrect: number;
  view: 'daily' | 'weekly' | 'allTime';
  onViewChange: (view: 'daily' | 'weekly' | 'allTime') => void;
  darkMode: boolean;
}

export default function CombinedMetricsCard({
  dailyQuestions,
  weeklyQuestions,
  allTimeQuestions,
  dailyCorrect,
  weeklyCorrect,
  allTimeCorrect,
  view,
  onViewChange,
  darkMode
}: CombinedMetricsCardProps) {
  const cardStyle = darkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  const handleClick = () => {
    if (view === 'daily') {
      onViewChange('weekly');
    } else if (view === 'weekly') {
      onViewChange('allTime');
    } else {
      onViewChange('daily');
    }
  };

  const calculatePercentage = (correct: number, total: number): number => {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  const getCurrentValues = () => {
    switch (view) {
      case 'daily':
        return { questions: dailyQuestions, correct: dailyCorrect };
      case 'weekly':
        return { questions: weeklyQuestions, correct: weeklyCorrect };
      case 'allTime':
        return { questions: allTimeQuestions, correct: allTimeCorrect };
      default:
        return { questions: dailyQuestions, correct: dailyCorrect };
    }
  };

  const { questions, correct } = getCurrentValues();
  const percentage = calculatePercentage(correct, questions);

  return (
    <div className="perspective-1000 hover:scale-[1.02] transition-transform duration-300">
      <div
        className={`p-0 rounded-lg cursor-pointer transition-transform duration-700 relative ${cardStyle}`}
        style={{ 
          transformStyle: 'preserve-3d',
          transform: view === 'daily' 
            ? 'rotateX(0deg)' 
            : view === 'weekly' 
              ? 'rotateX(180deg)' 
              : 'rotateX(360deg)',
          minHeight: '125px'
        }}
        onClick={handleClick}
      >
        {/* Daily View */}
        <div 
          className="absolute w-full h-full flex flex-col px-6 pt-6"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateX(0deg)',
            opacity: view === 'daily' ? 1 : 0,
            visibility: view === 'daily' ? 'visible' : 'hidden',
          }}
        >
          <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Questions & Accuracy today
          </h3>
          <div className="flex items-baseline space-x-2">
            <NumberAnimation value={questions} className="text-4xl font-bold text-blue-600" />
            <span className="text-lg text-gray-500">/</span>
            <NumberAnimation value={correct} className="text-4xl font-bold text-green-600" />
            <span className="text-lg text-gray-500 ml-2">({percentage}%)</span>
          </div>
        </div>
        
        {/* Weekly View */}
        <div 
          className="absolute w-full h-full flex flex-col px-6 pt-6 pb-3"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)',
            opacity: view === 'weekly' ? 1 : 0,
            visibility: view === 'weekly' ? 'visible' : 'hidden',
          }}
        >
          <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Questions & Accuracy this week
          </h3>
          <div className="flex items-baseline space-x-2">
            <NumberAnimation value={weeklyQuestions} className="text-4xl font-bold text-blue-600" />
            <span className="text-lg text-gray-500">/</span>
            <NumberAnimation value={weeklyCorrect} className="text-4xl font-bold text-green-600" />
            <span className="text-lg text-gray-500 ml-2">({calculatePercentage(weeklyCorrect, weeklyQuestions)}%)</span>
          </div>
        </div>

        {/* All Time View */}
        <div 
          className="absolute w-full h-full flex flex-col px-6 pt-6 pb-3"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateX(360deg)',
            opacity: view === 'allTime' ? 1 : 0,
            visibility: view === 'allTime' ? 'visible' : 'hidden',
          }}
        >
          <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Questions & Accuracy all-time
          </h3>
          <div className="flex items-baseline space-x-2">
            <NumberAnimation value={allTimeQuestions} className="text-4xl font-bold text-blue-600" />
            <span className="text-lg text-gray-500">/</span>
            <NumberAnimation value={allTimeCorrect} className="text-4xl font-bold text-green-600" />
            <span className="text-lg text-gray-500 ml-2">({calculatePercentage(allTimeCorrect, allTimeQuestions)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
