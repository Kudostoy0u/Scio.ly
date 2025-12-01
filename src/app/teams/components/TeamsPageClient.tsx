"use client";

import { useAuth } from "@/app/contexts/authContext";
import { useTeamStore } from "@/app/hooks/useTeamStore";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { handleApiError } from "@/lib/stores/teams/utils";
import { trpc } from "@/lib/trpc/client";
import logger from "@/lib/utils/logger";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  // Use team store for cache management
  const { invalidateCache, getCacheKey } = useTeamStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // tRPC queries and mutations - use tRPC directly for userTeams
  const utils = trpc.useUtils();
  const {
    data: userTeamsData,
    isLoading,
    refetch: refetchUserTeams,
  } = (
    trpc.teams.getUserTeams as unknown as {
      useQuery: (
        input: undefined,
        options?: { enabled?: boolean; staleTime?: number }
      ) => {
        data: { teams: Record<string, unknown>[] } | undefined;
        isLoading: boolean;
        refetch: () => Promise<unknown>;
      };
    }
  ).useQuery(undefined, {
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  // Convert tRPC data to UserTeam format - memoize to prevent infinite loops
  const userTeams = useMemo(() => {
    return (
      userTeamsData?.teams?.map((team: Record<string, unknown>) => ({
        id: String(team.id ?? ""),
        slug: String(team.slug ?? ""),
        school: String(team.school ?? ""),
        division: (team.division ?? "B") as "B" | "C",
        user_role: String(team.user_role ?? team.role ?? "member"),
        name: String(team.name ?? ""),
      })) || []
    );
  }, [userTeamsData]);

  // Update store with tRPC data to keep them in sync
  // Use a ref to track the last synced data to prevent infinite loops
  const lastSyncedDataRef = useRef<string | null>(null);

  useEffect(() => {
    if (!(userTeamsData?.teams && user?.id)) {
      return;
    }

    // Create a stable key from the data to detect changes
    const dataKey = JSON.stringify(
      userTeamsData.teams.map((t: Record<string, unknown>) => ({
        id: t.id,
        slug: t.slug,
      }))
    );

    // Only update if data actually changed
    if (lastSyncedDataRef.current === dataKey) {
      return;
    }

    lastSyncedDataRef.current = dataKey;

    const { useTeamStore: store } = require("@/lib/stores/teamStore");
    const cacheKey = getCacheKey("userTeams", user.id);
    store.setState({
      userTeams,
      cacheTimestamps: { ...store.getState().cacheTimestamps, [cacheKey]: Date.now() },
    });
  }, [userTeamsData, user?.id, getCacheKey, userTeams]);

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
  const teamsForLanding = userTeams.map(
    (userTeam: {
      id: string;
      slug: string;
      school: string;
      division: "B" | "C";
      name: string;
    }) => ({
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
    })
  ) as {
    id: string;
    name: string;
    slug: string;
    school: string;
    division: "B" | "C";
    members: {
      id: string;
      name: string;
      email: string;
      role: "captain" | "member";
    }[];
  }[];

  const handleCreateTeam = async (teamData: { school: string; division: "B" | "C" }) => {
    try {
      const newTeam = await createTeamMutation.mutateAsync(teamData);

      // Invalidate and refetch user teams to update sidebar and all teams page
      if (user?.id) {
        // Invalidate Zustand store cache with correct key format
        const cacheKey = getCacheKey("userTeams", user.id);
        invalidateCache(cacheKey);

        // Invalidate tRPC query cache
        (
          utils.teams.getUserTeams as unknown as {
            invalidate: () => Promise<void>;
          }
        ).invalidate();

        // Refetch user teams immediately
        await refetchUserTeams();
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
    } catch (error) {
      logger.error("Failed to create team:", error);
      const errorMessage = handleApiError(error, "createTeam");
      toast.error(errorMessage);
    }
  };

  const handleJoinTeam = async (joinData: { code: string }) => {
    try {
      const joinedTeam = await joinTeamMutation.mutateAsync(joinData);

      // Invalidate and refetch user teams to update sidebar and all teams page
      if (user?.id) {
        // Invalidate Zustand store cache with correct key format
        const cacheKey = getCacheKey("userTeams", user.id);
        invalidateCache(cacheKey);

        // Invalidate tRPC query cache
        (
          utils.teams.getUserTeams as unknown as {
            invalidate: () => Promise<void>;
          }
        ).invalidate();

        // Refetch user teams immediately
        await refetchUserTeams();
      }

      // Redirect to the team dashboard URL
      if (joinedTeam?.slug) {
        router.push(`/teams/${joinedTeam.slug}`);
      }
      toast.success("Successfully joined team!");
    } catch (error) {
      logger.error("Failed to join team:", error);
      const errorMessage = handleApiError(error, "joinTeam");
      toast.error(errorMessage);
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
