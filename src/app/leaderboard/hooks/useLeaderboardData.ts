/**
 * Hook for loading leaderboard data
 */

import logger from "@/lib/utils/logger";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Leaderboard, LeaderboardMember, UserProfile } from "../types";

interface UseLeaderboardDataProps {
  client: ReturnType<typeof import("@/app/contexts/authContext").useAuth>["client"];
  authUser: ReturnType<typeof import("@/app/contexts/authContext").useAuth>["user"];
  authLoading: boolean;
}

export function useLeaderboardData({ client, authUser, authLoading }: UseLeaderboardDataProps) {
  const router = useRouter();
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<string | null>(null);
  const [members, setMembers] = useState<LeaderboardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [publicLeaderboard, setPublicLeaderboard] = useState<Leaderboard | null>(null);
  const [hasJoinedPublic, setHasJoinedPublic] = useState<boolean>(false);

  const loadLeaderboardMembers = useCallback(
    async (leaderboardId: string) => {
      const supabase = client;
      const { data, error } = await supabase
        .from("leaderboard_members")
        .select(`
        user_id,
        questions_attempted,
        correct_answers,
        accuracy_percentage,
        users!inner(email, display_name, photo_url)
      `)
        .eq("leaderboard_id", leaderboardId)
        .order("correct_answers", { ascending: false })
        .order("accuracy_percentage", { ascending: false });

      if (error) {
        logger.error("Error loading members:", error);
        return;
      }

      if (data) {
        interface MemberData {
          user_id: string;
          questions_attempted: number | null;
          correct_answers: number | null;
          accuracy_percentage: number | null;
          users:
            | { email: string; display_name: string | null; photo_url: string | null }
            | { email: string; display_name: string | null; photo_url: string | null }[];
        }
        const membersWithRank = (data as MemberData[]).map((member, index) => {
          const userData = Array.isArray(member.users) ? member.users[0] : member.users;
          return {
            user_id: member.user_id,
            questions_attempted: member.questions_attempted || 0,
            correct_answers: member.correct_answers || 0,
            accuracy_percentage: member.accuracy_percentage || 0,
            display_name: userData?.display_name || null,
            email: userData?.email || "",
            photo_url: userData?.photo_url || null,
            rank: index + 1,
          } as LeaderboardMember;
        });
        setMembers(membersWithRank);
      }
    },
    [client]
  );

  const loadUserAndLeaderboards = useCallback(async () => {
    const supabase = client;
    if (!authUser) {
      setLoading(false);
      router.replace("/");
      return;
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", authUser.id)
      .single();

    const profileData = userProfile as { display_name?: string | null } | null;

    if (authUser?.email) {
      setUser({
        id: authUser.id,
        email: authUser.email,
        display_name: profileData?.display_name ?? undefined,
      });
    }

    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from("leaderboard_members")
      .select(`
        leaderboard_id,
        leaderboards:leaderboards!inner(
          id,
          name,
          description,
          is_public,
          join_code,
          reset_frequency,
          created_by
        )
      `)
      .eq("user_id", authUser.id);

    if (leaderboardError) {
      logger.error("Error loading leaderboards:", leaderboardError);
    }

    if (leaderboardData) {
      const userLeaderboards = leaderboardData.map(
        (item: { leaderboards: Leaderboard }) => item.leaderboards
      );
      setLeaderboards(userLeaderboards);
      const joinedPublic = userLeaderboards.some((lb: Leaderboard) => lb.is_public);
      setHasJoinedPublic(joinedPublic);
      if (userLeaderboards.length === 0) {
        setSelectedLeaderboard(null);
      }
    }

    try {
      const { data: pubLb } = await supabase
        .from("leaderboards")
        .select("id,name,description,is_public,join_code,reset_frequency,created_by")
        .eq("is_public", true)
        .limit(1)
        .single();
      setPublicLeaderboard(pubLb ?? null);
    } catch {
      setPublicLeaderboard(null);
    }
    setLoading(false);
  }, [client, authUser, router]);

  const canLoad = useMemo(() => !authLoading, [authLoading]);
  useEffect(() => {
    if (!canLoad) {
      return;
    }
    loadUserAndLeaderboards();
  }, [canLoad, loadUserAndLeaderboards]);

  useEffect(() => {
    if (selectedLeaderboard) {
      loadLeaderboardMembers(selectedLeaderboard);
    }
  }, [selectedLeaderboard, loadLeaderboardMembers]);

  useEffect(() => {
    if (!selectedLeaderboard && leaderboards.length > 0 && leaderboards[0]) {
      setSelectedLeaderboard(leaderboards[0].id);
    }
  }, [leaderboards, selectedLeaderboard]);

  return {
    leaderboards,
    setLeaderboards,
    selectedLeaderboard,
    setSelectedLeaderboard,
    members,
    loading,
    user,
    setUser,
    publicLeaderboard,
    hasJoinedPublic,
    loadUserAndLeaderboards,
  };
}

