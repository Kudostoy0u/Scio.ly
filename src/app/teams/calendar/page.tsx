'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import AuthButton from '@/app/components/AuthButton';
import TeamCalendar from '../components/TeamCalendar';
import Sidebar from '../components/Sidebar';
import { globalApiCache } from '@/lib/utils/globalApiCache';

export default function CalendarPage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [userTeams, setUserTeams] = useState<Array<{id: string, name: string, slug: string, user_role: string, school: string, division: 'B' | 'C'}>>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadUserTeams = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Use global cache to avoid duplicate requests
        const cacheKey = `user-teams-${user.id}`;
        const teams = await globalApiCache.fetchWithCache(
          cacheKey,
          async () => {
            const response = await fetch('/api/teams/user-teams');
            if (!response.ok) throw new Error('Failed to fetch user teams');
            const result = await response.json();
            return result.teams || [];
          },
          'user-teams'
        );
        
        setUserTeams(teams);
      } catch (error) {
        console.error('Error loading user teams:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserTeams();
  }, [user?.id]);

  const handleTabChange = (tab: 'home' | 'upcoming' | 'settings') => {
    if (tab === 'home') {
      router.push('/teams');
    } else if (tab === 'upcoming') {
      // Already on calendar page
    } else if (tab === 'settings') {
      router.push('/teams?tab=settings');
    }
  };

  const handleTeamSelect = (team: {id: string, name: string, slug: string, school: string, division: 'B' | 'C'}) => {
    router.push(`/teams/${team.slug}`);
  };

  const handleNavigateToMainDashboard = () => {
    router.push('/teams?view=all');
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Loading calendar...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Top Navigation Bar */}
      <div className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and hamburger menu */}
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center">
                <Image
                  src="/site-logo.png"
                  alt="Scio.ly Logo"
                  width={32}
                  height={32}
                  className="rounded-md"
                />
                <span className={`ml-2 text-xl font-bold hidden md:block ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Scio.ly
                </span>
              </Link>
              
              {/* Mobile hamburger menu */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 md:hidden"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
                className={`w-64 h-full ${darkMode ? 'bg-gray-900' : 'bg-white'} shadow-xl`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-8">
                    <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Menu
                    </span>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-800 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <Sidebar
                    activeTab="upcoming"
                    onTabChange={handleTabChange}
                    userTeams={userTeams}
                    onTeamSelect={handleTeamSelect}
                    onNavigateToMainDashboard={handleNavigateToMainDashboard}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar
            activeTab="upcoming"
            onTabChange={handleTabChange}
            userTeams={userTeams}
            onTeamSelect={handleTeamSelect}
            onNavigateToMainDashboard={handleNavigateToMainDashboard}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full md:w-auto">
          <div className="max-w-7xl mx-auto">
            <TeamCalendar 
              teamId={undefined} 
              isCaptain={userTeams.some(team => 
                team.user_role === 'captain' || team.user_role === 'co_captain'
              )} 
              teamSlug={userTeams[0]?.slug || undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
