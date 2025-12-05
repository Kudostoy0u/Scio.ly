/**
 * Action handlers for leaderboard operations
 */

import logger from "@/lib/utils/logger";
import type React from "react";
import type { UserProfile } from "../types";

interface LeaderboardActionsProps {
	client: ReturnType<
		typeof import("@/app/contexts/AuthContext").useAuth
	>["client"];
	user: UserProfile | null;
	setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
	setShowDisplayNameModal: (show: boolean) => void;
	setPendingLeaderboardAction: (action: "public" | "private" | null) => void;
	setJoinCode: (code: string) => void;
	setShowJoinModal: (show: boolean) => void;
	loadUserAndLeaderboards: () => Promise<void>;
	setSelectedLeaderboard: (id: string | null) => void;
}

export function createLeaderboardActions({
	client,
	user,
	setUser,
	setShowDisplayNameModal,
	setPendingLeaderboardAction,
	setJoinCode,
	setShowJoinModal,
	loadUserAndLeaderboards,
	setSelectedLeaderboard,
}: LeaderboardActionsProps) {
	const joinPublicLeaderboard = async () => {
		if (!user?.display_name) {
			setPendingLeaderboardAction("public");
			setShowDisplayNameModal(true);
			return;
		}
		const { error } = await (
			client.rpc as unknown as (
				name: string,
				args?: Record<string, unknown>,
			) => Promise<{ error: unknown }>
		)("join_public_leaderboard");
		if (error) {
			logger.error("Error joining public leaderboard:", error);
		} else {
			await loadUserAndLeaderboards();
		}
	};

	const joinPrivateLeaderboard = async (joinCode: string) => {
		if (!user?.display_name) {
			setPendingLeaderboardAction("private");
			setShowDisplayNameModal(true);
			return;
		}

		const { error } = await (
			client.rpc as unknown as (
				name: string,
				args?: Record<string, unknown>,
			) => Promise<{ error: unknown }>
		)("join_leaderboard_by_code", { p_join_code: joinCode });
		if (error) {
			logger.error("Error joining private leaderboard:", error);
		} else {
			setShowJoinModal(false);
			setJoinCode("");
			await loadUserAndLeaderboards();
		}
	};

	const handleSetDisplayName = async (
		displayName: string,
		pendingAction: "public" | "private" | null,
		joinCode: string,
	) => {
		if (!displayName.trim()) {
			return;
		}

		const { error } = await (
			client.from("users") as unknown as {
				update: (values: { display_name: string }) => {
					eq: (
						column: string,
						value: string | undefined,
					) => Promise<{ error: unknown }>;
				};
			}
		)
			.update({ display_name: displayName.trim() })
			.eq("id", user?.id ?? "");

		if (!error) {
			setUser((prev) =>
				prev ? { ...prev, display_name: displayName.trim() } : null,
			);
			setShowDisplayNameModal(false);

			if (pendingAction === "public") {
				const { error: joinError } = await (
					client.rpc as unknown as (
						name: string,
						args?: Record<string, unknown>,
					) => Promise<{ error: unknown }>
				)("join_public_leaderboard");
				if (!joinError) {
					await loadUserAndLeaderboards();
				}
			} else if (pendingAction === "private" && joinCode) {
				const { error: joinError } = await (
					client.rpc as unknown as (
						name: string,
						args?: Record<string, unknown>,
					) => Promise<{ error: unknown }>
				)("join_leaderboard_by_code", {
					p_join_code: joinCode,
				});
				if (!joinError) {
					setShowJoinModal(false);
					setJoinCode("");
					await loadUserAndLeaderboards();
				}
			}
			setPendingLeaderboardAction(null);
		}
	};

	const leaveLeaderboard = async (leaderboardId: string) => {
		const { error } = await (
			client.rpc as unknown as (
				name: string,
				args?: Record<string, unknown>,
			) => Promise<{ error: unknown }>
		)("leave_leaderboard", { p_leaderboard_id: leaderboardId } as Record<
			string,
			unknown
		>);
		if (!error) {
			await loadUserAndLeaderboards();
			setSelectedLeaderboard(null);
		}
	};

	return {
		joinPublicLeaderboard,
		joinPrivateLeaderboard,
		handleSetDisplayName,
		leaveLeaderboard,
	};
}
