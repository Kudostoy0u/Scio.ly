'use client';

import React, { useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { Users, Calendar, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import TeamLayout from './TeamLayout';
import TeamCalendar from './TeamCalendar';

interface Team {
  id: string;
  name: string;
  slug: string;
  school: string;
  division: 'B' | 'C';
  description?: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: 'captain' | 'member';
  }>;
}

interface TeamsLandingProps {
  onCreateTeam: () => void;
  onJoinTeam: () => void;
  userTeams: Team[];
  onTeamSelect: (team: Team) => void;
  isPreviewMode?: boolean;
}

export default function TeamsLanding({ onCreateTeam, onJoinTeam, userTeams, onTeamSelect: _onTeamSelect, isPreviewMode = false }: TeamsLandingProps) {
  const { darkMode } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'upcoming' | 'settings'>('home');
  
  // Check if user is a captain of any team
  const isCaptain = userTeams.some(team => 
    team.members.some(member => member.role === 'captain')
  );

  const handleTabChange = (tab: 'home' | 'upcoming' | 'settings') => {
    if (tab === 'upcoming') {
      router.push('/teams/calendar');
    } else {
      setActiveTab(tab);
    }
  };

  const handleNavigateToMainDashboard = () => {
    // Already on the main dashboard, just ensure we're on home tab
    setActiveTab('home');
  };

  // Convert TeamsLanding Team type to Sidebar Team type
  const sidebarTeams = userTeams.map(team => ({
    id: team.id,
    name: team.name,
    slug: team.slug,
    school: team.school,
    division: team.division
  }));

  // Handle team selection from sidebar
  const handleSidebarTeamSelect = (sidebarTeam: { id: string; name: string; slug: string; school: string; division: 'B' | 'C' }) => {
    // Find the full team object and call the original handler
    const fullTeam = userTeams.find(team => team.id === sidebarTeam.id);
    if (fullTeam) {
      // Navigate directly to team page, clearing any query parameters
      router.push(`/teams/${fullTeam.slug}`);
    }
  };

  return (
    <TeamLayout
      activeTab={activeTab}
      onTabChangeAction={handleTabChange}
      userTeams={sidebarTeams}
      onTeamSelect={handleSidebarTeamSelect}
      onNavigateToMainDashboard={handleNavigateToMainDashboard}
    >
          {activeTab === 'home' && (
            <div className="p-8">
          <div className="max-w-4xl mx-auto">
            {isPreviewMode ? (
              /* Preview Mode Content */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-center py-12">
                  <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <Users className={`w-12 h-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Team Management Made Simple
                  </h2>
                  <p className={`text-lg mb-8 max-w-2xl mx-auto ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Create teams, manage rosters, track assignments, and collaborate with your Science Olympiad team. <span className="text-blue-500 font-bold">Sign in to get started </span>with your team management journey.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto ${darkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
                        <Users className={`w-6 h-6 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                      </div>
                      <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Team Creation
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Create teams with custom divisions and invite members with unique codes.
                      </p>
                    </div>
                    
                    <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto ${darkMode ? 'bg-green-900' : 'bg-green-100'}`}>
                        <Calendar className={`w-6 h-6 ${darkMode ? 'text-green-300' : 'text-green-600'}`} />
                      </div>
                      <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Event Management
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Organize Science Olympiad events and track team member assignments.
                      </p>
                    </div>
                    
                    <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto ${darkMode ? 'bg-purple-900' : 'bg-purple-100'}`}>
                        <Settings className={`w-6 h-6 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
                      </div>
                      <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Collaboration
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Share materials, coordinate practices, and manage team communications.
                      </p>
                    </div>
                  </div>
                  
                </div>
              </motion.div>
            ) : userTeams.length > 0 ? (
              /* Teams List */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Your Teams
                  </h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={onCreateTeam}
                      className={`px-4 py-2 border rounded-lg transition-colors font-medium ${
                        darkMode 
                          ? 'border-blue-400 text-blue-400 hover:bg-blue-900' 
                          : 'border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white'
                      }`}
                    >
                      Create team
                    </button>
                    <button
                      onClick={onJoinTeam}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      Join team
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userTeams.map((team) => (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => router.push(`/teams/${team.slug}`)}
                      className={`p-6 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {team.school}
                            </h3>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Division {team.division}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Members
                          </span>
                          <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {team.members.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Captains
                          </span>
                          <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {team.members.filter(m => m.role === 'captain').length}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Empty State */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                {/* Illustration */}
                <div className="mb-8">
                  <div className="relative w-96 h-64 mx-auto">
                    {/* Window frame */}
                    <div className={`absolute inset-0 rounded-lg shadow-lg border-2 ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-600' 
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="p-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 h-32">
                          <div className={`rounded flex items-center justify-center ${
                            darkMode 
                              ? 'bg-blue-900' 
                              : 'bg-blue-100'
                          }`}>
                            <div className={`w-8 h-8 rounded ${
                              darkMode 
                                ? 'bg-blue-600' 
                                : 'bg-blue-300'
                            }`}></div>
                          </div>
                          <div className={`rounded flex items-center justify-center ${
                            darkMode 
                              ? 'bg-green-900' 
                              : 'bg-green-100'
                          }`}>
                            <div className={`w-6 h-6 rounded-full ${
                              darkMode 
                                ? 'bg-green-600' 
                                : 'bg-green-300'
                            }`}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Decorative elements */}
                    <div className={`absolute -left-4 top-8 w-8 h-8 rounded-full flex items-center justify-center ${
                      darkMode 
                        ? 'bg-pink-600' 
                        : 'bg-pink-300'
                    }`}>
                      <div className={`w-4 h-4 rounded-full ${
                        darkMode 
                          ? 'bg-pink-400' 
                          : 'bg-pink-100'
                      }`}></div>
                    </div>
                    <div className={`absolute -right-4 top-16 w-6 h-6 rounded flex items-center justify-center ${
                      darkMode 
                        ? 'bg-yellow-600' 
                        : 'bg-yellow-300'
                    }`}>
                      <div className={`w-3 h-3 rounded ${
                        darkMode 
                          ? 'bg-yellow-400' 
                          : 'bg-yellow-100'
                      }`}></div>
                    </div>
                    <div className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-12 h-8 rounded flex items-center justify-center ${
                      darkMode 
                        ? 'bg-blue-700' 
                        : 'bg-blue-200'
                    }`}>
                      <div className={`w-8 h-4 rounded ${
                        darkMode 
                          ? 'bg-blue-500' 
                          : 'bg-blue-100'
                      }`}></div>
                    </div>
                  </div>
                </div>

                {/* Call to action */}
                <h2 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Add a team to get started
                </h2>

                {/* Action buttons */}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={onCreateTeam}
                    className={`px-6 py-3 border rounded-lg transition-colors font-medium shadow-sm ${
                      darkMode 
                        ? 'border-blue-400 text-blue-400 hover:bg-blue-900' 
                        : 'border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    Create team
                  </button>
                  <button
                    onClick={onJoinTeam}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
                  >
                    Join team
                  </button>
                </div>

                {/* Help text */}
                <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
                  Don&apos;t see your teams? Try another account.
                </div>
              </motion.div>
            )}
          </div>
            </div>
          )}

          {activeTab === 'upcoming' && (
            <TeamCalendar 
              teamId={userTeams[0]?.id} 
              isCaptain={isCaptain} 
              teamSlug={userTeams[0]?.slug}
            />
          )}


          {activeTab === 'settings' && (
            <div className="p-8">
              <div className="max-w-4xl mx-auto">
                <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Settings
                </h2>
                <div className={`p-8 text-center rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <Settings className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Settings
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Team and account settings will appear here.
                  </p>
                </div>
              </div>
            </div>
          )}
    </TeamLayout>
  );
}
