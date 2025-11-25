"use client";

import { useAuth } from "@/app/contexts/authContext";
import { useTheme } from "@/app/contexts/themeContext";
import TeamCalendar from "@/app/teams/components/TeamCalendar";
import TeamLayout from "@/app/teams/components/TeamLayout";
import { globalApiCache } from "@/lib/utils/globalApiCache";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CalendarPage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [userTeams, setUserTeams] = useState<
    Array<{
      id: string;
      name: string;
      slug: string;
      user_role: string;
      school: string;
      division: "B" | "C";
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserTeams = async () => {
      if (!user?.id) {
        return;
      }

      try {
        setLoading(true);

        // Use global cache to avoid duplicate requests
        const cacheKey = `user-teams-${user.id}`;
        const teams = await globalApiCache.fetchWithCache(
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

        setUserTeams(teams);
      } catch (_error) {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    };

    loadUserTeams();
  }, [user?.id]);

  const handleTabChange = (tab: "home" | "upcoming" | "settings") => {
    if (tab === "home") {
      router.push("/teams");
    } else if (tab === "upcoming") {
      // Already on calendar page
    } else if (tab === "settings") {
      router.push("/teams?tab=settings");
    }
  };

  const handleTeamSelect = (team: {
    id: string;
    name: string;
    slug: string;
    school: string;
    division: "B" | "C";
  }) => {
    router.push(`/teams/${team.slug}`);
  };

  const handleNavigateToMainDashboard = () => {
    router.push("/teams?view=all");
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Loading calendar...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TeamLayout
      activeTab="upcoming"
      onTabChangeAction={handleTabChange}
      userTeams={userTeams}
      onTeamSelect={handleTeamSelect}
      onNavigateToMainDashboard={handleNavigateToMainDashboard}
    >
      <div className="max-w-7xl mx-auto">
        <TeamCalendar
          teamId={undefined}
          isCaptain={userTeams.some(
            (team) => team.user_role === "captain" || team.user_role === "co_captain"
          )}
          teamSlug={userTeams[0]?.slug || undefined}
        />
      </div>
    </TeamLayout>
  );
}
