'use client';

// motion import kept for future animations
// import { motion } from 'framer-motion';
import NumberAnimation from './NumberAnimation';

interface MetricsCardProps {
  title: string;
  dailyValue: number;
  weeklyValue: number;
  allTimeValue: number;
  view: 'daily' | 'weekly' | 'allTime';
  onViewChange: (view: 'daily' | 'weekly' | 'allTime') => void;
  color: string;
  darkMode: boolean;
}

export default function MetricsCard({
  title,
  dailyValue,
  weeklyValue,
  allTimeValue,
  view,
  onViewChange,
  color,
  darkMode
}: MetricsCardProps) {
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

  const toSentenceCase = (input: string) => {
    if (!input) return input;
    return input.charAt(0) + input.slice(1).toLowerCase();
  };

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
            {`${toSentenceCase(title)} today`}
          </h3>
          <NumberAnimation value={dailyValue} className={`text-4xl font-bold ${color}`} />
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
            {`${toSentenceCase(title)} this week`}
          </h3>
          <NumberAnimation value={weeklyValue} className={`text-4xl font-bold ${color}`} />
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
            {`${toSentenceCase(title)} all-time`}
          </h3>
          <NumberAnimation value={allTimeValue} className={`text-4xl font-bold ${color}`} />
        </div>
      </div>
    </div>
  );
} 