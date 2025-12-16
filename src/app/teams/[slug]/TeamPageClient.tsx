/**
 * Team Page Client Component (v2)
 *
 * Consumes hydrated team data from React Query (tRPC backed).
 * All tabs read from the same cache to keep data consistent.
 */

"use client";

import ConfirmModal from "@/app/components/ConfirmModal";
import { useTheme } from "@/app/contexts/ThemeContext";
import {
	useInvalidateTeam,
	useTeamFull,
	useTeamSubteams,
} from "@/lib/hooks/useTeam";
import { trpc } from "@/lib/trpc/client";
import { Clipboard, LogOut, Trash2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import PeopleTabUnified from "../components/PeopleTabUnified";
import RosterTabUnified from "../components/RosterTabUnified";
import StreamTab from "../components/StreamTab";
import TabNavigation from "../components/TabNavigation";
import TeamLayout from "../components/TeamLayout";

interface TeamPageClientProps {
	teamSlug: string;
}

type TabName = "roster" | "people" | "stream" | "assignments";

export default function TeamPageClient({ teamSlug }: TeamPageClientProps) {
	const { darkMode } = useTheme();
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<TabName>("roster");
	const [activeSubteamId, setActiveSubteamId] = useState<string | null>(null);
	const [showCodes, setShowCodes] = useState(false);
	const [confirmAction, setConfirmAction] = useState<"leave" | "delete" | null>(
		null,
	);
	const [deleteSubteamConfirm, setDeleteSubteamConfirm] = useState<{
		subteamId: string;
		subteamName: string;
	} | null>(null);
	const [layoutTab, setLayoutTab] = useState<"home" | "upcoming" | "settings">(
		"home",
	);

	const { data: teamData, isLoading, error } = useTeamFull(teamSlug);
	const { data: subteams } = useTeamSubteams(teamSlug);
	const { invalidateTeam, invalidateTeamAndUserTeams, refetchTeam } =
		useInvalidateTeam();
	const { data: userTeamsData } = trpc.teams.listUserTeams.useQuery();

	const createSubteamMutation = trpc.teams.createSubteam.useMutation();
	const renameSubteamMutation = trpc.teams.renameSubteam.useMutation();
	const deleteSubteamMutation = trpc.teams.deleteSubteam.useMutation();
	const leaveTeamMutation = trpc.teams.leaveTeam.useMutation();
	const archiveTeamMutation = trpc.teams.archiveTeam.useMutation();

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const getTabFromHash = (): TabName => {
			const hash = window.location.hash.replace("#", "");
			if (
				hash === "people" ||
				hash === "roster" ||
				hash === "stream" ||
				hash === "assignments"
			) {
				return hash as TabName;
			}
			return "roster";
		};
		setActiveTab(getTabFromHash());
		const onHashChange = () => {
			setActiveTab(getTabFromHash());
		};
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	useEffect(() => {
		if (!activeSubteamId && subteams && subteams.length > 0) {
			setActiveSubteamId(subteams[0]?.id ?? null);
		}
	}, [activeSubteamId, subteams]);

	const bannerBg = useMemo(
		() =>
			darkMode
				? "bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900"
				: "bg-gradient-to-r from-blue-50 via-white to-blue-50",
		[darkMode],
	);

	const userTeams = useMemo(
		() =>
			userTeamsData?.teams.map((team) => ({
				id: team.id,
				name: team.name || `${team.school} ${team.division}`,
				slug: team.slug,
				school: team.school,
				division: team.division as "B" | "C",
			})) ?? [],
		[userTeamsData],
	);

	const handleLayoutTabChange = (tab: "home" | "upcoming" | "settings") => {
		setLayoutTab(tab);
		if (tab === "upcoming") {
			router.push("/teams/calendar");
		} else if (tab === "settings") {
			// Handle settings navigation
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

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
			</div>
		);
	}

	if (error || !teamData) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div
					className={`text-xl ${darkMode ? "text-red-400" : "text-red-600"}`}
				>
					{error instanceof Error ? error.message : "Failed to load team data"}
				</div>
			</div>
		);
	}

	const isCaptain = teamData.meta.userRole === "captain";

	const navigateToTab = (tab: TabName) => {
		if (typeof window !== "undefined") {
			window.location.hash = `#${tab}`;
		}
		setActiveTab(tab);
	};

	const handleCreateSubteam = async () => {
		// Auto-generate name based on existing subteams
		// If no subteams exist, name it "Team B" (assuming "Team A" is the main team)
		// If one exists, name it "Team B", if two exist, name it "Team C", etc.
		const existingCount = subteams?.length ?? 0;
		const teamLetter = String.fromCharCode(66 + existingCount); // B = 66, C = 67, etc.
		const name = `Team ${teamLetter}`;

		try {
			const created = await createSubteamMutation.mutateAsync({
				teamSlug,
				name,
			});
			toast.success("Subteam created");
			setActiveSubteamId(created.id);
			await invalidateTeam(teamSlug);
		} catch (mutationError) {
			toast.error(
				mutationError instanceof Error
					? mutationError.message
					: "Failed to create subteam",
			);
		}
	};

	const handleRenameSubteam = async (subteamId: string, newName: string) => {
		if (!newName.trim()) {
			return;
		}
		try {
			await renameSubteamMutation.mutateAsync({
				teamSlug,
				subteamId,
				newName: newName.trim(),
			});
			toast.success("Subteam renamed");
			// Invalidate and refetch team data to ensure roster updates with new subteam name
			await invalidateTeam(teamSlug);
			await refetchTeam(teamSlug);
		} catch (mutationError) {
			toast.error(
				mutationError instanceof Error
					? mutationError.message
					: "Failed to rename subteam",
			);
		}
	};

	const handleDeleteSubteam = (subteamId: string, subteamName: string) => {
		setDeleteSubteamConfirm({ subteamId, subteamName });
	};

	const confirmDeleteSubteam = async () => {
		if (!deleteSubteamConfirm) return;

		const { subteamId } = deleteSubteamConfirm;
		setDeleteSubteamConfirm(null);

		try {
			await deleteSubteamMutation.mutateAsync({ teamSlug, subteamId });
			toast.success("Subteam deleted");
			await invalidateTeam(teamSlug);
			if (activeSubteamId === subteamId) {
				setActiveSubteamId(
					subteams?.find((s) => s.id !== subteamId)?.id ?? null,
				);
			}
		} catch (mutationError) {
			toast.error(
				mutationError instanceof Error
					? mutationError.message
					: "Failed to delete subteam",
			);
		}
	};

	const handleLeaveTeam = async () => {
		try {
			await leaveTeamMutation.mutateAsync({ teamSlug });
			toast.success("You left the team");
			// Invalidate team and user teams list since leaving removes team from list
			await invalidateTeamAndUserTeams(teamSlug);
			router.push("/teams");
		} catch (mutationError) {
			toast.error(
				mutationError instanceof Error
					? mutationError.message
					: "Unable to leave team",
			);
		}
	};

	const handleArchiveTeam = async () => {
		try {
			await archiveTeamMutation.mutateAsync({ teamSlug });
			toast.success("Team deleted");
			// Invalidate all team-related caches including user teams list
			await invalidateTeamAndUserTeams(teamSlug);
			router.push("/teams");
		} catch (mutationError) {
			toast.error(
				mutationError instanceof Error
					? mutationError.message
					: "Unable to delete team",
			);
		}
	};

	return (
		<TeamLayout
			activeTab={layoutTab}
			onTabChangeAction={handleLayoutTabChange}
			userTeams={userTeams}
			currentTeamSlug={teamSlug}
			onTeamSelect={handleTeamSelect}
			onNavigateToMainDashboard={handleNavigateToMainDashboard}
		>
			<div>
				<div
					className={`${bannerBg} border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}
				>
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
							<div>
								<p
									className={`text-xs uppercase tracking-wide ${darkMode ? "text-blue-200" : "text-blue-700"}`}
								>
									Team
								</p>
								<h1
									className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									{teamData.meta.name || teamData.meta.school}
								</h1>
								<p
									className={`mt-1 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									Division {teamData.meta.division} •{" "}
									{isCaptain ? "Captain" : "Member"}{" "}
									{teamData.meta.status === "archived" && (
										<span
											className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${darkMode ? "bg-yellow-900 text-yellow-200" : "bg-yellow-200 text-yellow-900"}`}
										>
											Archived
										</span>
									)}
								</p>
							</div>
							<div className="flex flex-row gap-2 w-full lg:w-auto">
								{isCaptain && (
									<button
										type="button"
										onClick={() => setShowCodes(true)}
										className="inline-flex items-center justify-center rounded-lg bg-blue-600 p-2.5 text-white shadow hover:bg-blue-700 transition-colors"
										title="View join codes"
									>
										<UserPlus className="h-5 w-5" />
									</button>
								)}
								<button
									type="button"
									onClick={() => setConfirmAction("leave")}
									className="inline-flex items-center justify-center rounded-lg bg-amber-600 p-2.5 text-white shadow hover:bg-amber-700 transition-colors"
									title="Leave team"
								>
									<LogOut className="h-5 w-5" />
								</button>
								{isCaptain && (
									<button
										type="button"
										onClick={() => setConfirmAction("delete")}
										className="inline-flex items-center justify-center rounded-lg bg-red-600 p-2.5 text-white shadow hover:bg-red-700 transition-colors"
										title="Delete team"
									>
										<Trash2 className="h-5 w-5" />
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div
				className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${darkMode ? "bg-gray-900" : "bg-white"} min-h-[calc(100vh-200px)]`}
			>
				<TabNavigation activeTab={activeTab} onTabChange={navigateToTab} />
				<div className="py-8 min-h-[calc(100vh-300px)]">
					{activeTab === "roster" &&
						(activeSubteamId ? (
							<RosterTabUnified
								team={{
									id: teamData.meta.teamId,
									school: teamData.meta.school,
									division: teamData.meta.division as "B" | "C",
									slug: teamData.meta.slug,
								}}
								isCaptain={isCaptain}
								activeSubteamId={activeSubteamId}
								subteams={
									subteams?.map((s) => ({
										id: s.id,
										name: s.name,
										team_id: teamData.meta.teamId,
										description: s.description ?? "",
										created_at: s.createdAt,
									})) ?? []
								}
								onSubteamChange={setActiveSubteamId}
								onCreateSubteam={handleCreateSubteam}
								onEditSubteam={handleRenameSubteam}
								onDeleteSubteam={handleDeleteSubteam}
							/>
						) : (
							<div
								className={`rounded-xl p-8 text-center ${darkMode ? "bg-gray-800" : "bg-white"}`}
							>
								<p
									className={`text-lg font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									No subteams yet
								</p>
								<p
									className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
								>
									Create a subteam to start managing your roster.
								</p>
								{isCaptain && (
									<button
										type="button"
										onClick={handleCreateSubteam}
										className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700"}`}
									>
										Create subteam
									</button>
								)}
							</div>
						))}

					{activeTab === "people" && (
						<PeopleTabUnified
							team={{
								id: teamData.meta.teamId,
								school: teamData.meta.school,
								division: teamData.meta.division as "B" | "C",
								slug: teamData.meta.slug,
							}}
							isCaptain={isCaptain}
							activeSubteamId={activeSubteamId}
							subteams={
								subteams?.map((s) => ({
									id: s.id,
									name: s.name,
									team_id: teamData.meta.teamId,
									description: s.description ?? "",
									created_at: s.createdAt,
								})) ?? []
							}
							onSubteamChange={setActiveSubteamId}
						/>
					)}

					{activeTab === "stream" &&
						(activeSubteamId ? (
							<StreamTab
								team={{
									id: teamData.meta.teamId,
									school: teamData.meta.school,
									division: teamData.meta.division as "B" | "C",
									slug: teamData.meta.slug,
								}}
								isCaptain={isCaptain}
								activeSubteamId={activeSubteamId}
							/>
						) : (
							<div
								className={`rounded-xl p-8 text-center ${darkMode ? "bg-gray-800" : "bg-white"}`}
							>
								<p
									className={`text-lg font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									No subteams yet
								</p>
								<p
									className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
								>
									Create a subteam to start using the stream.
								</p>
								{isCaptain && (
									<button
										type="button"
										onClick={handleCreateSubteam}
										className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700"}`}
									>
										Create subteam
									</button>
								)}
							</div>
						))}

					{activeTab === "assignments" && (
						<div className={darkMode ? "text-white" : "text-gray-900"}>
							Assignments tab - TODO
						</div>
					)}
				</div>
			</div>

			{/* Join codes modal */}
			{showCodes && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center"
					style={{
						backgroundColor: darkMode
							? "rgba(0, 0, 0, 0.75)"
							: "rgba(0, 0, 0, 0.5)",
					}}
				>
					<div
						className={`w-full max-w-lg rounded-xl p-6 shadow-2xl border ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200"}`}
					>
						<div className="flex items-center justify-between mb-6">
							<h3
								className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								Join codes
							</h3>
							<button
								type="button"
								onClick={() => setShowCodes(false)}
								className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"}`}
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="space-y-4">
							<div
								className={`rounded-lg border p-4 ${darkMode ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"}`}
							>
								<div className="flex items-center justify-between mb-3">
									<div>
										<p
											className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
										>
											Member code
										</p>
										<p
											className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
										>
											Share with members to join.
										</p>
									</div>
									<button
										type="button"
										onClick={() =>
											navigator.clipboard.writeText(teamData.meta.memberCode)
										}
										className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
									>
										<Clipboard className="mr-1.5 h-4 w-4" />
										Copy
									</button>
								</div>
								<p
									className={`mt-2 font-mono text-sm break-all ${darkMode ? "text-blue-400" : "text-blue-600"}`}
								>
									{teamData.meta.memberCode}
								</p>
							</div>
							{isCaptain && teamData.meta.captainCode && (
								<div
									className={`rounded-lg border p-4 ${darkMode ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"}`}
								>
									<div className="flex items-center justify-between mb-3">
										<div>
											<p
												className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
											>
												Captain code
											</p>
											<p
												className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
											>
												Only share with captains.
											</p>
										</div>
										<button
											type="button"
											onClick={() =>
												navigator.clipboard.writeText(
													teamData.meta.captainCode ?? "",
												)
											}
											className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
										>
											<Clipboard className="mr-1.5 h-4 w-4" />
											Copy
										</button>
									</div>
									<p
										className={`mt-2 font-mono text-sm break-all ${darkMode ? "text-blue-400" : "text-blue-600"}`}
									>
										{teamData.meta.captainCode}
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Confirm modal for leave/delete team */}
			<ConfirmModal
				isOpen={confirmAction !== null}
				onClose={() => setConfirmAction(null)}
				onConfirm={() => {
					if (confirmAction === "leave") {
						handleLeaveTeam();
					} else if (confirmAction === "delete") {
						handleArchiveTeam();
					}
				}}
				title={confirmAction === "leave" ? "Leave team?" : "Delete team?"}
				message={
					confirmAction === "leave"
						? "You will lose access immediately."
						: "This cannot be undone and removes all team data."
				}
				confirmText={confirmAction === "leave" ? "Leave team" : "Delete team"}
				confirmVariant={confirmAction === "leave" ? "warning" : "danger"}
			/>

			{/* Confirm modal for delete subteam */}
			<ConfirmModal
				isOpen={deleteSubteamConfirm !== null}
				onClose={() => setDeleteSubteamConfirm(null)}
				onConfirm={confirmDeleteSubteam}
				title="Delete subteam?"
				message={`Delete ${deleteSubteamConfirm?.subteamName || "this subteam"}? This will remove its roster entries.`}
				confirmText="Delete"
				confirmVariant="danger"
			/>
		</TeamLayout>
	);
}
