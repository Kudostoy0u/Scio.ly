'use client';

import React, { useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import Sidebar from './Sidebar';
import AuthButton from '@/app/components/AuthButton';

interface Team {
  id: string;
  name: string;
  slug: string;
  school: string;
  division: 'B' | 'C';
}

interface TeamLayoutProps {
  children: React.ReactNode;
  activeTab: 'home' | 'upcoming' | 'settings';
  onTabChange: (tab: 'home' | 'upcoming' | 'settings') => void;
  userTeams?: Team[];
  currentTeamSlug?: string;
  onTeamSelect?: (team: Team) => void;
  onNavigateToMainDashboard?: () => void;
  showTopBar?: boolean;
}

export default function TeamLayout({
  children,
  activeTab,
  onTabChange,
  userTeams = [],
  currentTeamSlug,
  onTeamSelect,
  onNavigateToMainDashboard,
  showTopBar = true
}: TeamLayoutProps) {
  const { darkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Top Navigation Bar */}
      {showTopBar && (
        <div className={`fixed top-0 left-0 right-0 z-40 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left side - Logo and mobile menu */}
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
                
                {/* Mobile menu button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={`md:hidden p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>

              {/* Right side - Actions */}
              <div className="flex items-center space-x-3">
                <AuthButton />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`flex h-screen ${showTopBar ? 'pt-16' : ''}`}>
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
                className={`w-60 h-full ${darkMode ? 'bg-gray-900' : 'bg-white'} shadow-xl overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 pt-20">
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
                    activeTab={activeTab}
                    onTabChange={(tab) => {
                      onTabChange(tab);
                      setIsMobileMenuOpen(false);
                    }}
                    userTeams={userTeams}
                    currentTeamSlug={currentTeamSlug}
                    onTeamSelect={onTeamSelect}
                    onNavigateToMainDashboard={onNavigateToMainDashboard}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed Desktop Sidebar */}
        <div className="hidden md:block fixed left-0 top-16 bottom-0 z-30 w-60">
          <Sidebar
            activeTab={activeTab}
            onTabChange={onTabChange}
            userTeams={userTeams}
            currentTeamSlug={currentTeamSlug}
            onTeamSelect={onTeamSelect}
            onNavigateToMainDashboard={onNavigateToMainDashboard}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full md:ml-60 pb-16 md:pb-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
