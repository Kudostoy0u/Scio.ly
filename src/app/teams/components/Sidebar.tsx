'use client';

import React from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { Home, Calendar, Archive, Settings, Users, ChevronRight } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  slug: string;
  school: string;
  division: 'B' | 'C';
}

interface SidebarProps {
  activeTab: 'home' | 'upcoming' | 'settings';
  onTabChange: (tab: 'home' | 'upcoming' | 'settings') => void;
  userTeams?: Team[];
  currentTeamSlug?: string;
  onTeamSelect?: (team: Team) => void;
  onNavigateToMainDashboard?: () => void;
}

export default function Sidebar({ 
  activeTab, 
  onTabChange, 
  userTeams = [], 
  currentTeamSlug, 
  onTeamSelect, 
  onNavigateToMainDashboard 
}: SidebarProps) {
  const { darkMode } = useTheme();
  const router = useRouter();

  const sidebarItems = [
    { icon: Calendar, label: 'Upcoming', active: activeTab === 'upcoming', tab: 'upcoming' as const },
    { icon: Settings, label: 'Settings', active: activeTab === 'settings', tab: 'settings' as const },
  ];

  const handleArchivedClick = () => {
    router.push('/teams/archived');
  };

  return (
    <div className={`w-full h-full flex flex-col ${
      darkMode 
        ? 'bg-gray-900 md:border-r border-gray-800' 
        : 'bg-white md:border-r border-gray-200'
    }`}>

      {/* Main Navigation */}
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          {/* Home Button */}
          <button
            onClick={() => {
              if (onNavigateToMainDashboard) {
                onNavigateToMainDashboard();
              } else {
                window.location.href = '/teams?view=all';
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              darkMode
                ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Home className="w-4 h-4" />
              <span>All Teams</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Navigation Items */}
          {sidebarItems.map((item, index) => (
            <button
              key={index}
              onClick={() => onTabChange(item.tab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                item.active
                  ? darkMode
                    ? 'bg-blue-900/20 text-blue-300 border border-blue-800'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                  : darkMode
                  ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.active && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}

          {/* Archived Teams Button */}
          <button
            onClick={handleArchivedClick}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              darkMode
                ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Archive className="w-4 h-4" />
              <span>Archived</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Teams Section - Right below navigation items */}
          {userTeams.length > 0 && (
            <div className="mt-6">
              <div className="mb-3">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Your Teams
                </h3>
              </div>
              <div className="space-y-1">
                {userTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => onTeamSelect?.(team)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                      currentTeamSlug === team.slug
                        ? darkMode
                          ? 'bg-blue-900/20 text-blue-300 border border-blue-800'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                        : darkMode
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-100'
                      }`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{team.school}</div>
                        <div className={`text-xs truncate ${
                          currentTeamSlug === team.slug 
                            ? darkMode
                              ? 'text-blue-400'
                              : 'text-blue-600'
                            : darkMode 
                            ? 'text-gray-400' 
                            : 'text-gray-500'
                        }`}>
                          Division {team.division}
                        </div>
                      </div>
                    </div>
                    {currentTeamSlug === team.slug && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
