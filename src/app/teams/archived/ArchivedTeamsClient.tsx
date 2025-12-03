"use client";

import { useTheme } from "@/app/contexts/themeContext";
import TeamLayout from "@/app/teams/components/TeamLayout";
import { motion } from "framer-motion";
import { Archive, ArrowLeft, RefreshCw, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Team {
	id: string;
	name: string;
	slug: string;
	school: string;
	division: "B" | "C";
	description?: string;
	members: Array<{
		id: string;
		name: string;
		email: string;
		role: "captain" | "member";
	}>;
}

export default function ArchivedTeamsClient() {
	const { darkMode } = useTheme();
	const router = useRouter();
	const [archivedTeams, setArchivedTeams] = useState<Team[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const loadArchivedTeams = useCallback(async () => {
		try {
			setIsRefreshing(true);
			const response = await fetch("/api/teams/archived");
			if (response.ok) {
				const data = await response.json();
				setArchivedTeams(data.teams || []);
			}
		} catch (_error) {
			// Ignore errors
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, []);

	const handleTabChange = (tab: "home" | "upcoming" | "settings") => {
		if (tab === "home") {
			router.push("/teams");
		} else if (tab === "upcoming") {
			router.push("/teams/calendar");
		} else if (tab === "settings") {
			router.push("/teams?tab=settings");
		}
	};

	const handleNavigateToMainDashboard = () => {
		router.push("/teams?view=all");
	};

	const handleDeleteTeam = async (teamSlug: string) => {
		if (
			!confirm(
				"Are you sure you want to permanently delete this team? This action cannot be undone.",
			)
		) {
			return;
		}

		try {
			const response = await fetch(`/api/teams/${teamSlug}/delete`, {
				method: "DELETE",
			});

			if (response.ok) {
				// Remove from archived teams list
				setArchivedTeams((prev) =>
					prev.filter((team) => team.slug !== teamSlug),
				);
			} else {
				await response.json();
				alert("Failed to delete team. Please try again.");
			}
		} catch {
			alert("Failed to delete team. Please try again.");
		}
	};

	useEffect(() => {
		loadArchivedTeams();
	}, [loadArchivedTeams]);

	if (isLoading) {
		return (
			<TeamLayout
				activeTab="home"
				onTabChangeAction={handleTabChange}
				onNavigateToMainDashboard={handleNavigateToMainDashboard}
			>
				<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
					<div className="text-center">
						<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4" />
						<p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
							Loading archived teams...
						</p>
					</div>
				</div>
			</TeamLayout>
		);
	}

	return (
		<TeamLayout
			activeTab="home"
			onTabChangeAction={handleTabChange}
			onNavigateToMainDashboard={handleNavigateToMainDashboard}
		>
			{/* Main Content */}
			<div className="p-8">
				<div className="max-w-4xl mx-auto">
					{/* Header */}
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center space-x-4">
							<button
								type="button"
								onClick={() => router.push("/teams?view=all")}
								className={`p-2 rounded-lg transition-colors ${
									darkMode
										? "text-gray-300 hover:bg-gray-800 hover:text-white"
										: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
								}`}
							>
								<ArrowLeft className="w-5 h-5" />
							</button>
							<h1
								className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								Archived Teams
							</h1>
						</div>
						<button
							type="button"
							onClick={loadArchivedTeams}
							disabled={isRefreshing}
							className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
								darkMode
									? "bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
									: "bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
							}`}
						>
							<RefreshCw
								className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
							/>
							<span>Refresh</span>
						</button>
					</div>

					{/* Teams List */}
					{archivedTeams.length === 0 ? (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
							className={`p-8 text-center rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-50"}`}
						>
							<Archive
								className={`w-16 h-16 mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`}
							/>
							<h3
								className={`text-lg font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								No archived teams
							</h3>
							<p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
								Teams you archive will appear here.
							</p>
						</motion.div>
					) : (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
							className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
						>
							{archivedTeams.map((team) => (
								<motion.div
									key={team.id}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.3 }}
									className={`p-6 rounded-lg border ${
										darkMode
											? "bg-gray-800 border-gray-700 hover:bg-gray-750"
											: "bg-white border-gray-200 hover:bg-gray-50"
									} transition-colors`}
								>
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center space-x-3">
											<div
												className={`w-12 h-12 rounded-full flex items-center justify-center ${
													darkMode ? "bg-gray-600" : "bg-gray-300"
												}`}
											>
												<Users className="w-6 h-6 text-gray-500" />
											</div>
											<div>
												<h3
													className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
												>
													{team.school}
												</h3>
												<p
													className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
												>
													Division {team.division}
												</p>
											</div>
										</div>
										<span
											className={`px-2 py-1 rounded-full text-xs font-medium ${
												darkMode
													? "bg-red-900/30 text-red-300 border border-red-700"
													: "bg-red-100 text-red-800 border border-red-200"
											}`}
										>
											Archived
										</span>
									</div>

									<div className="space-y-2 mb-4">
										<div className="flex items-center justify-between">
											<span
												className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
											>
												Members
											</span>
											<span
												className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
											>
												{team.members.length}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span
												className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
											>
												Captains
											</span>
											<span
												className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
											>
												{
													team.members.filter((m) => m.role === "captain")
														.length
												}
											</span>
										</div>
									</div>

									<div className="flex items-center justify-between">
										<span
											className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
										>
											{team.members.length} member
											{team.members.length !== 1 ? "s" : ""}
										</span>
										<button
											type="button"
											onClick={() => handleDeleteTeam(team.slug)}
											className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
												darkMode
													? "bg-red-600 text-white hover:bg-red-700"
													: "bg-red-600 text-white hover:bg-red-700"
											}`}
										>
											Delete
										</button>
									</div>
								</motion.div>
							))}
						</motion.div>
					)}
				</div>
			</div>
		</TeamLayout>
	);
}
