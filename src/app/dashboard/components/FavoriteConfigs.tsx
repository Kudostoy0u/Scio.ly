'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaHeart, FaTrash, FaPlay } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { loadFavoriteConfigs, saveFavoriteConfigs, areCookiesEnabled } from '@/lib/cookies';

interface FavoriteConfig {
  id: string;
  name: string;
  event: string;
  division: string;
  time: number;
  number: number;
  difficulty: string;
  types?: string;
  subtopics?: string[];
  tournament?: string;
  settings: {
    questionCount: number;
    timeLimit: number;
    difficulties: string[];
    types: string;
    division: string;
    tournament: string;
    subtopics: string[];
  };
}

interface FavoriteConfigsProps {
  darkMode: boolean;
}

export default function FavoriteConfigs({ darkMode }: FavoriteConfigsProps) {
  console.log('[FavoriteConfigs] Component rendering...');
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteConfig[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const cardStyle = darkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  // Load favorites from cookies on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[FavoriteConfigs] Component mounted, checking cookies...');
      if (!areCookiesEnabled()) {
        console.warn('[FavoriteConfigs] Cookies are not enabled. Favorite configurations may not persist.');
        toast.warning('Cookies are disabled. Favorite configurations may not persist.');
      }
      
      const savedFavorites = loadFavoriteConfigs();
      console.log('[FavoriteConfigs] Loaded favorites from cookies:', savedFavorites);
      setFavorites(savedFavorites);
      setIsLoaded(true);
    }
  }, []);

  // Save favorites to cookies whenever they change (but not during initial load)
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {
      console.log('[FavoriteConfigs] Favorites changed, saving to cookies:', favorites);
      saveFavoriteConfigs(favorites);
    }
  }, [favorites, isLoaded]);

  const handlePractice = (config: FavoriteConfig) => {
    // Clear any existing test session and data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('testQuestions');
      localStorage.removeItem('testUserAnswers');
      localStorage.removeItem('currentTestSession');
      localStorage.removeItem('testTimeLeft');
      localStorage.removeItem('isTimeSynchronized');
      localStorage.removeItem('originalSyncTime');
      localStorage.removeItem('syncTimestamp');
    }

    // Set test parameters in localStorage (same as handleGenerateTest)
    const testParams = {
      eventName: config.event,
      questionCount: config.settings.questionCount,
      timeLimit: config.settings.timeLimit,
      difficulties: config.settings.difficulties,
      types: config.settings.types,
      division: config.settings.division,
      tournament: 'any', // Always use 'any' for privacy
      subtopics: config.settings.subtopics,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('testParams', JSON.stringify(testParams));
      
      // Also set the cookie for server-side rendering
      try {
        const cookiePayload = encodeURIComponent(JSON.stringify({
          eventName: config.event,
          questionCount: config.settings.questionCount,
          timeLimit: config.settings.timeLimit,
          types: config.settings.types,
          division: config.settings.division,
          subtopics: config.settings.subtopics,
        }));
        // 10 minutes expiry
        document.cookie = `scio_test_params=${cookiePayload}; Path=/; Max-Age=600; SameSite=Lax`;
      } catch (error) {
        console.warn('Failed to set test cookie:', error);
      }
    }

    // Navigate directly to test page
    router.push('/test');
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id));
    toast.success('Configuration removed from favorites');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'hard': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (favorites.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FaHeart className="text-red-500 text-xl" />
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            1-Click Practice
          </h2>
        </div>
        <div className={`${cardStyle} rounded-lg p-6 text-center`}>
          <FaHeart className="text-4xl text-gray-400 mx-auto mb-3" />
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            No favorite configurations yet
          </p>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
            Go to Practice → Configure a test → Click the heart to save it here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <FaHeart className="text-red-500 text-xl" />
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          1-Click Practice
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {favorites.map((config) => (
          <motion.div
            key={config.id}
            className={`${cardStyle} rounded-lg p-4 border-2 hover:border-blue-500 transition-colors duration-200`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Header with name and remove button */}
            <div className="flex items-start justify-between mb-3">
              <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'} truncate flex-1`}>
                {config.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFavorite(config.id);
                }}
                className={`p-1 rounded-full hover:bg-red-100 ${darkMode ? 'hover:bg-red-900' : 'hover:bg-red-100'} transition-colors`}
                title="Remove from favorites"
              >
                <FaTrash className="text-red-500 text-xs" />
              </button>
            </div>

            {/* Configuration details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Event:
                </span>
                <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {config.event}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Division:
                </span>
                <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {config.division}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Time:
                </span>
                <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {config.time} min
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Questions:
                </span>
                <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {config.number}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Type:
                </span>
                <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {config.types || config.settings?.types || 'MCQ'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Difficulty:
                </span>
                <span className={`text-xs font-medium ${getDifficultyColor(config.difficulty)}`}>
                  {config.difficulty}
                </span>
              </div>
              
              {config.subtopics && config.subtopics.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Topics:
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {config.subtopics.length} selected
                  </span>
                </div>
              )}
            </div>

            {/* Practice button */}
            <button
              onClick={() => handlePractice(config)}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2`}
            >
              <FaPlay className="text-xs" />
              Start Practice
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
