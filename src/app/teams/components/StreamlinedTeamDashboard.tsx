'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { UserPlus, LogOut, Archive, RefreshCw } from 'lucide-react';
import TeamLayout from './TeamLayout';
import TabNavigation from './TabNavigation';
import BannerInvite from './BannerInvite';
import { useStreamlinedTeamData, useUserTeams } from '@/app/hooks/useStreamlinedTeamData';

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

interface StreamlinedTeamDashboardProps {
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

export default function StreamlinedTeamDashboard({ 
  team, 
  isCaptain, 
  onBack: _onBack,
  activeTab: initialActiveTab = 'roster'
}: StreamlinedTeamDashboardProps) {
  const { darkMode } = useTheme();
  const router = useRouter();
  
  // State
  const [activeSubteamId, setActiveSubteamId] = useState<string | null>(null);
  const [showBannerInvite, setShowBannerInvite] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'home' | 'upcoming' | 'settings'>('home');
  const [activeTab] = useState<'roster' | 'stream' | 'assignments' | 'people'>(initialActiveTab);
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const [showDeleteSubteamModal, setShowDeleteSubteamModal] = useState(false);
  const [subteamToDelete, setSubteamToDelete] = useState<{ id: string; name: string } | null>(null);

  // Use streamlined team data hook
  const { 
    data: teamData, 
    loading, 
    error, 
    refetch, 
    updateData 
  } = useStreamlinedTeamData({
    teamSlug: team.slug,
    includeSubteams: true,
    includeMembers: true,
    includeRoster: activeTab === 'roster',
    includeStream: activeTab === 'stream',
    includeAssignments: activeTab === 'assignments',
    subteamId: activeSubteamId || undefined,
    autoRefresh: true,
    refreshInterval: 2 * 60 * 1000 // 2 minutes
  });

  // Use user teams hook
  const { teams: userTeams } = useUserTeams();

  // Set active subteam when subteams are loaded
  useEffect(() => {
    if (teamData?.subteams && teamData.subteams.length > 0 && !activeSubteamId) {
      setActiveSubteamId(teamData.subteams[0].id);
    }
  }, [teamData?.subteams, activeSubteamId]);

  // Handle subteam creation
  const handleCreateSubteam = async (name: string) => {
    try {
      let subteamName = name;
      if (!name.trim()) {
        const subteamsData = teamData?.subteams || [];
        const nextLetter = String.fromCharCode(65 + subteamsData.length);
        subteamName = `Team ${nextLetter}`;
      }
      
      const response = await fetch(`/api/teams/${team.slug}/subteams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subteamName })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Subteam "${subteamName}" created successfully!`);
        
        // Optimistically update the data
        updateData(prevData => ({
          ...prevData,
          subteams: [
            ...(prevData?.subteams || []),
            {
              id: data.id,
              groupId: prevData?.team.id || '',
              teamId: data.team_id,
              description: data.description,
              captainCode: '',
              userCode: '',
              createdBy: '',
              createdAt: new Date(data.created_at),
              updatedAt: new Date(data.created_at),
              settings: {},
              status: 'active' as const
            }
          ]
        }));
        
        setActiveSubteamId(data.id);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create subteam');
      }
    } catch (error) {
      console.error('Failed to create subteam:', error);
      toast.error('Failed to create subteam. Please try again.');
    }
  };

  // Handle subteam editing
  const handleEditSubteam = async (subteamId: string, newName: string) => {
    try {
      // Optimistically update the UI
      updateData(prevData => ({
        ...prevData,
        subteams: (prevData?.subteams || []).map(subteam => 
          subteam.id === subteamId 
            ? { ...subteam, description: newName }
            : subteam
        )
      }));
      
      const response = await fetch(`/api/teams/${team.slug}/subteams/${subteamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      
      if (response.ok) {
        toast.success(`Subteam renamed to "${newName}" successfully!`);
        await refetch(); // Refresh data from server
      } else {
        // Revert optimistic update on error
        await refetch();
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update subteam name');
      }
    } catch (error) {
      console.error('Failed to edit subteam:', error);
      await refetch(); // Revert optimistic update
      toast.error('Failed to update subteam name. Please try again.');
    }
  };

  // Handle subteam deletion
  const handleDeleteSubteam = async (subteamId: string) => {
    try {
      const response = await fetch(`/api/teams/${team.slug}/subteams/${subteamId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Optimistically remove the subteam
        updateData(prevData => ({
          ...prevData,
          subteams: (prevData?.subteams || []).filter(subteam => subteam.id !== subteamId)
        }));
        
        // If the deleted subteam was active, switch to the first remaining subteam
        if (activeSubteamId === subteamId) {
          const remainingSubteams = teamData?.subteams?.filter(s => s.id !== subteamId) || [];
          if (remainingSubteams.length > 0) {
            setActiveSubteamId(remainingSubteams[0].id);
          } else {
            setActiveSubteamId(null);
          }
        }
        
        toast.success('Subteam deleted successfully!');
        await refetch(); // Refresh data from server
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete subteam');
      }
    } catch (error) {
      console.error('Failed to delete subteam:', error);
      toast.error('Failed to delete subteam. Please try again.');
    }
  };

  // Handle team exit
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

  // Handle team archiving
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

  // Handle tab changes
  const handleTabChange = (tab: 'home' | 'upcoming' | 'settings') => {
    if (tab === 'upcoming') {
      router.push('/teams/calendar');
    } else {
      setSidebarTab(tab);
    }
  };

  // Handle team selection
  const handleTeamSelect = (selectedTeam: Team) => {
    router.push(`/teams/${selectedTeam.slug}`);
  };

  // Handle navigation to main dashboard
  const handleNavigateToMainDashboard = () => {
    router.push('/teams?view=all');
  };

  // Handle refresh
  const handleRefresh = async () => {
    await refetch();
    toast.success('Team data refreshed');
  };

  // Render sidebar content
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

  // Render home content
  const renderHomeContent = () => {
    const LoadingFallback = () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );

    if (loading) {
      return <LoadingFallback />;
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'roster':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <RosterTab
              team={team}
              isCaptain={isCaptain}
              onInvitePerson={() => setShowBannerInvite(true)}
              activeSubteamId={activeSubteamId}
              subteams={teamData?.subteams || []}
              onSubteamChange={setActiveSubteamId}
              onCreateSubteam={handleCreateSubteam}
              onEditSubteam={handleEditSubteam}
              onDeleteSubteam={(id, name) => {
                setSubteamToDelete({ id, name });
                setShowDeleteSubteamModal(true);
              }}
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
              onCreateAssignment={() => setShowAssignmentCreator(true)}
            />
          </Suspense>
        );
      case 'people':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PeopleTab
              team={team}
              isCaptain={isCaptain}
              onInvitePerson={() => setShowBannerInvite(true)}
              activeSubteamId={activeSubteamId}
              subteams={teamData?.subteams || []}
              onSubteamChange={setActiveSubteamId}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <TeamLayout
        activeTab={sidebarTab}
        onTabChangeAction={handleTabChange}
        userTeams={userTeams}
        currentTeamSlug={team.slug}
        onTeamSelect={handleTeamSelect}
        onNavigateToMainDashboard={handleNavigateToMainDashboard}
      >
        {/* Team Header Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">{team.school}</h1>
                <p className="text-purple-100 mt-2">Division {team.division}</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleRefresh}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group shadow-lg ${
                    darkMode 
                      ? 'bg-gray-700 bg-opacity-90 hover:bg-opacity-100' 
                      : 'bg-white bg-opacity-90 hover:bg-opacity-100'
                  }`}
                  title="Refresh Data"
                >
                  <RefreshCw className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
                </button>
                {isCaptain && (
                  <button
                    onClick={() => setShowBannerInvite(true)}
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
      </TeamLayout>

      {/* Modals */}
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
                onClick={() => setShowExitModal(false)}
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
                onClick={() => setShowArchiveModal(false)}
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
            onAssignmentCreated={() => setShowAssignmentCreator(false)}
            onCancel={() => setShowAssignmentCreator(false)}
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
                onClick={() => setShowDeleteSubteamModal(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteSubteam(subteamToDelete.id);
                  setShowDeleteSubteamModal(false);
                  setSubteamToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
