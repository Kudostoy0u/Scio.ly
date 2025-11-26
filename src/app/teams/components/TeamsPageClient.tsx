"use client";

import { useAuth } from "@/app/contexts/authContext";
import { useTeamStore } from "@/app/hooks/useTeamStore";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import CreateTeamModal from "./CreateTeamModal";
import JoinTeamModal from "./JoinTeamModal";
import TeamsLanding from "./TeamsLanding";

interface TeamsPageClientProps {
  initialLinkedSelection?: {
    school: string;
    division: "B" | "C";
    team_id: string;
    member_name?: string;
  } | null;
  initialGroupSlug?: string | null;
}

// Use UserTeam from the cache utility instead of defining our own

export default function TeamsPageClient({
  initialLinkedSelection: _initialLinkedSelection,
  initialGroupSlug: _initialGroupSlug,
}: TeamsPageClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  // Use team store instead of separate state management
  const { userTeams, isUserTeamsLoading: isLoading, invalidateCache } = useTeamStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // tRPC mutations at component level
  const createTeamMutation = trpc.teams.createTeam.useMutation();
  const joinTeamMutation = trpc.teams.joinTeam.useMutation();
  const [teamMemberCounts, setTeamMemberCounts] = useState<
    Record<string, { total: number; captains: number }>
  >({});

  // User teams are now loaded by the enhanced hook automatically

  // Load member counts - simplified for now
  useEffect(() => {
    const loadMemberCounts = () => {
      const counts: Record<string, { total: number; captains: number }> = {};

      // Set default counts for now
      for (const userTeam of userTeams) {
        counts[userTeam.slug] = { total: 0, captains: 0 };
      }

      setTeamMemberCounts(counts);
    };

    if (userTeams.length > 0) {
      loadMemberCounts();
    }
  }, [userTeams]);

  // Convert UserTeam to Team format for TeamsLanding
  const teamsForLanding = userTeams.map((userTeam) => ({
    id: userTeam.id,
    name: userTeam.name || `${userTeam.school} ${userTeam.division}`,
    slug: userTeam.slug,
    school: userTeam.school,
    division: userTeam.division,
    members: teamMemberCounts[userTeam.slug]
      ? Array.from({ length: teamMemberCounts[userTeam.slug]?.total ?? 0 }, (_, i) => ({
          id: `member-${i}`,
          name: `Member ${i + 1}`,
          email: `member${i + 1}@example.com`,
          role: (i < (teamMemberCounts[userTeam.slug]?.captains || 0) ? "captain" : "member") as
            | "captain"
            | "member",
        }))
      : [],
  })) as Array<{
    id: string;
    name: string;
    slug: string;
    school: string;
    division: "B" | "C";
    members: Array<{
      id: string;
      name: string;
      email: string;
      role: "captain" | "member";
    }>;
  }>;

  const handleCreateTeam = async (teamData: { school: string; division: "B" | "C" }) => {
    try {
      const newTeam = await createTeamMutation.mutateAsync(teamData);

      // Invalidate cache to refresh teams list
      if (user?.id) {
        invalidateCache(`user-teams-${user.id}`);
      }

      // If team was reactivated, clear subteams cache to ensure fresh data
      if (newTeam.wasReactivated && newTeam.slug) {
        // Clear subteams cache for this team
        if (typeof window !== "undefined") {
          // Clear localStorage cache
          SyncLocalStorage.removeItem(`subteams-${newTeam.slug}`);
          // Clear any other relevant caches
          SyncLocalStorage.removeItem(`roster-${newTeam.slug}`);
          SyncLocalStorage.removeItem(`members-${newTeam.slug}`);
        }
      }

      // Redirect to the team dashboard URL
      if (newTeam?.slug) {
        router.push(`/teams/${newTeam.slug}`);
      }
      toast.success("Team created successfully!");
    } catch (_error) {
      toast.error("Failed to create team");
    }
  };

  const handleJoinTeam = async (joinData: { code: string }) => {
    try {
      const joinedTeam = await joinTeamMutation.mutateAsync(joinData);

      // Invalidate cache to refresh teams list
      if (user?.id) {
        invalidateCache(`user-teams-${user.id}`);
      }

      // Redirect to the team dashboard URL
      if (joinedTeam?.slug) {
        router.push(`/teams/${joinedTeam.slug}`);
      }
      toast.success("Successfully joined team!");
    } catch (_error) {
      toast.error("Failed to join team");
    }
  };

  // Removed handleBackToLanding and handleTeamSelect since we only handle landing page now

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading teams...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <TeamsLanding
        onCreateTeam={() => {
          toast.info("You need to create an account to use teams", {
            onClick: () => router.push("/auth"),
            style: { cursor: "pointer" },
          });
        }}
        onJoinTeam={() => {
          toast.info("You need to create an account to use teams", {
            onClick: () => router.push("/auth"),
            style: { cursor: "pointer" },
          });
        }}
        userTeams={[]}
        onTeamSelect={() => {
          toast.info("You need to create an account to use teams", {
            onClick: () => router.push("/auth"),
            style: { cursor: "pointer" },
          });
        }}
        isPreviewMode={true}
      />
    );
  }

  return (
    <>
      <TeamsLanding
        onCreateTeam={() => setIsCreateModalOpen(true)}
        onJoinTeam={() => setIsJoinModalOpen(true)}
        userTeams={teamsForLanding}
        onTeamSelect={() => undefined}
      />

      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTeam={handleCreateTeam}
      />

      <JoinTeamModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinTeam={handleJoinTeam}
      />
    </>
  );
}
