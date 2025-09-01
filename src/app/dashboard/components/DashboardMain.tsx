'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaPen } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useTheme } from '@/app/contexts/ThemeContext';
import { User } from '@supabase/supabase-js';
import Header from '../../components/Header';
import ContactModal from '@/app/components/ContactModal';
import { handleContactSubmission } from '@/app/utils/contactUtils';
import { ContactFormData } from '../types';
import WelcomeMessage from './WelcomeMessage';
import MetricsCard from './MetricsCard';
import FavoriteConfigsCard from './FavoriteConfigsCard';
import QuestionsThisWeekChart from './QuestionsThisWeekChart';
import ActionButtons from './ActionButtons';
import AnimatedAccuracy from './AnimatedAccuracy';
import HylasBanner from './HylasBanner';

import { useDashboardData } from '../hooks/useDashboardData';
import { BannerProvider, useBannerContext } from '../contexts/BannerContext';

function DashboardContent({ initialUser }: { initialUser?: User | null }) {
  const router = useRouter();
  const { darkMode, setDarkMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser ?? null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const { bannerVisible, closeBanner } = useBannerContext();

  // Use the new simplified data management hook
  const {
    metrics,
    historyData,
    greetingName,
    isLoading,
  } = useDashboardData(currentUser);

  // View states for metrics cards
  const [correctView, setCorrectView] = useState<'daily' | 'weekly' | 'allTime'>('daily');
  const [accuracyView, setAccuracyView] = useState<'daily' | 'weekly' | 'allTime'>('daily');

  // Card style for consistent theming
  const cardStyle = darkMode 
    ? 'bg-gray-800 border border-gray-700' 
    : 'bg-white border border-gray-200';

  // Fetch user data and listen to auth state changes
  useEffect(() => {
    const setupAuthListener = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        
        // Get initial user
        const { data: { user } } = await supabase.auth.getUser();
        const effectiveUser = user || initialUser || null;
        setCurrentUser(effectiveUser);

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          console.log('DashboardMain: Auth state changed:', _event, session?.user?.id);
          const effectiveUser = session?.user || initialUser || null;
          setCurrentUser(effectiveUser);
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up auth listener:', error);
      }
    };

    const cleanup = setupAuthListener();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [initialUser]);

  // Handle contact form submission
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

  // Calculate accuracy based on current view
  const getAccuracyForView = (view: 'daily' | 'weekly' | 'allTime'): number => {
    switch (view) {
      case 'daily':
        return metrics.questionsAttempted > 0 ? (metrics.correctAnswers / metrics.questionsAttempted) * 100 : 0;
      case 'weekly':
        return calculateWeeklyAccuracy();
      case 'allTime':
        return calculateAllTimeAccuracy();
      default:
        return 0;
    }
  };

  // Calculate weekly accuracy
  const calculateWeeklyAccuracy = (): number => {
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    const weekData = last7Days
      .map(dateStr => historyData[dateStr])
      .filter(stats => stats && stats.questionsAttempted > 0);

    const totals = weekData.reduce(
      (acc, stats) => ({
        attempted: acc.attempted + (stats?.questionsAttempted || 0),
        correct: acc.correct + (stats?.correctAnswers || 0),
      }),
      { attempted: 0, correct: 0 }
    );
    
    return totals.attempted > 0 ? (totals.correct / totals.attempted) * 100 : 0;
  };

  // Calculate all-time accuracy
  const calculateAllTimeAccuracy = (): number => {
    const allStats = Object.values(historyData);
    const totals = allStats.reduce(
      (acc, stats) => ({
        attempted: acc.attempted + (stats?.questionsAttempted || 0),
        correct: acc.correct + (stats?.correctAnswers || 0),
      }),
      { attempted: 0, correct: 0 }
    );
    
    return totals.attempted > 0 ? (totals.correct / totals.attempted) * 100 : 0;
  };

  const calculateWeeklyTotals = () => {
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    const totals = last7Days.reduce(
      (acc, dateStr) => {
        const stats = historyData[dateStr];
        return {
          questions: acc.questions + (stats?.questionsAttempted || 0),
          correct: acc.correct + (stats?.correctAnswers || 0),
        };
      },
      { questions: 0, correct: 0 }
    );

    return totals;
  };

  const calculateAllTimeTotals = () => {
    const totals = Object.values(historyData).reduce(
      (acc, stats) => ({
        questions: acc.questions + (stats?.questionsAttempted || 0),
        correct: acc.correct + (stats?.correctAnswers || 0),
      }),
      { questions: 0, correct: 0 }
    );

    return totals;
  };

    return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div
        className={`absolute inset-0 ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        } transition-colors duration-300`}
      />

      {/* Main Content */}
      <div className="relative z-10">
        {bannerVisible && <HylasBanner onClose={closeBanner} />}
        <div className={bannerVisible ? 'relative' : ''} style={bannerVisible ? { marginTop: '32px' } : {}}>
          <Header />
        </div>

        <div className={`container mx-auto px-4 pb-8 ${bannerVisible ? 'pt-28' : 'pt-24'}`}>
          {/* Welcome Banner and Practice Button Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 md:mb-8">
            {/* Welcome Message - Takes 2/3 on desktop */}
            <div className="lg:col-span-2">
              <div className="h-32">
                <WelcomeMessage 
                  greetingName={greetingName} 
                  darkMode={darkMode} 
                  currentUser={currentUser}
                  setDarkMode={setDarkMode}
                  isLoading={isLoading}
                />
              </div>
            </div>
            
            {/* Practice Button - Takes 1/3 on desktop */}
            <div className="lg:col-span-1">
              <motion.button
                onClick={() => router.push('/practice')}
                className="rounded-lg w-full h-32 py-7 px-6 text-white text-center flex flex-col items-center justify-center bg-blue-600 relative overflow-hidden group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Pencil Icon */}
                <div className="absolute inset-0 flex items-center justify-center transition-all duration-600 ease-in-out -translate-y-4 group-hover:translate-y-0">
                  <FaPen className="text-3xl transition-all duration-600 ease-in-out group-hover:rotate-[-270deg]" />
                </div>
                
                {/* Practice Text */}
                <span className="text-xl font-bold absolute inset-0 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0 translate-y-4">
                  Practice
                </span>
              </motion.button>
            </div>
          </div>



          {/* Metrics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 lg:mb-8">
            {/* [Daily/Weekly/All-Time] Correct Answers Card - Takes 1/3 on desktop */}
            <div className="lg:col-span-1">
              <div className="h-32">
                <MetricsCard
                  title="Correct Answers"
                  dailyValue={metrics.correctAnswers}
                  weeklyValue={calculateWeeklyTotals().correct}
                  allTimeValue={calculateAllTimeTotals().correct}
                  view={correctView}
                  onViewChange={setCorrectView}
                  color="text-green-600"
                  darkMode={darkMode}
                  dailyDenominator={metrics.questionsAttempted}
                  weeklyDenominator={calculateWeeklyTotals().questions}
                  allTimeDenominator={calculateAllTimeTotals().questions}
                  formatAsFraction={true}
                  isLoading={isLoading}
                />
              </div>
            </div>

            {/* Favorite Configs - Takes 2/3 on desktop, hidden on mobile */}
            <div className="lg:col-span-2">
              <div className="h-32 lg:mb-0">
                <FavoriteConfigsCard />
              </div>
            </div>
          </div>

          {/* Charts and Accuracy Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 lg:mb-8">
            {/* Questions Chart */}
            <QuestionsThisWeekChart historyData={historyData} darkMode={darkMode} />

            {/* Accuracy Card */}
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
                        animate={{ pathLength: getAccuracyForView('daily') / 100 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                      <AnimatedAccuracy
                        value={Math.round(getAccuracyForView('daily'))}
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
                        animate={{ pathLength: getAccuracyForView('weekly') / 100 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                      <AnimatedAccuracy
                        value={Math.round(getAccuracyForView('weekly'))}
                        darkMode={darkMode}
                        className="text-2xl font-bold"
                      />
                    </svg>
                  </div>
                </div>

                {/* All-Time Accuracy */}
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
                    All-Time Accuracy
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
                        animate={{ pathLength: getAccuracyForView('allTime') / 100 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                      <AnimatedAccuracy
                        value={Math.round(getAccuracyForView('allTime'))}
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

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onSubmit={handleContact}
        darkMode={darkMode}
      />
    </div>
  );
}

export default function DashboardMain({ initialUser }: { initialUser?: User | null }) {
  return (
    <BannerProvider>
      <DashboardContent initialUser={initialUser} />
    </BannerProvider>
  );
} 