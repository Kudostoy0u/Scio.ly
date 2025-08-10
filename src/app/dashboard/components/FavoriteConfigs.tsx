'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaHeart, FaTrash } from 'react-icons/fa';
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
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteConfig[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [deleteIntentCardId, setDeleteIntentCardId] = useState<string | null>(null);

  const cardStyle = darkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!areCookiesEnabled()) {
        toast.warning('Cookies are disabled. Favorite configurations may not persist.');
      }
      const savedFavorites = loadFavoriteConfigs();
      setFavorites(savedFavorites);
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {
      saveFavoriteConfigs(favorites);
    }
  }, [favorites, isLoaded]);

  const handlePractice = (config: FavoriteConfig) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('testQuestions');
      localStorage.removeItem('testUserAnswers');
      localStorage.removeItem('currentTestSession');
      localStorage.removeItem('testTimeLeft');
      localStorage.removeItem('isTimeSynchronized');
      localStorage.removeItem('originalSyncTime');
      localStorage.removeItem('syncTimestamp');

      const testParams = {
        eventName: config.event,
        questionCount: config.settings.questionCount,
        timeLimit: config.settings.timeLimit,
        difficulties: config.settings.difficulties,
        types: config.settings.types,
        division: config.settings.division,
        tournament: 'any',
        subtopics: config.settings.subtopics,
      };

      localStorage.setItem('testParams', JSON.stringify(testParams));

      try {
        const cookiePayload = encodeURIComponent(
          JSON.stringify({
            eventName: config.event,
            questionCount: config.settings.questionCount,
            timeLimit: config.settings.timeLimit,
            types: config.settings.types,
            division: config.settings.division,
            subtopics: config.settings.subtopics,
          })
        );
        document.cookie = `scio_test_params=${cookiePayload}; Path=/; Max-Age=600; SameSite=Lax`;
      } catch (error) {
        console.warn('Failed to set test cookie:', error);
      }
    }

    router.push('/test');
  };

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((fav) => fav.id !== id));
    toast.success('Configuration removed from favorites');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'hard':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (favorites.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FaHeart className="text-red-500 text-xl" />
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>1-Click Practice</h2>
        </div>
        <div className={`${cardStyle} rounded-lg p-6 text-center`}>
          <FaHeart className="text-4xl text-gray-400 mx-auto mb-3" />
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>No favorite configurations yet</p>
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
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>1-Click Practice</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {favorites.map((config) => (
          <motion.div
            key={config.id}
            className={`relative rounded-lg p-4 border-2 transition-colors duration-200 cursor-pointer overflow-hidden
              ${cardStyle}
              ${
                hoveredCardId === config.id
                  ? darkMode
                    ? 'border-blue-600'
                    : 'border-blue-500'
                  : darkMode
                  ? 'border-gray-700'
                  : 'border-gray-200'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={() => setHoveredCardId(config.id)}
            onMouseLeave={() => {
              setHoveredCardId(null);
              setDeleteIntentCardId(null);
            }}
            onClick={(e) => {
              if (deleteIntentCardId !== config.id) {
                handlePractice(config);
              }
            }}
          >
            {/* Overlay */}
            {hoveredCardId === config.id && (
              <div className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-10 transition-all duration-200"></div>
            )}

            {/* Delete button, higher z-index and pointerEvents 'auto' to always receive clicks */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFavorite(config.id);
              }}
              onMouseEnter={() => setDeleteIntentCardId(config.id)}
              onMouseLeave={() => setDeleteIntentCardId(null)}
              className={`p-1 rounded-full transition-colors absolute top-2 right-2 z-50 ${
                darkMode ? 'hover:bg-red-900' : 'hover:bg-red-100'
              }`}
              title="Remove from favorites"
              style={{ pointerEvents: 'auto' }}
            >
              <FaTrash className="text-red-500 text-xs" />
            </button>

            <div
              className={`relative z-20 transition-all duration-200 ${
                hoveredCardId === config.id ? 'opacity-20' : 'opacity-100'
              }`}
            >
              {/* Header */}
              <h3
                className={`font-semibold text-sm ${
                  darkMode ? 'text-white' : 'text-gray-900'
                } truncate mb-3`}
              >
                {config.name}
              </h3>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Event:</span>
                  <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>{config.event}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Division:</span>
                  <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>{config.division}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Time:</span>
                  <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>{config.time} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Questions:
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>{config.number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Type:</span>
                  <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>{config.types || config.settings.types || 'MCQ'}</span>
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
            </div>

            {/* Resume/Delete overlay button */}
{/* Resume / Delete Button on hover */}
{hoveredCardId === config.id && (
  <motion.button
  className="absolute inset-0 flex items-center justify-center z-30"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  onClick={(e) => {
    e.stopPropagation();
    if (deleteIntentCardId === config.id) {
      removeFavorite(config.id);
    } else {
      handlePractice(config);
    }
  }}
>
  <span
    className={`font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-200 text-white ${
      deleteIntentCardId === config.id ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
    }`}
    style={{ minWidth: '120px', textAlign: 'center' }} // give a min width so it looks balanced
  >
    {deleteIntentCardId === config.id ? 'Delete' : 'Resume'}
  </span>
</motion.button>

)}

          </motion.div>
        ))}
      </div>
    </div>
  );
}
