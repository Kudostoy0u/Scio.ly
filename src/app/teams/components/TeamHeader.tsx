'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/app/contexts/ThemeContext';
import { UserPlus, LogOut, Archive, Menu } from 'lucide-react';
import AuthButton from '@/app/components/AuthButton';

interface TeamHeaderProps {
  school: string;
  division: 'B' | 'C';
  isCaptain: boolean;
  onBack: () => void;
  onInvitePerson: () => void;
  onExitTeam: () => void;
  onArchiveTeam: () => void;
  onMobileMenuToggle?: () => void;
  subteams?: Array<{
    id: string;
    name: string;
    team_id: string;
    description: string;
    created_at: string;
  }>;
  activeSubteamId?: string | null;
  onSubteamChange?: (subteamId: string) => void;
  onCreateSubteam?: (name: string) => void;
  loadingSubteams?: boolean;
}

export default function TeamHeader({
  school,
  division,
  isCaptain,
  onBack: _onBack,
  onInvitePerson,
  onExitTeam,
  onArchiveTeam,
  onMobileMenuToggle,
  subteams: _subteams = [],
  activeSubteamId: _activeSubteamId,
  onSubteamChange: _onSubteamChange,
  onCreateSubteam: _onCreateSubteam,
  loadingSubteams: _loadingSubteams = false
}: TeamHeaderProps) {
  const { darkMode } = useTheme();
  
  return (
    <>
      {/* Top Navigation Bar */}
      <div className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
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
              {onMobileMenuToggle && (
                <button
                  onClick={onMobileMenuToggle}
                  className={`md:hidden p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              <button className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      {/* Team Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{school}</h1>
              <p className="text-purple-100 mt-2">Division {division}</p>
            </div>
            <div className="flex items-center space-x-4">
              {isCaptain && (
                <button
                  onClick={onInvitePerson}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group shadow-lg ${
                    darkMode 
                      ? 'bg-gray-700 bg-opacity-90 hover:bg-opacity-100' 
                      : 'bg-white bg-opacity-90 hover:bg-opacity-100'
                  }`}
                  title="Invite Person"
                >
                  <UserPlus className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
                </button>
              )}
              <button
                onClick={onExitTeam}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group shadow-lg ${
                  darkMode 
                    ? 'bg-gray-700 bg-opacity-90 hover:bg-opacity-100' 
                    : 'bg-white bg-opacity-90 hover:bg-opacity-100'
                }`}
                title="Exit Team"
              >
                <LogOut className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
              </button>
              {isCaptain && (
                <button
                  onClick={onArchiveTeam}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group shadow-lg ${
                    darkMode 
                      ? 'bg-gray-700 bg-opacity-90 hover:bg-opacity-100' 
                      : 'bg-white bg-opacity-90 hover:bg-opacity-100'
                  }`}
                  title="Archive Team"
                >
                  <Archive className="w-6 h-6 text-orange-600 group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
