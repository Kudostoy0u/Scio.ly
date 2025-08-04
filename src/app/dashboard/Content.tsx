'use client';

import { useRouter } from 'next/navigation';
import { motion} from 'framer-motion';
import { useEffect, useState } from 'react';
import { FaFileAlt, FaBookmark, FaPen } from 'react-icons/fa';
import { FaDiscord, FaUsers } from 'react-icons/fa';

import { toast, ToastContainer } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import { getDailyMetrics } from '@/app/utils/metrics';
import { useTheme } from '@/app/contexts/ThemeContext';
import { User } from '@supabase/supabase-js';
import 'react-toastify/dist/ReactToastify.css';
import Header from '../components/Header';
import ContactModal from '@/app/components/ContactModal';
import { handleContactSubmission } from '@/app/utils/contactUtils';

interface ContactFormData {
  name: string;
  email: string;
  topic: string;
  message: string;
}

interface DailyData {
  date: string;
  count: number;
}

interface WeeklyData {
  questions: DailyData[];
  accuracy: number;
}

interface HistoricalMetrics {
  questionsAttempted: number;
  correctAnswers: number;
  eventsPracticed: string[];
}



const NumberAnimation = ({ value, className }: { value: number; className: string }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let start = 0;
    const end = value;
    const duration = 1000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, isMounted]);

  return <span className={className}>{displayValue}</span>;
};

const AnimatedAccuracy = ({
  value,
  darkMode,
  className,
}: {
  value: number;
  darkMode: boolean;
  className?: string;
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <text x="50" y="50" className={className} textAnchor="middle" fill={darkMode ? '#fff' : '#000'}>
        {value}%
      </text>
    );
  }

  return (
    <motion.text
      x="50"
      y="50"
      className={className}
      textAnchor="middle"
      fill={darkMode ? '#fff' : '#000'}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      {value}%
    </motion.text>
  );
};

const WelcomeMessage = ({ darkMode, currentUser, setDarkMode }: { darkMode: boolean; currentUser: User | null; setDarkMode: (value: boolean) => void }) => {
  return (
    <div
      className={`p-6 rounded-lg ${
        darkMode ? 'bg-gray-800 border-2 border-gray-700' : 'bg-white border-2 border-gray-200'
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h1
            className={`text-2xl font-bold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {currentUser
              ? `Welcome to Scio.ly, ${(currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || currentUser.email)?.split(' ')[0]}!`
              : 'Welcome to Scio.ly!'}
          </h1>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Get started by exploring our practice resources or checking your progress.
          </p>
        </div>
        
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-3 rounded-full shadow-lg transition-transform duration-300 hover:scale-110 ml-4 ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="4" fill="currentColor"/>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05L5.636 5.636"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 1112 3v0a9 9 0 008.354 12.354z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default function WelcomePage() {
  const router = useRouter();
  const { darkMode, setDarkMode } = useTheme();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [dailyStats, setDailyStats] = useState({
    questionsAttempted: 0,
    correctAnswers: 0,
    eventsPracticed: [] as string[],
  });
  const [authInitialized, setAuthInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [historyData, setHistoryData] = useState<Record<string, HistoricalMetrics>>({});
  // --- New: Compute window width and extra height on mobile ---
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
  const [extraHeight, setExtraHeight] = useState(0);

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowWidth(width);
      let increments = 0;
      if (width < 414) {
        const diff = 414 - width;
        increments += Math.floor(diff / 4);
      }
      if (height < 700) {
        const diff = 700 - extraHeight;
        increments += Math.floor(diff / 22);
      }
      setExtraHeight(increments);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [extraHeight]);

  // Compute the minimum height style:
  // - On mobile (width below 414px): baseline 220vw + extra (1vh per 10px below 414px)
  // - Otherwise: fixed 110vh
  const computedMinHeight =
    windowWidth === null || windowWidth < 1000
      ? `calc(195vh + ${extraHeight}vh)`
      : '110vh';

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;
      setAuthInitialized(true);
      setCurrentUser(user);
      if (!user) {
        setDailyStats({
          questionsAttempted: 0,
          correctAnswers: 0,
          eventsPracticed: [],
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authInitialized) return;

    const fetchData = async () => {
      if (currentUser) {
        // Get user stats history from Supabase
        const { data: statsHistory, error } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('date', { ascending: true });

        if (!error && statsHistory) {
          const allDailyStats: Record<string, {
            questionsAttempted: number;
            correctAnswers: number;
            eventsPracticed: string[];
            eventQuestions: Record<string, number>;
            gamePoints: number;
          }> = {};
          statsHistory.forEach(stat => {
            allDailyStats[stat.date] = {
              questionsAttempted: stat.questions_attempted,
              correctAnswers: stat.correct_answers,
              eventsPracticed: stat.events_practiced,
              eventQuestions: stat.event_questions,
              gamePoints: stat.game_points
            };
          });
          setHistoryData(allDailyStats);
        }
        
        const todayStats = await getDailyMetrics(currentUser.id);
        if (todayStats) {
          setDailyStats({
            questionsAttempted: todayStats.questionsAttempted || 0,
            correctAnswers: todayStats.correctAnswers || 0,
            eventsPracticed: todayStats.eventsPracticed || [],
          });
        }
      } else {
        const localStats = await getDailyMetrics(null);
        setDailyStats({
          questionsAttempted: localStats?.questionsAttempted || 0,
          correctAnswers: localStats?.correctAnswers || 0,
          eventsPracticed: localStats?.eventsPracticed || [],
        });
        const today = new Date().toISOString().split('T')[0];
        setHistoryData({
          [today]: localStats || {
            questionsAttempted: 0,
            correctAnswers: 0,
            eventsPracticed: [],
          },
        });
      }
    };

    fetchData();
  }, [authInitialized, currentUser]);

  const metrics = {
    questionsAttempted: dailyStats.questionsAttempted,
    correctAnswers: dailyStats.correctAnswers,
    eventsPracticed: dailyStats.eventsPracticed.length,
    accuracy:
      dailyStats.questionsAttempted > 0
        ? (dailyStats.correctAnswers / dailyStats.questionsAttempted) * 100
        : 0,
  };

  const generateWeeklyData = (): WeeklyData => {
    // Get the last 7 days based on current date
    const days: DailyData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = historyData[dateStr] || { questionsAttempted: 0, correctAnswers: 0 };
      days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: dayData.questionsAttempted || 0,
      });
    }

    // Calculate weekly accuracy using the same date range
    const weeklyAccuracy = calculateWeeklyAccuracy();
    
    return {
      questions: days,
      accuracy: weeklyAccuracy,
    };
  };

  const getYAxisScale = () => {
    // Use the same weekly data that's generated based on current date
    const weekData = generateWeeklyData().questions;
    const maxValue = Math.max(...weekData.map((day) => day.count), 1);
    const roundedMax = Math.ceil(maxValue / 5) * 5;
    return Array.from({ length: 5 }, (_, i) => Math.round(roundedMax * (1 - i / 4)));
  };

  const calculateWeeklyAccuracy = (): number => {
    // Get the last 7 days based on current date
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push(dateStr);
    }

    // Filter history data to only include entries from the last 7 days
    const weekData = last7Days
      .map(dateStr => [dateStr, historyData[dateStr] || { questionsAttempted: 0, correctAnswers: 0 }] as [string, { questionsAttempted: number, correctAnswers: number }])
      .filter(([, stats]) => stats.questionsAttempted > 0);

    // Calculate accuracy from the filtered data
    const totals = weekData.reduce(
      (acc, [, stats]) => ({
        attempted: acc.attempted + (stats.questionsAttempted || 0),
        correct: acc.correct + (stats.correctAnswers || 0),
      }),
      { attempted: 0, correct: 0 }
    );
    
    return totals.attempted > 0 ? (totals.correct / totals.attempted) * 100 : 0;
  };

  const calculateAllTimeAccuracy = (): number => {
    const allData = Object.entries(historyData);
    const totals = allData.reduce(
      (acc, [, stats]) => ({
        attempted: acc.attempted + (stats.questionsAttempted || 0),
        correct: acc.correct + (stats.correctAnswers || 0),
      }),
      { attempted: 0, correct: 0 }
    );
    return totals.attempted > 0 ? (totals.correct / totals.attempted) * 100 : 0;
  };



  const handleContact = async (data: ContactFormData) => {
    const result = await handleContactSubmission(data);
    
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const cardStyle =
    darkMode
      ? 'bg-gray-800 border-2 border-gray-700'
      : 'bg-white border-2 border-gray-200';






  // Add new state for six test code digits
  const [testCodeDigits, setTestCodeDigits] = useState(new Array(6).fill(''));

  // Replace the old handleLoadTest function with one that accepts a code parameter
  const handleLoadTest = async (code: string) => {
    try {
      const { handleShareCodeRedirect } = await import('@/app/utils/shareCodeUtils');
      const success = await handleShareCodeRedirect(code);
      
      if (!success) {
        toast.error('Failed to load shared test. Please try again.', {
          position: "bottom-center"
        });
      }
    } catch (error) {
      console.error('Error validating test code:', error);
      toast.error('Failed to validate test code. Please try again.', {
        position: "bottom-center"
      });
    }
  };

  // Handle paste event for test code input fields
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // If the pasted data is empty, do nothing
    if (!pastedData) return;
    
    // Create a new array with the pasted data distributed across the digits
    const newDigits = [...testCodeDigits];
    
    // Fill in the digits starting from the current index
    for (let i = 0; i < pastedData.length && index + i < newDigits.length; i++) {
      const char = pastedData[i];
      if (char.match(/^[A-Za-z0-9]$/)) {
        newDigits[index + i] = char.toUpperCase();
      }
    }
    
    setTestCodeDigits(newDigits);
    
    // Focus the appropriate input after paste
    const nextIndex = Math.min(index + pastedData.length, newDigits.length - 1);
    const nextInput = document.getElementById(`digit-${nextIndex}`) as HTMLInputElement | null;
    if (nextInput) {
      nextInput.focus();
    }
    
    // Auto-submit if all 6 boxes are filled
    if (newDigits.every(digit => digit !== '')) {
      handleLoadTest(newDigits.join(''));
    }
  };

  // Add two helper functions to handle individual digit input and key navigation
  const handleDigitChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (val === '') {
      const newDigits = [...testCodeDigits];
      newDigits[index] = '';
      setTestCodeDigits(newDigits);
      return;
    }
    // If multiple characters are entered (e.g., paste), fill subsequent inputs
    if (val.length > 1) {
      const newDigits = [...testCodeDigits];
      for (let i = 0; i < val.length && index + i < newDigits.length; i++) {
        const char = val[i];
        if (!char.match(/^[A-Za-z0-9]$/)) continue;
        newDigits[index + i] = char.toUpperCase();
      }
      setTestCodeDigits(newDigits);
      const nextIndex = Math.min(index + val.length, newDigits.length - 1);
      const nextInput = document.getElementById(`digit-${nextIndex}`) as HTMLInputElement | null;
      if (nextInput) { nextInput.focus(); }
      if (newDigits.every(digit => digit !== '')) {
        handleLoadTest(newDigits.join(''));
      }
      return;
    }
    const char = val.slice(-1); // take only the last character
    if (!char.match(/^[A-Za-z0-9]$/)) return; // allow only alphanumeric
    const newDigits = [...testCodeDigits];
    newDigits[index] = char.toUpperCase();
    setTestCodeDigits(newDigits);
    // Focus next input if available
    if (index < 5 && char) {
      const nextInput = document.getElementById(`digit-${index + 1}`) as HTMLInputElement | null;
      if (nextInput) { nextInput.focus(); }
    }
    // Auto-submit if all 6 boxes are filled
    if (newDigits.every(digit => digit !== '')) {
      handleLoadTest(newDigits.join(''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && testCodeDigits[index] === '') {
      if (index > 0) {
        const prevInput = document.getElementById(`digit-${index - 1}`) as HTMLInputElement | null;
        if (prevInput) { prevInput.focus(); }
      }
    }
  };

  // Add new state for accuracy view
  const [accuracyView, setAccuracyView] = useState<'daily' | 'weekly' | 'allTime'>('daily');

  // Add state for metric card views
  const [questionsView, setQuestionsView] = useState<'daily' | 'weekly' | 'allTime'>('daily');
  const [correctView, setCorrectView] = useState<'daily' | 'weekly' | 'allTime'>('daily');
  const [eventsView, setEventsView] = useState<'daily' | 'weekly' | 'allTime'>('daily');

  // Calculate weekly and all-time totals for each metric
  const calculateWeeklyQuestions = (): number => {
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push(dateStr);
    }

    return last7Days.reduce((total, dateStr) => {
      const dayData = historyData[dateStr] || { questionsAttempted: 0 };
      return total + (dayData.questionsAttempted || 0);
    }, 0);
  };

  const calculateAllTimeQuestions = (): number => {
    return Object.values(historyData).reduce((total, stats) => {
      return total + (stats.questionsAttempted || 0);
    }, 0);
  };

  const calculateWeeklyCorrect = (): number => {
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push(dateStr);
    }

    return last7Days.reduce((total, dateStr) => {
      const dayData = historyData[dateStr] || { correctAnswers: 0 };
      return total + (dayData.correctAnswers || 0);
    }, 0);
  };

  const calculateAllTimeCorrect = (): number => {
    return Object.values(historyData).reduce((total, stats) => {
      return total + (stats.correctAnswers || 0);
    }, 0);
  };

  const calculateWeeklyEvents = (): number => {
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push(dateStr);
    }

    const uniqueEvents = new Set<string>();
    last7Days.forEach(dateStr => {
      const dayData = historyData[dateStr];
      if (dayData && dayData.eventsPracticed) {
        dayData.eventsPracticed.forEach(event => uniqueEvents.add(event));
      }
    });
    return uniqueEvents.size;
  };

  const calculateAllTimeEvents = (): number => {
    const uniqueEvents = new Set<string>();
    Object.values(historyData).forEach(stats => {
      if (stats.eventsPracticed) {
        stats.eventsPracticed.forEach(event => uniqueEvents.add(event));
      }
    });
    return uniqueEvents.size;
  };

  return (
    <div className="relative w-100 overflow-x-hidden" style={{ minHeight: computedMinHeight }}>
      {/* Background */}
      <ToastContainer/>
      <div
        className={`absolute inset-0 ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}
      ></div>



      <Header />

      {/* Main Content */}
      <div className="relative z-10 pt-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Banner and Practice Button Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Welcome Message - Takes 2/3 on desktop */}
            <div className="lg:col-span-2">
              <WelcomeMessage darkMode={darkMode} currentUser={currentUser} setDarkMode={setDarkMode} />
            </div>
            
            {/* Practice Button - Takes 1/3 on desktop */}
            <div className="flex">
              <motion.button
                onClick={() => router.push('/practice')}
                className="rounded-lg w-full py-7 px-6 text-white text-center flex flex-col items-center justify-center bg-blue-600"
              >
                <FaPen className="text-3xl" />
                <span className="text-xl font-bold">Practice</span>
              </motion.button>
            </div>
          </div>

          {/* Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Questions Attempted Card */}
            <div className="perspective-1000 hover:scale-[1.02] transition-transform duration-300">
              <div
                className={`p-0 rounded-lg cursor-pointer transition-transform duration-700 relative ${cardStyle}`}
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: questionsView === 'daily' 
                    ? 'rotateX(0deg)' 
                    : questionsView === 'weekly' 
                      ? 'rotateX(180deg)' 
                      : 'rotateX(360deg)',
                  minHeight: '140px'
                }}
                onClick={() => {
                  if (questionsView === 'daily') {
                    setQuestionsView('weekly');
                  } else if (questionsView === 'weekly') {
                    setQuestionsView('allTime');
                  } else {
                    setQuestionsView('daily');
                  }
                }}
              >
                {/* Daily Questions */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(0deg)',
                    opacity: questionsView === 'daily' ? 1 : 0,
                    visibility: questionsView === 'daily' ? 'visible' : 'hidden',
                  }}
                >
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Questions Attempted
                  </h3>
                  <NumberAnimation value={metrics.questionsAttempted} className="text-4xl font-bold text-blue-600" />
                </div>
                
                {/* Weekly Questions */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(180deg)',
                    opacity: questionsView === 'weekly' ? 1 : 0,
                    visibility: questionsView === 'weekly' ? 'visible' : 'hidden',
                  }}
                >
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Weekly Questions
                  </h3>
                  <NumberAnimation value={calculateWeeklyQuestions()} className="text-4xl font-bold text-blue-600" />
                </div>

                {/* All Time Questions */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(360deg)',
                    opacity: questionsView === 'allTime' ? 1 : 0,
                    visibility: questionsView === 'allTime' ? 'visible' : 'hidden',
                  }}
                >
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    All Time Questions
                  </h3>
                  <NumberAnimation value={calculateAllTimeQuestions()} className="text-4xl font-bold text-blue-600" />
                </div>
              </div>
            </div>

            {/* Correct Answers Card */}
            <div className="perspective-1000 hover:scale-[1.02] transition-transform duration-300">
              <div
                className={`p-0 rounded-lg cursor-pointer transition-transform duration-700 relative ${cardStyle}`}
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: correctView === 'daily' 
                    ? 'rotateX(0deg)' 
                    : correctView === 'weekly' 
                      ? 'rotateX(180deg)' 
                      : 'rotateX(360deg)',
                  minHeight: '140px'
                }}
                onClick={() => {
                  if (correctView === 'daily') {
                    setCorrectView('weekly');
                  } else if (correctView === 'weekly') {
                    setCorrectView('allTime');
                  } else {
                    setCorrectView('daily');
                  }
                }}
              >
                {/* Daily Correct */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(0deg)',
                    opacity: correctView === 'daily' ? 1 : 0,
                    visibility: correctView === 'daily' ? 'visible' : 'hidden',
                  }}
                >
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Correct Answers
                  </h3>
                  <NumberAnimation value={metrics.correctAnswers} className="text-4xl font-bold text-green-600" />
                </div>
                
                {/* Weekly Correct */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(180deg)',
                    opacity: correctView === 'weekly' ? 1 : 0,
                    visibility: correctView === 'weekly' ? 'visible' : 'hidden',
                  }}
                >
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Weekly Correct
                  </h3>
                  <NumberAnimation value={calculateWeeklyCorrect()} className="text-4xl font-bold text-green-600" />
                </div>

                {/* All Time Correct */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(360deg)',
                    opacity: correctView === 'allTime' ? 1 : 0,
                    visibility: correctView === 'allTime' ? 'visible' : 'hidden',
                  }}
                >
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    All Time Correct
                  </h3>
                  <NumberAnimation value={calculateAllTimeCorrect()} className="text-4xl font-bold text-green-600" />
                </div>
              </div>
            </div>

            {/* Events Practiced Card */}
            <div className="perspective-1000 hover:scale-[1.02] transition-transform duration-300">
              <div
                className={`p-0 rounded-lg cursor-pointer transition-transform duration-700 relative ${cardStyle}`}
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: eventsView === 'daily' 
                    ? 'rotateX(0deg)' 
                    : eventsView === 'weekly' 
                      ? 'rotateX(180deg)' 
                      : 'rotateX(360deg)',
                  minHeight: '140px'
                }}
                onClick={() => {
                  if (eventsView === 'daily') {
                    setEventsView('weekly');
                  } else if (eventsView === 'weekly') {
                    setEventsView('allTime');
                  } else {
                    setEventsView('daily');
                  }
                }}
              >
                {/* Daily Events */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(0deg)',
                    opacity: eventsView === 'daily' ? 1 : 0,
                    visibility: eventsView === 'daily' ? 'visible' : 'hidden',
                  }}
                >
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Events Practiced
                  </h3>
                  <NumberAnimation value={metrics.eventsPracticed} className="text-4xl font-bold text-purple-600" />
                </div>
                
                {/* Weekly Events */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(180deg)',
                    opacity: eventsView === 'weekly' ? 1 : 0,
                    visibility: eventsView === 'weekly' ? 'visible' : 'hidden',
                  }}
                >
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Weekly Events
                  </h3>
                  <NumberAnimation value={calculateWeeklyEvents()} className="text-4xl font-bold text-purple-600" />
                </div>

                {/* All Time Events */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(360deg)',
                    opacity: eventsView === 'allTime' ? 1 : 0,
                    visibility: eventsView === 'allTime' ? 'visible' : 'hidden',
                  }}
                >
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    All Time Events
                  </h3>
                  <NumberAnimation value={calculateAllTimeEvents()} className="text-4xl font-bold text-purple-600" />
                </div>
              </div>
            </div>


          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Desktop Vertical Chart */}
            <div className={`hidden sm:block p-6 rounded-lg ${cardStyle}`}>
              <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Questions This Week
              </h2>
              <div className="relative h-[200px] flex items-end justify-between px-12">
                {/* Y-axis */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between">
                  {getYAxisScale().map((tick, index) => (
                    <div key={`y-axis-${index}`} className="flex items-center">
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {tick}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Vertical Bars */}
                {generateWeeklyData().questions.map((day, index) => (
                  <div key={index} className="flex flex-col items-center group">
                    <div className="relative">
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div
                          className={`px-2 py-1 rounded text-sm border ${
                            darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-200'
                          }`}
                        >
                          {day.count} questions
                        </div>
                      </div>
                      <div
                        className={`w-12 bg-blue-500 rounded-t-md transition-colors duration-300 group-hover:bg-blue-400`}
                        style={{
                          height: `${(day.count / Math.max(getYAxisScale()[0], 1)) * 160}px`,
                        }}
                      />
                    </div>
                    <span className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {day.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Horizontal Chart */}
            <div className={`block sm:hidden p-6 rounded-lg ${cardStyle} ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <h2 className="text-xl font-semibold mb-4">
                Questions This Week
              </h2>
              <div className="flex flex-col space-y-3">
                {generateWeeklyData().questions.map((day) => (
                  <div key={day.date} className="flex items-center">
                    <div className="w-16 text-sm">{day.date}</div>
                    <div className="flex-1 bg-gray-200 rounded h-4 relative">
                      <div
                        style={{ width: `${(day.count / Math.max(...generateWeeklyData().questions.map(d => d.count), 1)) * 100}%` }}
                        className="bg-blue-500 h-4 rounded"
                      ></div>
                    </div>
                    <div className="w-12 text-right text-sm ml-2">{day.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Half Circle Accuracy Card */}
            <div className="perspective-1000 hover:scale-[1.02] transition-transform duration-300">
              <div
                className={`p-0 rounded-lg cursor-pointer transition-transform duration-700 relative ${cardStyle}`}
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: accuracyView === 'daily' 
                    ? 'rotateX(0deg)' 
                    : accuracyView === 'weekly' 
                      ? 'rotateX(180deg)' 
                      : 'rotateX(360deg)',
                  minHeight: '300px'
                }}
                onClick={() => {
                  if (accuracyView === 'daily') {
                    setAccuracyView('weekly');
                  } else if (accuracyView === 'weekly') {
                    setAccuracyView('allTime');
                  } else {
                    setAccuracyView('daily');
                  }
                }}
              >
                {/* Daily Accuracy */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(0deg)',
                    opacity: accuracyView === 'daily' ? 1 : 0,
                    visibility: accuracyView === 'daily' ? 'visible' : 'hidden',
                    
                  }}
                >
                  <h2 className={`text-xl font-semibold mb-2 text-left ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Daily Accuracy
                  </h2>
                  <div className="flex items-center justify-center flex-grow">
                    <svg className="w-72 h-40" viewBox="0 0 100 60">
                      <path
                        d="M5 50 A 45 45 0 0 1 95 50"
                        fill="none"
                        stroke={darkMode ? '#374151' : '#e2e8f0'}
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <motion.path
                        d="M5 50 A 45 45 0 0 1 95 50"
                        fill="none"
                        stroke={darkMode ? '#60a5fa' : '#3b82f6'}
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: metrics.accuracy / 100 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                      <AnimatedAccuracy
                        value={Math.round(metrics.accuracy)}
                        darkMode={darkMode}
                        className="text-2xl font-bold"
                      />
                    </svg>
                  </div>
                </div>
                
                {/* Weekly Accuracy */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(180deg)',
                    opacity: accuracyView === 'weekly' ? 1 : 0,
                    visibility: accuracyView === 'weekly' ? 'visible' : 'hidden',
                    
                  }}
                >
                  <h2 className={`text-xl font-semibold mb-2 text-left ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Weekly Accuracy
                  </h2>
                  <div className="flex items-center justify-center flex-grow">
                    <svg className="w-72 h-40" viewBox="0 0 100 60">
                      <path
                        d="M5 50 A 45 45 0 0 1 95 50"
                        fill="none"
                        stroke={darkMode ? '#374151' : '#e2e8f0'}
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <motion.path
                        d="M5 50 A 45 45 0 0 1 95 50"
                        fill="none"
                        stroke={darkMode ? '#60a5fa' : '#3b82f6'}
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: calculateWeeklyAccuracy() / 100 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                      <AnimatedAccuracy
                        value={Math.round(calculateWeeklyAccuracy())}
                        darkMode={darkMode}
                        className="text-2xl font-bold"
                      />
                    </svg>
                  </div>
                </div>

                {/* All Time Accuracy */}
                <div 
                  className="absolute w-full h-full flex flex-col p-6"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(360deg)',
                    opacity: accuracyView === 'allTime' ? 1 : 0,
                    visibility: accuracyView === 'allTime' ? 'visible' : 'hidden',
                    
                  }}
                >
                  <h2 className={`text-xl font-semibold mb-2 text-left ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    All Time Accuracy
                  </h2>
                  <div className="flex items-center justify-center flex-grow">
                    <svg className="w-72 h-40" viewBox="0 0 100 60">
                      <path
                        d="M5 50 A 45 45 0 0 1 95 50"
                        fill="none"
                        stroke={darkMode ? '#374151' : '#e2e8f0'}
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <motion.path
                        d="M5 50 A 45 45 0 0 1 95 50"
                        fill="none"
                        stroke={darkMode ? '#60a5fa' : '#3b82f6'}
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: calculateAllTimeAccuracy() / 100 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                      <AnimatedAccuracy
                        value={Math.round(calculateAllTimeAccuracy())}
                        darkMode={darkMode}
                        className="text-2xl font-bold"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>          </div>

          {/* --- Test Share Code Input - Moved Above Buttons --- */}
          <div className="mb-8">
            <div className={`p-6 rounded-lg ${cardStyle} flex flex-col md:flex-row items-center gap-4`}>
              <label htmlFor="test-code-input" className={`text-lg font-semibold whitespace-nowrap ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Test Share Code:
              </label>
              <div className="flex-grow grid grid-cols-6 gap-1 w-full md:w-auto">
                {testCodeDigits.map((digit, index) => (
                  <input
                    key={index}
                    id={`digit-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={(e) => handlePaste(e, index)}
                    className={`
                      ${darkMode ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-white text-gray-700 border-gray-300'} 
                      w-full aspect-square text-center text-3xl sm:text-4xl font-bold 
                      border rounded-md
                    `}
                    style={{ fontFamily: "'PT Sans Narrow', sans-serif" }}
                    aria-label={`Test code digit ${index + 1}`}
                  />
                ))}
              </div>
              {/* Optional: Add a small submit button if auto-submit on full code isn't desired */}
              {/* <button 
                onClick={() => handleLoadTest(testCodeDigits.join(''))} 
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 ml-4"
                disabled={testCodeDigits.some(d => d === '')}
              >
                Load
              </button> */} 
            </div>
          </div>
          
          {/* --- Row of Action Buttons --- */} 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Recent Reports Button */} 
            <motion.div 
              onClick={() => router.push('/reports')}
              className={`rounded-lg cursor-pointer ${cardStyle} hover:border-gray-600`}
            >
              <div className={`w-full h-full p-6 flex items-center gap-4 ${darkMode ? 'text-white' : 'text-black'}`}>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <FaFileAlt className="text-2xl text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">Recent Reports</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Check out how the community has been fixing up the question base
                  </p>
                </div>
              </div>
            </motion.div>
            
            {/* Bookmarked Questions Button */} 
            <motion.div 
              onClick={() => router.push('/bookmarks')}
              className={`rounded-lg cursor-pointer ${cardStyle} hover:border-gray-600`}
            >
              <div className={`w-full h-full p-6 flex items-center gap-4 ${darkMode ? 'text-white' : 'text-black'}`}>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <FaBookmark className="text-2xl text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">Bookmarked Questions</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    View and practice over your bookmarked questions
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* --- Row of Additional Action Buttons --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Discord Bot Button */}
            <motion.div 
              onClick={() => window.open('https://discord.com/oauth2/authorize?client_id=1400979720614711327&permissions=8&integration_type=0&scope=bot+applications.commands', '_blank')}
              className={`rounded-lg cursor-pointer ${cardStyle} hover:border-gray-600`}
            >
              <div className={`w-full h-full p-6 flex items-center gap-4 ${darkMode ? 'text-white' : 'text-black'}`}>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <FaDiscord className="text-2xl text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">Add Discord Bot</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Add Scio.ly bot to your Discord server for quick access
                  </p>
                </div>
              </div>
            </motion.div>
            
            {/* Teams Button */}
            <motion.div 
              onClick={() => toast.info('Coming soon!', { position: 'top-right' })}
              className={`rounded-lg cursor-pointer ${cardStyle} hover:border-gray-600`}
            >
              <div className={`w-full h-full p-6 flex items-center gap-4 ${darkMode ? 'text-white' : 'text-black'}`}>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <FaUsers className="text-2xl text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">Scio.ly for Teams</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Collaborative features for teams and organizations
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>



      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onSubmit={handleContact}
        darkMode={darkMode}
      />

      {/* Add styled scrollbar */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 8px;
          ${darkMode
            ? 'background: black;'
            : 'background: white;'
          }
        }

                ::-webkit-scrollbar-thumb {
          background: ${darkMode
            ? '#374151'
            : '#3b82f6'};
          border-radius: 4px;
          transition: background 1s ease;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${darkMode
            ? '#1f2937'
            : '#2563eb'};
        }
      `}</style>
      <br/><br/>
      
    </div>
  );
}
