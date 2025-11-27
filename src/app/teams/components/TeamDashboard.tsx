"use client";

import { useAuth } from "@/app/contexts/authContext";
import { useTheme } from "@/app/contexts/themeContext";
import { useTeamStore } from "@/app/hooks/useTeamStore";
import { useRouter } from "next/navigation";
import { Suspense, lazy, useEffect, useState } from "react";
import BannerInvite from "./BannerInvite";
import TabNavigation from "./TabNavigation";
import { ArchiveTeamModal } from "./TeamDashboard/components/ArchiveTeamModal";
import { DeleteSubteamModal } from "./TeamDashboard/components/DeleteSubteamModal";
import { ExitTeamModal } from "./TeamDashboard/components/ExitTeamModal";
import { HomeContent } from "./TeamDashboard/components/HomeContent";
import { TeamHeaderBanner } from "./TeamDashboard/components/TeamHeaderBanner";
import { useSubteamHandlers } from "./TeamDashboard/hooks/useSubteamHandlers";
import { useTeamActions } from "./TeamDashboard/hooks/useTeamActions";
import TeamDataLoader from "./TeamDataLoader";
import TeamLayout from "./TeamLayout";

const TeamCalendar = lazy(() => import("./TeamCalendar"));
const AssignmentCreator = lazy(() => import("./EnhancedAssignmentCreator"));

interface Team {
  id: string;
  name: string;
  slug: string;
  school: string;
  division: "B" | "C";
}

interface TeamDashboardProps {
  team: {
    id: string;
    school: string;
    division: "B" | "C";
    slug: string;
  };
  isCaptain: boolean;
  onBack: () => void;
  activeTab?: "roster" | "stream" | "assignments" | "people";
}

export default function TeamDashboard({
  team,
  isCaptain,
  onBack: _onBack,
  activeTab: initialActiveTab = "roster",
}: TeamDashboardProps) {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  // User teams are now loaded by the enhanced hook
  const router = useRouter();

  // Subteam state
  const [activeSubteamId, setActiveSubteamId] = useState<string | null>(null);
  const [_loadingSubteams, setLoadingSubteams] = useState(true);
  const [showBannerInvite, setShowBannerInvite] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Sidebar state
  const [sidebarTab, setSidebarTab] = useState<"home" | "upcoming" | "settings">("home");

  // Home tab state
  const [activeTab] = useState<"roster" | "stream" | "assignments" | "people">(initialActiveTab);

  // Modal states
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const [showDeleteSubteamModal, setShowDeleteSubteamModal] = useState(false);
  const [subteamToDelete, setSubteamToDelete] = useState<{ id: string; name: string } | null>(null);

  // Use team store
  const { userTeams, getSubteams } = useTeamStore();

  // Use custom hooks for handlers
  const { handleCreateSubteam, handleEditSubteam, handleDeleteSubteam } = useSubteamHandlers(
    team.slug
  );
  const { handleExitTeam, handleArchiveTeam } = useTeamActions(team.slug);

  // Set active subteam when subteams are available
  useEffect(() => {
    const subteamsData = getSubteams(team.slug);

    if (subteamsData && subteamsData.length > 0) {
      if (!activeSubteamId) {
        const firstSubteam = subteamsData[0];
        if (firstSubteam) {
          setActiveSubteamId(firstSubteam.id);
        }
      }
      setLoadingSubteams(false);
    } else if (subteamsData && subteamsData.length === 0) {
      setLoadingSubteams(false);
    }
  }, [team.slug, getSubteams, activeSubteamId]);

  // REMOVED: Additional effect to ensure subteams are loaded
  // Now using multiplexed endpoint in TeamDataLoader which loads subteams
  // along with all other team data in a single request
  // useEffect(() => {
  //   if (!user?.id) {
  //     console.log('🔍 [TeamDashboard] User not authenticated, skipping subteam load');
  //     return;
  //   }
  //
  //   const loadSubteamsData = async () => {
  //     try {
  //       console.log('🔍 [TeamDashboard] Loading subteams for authenticated user');
  //       await loadSubteams(team.slug);
  //     } catch (error) {
  //       console.error('Failed to load subteams:', error);
  //     }
  //   };
  //
  //   loadSubteamsData();
  // }, [team.slug, loadSubteams, user?.id]);

  // Show loading state if user is not authenticated
  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading authentication...</div>
      </div>
    );
  }

  // Use tRPC for data fetching with automatic batching
  // Note: We're using the team store for subteams data instead of direct tRPC
  // trpc.teams.getSubteams.useQuery(
  //   { teamSlug: team.slug },
  //   {
  //     enabled: !!team.slug,
  //     staleTime: 10 * 60 * 1000,
  //   }
  // );

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

  const handleAssignmentCreated = (_assignment: { id: string; title: string }) => {
    setShowAssignmentCreator(false);
  };

  const handleCancelAssignment = () => {
    setShowAssignmentCreator(false);
  };

  const handleExitTeamClick = () => {
    setShowExitModal(true);
  };

  const confirmExitTeam = async () => {
    await handleExitTeam();
    setShowExitModal(false);
  };

  const handleArchiveTeamClick = () => {
    setShowArchiveModal(true);
  };

  const confirmArchiveTeam = async () => {
    await handleArchiveTeam();
    setShowArchiveModal(false);
  };

  const handleCreateSubteamWrapper = async (name: string) => {
    await handleCreateSubteam(name, setActiveSubteamId);
  };

  const handleDeleteSubteamClick = (subteamId: string, subteamName: string) => {
    setSubteamToDelete({ id: subteamId, name: subteamName });
    setShowDeleteSubteamModal(true);
  };

  const confirmDeleteSubteam = async () => {
    if (subteamToDelete) {
      await handleDeleteSubteam(subteamToDelete.id, activeSubteamId, setActiveSubteamId);
      setShowDeleteSubteamModal(false);
      setSubteamToDelete(null);
    }
  };

  const handleTabChange = (tab: "home" | "upcoming" | "settings") => {
    if (tab === "upcoming") {
      router.push("/teams/calendar");
    } else {
      setSidebarTab(tab);
    }
  };

  const handleNavigateToMainDashboard = () => {
    // Navigate to the teams overview page with a parameter to bypass auto-redirect
    router.push("/teams?view=all");
  };

  const handleTeamSelect = (selectedTeam: Team) => {
    // Navigate to team without any query parameters
    router.push(`/teams/${selectedTeam.slug}`);
  };

  const renderSidebarContent = () => {
    switch (sidebarTab) {
      case "upcoming":
        return <TeamCalendar teamId={team.id} isCaptain={isCaptain} teamSlug={team.slug} />;
      case "settings":
        return (
          <div className="p-6">
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
              Team Settings
            </h2>
            <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Team settings will be available here.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <TeamDataLoader teamSlug={team.slug}>
      <TeamLayout
        activeTab={sidebarTab}
        onTabChangeAction={handleTabChange}
        userTeams={userTeams}
        currentTeamSlug={team.slug}
        onTeamSelect={handleTeamSelect}
        onNavigateToMainDashboard={handleNavigateToMainDashboard}
      >
        <TeamHeaderBanner
          team={team}
          isCaptain={isCaptain}
          darkMode={darkMode}
          onInvitePerson={handleInvitePerson}
          onExitTeam={handleExitTeamClick}
          onArchiveTeam={handleArchiveTeamClick}
        />

        {/* Tab Content */}
        {sidebarTab === "home" && (
          <>
            <TabNavigation teamSlug={team.slug} />
            <HomeContent
              activeTab={activeTab}
              team={team}
              isCaptain={isCaptain}
              activeSubteamId={activeSubteamId}
              subteams={getSubteams(team.slug)}
              onInvitePerson={handleInvitePerson}
              onCreateAssignment={handleCreateAssignment}
              onCreateSubteam={handleCreateSubteamWrapper}
              onEditSubteam={handleEditSubteam}
              onDeleteSubteam={handleDeleteSubteamClick}
              onSubteamChange={setActiveSubteamId}
              getSubteams={getSubteams}
            />
          </>
        )}

        {sidebarTab !== "home" && renderSidebarContent()}
      </TeamLayout>

      {/* Banner Invite */}
      <BannerInvite
        isOpen={showBannerInvite}
        onClose={() => setShowBannerInvite(false)}
        teamSlug={team.slug}
      />

      <ExitTeamModal
        isOpen={showExitModal}
        darkMode={darkMode}
        onConfirm={confirmExitTeam}
        onCancel={() => setShowExitModal(false)}
      />

      <ArchiveTeamModal
        isOpen={showArchiveModal}
        darkMode={darkMode}
        onConfirm={confirmArchiveTeam}
        onCancel={() => setShowArchiveModal(false)}
      />

      {/* Assignment Creator Modal */}
      {showAssignmentCreator && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Loading assignment creator...
                </p>
              </div>
            </div>
          }
        >
          <AssignmentCreator
            teamId={team.slug}
            subteamId={activeSubteamId || undefined}
            onAssignmentCreated={handleAssignmentCreated}
            onCancel={handleCancelAssignment}
            darkMode={darkMode}
          />
        </Suspense>
      )}

      <DeleteSubteamModal
        isOpen={showDeleteSubteamModal}
        darkMode={darkMode}
        subteamName={subteamToDelete?.name || null}
        onConfirm={confirmDeleteSubteam}
        onCancel={() => {
          setShowDeleteSubteamModal(false);
          setSubteamToDelete(null);
        }}
      />
    </TeamDataLoader>
  );
}
