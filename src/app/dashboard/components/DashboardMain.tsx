'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaPen } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import { getDailyMetrics } from '@/app/utils/metrics';
import { useTheme } from '@/app/contexts/ThemeContext';
import { User } from '@supabase/supabase-js';
// Toast styles are injected globally by Providers
import Header from '../../components/Header';
import ContactModal from '@/app/components/ContactModal';
import { handleContactSubmission } from '@/app/utils/contactUtils';
import { ContactFormData, Metrics, DailyData, WeeklyData } from '../types';
import WelcomeMessage from './WelcomeMessage';
import MetricsCard from './MetricsCard';
import ActionButtons from './ActionButtons';
import QuestionsThisWeekChart from './QuestionsThisWeekChart';

import AnimatedAccuracy from './AnimatedAccuracy';

type HistoryData = Record<string, { questionsAttempted: number; correctAnswers: number; eventsPracticed?: string[] }>;

export default function DashboardMain({
  initialUser,
  initialMetrics,
  initialHistoryData,
}: {
  initialUser?: User | null;
  initialMetrics?: { questionsAttempted: number; correctAnswers: number; eventsPracticed: string[]; accuracy: number };
  initialHistoryData?: { historicalData: DailyData[]; historyData: HistoryData };
}) {
  const router = useRouter();
  const { darkMode, setDarkMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser ?? null);
  const [metrics, setMetrics] = useState<Metrics>({
    questionsAttempted: initialMetrics?.questionsAttempted ?? 0,
    correctAnswers: initialMetrics?.correctAnswers ?? 0,
    eventsPracticed: initialMetrics?.eventsPracticed ?? [],
    accuracy: initialMetrics?.accuracy ?? 0
  });
  const [historicalData, setHistoricalData] = useState<DailyData[]>(initialHistoryData?.historicalData ?? []);
  const [historyData, setHistoryData] = useState<HistoryData>(initialHistoryData?.historyData ?? {});
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // View states for metrics cards
  const [questionsView, setQuestionsView] = useState<'daily' | 'weekly' | 'allTime'>('daily');
  const [correctView, setCorrectView] = useState<'daily' | 'weekly' | 'allTime'>('daily');
  const [eventsView, setEventsView] = useState<'daily' | 'weekly' | 'allTime'>('daily');
  const [accuracyView, setAccuracyView] = useState<'daily' | 'weekly' | 'allTime'>('daily');

  // Card style for consistent theming (no shadow)
  const cardStyle = darkMode 
    ? 'bg-gray-800 border border-gray-700' 
    : 'bg-white border border-gray-200';

  // Responsive design - keeping for future use
  // const [isMobile, setIsMobile] = useState(false);

  // function handleResize() {
  //   setIsMobile(window.innerWidth < 768);
  // }

  // useEffect(() => {
  //   handleResize();
  //   window.addEventListener('resize', handleResize);
  //   return () => window.removeEventListener('resize', handleResize);
  // }, []);

  // Fetch user and metrics data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Always get the client-side user to ensure an authenticated session for RLS
        const { data: { user } } = await supabase.auth.getUser();
        const effectiveUser = user || initialUser || null;
        setCurrentUser(effectiveUser);
        if (!effectiveUser) {
          // Anonymous fallback: load metrics from localStorage
          const dailyMetrics = await getDailyMetrics(null);
          if (dailyMetrics) {
            const accuracy = dailyMetrics.questionsAttempted > 0
              ? (dailyMetrics.correctAnswers / dailyMetrics.questionsAttempted) * 100
              : 0;
            setMetrics({ ...dailyMetrics, accuracy });
          }

          // Build historical data from localStorage keys metrics_<date>
          try {
            const localHistoryEntries: Array<{ date: string; questions_attempted: number; correct_answers: number; events_practiced: string[] }>= [];
            for (let i = 0; typeof window !== 'undefined' && i < localStorage.length; i++) {
              const key = localStorage.key(i) || '';
              if (key.startsWith('metrics_')) {
                const date = key.replace('metrics_', '');
                try {
                  const raw = localStorage.getItem(key);
                  if (!raw) continue;
                  const parsed = JSON.parse(raw) as { questionsAttempted?: number; correctAnswers?: number; eventsPracticed?: string[] };
                  localHistoryEntries.push({
                    date,
                    questions_attempted: parsed.questionsAttempted || 0,
                    correct_answers: parsed.correctAnswers || 0,
                    events_practiced: parsed.eventsPracticed || []
                  });
                } catch {}
              }
            }

            localHistoryEntries.sort((a, b) => a.date.localeCompare(b.date));
            const processedData = localHistoryEntries.map(item => ({ date: item.date, count: item.questions_attempted || 0 }));
            setHistoricalData(processedData);

            const historyObj: HistoryData = {} as any;
            localHistoryEntries.forEach(item => {
              historyObj[item.date] = {
                questionsAttempted: item.questions_attempted || 0,
                correctAnswers: item.correct_answers || 0,
                eventsPracticed: item.events_practiced || []
              };
            });
            setHistoryData(historyObj);
          } catch {
            // ignore local parsing errors
          }
          return;
        }

        // Logged-in: seed UI instantly from localStorage cache, then refresh from Supabase
        try {
          const todayKey = new Date().toISOString().split('T')[0];
          const raw = typeof window !== 'undefined' ? localStorage.getItem(`metrics_${todayKey}`) : null;
          if (raw) {
            const parsed = JSON.parse(raw) as { questionsAttempted?: number; correctAnswers?: number; eventsPracticed?: string[] };
            const q = parsed.questionsAttempted || 0;
            const c = parsed.correctAnswers || 0;
            setMetrics({
              questionsAttempted: q,
              correctAnswers: c,
              eventsPracticed: parsed.eventsPracticed || [],
              accuracy: q > 0 ? (c / q) * 100 : 0,
            });
          }
          // Also seed history from local to avoid empty charts
          const localHistoryEntries: Array<{ date: string; questions_attempted: number; correct_answers: number; events_practiced: string[] }>= [];
          if (typeof window !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i) || '';
              if (key.startsWith('metrics_')) {
                const date = key.replace('metrics_', '');
                try {
                  const rawItem = localStorage.getItem(key);
                  if (!rawItem) continue;
                  const parsed = JSON.parse(rawItem) as { questionsAttempted?: number; correctAnswers?: number; eventsPracticed?: string[] };
                  localHistoryEntries.push({
                    date,
                    questions_attempted: parsed.questionsAttempted || 0,
                    correct_answers: parsed.correctAnswers || 0,
                    events_practiced: parsed.eventsPracticed || [],
                  });
                } catch {}
              }
            }
          }
          if (localHistoryEntries.length > 0) {
            localHistoryEntries.sort((a, b) => a.date.localeCompare(b.date));
            setHistoricalData(localHistoryEntries.map(item => ({ date: item.date, count: item.questions_attempted || 0 })));
            const historyObj: HistoryData = {} as any;
            localHistoryEntries.forEach(item => {
              historyObj[item.date] = {
                questionsAttempted: item.questions_attempted || 0,
                correctAnswers: item.correct_answers || 0,
                eventsPracticed: item.events_practiced || [],
              };
            });
            setHistoryData(historyObj);
          }
        } catch {}

        if (!initialMetrics) {
          // Fetch daily metrics
          const dailyMetrics = await getDailyMetrics(effectiveUser.id);
          if (dailyMetrics) {
            const accuracy = dailyMetrics.questionsAttempted > 0
              ? (dailyMetrics.correctAnswers / dailyMetrics.questionsAttempted) * 100
              : 0;
            
            setMetrics({
              ...dailyMetrics,
              accuracy
            });
          }

          // Fetch historical data for charts from user_stats (by day)
          const { data: historicalData } = await (supabase as any)
            .from('user_stats')
            .select('date, questions_attempted, correct_answers, events_practiced')
            .eq('user_id', effectiveUser.id)
            .order('date', { ascending: true });

          if (historicalData) {
            const processedData = historicalData.map((item: any) => ({
              date: item.date,
              count: item.questions_attempted || 0
            }));
            setHistoricalData(processedData);

            // Create history data object for charts
            const historyObj: HistoryData = {};
            (historicalData as any[]).forEach((item: any) => {
              const dateStr = item.date;
              historyObj[dateStr] = {
                questionsAttempted: item.questions_attempted || 0,
                correctAnswers: item.correct_answers || 0,
                eventsPracticed: item.events_practiced || []
              };
            });
            setHistoryData(historyObj);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    if (!initialMetrics || !initialHistoryData) {
      fetchData();
    }
  }, [initialUser, initialMetrics, initialHistoryData]);

  // Refresh metrics when auth state changes on the client
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        // Force refresh of metrics/history
        (async () => {
          // Seed from local cache immediately for smoother UX
          try {
            const todayKey = new Date().toISOString().split('T')[0];
            const raw = typeof window !== 'undefined' ? localStorage.getItem(`metrics_${todayKey}`) : null;
            if (raw) {
              const parsed = JSON.parse(raw) as { questionsAttempted?: number; correctAnswers?: number; eventsPracticed?: string[] };
              const q = parsed.questionsAttempted || 0;
              const c = parsed.correctAnswers || 0;
              setMetrics({
                questionsAttempted: q,
                correctAnswers: c,
                eventsPracticed: parsed.eventsPracticed || [],
                accuracy: q > 0 ? (c / q) * 100 : 0,
              });
            }
          } catch {}
          const daily = await getDailyMetrics(session.user.id);
          if (daily) {
            const accuracy = daily.questionsAttempted > 0 ? (daily.correctAnswers / daily.questionsAttempted) * 100 : 0;
            setMetrics({ ...daily, accuracy });
          }
          const { data: historicalData } = await (supabase as any)
            .from('user_stats')
            .select('date, questions_attempted, correct_answers, events_practiced')
            .eq('user_id', session.user.id)
            .order('date', { ascending: true });
          if (historicalData) {
            setHistoricalData(historicalData.map((item: any) => ({ date: item.date, count: item.questions_attempted || 0 })));
            const historyObj: Record<string, { questionsAttempted: number; correctAnswers: number; eventsPracticed?: string[] }> = {};
            (historicalData as any[]).forEach((item: any) => {
              historyObj[item.date] = {
                questionsAttempted: item.questions_attempted || 0,
                correctAnswers: item.correct_answers || 0,
                eventsPracticed: item.events_practiced || []
              };
            });
            setHistoryData(historyObj);
          }
        })();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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

  // removed: getYAxisScale (legacy bar chart)

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
    if (historicalData.length === 0) return 0;
    const totalQuestions = historicalData.reduce((sum, item) => sum + item.count, 0);
    const totalCorrect = Object.values(historyData).reduce((sum, d) => sum + (d?.correctAnswers || 0), 0);
    return totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  };

  const handleContact = async (data: ContactFormData) => {
    try {
      await handleContactSubmission(data);
      setContactModalOpen(false);
      toast.success('Message sent successfully!');
    } catch (error) {
      console.error('Error sending contact message:', error);
      toast.error('Failed to send message. Please try again.');
    }
  };

  const calculateWeeklyQuestions = (): number => {
    const weeklyData = generateWeeklyData();
    return weeklyData.questions.reduce((sum, item) => sum + item.count, 0);
  };

  const calculateAllTimeQuestions = (): number => {
    return historicalData.reduce((sum, item) => sum + item.count, 0);
  };

  const calculateWeeklyCorrect = (): number => {
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }
    return last7Days.reduce((sum, d) => sum + (historyData[d]?.correctAnswers || 0), 0);
  };

  const calculateAllTimeCorrect = (): number => {
    return Object.values(historyData).reduce((sum, d) => sum + (d?.correctAnswers || 0), 0);
  };

  const calculateWeeklyEvents = (): number => {
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }
    const setUnique = new Set<string>();
    last7Days.forEach(d => {
      (historyData[d]?.eventsPracticed || []).forEach(ev => setUnique.add(ev));
    });
    return setUnique.size;
  };

  const calculateAllTimeEvents = (): number => {
    const all = new Set<string>();
    Object.values(historyData).forEach(day => {
      (day.eventsPracticed || []).forEach(ev => all.add(ev));
    });
    // Fallback to today's if history empty
    if (all.size === 0) return metrics.eventsPracticed.length;
    return all.size;
  };

  return (
    <div className="relative min-h-screen">
      {/* Background */}
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
            <MetricsCard
              title="Questions Attempted"
              dailyValue={metrics.questionsAttempted}
              weeklyValue={calculateWeeklyQuestions()}
              allTimeValue={calculateAllTimeQuestions()}
              view={questionsView}
              onViewChange={setQuestionsView}
              color="text-blue-600"
              darkMode={darkMode}
            />

            {/* Correct Answers Card */}
            <MetricsCard
              title="Correct Answers"
              dailyValue={metrics.correctAnswers}
              weeklyValue={calculateWeeklyCorrect()}
              allTimeValue={calculateAllTimeCorrect()}
              view={correctView}
              onViewChange={setCorrectView}
              color="text-green-600"
              darkMode={darkMode}
            />

            {/* Events Practiced Card */}
            <MetricsCard
              title="Events Practiced"
              dailyValue={metrics.eventsPracticed.length}
              weeklyValue={calculateWeeklyEvents()}
              allTimeValue={calculateAllTimeEvents()}
              view={eventsView}
              onViewChange={setEventsView}
              color="text-purple-600"
              darkMode={darkMode}
            />
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <QuestionsThisWeekChart historyData={historyData} darkMode={darkMode} />

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
            </div>
          </div>



          {/* Action Buttons */}
          <ActionButtons darkMode={darkMode} />
        </div>
      </div>

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onSubmit={handleContact}
        darkMode={darkMode}
      />

      {/* Global scrollbar theme is centralized in globals.css */}
      <br/><br/>
      
    </div>
  );
} 