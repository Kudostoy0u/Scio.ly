"use client";

import Header from "@/app/components/Header";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { Plus, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { CreateLeaderboardModal } from "./components/CreateLeaderboardModal";
import { DisplayNameModal } from "./components/DisplayNameModal";
import { JoinModal } from "./components/JoinModal";
import { LeaderboardList } from "./components/LeaderboardList";
import { RankingsTable } from "./components/RankingsTable";
import { createLeaderboardActions } from "./handlers/leaderboardActions";
import { useLeaderboardData } from "./hooks/useLeaderboardData";

export default function LeaderboardClientPage() {
	const { darkMode } = useTheme();
	const { user: authUser, client, loading: authLoading } = useAuth();

	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showJoinModal, setShowJoinModal] = useState(false);
	const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
	const [displayName, setDisplayName] = useState("");
	const [pendingLeaderboardAction, setPendingLeaderboardAction] = useState<
		"public" | "private" | null
	>(null);
	const [joinCode, setJoinCode] = useState("");

	const {
		leaderboards,
		selectedLeaderboard,
		setSelectedLeaderboard,
		members,
		loading,
		user,
		setUser,
		publicLeaderboard,
		hasJoinedPublic,
		loadUserAndLeaderboards,
	} = useLeaderboardData({ client, authUser, authLoading });

	const {
		joinPublicLeaderboard,
		joinPrivateLeaderboard,
		handleSetDisplayName,
		leaveLeaderboard,
	} = createLeaderboardActions({
		client,
		user,
		setUser,
		setShowDisplayNameModal,
		setPendingLeaderboardAction,
		setJoinCode,
		setShowJoinModal,
		loadUserAndLeaderboards,
		setSelectedLeaderboard,
	});

	const handleJoinPrivate = async () => {
		await joinPrivateLeaderboard(joinCode);
	};

	const handleSetDisplayNameSubmit = async () => {
		await handleSetDisplayName(displayName, pendingLeaderboardAction, joinCode);
	};

	const handleLeave = async () => {
		if (selectedLeaderboard) {
			await leaveLeaderboard(selectedLeaderboard);
		}
	};

	if (loading) {
		return (
			<div
				className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
			>
				<Header />
				<div className="pt-20 flex items-center justify-center min-h-[calc(100vh-5rem)]">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
				</div>
			</div>
		);
	}

	return (
		<div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
			<Header />
			<div
				className={`p-4 pt-20 max-w-7xl mx-auto ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				<div className="flex items-center justify-between mb-8">
					<h1
						className={`text-3xl font-bold flex items-center gap-3 ${darkMode ? "" : "text-gray-900"}`}
					>
						<Trophy className="w-8 h-8 text-yellow-500" />
						Leaderboards
					</h1>

					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setShowJoinModal(true)}
							aria-label="Join with code"
							title="Join with code"
							className={`${darkMode ? "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"} p-2 rounded-lg transition-colors`}
						>
							<Users className="w-5 h-5" />
						</button>
						<button
							type="button"
							onClick={() => setShowCreateModal(true)}
							aria-label="Create private leaderboard"
							title="Create private leaderboard"
							className={`${darkMode ? "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"} p-2 rounded-lg transition-colors`}
						>
							<Plus className="w-5 h-5" />
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-1">
						<LeaderboardList
							leaderboards={leaderboards}
							selectedLeaderboard={selectedLeaderboard}
							onSelect={setSelectedLeaderboard}
							onJoinPublic={joinPublicLeaderboard}
							hasJoinedPublic={hasJoinedPublic}
							publicLeaderboard={publicLeaderboard}
							darkMode={darkMode}
						/>
					</div>

					<div className="lg:col-span-2">
						{selectedLeaderboard && leaderboards.length > 0 ? (
							<RankingsTable
								members={members}
								user={user}
								onLeave={handleLeave}
								darkMode={darkMode}
							/>
						) : leaderboards.length > 0 ? (
							<div
								className={`rounded-lg p-12 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} shadow-sm text-center`}
							>
								<Trophy
									className={`w-16 h-16 mx-auto mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
								/>
								<p className={darkMode ? "text-gray-400" : "text-gray-600"}>
									Select a leaderboard to view rankings
								</p>
							</div>
						) : null}
						{leaderboards.length === 0 && (
							<div
								className={`rounded-lg p-12 mt-6 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} shadow-sm text-center`}
							>
								<p className={darkMode ? "text-gray-300" : "text-gray-700"}>
									You haven&apos;t joined any leaderboards yet. Use the buttons
									above to join the public leaderboard, join with a code, or
									create your own.
								</p>
							</div>
						)}
					</div>
				</div>

				<JoinModal
					show={showJoinModal}
					joinCode={joinCode}
					onJoinCodeChange={setJoinCode}
					onJoin={handleJoinPrivate}
					onClose={() => setShowJoinModal(false)}
					darkMode={darkMode}
				/>

				{showCreateModal && (
					<CreateLeaderboardModal
						onClose={() => setShowCreateModal(false)}
						onCreated={loadUserAndLeaderboards}
					/>
				)}

				<DisplayNameModal
					show={showDisplayNameModal}
					displayName={displayName}
					onDisplayNameChange={setDisplayName}
					onSubmit={handleSetDisplayNameSubmit}
					onClose={() => {
						setShowDisplayNameModal(false);
						setPendingLeaderboardAction(null);
					}}
					darkMode={darkMode}
				/>
			</div>
		</div>
	);
}
