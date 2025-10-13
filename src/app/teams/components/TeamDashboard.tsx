'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { X, Menu, UserPlus, LogOut, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import Sidebar from './Sidebar';
import TabNavigation from './TabNavigation';
import BannerInvite from './BannerInvite';
import AuthButton from '@/app/components/AuthButton';
import { useTeamStore } from '@/app/hooks/useTeamStore';

// Lazy load heavy components
const RosterTab = lazy(() => import('./RosterTab'));
const StreamTab = lazy(() => import('./StreamTab'));
const AssignmentsTab = lazy(() => import('./AssignmentsTab'));
const PeopleTab = lazy(() => import('./PeopleTab'));
const TeamCalendar = lazy(() => import('./TeamCalendar'));
const AssignmentCreator = lazy(() => import('./EnhancedAssignmentCreator'));

interface Team {
  id: string;
  name: string;
  slug: string;
  school: string;
  division: 'B' | 'C';
}

interface TeamDashboardProps {
  team: {
    id: string;
    school: string;
    division: 'B' | 'C';
    slug: string;
  };
  isCaptain: boolean;
  onBack: () => void;
  activeTab?: 'roster' | 'stream' | 'assignments' | 'people';
}

export default function TeamDashboard({ 
  team, 
  isCaptain, 
  onBack: _onBack,
  activeTab: initialActiveTab = 'roster'
}: TeamDashboardProps) {
  const { darkMode } = useTheme();
  // User teams are now loaded by the enhanced hook
  const router = useRouter();
  
  // Subteam state
  const [activeSubteamId, setActiveSubteamId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingSubteams, setLoadingSubteams] = useState(true);
  const [showBannerInvite, setShowBannerInvite] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  
  // Sidebar state
  const [sidebarTab, setSidebarTab] = useState<'home' | 'upcoming' | 'settings'>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Home tab state
  const [activeTab] = useState<'roster' | 'stream' | 'assignments' | 'people'>(initialActiveTab);
  
  // Modal states
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const [showDeleteSubteamModal, setShowDeleteSubteamModal] = useState(false);
  const [subteamToDelete, setSubteamToDelete] = useState<{ id: string; name: string } | null>(null);

  // Use team store
  const { 
    userTeams, 
    getSubteams, 
    loadSubteams,
    addSubteam,
    updateSubteam,
    deleteSubteam
  } = useTeamStore();

  // Mock data for demonstration
  // const [_posts] = useState([
  //   {
  //     id: '1',
  //     author: 'Team Captain',
  //     content: 'Welcome to the team! Let\'s work hard and have fun this season.',
  //     timestamp: '2 hours ago',
  //     type: 'announcement' as const,
  //   },
  // ]);

  // User teams are now loaded by the enhanced hook

  const handleInvitePerson = () => {
    setShowBannerInvite(true);
  };

  const handleCreateAssignment = () => {
    setShowAssignmentCreator(true);
  };

  const handleAssignmentCreated = (assignment: any) => {
    setShowAssignmentCreator(false);
    // You could add a toast notification here
    console.log('Assignment created:', assignment);
  };

  const handleCancelAssignment = () => {
    setShowAssignmentCreator(false);
  };


  const handleExitTeam = () => {
    setShowExitModal(true);
  };

  const confirmExitTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${team.slug}/exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast.success('Successfully exited team');
        // Redirect to teams page after successful exit
        window.location.href = '/teams';
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to exit team');
      }
    } catch (error) {
      console.error('Failed to exit team:', error);
      toast.error('Failed to exit team');
    } finally {
      setShowExitModal(false);
    }
  };

  const cancelExitTeam = () => {
    setShowExitModal(false);
  };

  const handleArchiveTeam = () => {
    setShowArchiveModal(true);
  };

  const confirmArchiveTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${team.slug}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast.success('Team archived successfully');
        // Redirect to teams page after successful archive
        window.location.href = '/teams';
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to archive team');
      }
    } catch (error) {
      console.error('Failed to archive team:', error);
      toast.error('Failed to archive team');
    } finally {
      setShowArchiveModal(false);
    }
  };

  const cancelArchiveTeam = () => {
    setShowArchiveModal(false);
  };


  // Load subteams using team store
  useEffect(() => {
    const loadSubteamsData = async () => {
      try {
        setLoadingSubteams(true);
        // Load subteams immediately to avoid delays
        await loadSubteams(team.slug);
      } catch (error) {
        console.error('Failed to load subteams:', error);
      } finally {
        setLoadingSubteams(false);
      }
    };

    loadSubteamsData();
  }, [team.slug, loadSubteams]);

  // Set active subteam when subteams are loaded
  useEffect(() => {
    const subteamsData = getSubteams(team.slug);
    if (subteamsData && subteamsData.length > 0 && !activeSubteamId) {
      setActiveSubteamId(subteamsData[0].id);
    }
  }, [team.slug, getSubteams, activeSubteamId]);

  const handleCreateSubteam = async (name: string) => {
    try {
      // Generate default name if none provided
      let subteamName = name;
      if (!name.trim()) {
        const subteamsData = getSubteams(team.slug);
        const nextLetter = String.fromCharCode(65 + subteamsData.length); // A, B, C, etc.
        subteamName = `Team ${nextLetter}`;
      }
      
      const response = await fetch(`/api/teams/${team.slug}/subteams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subteamName })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Create subteam object for optimistic update
        const newSubteam = {
          id: data.id,
          name: data.name,
          team_id: data.team_id,
          description: data.name,
          created_at: new Date().toISOString()
        };
        
        // Optimistically add the subteam to the store
        addSubteam(team.slug, newSubteam);
        
        // Set the new subteam as active
        setActiveSubteamId(data.id);
        
        // Show success toast
        toast.success(`Subteam "${subteamName}" created successfully!`);
        
        // Reload subteams to ensure we have the latest data from server
        await loadSubteams(team.slug);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create subteam');
      }
    } catch (error) {
      console.error('Failed to create subteam:', error);
      toast.error('Failed to create subteam. Please try again.');
    }
  };

  const handleEditSubteam = async (subteamId: string, newName: string) => {
    try {
      // Optimistically update the UI immediately
      updateSubteam(team.slug, subteamId, { name: newName });
      
      const response = await fetch(`/api/teams/${team.slug}/subteams/${subteamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      
      if (response.ok) {
        // Show success toast
        toast.success(`Subteam renamed to "${newName}" successfully!`);
        
        // Reload subteams to ensure we have the latest data from server
        await loadSubteams(team.slug);
      } else {
        // Revert optimistic update on error
        await loadSubteams(team.slug);
        
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update subteam name');
      }
    } catch (error) {
      console.error('Failed to edit subteam:', error);
      
      // Revert optimistic update on error
      await loadSubteams(team.slug);
      toast.error('Failed to update subteam name. Please try again.');
    }
  };

  const handleDeleteSubteam = async (subteamId: string) => {
    try {
      const response = await fetch(`/api/teams/${team.slug}/subteams/${subteamId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Optimistically remove the subteam from the store
        deleteSubteam(team.slug, subteamId);
        
        // If the deleted subteam was active, switch to the first remaining subteam
        if (activeSubteamId === subteamId) {
          const remainingSubteams = getSubteams(team.slug);
          if (remainingSubteams.length > 0) {
            setActiveSubteamId(remainingSubteams[0].id);
          } else {
            setActiveSubteamId(null);
          }
        }
        
        // Show success toast
        toast.success('Subteam deleted successfully!');
        
        // Reload subteams to ensure we have the latest data from server
        await loadSubteams(team.slug);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete subteam');
      }
    } catch (error) {
      console.error('Failed to delete subteam:', error);
      toast.error('Failed to delete subteam. Please try again.');
    }
  };

  const confirmDeleteSubteam = () => {
    if (subteamToDelete) {
      handleDeleteSubteam(subteamToDelete.id);
      setShowDeleteSubteamModal(false);
      setSubteamToDelete(null);
    }
  };

  const cancelDeleteSubteam = () => {
    setShowDeleteSubteamModal(false);
    setSubteamToDelete(null);
  };

  const handleDeleteSubteamClick = (subteamId: string, subteamName: string) => {
    setSubteamToDelete({ id: subteamId, name: subteamName });
    setShowDeleteSubteamModal(true);
  };

  const handleTabChange = (tab: 'home' | 'upcoming' | 'settings') => {
    if (tab === 'upcoming') {
      router.push('/teams/calendar');
    } else {
      setSidebarTab(tab);
    }
  };

  const handleNavigateToMainDashboard = () => {
    // Navigate to the teams overview page with a parameter to bypass auto-redirect
    router.push('/teams?view=all');
  };

  const handleTeamSelect = (selectedTeam: Team) => {
    // Navigate to team without any query parameters
    router.push(`/teams/${selectedTeam.slug}`);
  };


  const renderSidebarContent = () => {
    switch (sidebarTab) {
      case 'upcoming':
        return (
          <TeamCalendar 
            teamId={team.id}
            isCaptain={isCaptain}
            teamSlug={team.slug}
          />
        );
      case 'settings':
        return (
          <div className="p-6">
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Team Settings
            </h2>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Team settings will be available here.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderHomeContent = () => {
    const LoadingFallback = () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );

    switch (activeTab) {
      case 'roster':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <RosterTab
              team={team}
              isCaptain={isCaptain}
              onInvitePerson={handleInvitePerson}
              activeSubteamId={activeSubteamId}
              subteams={getSubteams(team.slug)}
              onSubteamChange={setActiveSubteamId}
              onCreateSubteam={handleCreateSubteam}
              onEditSubteam={handleEditSubteam}
              onDeleteSubteam={handleDeleteSubteamClick}
            />
          </Suspense>
        );
      case 'stream':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <StreamTab 
              team={team} 
              isCaptain={isCaptain} 
              activeSubteamId={activeSubteamId} 
            />
          </Suspense>
        );
      case 'assignments':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AssignmentsTab
              teamId={team.slug}
              isCaptain={isCaptain}
              onCreateAssignment={handleCreateAssignment}
            />
          </Suspense>
        );
      case 'people':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PeopleTab
              team={team}
              isCaptain={isCaptain}
              onInvitePerson={handleInvitePerson}
              activeSubteamId={activeSubteamId}
              subteams={getSubteams(team.slug)}
              onSubteamChange={setActiveSubteamId}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Fixed Top Navigation Bar */}
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

      <div className="flex h-screen pt-16">
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
                className={`w-64 h-full ${darkMode ? 'bg-gray-900' : 'bg-white'} shadow-xl overflow-hidden`}
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
                    activeTab={sidebarTab}
                    onTabChange={(tab) => {
                      handleTabChange(tab);
                      setIsMobileMenuOpen(false);
                    }}
                    userTeams={userTeams}
                    currentTeamSlug={team.slug}
                    onTeamSelect={handleTeamSelect}
                    onNavigateToMainDashboard={handleNavigateToMainDashboard}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed Desktop Sidebar */}
        <div className="hidden md:block fixed left-0 top-16 bottom-0 z-30">
          <Sidebar
            activeTab={sidebarTab}
            onTabChange={handleTabChange}
            userTeams={userTeams}
            currentTeamSlug={team.slug}
            onTeamSelect={handleTeamSelect}
            onNavigateToMainDashboard={handleNavigateToMainDashboard}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full md:ml-64 pb-16 md:pb-0 overflow-y-auto">
          {/* Team Header Banner - Scrollable */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{team.school}</h1>
                  <p className="text-purple-100 mt-2">Division {team.division}</p>
                </div>
                <div className="flex items-center space-x-4">
                  {isCaptain && (
                    <button
                      onClick={handleInvitePerson}
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
                    onClick={handleExitTeam}
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
                      onClick={handleArchiveTeam}
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

          {/* Tab Content */}
          {sidebarTab === 'home' && (
            <>
              <TabNavigation teamSlug={team.slug} />
              {renderHomeContent()}
            </>
          )}
          
          {sidebarTab !== 'home' && renderSidebarContent()}
        </div>
      </div>


      {/* Banner Invite */}
      <BannerInvite
        isOpen={showBannerInvite}
        onClose={() => setShowBannerInvite(false)}
        teamSlug={team.slug}
      />

      {/* Exit Team Modal */}
      {showExitModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>Exit Team</h3>
            <p className={`mb-6 ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>Are you sure you want to exit this team?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelExitTeam}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-gray-300 border-gray-600 hover:bg-gray-700' 
                    : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmExitTeam}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Exit Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Team Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>Archive Team</h3>
            <p className={`mb-6 ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>Are you sure you want to archive this team? This action will move the team to the archived section and can be undone later.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelArchiveTeam}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-gray-300 border-gray-600 hover:bg-gray-700' 
                    : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmArchiveTeam}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Archive Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Creator Modal */}
      {showAssignmentCreator && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Loading assignment creator...</p>
            </div>
          </div>
        }>
          <AssignmentCreator
            teamId={team.slug}
            subteamId={activeSubteamId || undefined}
            onAssignmentCreated={handleAssignmentCreated}
            onCancel={handleCancelAssignment}
            darkMode={darkMode}
          />
        </Suspense>
      )}

      {/* Delete Subteam Confirmation Modal */}
      {showDeleteSubteamModal && subteamToDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>Delete Subteam</h3>
            <p className={`mb-6 ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Are you sure you want to delete the subteam &ldquo;{subteamToDelete.name}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteSubteam}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSubteam}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}