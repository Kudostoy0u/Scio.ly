"use client";
import { Suspense, lazy } from "react";

const RosterTab = lazy(() => import("../../RosterTab"));
const StreamTab = lazy(() => import("../../StreamTab"));
const AssignmentsTab = lazy(() => import("../../AssignmentsTab"));
const PeopleTab = lazy(() => import("../../PeopleTab"));

interface HomeContentProps {
  activeTab: "roster" | "stream" | "assignments" | "people";
  team: {
    id: string;
    school: string;
    division: "B" | "C";
    slug: string;
  };
  isCaptain: boolean;
  activeSubteamId: string | null;
  subteams: Array<{
    id: string;
    name: string;
    team_id: string;
    description: string;
    created_at: string;
  }>;
  onInvitePerson: () => void;
  onCreateAssignment: () => void;
  onCreateSubteam: (name: string) => void;
  onEditSubteam: (subteamId: string, newName: string) => void;
  onDeleteSubteam: (subteamId: string, subteamName: string) => void;
  onSubteamChange: (subteamId: string) => void;
  getSubteams: (slug: string) => Array<{
    id: string;
    name: string;
    team_id: string;
    description: string;
    created_at: string;
  }>;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      <span className="ml-2 text-gray-600">Loading...</span>
    </div>
  );
}

export function HomeContent({
  activeTab,
  team,
  isCaptain,
  activeSubteamId,
  subteams,
  onInvitePerson,
  onCreateAssignment,
  onCreateSubteam,
  onEditSubteam,
  onDeleteSubteam,
  onSubteamChange,
  getSubteams,
}: HomeContentProps) {
  switch (activeTab) {
    case "roster":
      return (
        <Suspense fallback={<LoadingFallback />}>
          <RosterTab
            team={team}
            isCaptain={isCaptain}
            onInvitePerson={onInvitePerson}
            activeSubteamId={activeSubteamId}
            subteams={subteams}
            onSubteamChange={onSubteamChange}
            onCreateSubteam={onCreateSubteam}
            onEditSubteam={onEditSubteam}
            onDeleteSubteam={onDeleteSubteam}
          />
        </Suspense>
      );
    case "stream":
      return (
        <Suspense fallback={<LoadingFallback />}>
          <StreamTab team={team} isCaptain={isCaptain} activeSubteamId={activeSubteamId} />
        </Suspense>
      );
    case "assignments":
      return (
        <Suspense fallback={<LoadingFallback />}>
          <AssignmentsTab
            teamId={team.slug}
            isCaptain={isCaptain}
            onCreateAssignment={onCreateAssignment}
          />
        </Suspense>
      );
    case "people":
      return (
        <Suspense fallback={<LoadingFallback />}>
          <PeopleTab
            team={team}
            isCaptain={isCaptain}
            onInvitePerson={onInvitePerson}
            activeSubteamId={activeSubteamId}
            subteams={getSubteams(team.slug)}
            onSubteamChange={onSubteamChange}
          />
        </Suspense>
      );
    default:
      return null;
  }
}
