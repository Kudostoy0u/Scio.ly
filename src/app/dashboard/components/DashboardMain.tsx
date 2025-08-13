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
import dynamic from 'next/dynamic';

const WelcomeMessage = dynamic(() => import('./WelcomeMessage'), { ssr: false, loading: () => (
  <div className="rounded-lg p-6 border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-8 w-64 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-80 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="hidden md:block p-6 rounded-lg bg-gray-100 dark:bg-gray-700" />
    </div>
  </div>
) });

const MetricsCard = dynamic(() => import('./MetricsCard'), { ssr: false, loading: () => (
  <div className="perspective-1000 transition-transform duration-300 text-center">
    <div className="p-0 h-32 rounded-lg relative border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800">
      <div className="absolute w-full h-full flex flex-col px-6 pt-6 pb-3">
        <div className="h-5 w-40 mb-2 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-9 w-24 rounded bg-gray-200 dark:bg-gray-700 self-center" />
      </div>
    </div>
  </div>
) });

const FavoriteConfigsCard = dynamic(() => import('./FavoriteConfigsCard'), { ssr: false, loading: () => (
  <div className="hidden md:flex md:col-span-2 rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800 pl-5 pr-5 h-32 overflow-hidden animate-pulse">
    <div className="flex flex-row w-full items-center gap-4 h-full">
      <div className="flex-none min-w-[110px]">
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="flex-1 h-full">
        <div className="grid grid-cols-4 gap-4 h-full items-center">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="hidden md:flex items-center justify-center rounded-md h-[80%] bg-gray-50/60 dark:bg-gray-900/30 border dark:border-gray-800 border-gray-200" />
          ))}
        </div>
      </div>
    </div>
  </div>
) });

const QuestionsThisWeekChart = dynamic(() => import('./QuestionsThisWeekChart'), { ssr: false, loading: () => (
  <div className="p-6 rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800 flex flex-col h-[360px] md:h-[300px] animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="flex items-center gap-2">
        <div className="h-8 w-16 rounded-md bg-gray-200 dark:bg-gray-700" />
        <div className="h-8 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
    <div className="mb-2 flex flex-wrap items-center gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
      ))}
    </div>
    <div className="w-full flex-1 min-h-0 rounded bg-gray-200 dark:bg-gray-700" />
  </div>
) });

const ActionButtons = dynamic(() => import('./ActionButtons'), { ssr: false, loading: () => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-pulse">
      <div className="rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800">
        <div className="w-full h-full p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 w-12 h-12" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-72 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="grid grid-cols-3 gap-2 md:flex md:space-x-2 md:grid-cols-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800">
        <div className="w-full h-full p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 w-12 h-12" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-56 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-pulse">
      <div className="rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800">
        <div className="w-full h-full p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 w-12 h-12" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-52 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-72 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
      <div className="rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800">
        <div className="w-full h-full p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 w-12 h-12" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-52 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-72 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-pulse">
      <div className="rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800">
        <div className="w-full h-full p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 w-12 h-12" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-56 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
      <div className="rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800">
        <div className="w-full h-full p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 w-12 h-12" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-52 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-72 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    </div>
  </>
) });

import AnimatedAccuracy from './AnimatedAccuracy';

type HistoryData = Record<string, { questionsAttempted: number; correctAnswers: number; eventsPracticed?: string[] }>;

export default function DashboardMain({
  initialUser,
  initialMetrics,
  initialHistoryData,
  initialGreetingName,
}: {
  initialUser?: User | null;
  initialMetrics?: { questionsAttempted: number; correctAnswers: number; eventsPracticed: string[]; accuracy: number };
  initialHistoryData?: { historicalData: DailyData[]; historyData: HistoryData };
  initialGreetingName?: string;
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
  const [greetingName, setGreetingName] = useState<string>(initialGreetingName || '');

  // View states for metrics cards
  const [correctView, setCorrectView] = useState<'daily' | 'weekly' | 'allTime'>('daily');
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

        {
          // Fetch daily metrics
          const dailyMetrics = await getDailyMetrics(effectiveUser.id);
          if (dailyMetrics) {
            const accuracy = dailyMetrics.questionsAttempted > 0
              ? (dailyMetrics.correctAnswers / dailyMetrics.questionsAttempted) * 100
              : 0;
            // Avoid state churn if identical to current values
            setMetrics(prev => {
              const next = { ...dailyMetrics, accuracy };
              if (
                prev.questionsAttempted === next.questionsAttempted &&
                prev.correctAnswers === next.correctAnswers &&
                prev.accuracy === next.accuracy &&
                (prev.eventsPracticed || []).join('|') === (next.eventsPracticed || []).join('|')
              ) {
                return prev;
              }
              return next;
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
            setHistoricalData(prev => {
              const sameLength = prev.length === processedData.length;
              const same = sameLength && prev.every((p, i) => p.date === processedData[i].date && p.count === processedData[i].count);
              return same ? prev : processedData;
            });

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
            setHistoryData(prev => {
              const keysPrev = Object.keys(prev);
              const keysNext = Object.keys(historyObj);
              const sameKeys = keysPrev.length === keysNext.length && keysPrev.every(k => keysNext.includes(k));
              const sameValues = sameKeys && keysPrev.every(k => {
                const a = prev[k]; const b = historyObj[k];
                return (
                  (a?.questionsAttempted || 0) === (b?.questionsAttempted || 0) &&
                  (a?.correctAnswers || 0) === (b?.correctAnswers || 0) &&
                  (a?.eventsPracticed || []).join('|') === (b?.eventsPracticed || []).join('|')
                );
              });
              return sameValues ? prev : historyObj;
            });
          }

          // Fetch preferred greeting name in the same flow as metrics
          try {
            const { data } = await (supabase as any)
              .from('users')
              .select('first_name, display_name')
              .eq('id', effectiveUser.id)
              .maybeSingle();
            const first: string | undefined = (data as any)?.first_name;
            const display: string | undefined = (data as any)?.display_name;
            const chosen = (first && first.trim()) ? first.trim() : (display && display.trim()) ? display.trim().split(' ')[0] : '';
            if (chosen) {
              setGreetingName(prev => prev || chosen);
              try { localStorage.setItem('scio_display_name', chosen); } catch {}
            }
          } catch {}
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    // Always fetch after mount to revalidate session and prevent stale zero-state
    fetchData();
  }, [initialUser]);

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

          // Also refresh greeting name immediately after sign-in
          try {
            const { data } = await (supabase as any)
              .from('users')
              .select('first_name, display_name')
              .eq('id', session.user.id)
              .maybeSingle();
            const first: string | undefined = (data as any)?.first_name;
            const display: string | undefined = (data as any)?.display_name;
            const chosen = (first && first.trim())
              ? first.trim()
              : (display && display.trim())
                ? display.trim().split(' ')[0]
                : (session.user.email?.split('@')[0] || '');
            if (chosen) {
              setGreetingName(chosen);
              try {
                localStorage.setItem('scio_display_name', chosen);
                window.dispatchEvent(new CustomEvent('scio-display-name-updated', { detail: chosen }));
              } catch {}
            }
          } catch {}
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

  // Events cards were removed; corresponding calculators no longer needed

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 md:mb-8">
            {/* Welcome Message - Takes 2/3 on desktop */}
            <div className="lg:col-span-2">
              <WelcomeMessage darkMode={darkMode} currentUser={currentUser} setDarkMode={setDarkMode} greetingName={greetingName} />
            </div>
            
            {/* Practice Button - Takes 1/3 on desktop */}
            <div className="flex">
              <motion.button
                onClick={() => router.push('/practice')}
                className="rounded-lg w-full h-[136px] py-7 px-6 text-white text-center flex flex-col items-center justify-center bg-blue-600"
              >
                <FaPen className="text-3xl" />
                <span className="text-xl font-bold">Practice</span>
              </motion.button>
            </div>
          </div>

          {/* Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:mb-8">
            {/* Correct / Attempted merged */}
            <div className="md:col-span-1">
              <MetricsCard
              title="Questions Correct"
              dailyValue={metrics.correctAnswers}
              weeklyValue={calculateWeeklyCorrect()}
              allTimeValue={calculateAllTimeCorrect()}
              view={correctView}
              onViewChange={setCorrectView}
              color="text-green-600"
              darkMode={darkMode}
              dailyDenominator={metrics.questionsAttempted}
              weeklyDenominator={calculateWeeklyQuestions()}
              allTimeDenominator={calculateAllTimeQuestions()}
              formatAsFraction={true}
              />
            </div>

            <div className="md:col-span-3">
              <FavoriteConfigsCard />
            </div>
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