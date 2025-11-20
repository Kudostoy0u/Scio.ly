import { useAuth } from "@/app/contexts/AuthContext";
import { globalApiCache } from "@/lib/utils/globalApiCache";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

interface UserTeam {
  id: string;
  slug: string;
  school: string;
  division: string;
  user_role: string;
  team_name: string;
  is_archived: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  username: string;
  display_name: string;
  role: string;
  joinedAt: string;
  subteam: {
    id: string;
    name: string;
    teamId: string;
  };
  events: string[];
  eventCount: number;
  avatar?: string;
  isOnline: boolean;
  isPendingInvitation?: boolean;
  hasPendingInvite?: boolean;
  hasPendingLinkInvite?: boolean;
  invitationCode?: string;
}

interface TeamData {
  userTeams: UserTeam[];
  subteams: any[];
  roster: Record<string, string[]>;
  removedEvents: string[];
  members: TeamMember[];
  stream: any[];
  assignments: any[];
  tournaments: any[];
  timers: any[];
}

export function useEnhancedTeamData() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<TeamData>({
    userTeams: [],
    subteams: [],
    roster: {},
    removedEvents: [],
    members: [],
    stream: [],
    assignments: [],
    tournaments: [],
    timers: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handle403Error = useCallback(
    (errorMessage = "You are not a member of this team") => {
      toast.error(errorMessage);
      router.push("/dashboard");
    },
    [router]
  );

  // Fetch user teams
  const fetchUserTeams = useCallback(async (): Promise<UserTeam[]> => {
    if (!user?.id) {
      return [];
    }

    const cacheKey = `user-teams-${user.id}`;
    return globalApiCache.fetchWithCache(
      cacheKey,
      async () => {
        const response = await fetch("/api/teams/user-teams");
        if (!response.ok) {
          throw new Error("Failed to fetch user teams");
        }
        const result = await response.json();
        return result.teams || [];
      },
      "user-teams"
    );
  }, [user?.id]);

  // Fetch subteams
  const fetchSubteams = useCallback(
    async (teamSlug: string): Promise<any[]> => {
      if (!teamSlug) {
        return [];
      }

      const cacheKey = `subteams-${teamSlug}`;
      return globalApiCache.fetchWithCache(
        cacheKey,
        async () => {
          const response = await fetch(`/api/teams/${teamSlug}/subteams`);
          if (response.status === 403) {
            const errorData = await response.json();
            handle403Error(errorData.error || "You are not a member of this team");
            return [];
          }
          if (!response.ok) {
            throw new Error("Failed to fetch subteams");
          }
          const result = await response.json();
          return result.subteams || [];
        },
        "subteams"
      );
    },
    [handle403Error]
  );

  // Fetch roster data (includes both roster and removed events)
  const fetchRoster = useCallback(
    async (
      teamSlug: string,
      subteamId: string
    ): Promise<{
      roster: Record<string, string[]>;
      removedEvents: string[];
    }> => {
      if (!(teamSlug && subteamId)) {
        return { roster: {}, removedEvents: [] };
      }

      const cacheKey = `roster-${teamSlug}-${subteamId}`;
      return globalApiCache.fetchWithCache(
        cacheKey,
        async () => {
          const response = await fetch(`/api/teams/${teamSlug}/roster?subteamId=${subteamId}`);
          if (response.status === 403) {
            const errorData = await response.json();
            handle403Error(errorData.error || "You are not a member of this team");
            return { roster: {}, removedEvents: [] };
          }
          if (!response.ok) {
            throw new Error("Failed to fetch roster");
          }
          const result = await response.json();
          return {
            roster: result.roster || {},
            removedEvents: result.removedEvents || [],
          };
        },
        "roster"
      );
    },
    [handle403Error]
  );

  // Fetch members
  const fetchMembers = useCallback(
    async (teamSlug: string, subteamId?: string): Promise<TeamMember[]> => {
      if (!teamSlug) {
        return [];
      }

      const subteamParam = subteamId && subteamId !== "all" ? `?subteamId=${subteamId}` : "";
      const cacheKey = `members-${teamSlug}-${subteamId || "all"}`;

      return globalApiCache.fetchWithCache(
        cacheKey,
        async () => {
          const response = await fetch(`/api/teams/${teamSlug}/members${subteamParam}`);
          if (response.status === 403) {
            const errorData = await response.json();
            handle403Error(errorData.error || "You are not a member of this team");
            return [];
          }
          if (!response.ok) {
            throw new Error("Failed to fetch members");
          }
          const result = await response.json();
          return result.members || [];
        },
        "members"
      );
    },
    [handle403Error]
  );

  // Fetch stream data
  const fetchStream = useCallback(
    async (teamSlug: string, subteamId: string): Promise<any[]> => {
      if (!(teamSlug && subteamId)) {
        return [];
      }

      const cacheKey = `stream-${teamSlug}-${subteamId}`;
      return globalApiCache.fetchWithCache(
        cacheKey,
        async () => {
          const response = await fetch(`/api/teams/${teamSlug}/stream?subteamId=${subteamId}`);
          if (response.status === 403) {
            const errorData = await response.json();
            handle403Error(errorData.error || "You are not a member of this team");
            return [];
          }
          if (!response.ok) {
            throw new Error("Failed to fetch stream");
          }
          const result = await response.json();
          return result.posts || [];
        },
        "stream"
      );
    },
    [handle403Error]
  );

  // Fetch assignments
  const fetchAssignments = useCallback(
    async (teamSlug: string): Promise<any[]> => {
      if (!teamSlug) {
        return [];
      }

      const cacheKey = `assignments-${teamSlug}`;
      return globalApiCache.fetchWithCache(
        cacheKey,
        async () => {
          const response = await fetch(`/api/teams/${teamSlug}/assignments`);
          if (response.status === 403) {
            const errorData = await response.json();
            handle403Error(errorData.error || "You are not a member of this team");
            return [];
          }
          if (!response.ok) {
            throw new Error("Failed to fetch assignments");
          }
          const result = await response.json();
          return result.assignments || [];
        },
        "assignments"
      );
    },
    [handle403Error]
  );

  // Fetch tournaments
  const fetchTournaments = useCallback(
    async (teamSlug: string, subteamId: string): Promise<any[]> => {
      if (!(teamSlug && subteamId)) {
        return [];
      }

      const cacheKey = `tournaments-${teamSlug}-${subteamId}`;
      return globalApiCache.fetchWithCache(
        cacheKey,
        async () => {
          const response = await fetch(`/api/teams/${teamSlug}/tournaments?subteamId=${subteamId}`);
          if (response.status === 403) {
            const errorData = await response.json();
            handle403Error(errorData.error || "You are not a member of this team");
            return [];
          }
          if (!response.ok) {
            throw new Error("Failed to fetch tournaments");
          }
          const result = await response.json();
          return result.events || [];
        },
        "tournaments"
      );
    },
    [handle403Error]
  );

  // Fetch timers
  const fetchTimers = useCallback(
    async (teamSlug: string, subteamId: string): Promise<any[]> => {
      if (!(teamSlug && subteamId)) {
        return [];
      }

      const cacheKey = `timers-${teamSlug}-${subteamId}`;
      return globalApiCache.fetchWithCache(
        cacheKey,
        async () => {
          const response = await fetch(`/api/teams/${teamSlug}/timers?subteamId=${subteamId}`);
          if (response.status === 403) {
            const errorData = await response.json();
            handle403Error(errorData.error || "You are not a member of this team");
            return [];
          }
          if (!response.ok) {
            throw new Error("Failed to fetch timers");
          }
          const result = await response.json();
          return result.timers || [];
        },
        "timers"
      );
    },
    [handle403Error]
  );

  // Load initial data
  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userTeams = await fetchUserTeams();
      setData((prev) => ({ ...prev, userTeams }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchUserTeams]);

  // Load subteams
  const loadSubteams = useCallback(
    async (teamSlug: string) => {
      try {
        const subteams = await fetchSubteams(teamSlug);
        setData((prev) => ({ ...prev, subteams }));
      } catch (_err) {}
    },
    [fetchSubteams]
  );

  // Load roster data
  const loadRoster = useCallback(
    async (teamSlug: string, subteamId: string) => {
      try {
        const rosterData = await fetchRoster(teamSlug, subteamId);
        setData((prev) => ({
          ...prev,
          roster: rosterData.roster,
          removedEvents: rosterData.removedEvents,
        }));

        // Start background refresh for roster
        const cacheKey = `roster-${teamSlug}-${subteamId}`;
        globalApiCache.startBackgroundRefresh(
          cacheKey,
          () => fetchRoster(teamSlug, subteamId),
          "roster"
        );
      } catch (_err) {}
    },
    [fetchRoster]
  );

  // Load members
  const loadMembers = useCallback(
    async (teamSlug: string, subteamId?: string) => {
      try {
        const members = await fetchMembers(teamSlug, subteamId);
        setData((prev) => ({ ...prev, members }));

        // Start background refresh for members
        const cacheKey = `members-${teamSlug}-${subteamId || "all"}`;
        globalApiCache.startBackgroundRefresh(
          cacheKey,
          () => fetchMembers(teamSlug, subteamId),
          "members"
        );
      } catch (_err) {}
    },
    [fetchMembers]
  );

  // Load stream data
  const loadStream = useCallback(
    async (teamSlug: string, subteamId: string) => {
      try {
        const stream = await fetchStream(teamSlug, subteamId);
        setData((prev) => ({ ...prev, stream }));

        // Start background refresh for stream
        const cacheKey = `stream-${teamSlug}-${subteamId}`;
        globalApiCache.startBackgroundRefresh(
          cacheKey,
          () => fetchStream(teamSlug, subteamId),
          "stream"
        );
      } catch (_err) {}
    },
    [fetchStream]
  );

  // Load assignments
  const loadAssignments = useCallback(
    async (teamSlug: string) => {
      try {
        const assignments = await fetchAssignments(teamSlug);
        setData((prev) => ({ ...prev, assignments }));

        // Start background refresh for assignments
        const cacheKey = `assignments-${teamSlug}`;
        globalApiCache.startBackgroundRefresh(
          cacheKey,
          () => fetchAssignments(teamSlug),
          "assignments"
        );
      } catch (_err) {}
    },
    [fetchAssignments]
  );

  // Load tournaments
  const loadTournaments = useCallback(
    async (teamSlug: string, subteamId: string) => {
      try {
        const tournaments = await fetchTournaments(teamSlug, subteamId);
        setData((prev) => ({ ...prev, tournaments }));

        // Start background refresh for tournaments
        const cacheKey = `tournaments-${teamSlug}-${subteamId}`;
        globalApiCache.startBackgroundRefresh(
          cacheKey,
          () => fetchTournaments(teamSlug, subteamId),
          "tournaments"
        );
      } catch (_err) {}
    },
    [fetchTournaments]
  );

  // Load timers
  const loadTimers = useCallback(
    async (teamSlug: string, subteamId: string) => {
      try {
        const timers = await fetchTimers(teamSlug, subteamId);
        setData((prev) => ({ ...prev, timers }));

        // Start background refresh for timers
        const cacheKey = `timers-${teamSlug}-${subteamId}`;
        globalApiCache.startBackgroundRefresh(
          cacheKey,
          () => fetchTimers(teamSlug, subteamId),
          "timers"
        );
      } catch (_err) {}
    },
    [fetchTimers]
  );

  // Invalidate cache
  const invalidateCache = useCallback((key?: string) => {
    globalApiCache.invalidate(key);
  }, []);

  // Check for refresh parameter and clear cache
  useEffect(() => {
    const refreshParam = searchParams.get("refresh");
    if (refreshParam) {
      globalApiCache.invalidate();
      // Remove the refresh parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("refresh");
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, router]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup background refresh timers on unmount
  useEffect(() => {
    return () => {
      // Stop all background refresh timers
      globalApiCache.invalidate();
    };
  }, []);

  return {
    ...data,
    loading,
    error,
    loadSubteams,
    loadRoster,
    loadMembers,
    loadStream,
    loadAssignments,
    loadTournaments,
    loadTimers,
    invalidateCache,
    refetch: loadData,
  };
}
