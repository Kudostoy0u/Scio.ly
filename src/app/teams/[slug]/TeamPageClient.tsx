/**
 * Team Page Client Component (v2)
 *
 * Consumes hydrated team data from React Query (tRPC backed).
 * All tabs read from the same cache to keep data consistent.
 */

"use client";

import { useTheme } from "@/app/contexts/themeContext";
import {
	useInvalidateTeam,
	useTeamFull,
	useTeamSubteams,
} from "@/lib/hooks/useTeam";
import { trpc } from "@/lib/trpc/client";
import { Clipboard, LogOut, ShieldCheck, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import PeopleTabUnified from "../components/PeopleTabUnified";
import RosterTabUnified from "../components/RosterTabUnified";
import TabNavigation from "../components/TabNavigation";
import TeamLayout from "../components/TeamLayout";

interface TeamPageClientProps {
	teamSlug: string;
}

type TabName = "home" | "people" | "roster" | "assignments";

export default function TeamPageClient({ teamSlug }: TeamPageClientProps) {
	const { darkMode } = useTheme();
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<TabName>("home");
	const [activeSubteamId, setActiveSubteamId] = useState<string | null>(null);
	const [showCodes, setShowCodes] = useState(false);
	const [confirmAction, setConfirmAction] = useState<"leave" | "delete" | null>(
		null,
	);
	const [layoutTab, setLayoutTab] = useState<"home" | "upcoming" | "settings">(
		"home",
	);

	const { data: teamData, isLoading, error } = useTeamFull(teamSlug);
	const { data: subteams } = useTeamSubteams(teamSlug);
	const { invalidateTeam } = useInvalidateTeam();
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
			if (hash === "people" || hash === "roster" || hash === "assignments") {
				return hash;
			}
			return "home";
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
			if (tab === "home") {
				window.location.hash = "";
			} else {
				window.location.hash = `#${tab}`;
			}
		}
		setActiveTab(tab);
	};

	const handleCreateSubteam = async () => {
		const name =
			window.prompt("Subteam name? Leave blank for default") ?? undefined;
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
			await invalidateTeam(teamSlug);
		} catch (mutationError) {
			toast.error(
				mutationError instanceof Error
					? mutationError.message
					: "Failed to rename subteam",
			);
		}
	};

	const handleDeleteSubteam = async (
		subteamId: string,
		subteamName: string,
	) => {
		if (
			!window.confirm(
				`Delete ${subteamName || "this subteam"}? This will remove its roster entries.`,
			)
		) {
			return;
		}
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
			router.push("/teams");
			await invalidateTeam(teamSlug);
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
			await invalidateTeam(teamSlug);
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
										<span className="ml-2 inline-flex items-center rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-semibold text-yellow-900">
											Archived
										</span>
									)}
								</p>
							</div>
							<div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto">
								{isCaptain && (
									<button
										type="button"
										onClick={() => setShowCodes(true)}
										className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
									>
										<ShieldCheck className="mr-2 h-4 w-4" />
										View join codes
									</button>
								)}
								<button
									type="button"
									onClick={() => setConfirmAction("leave")}
									className="inline-flex items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700"
								>
									<LogOut className="mr-2 h-4 w-4" />
									Leave team
								</button>
								{isCaptain && (
									<button
										type="button"
										onClick={() => setConfirmAction("delete")}
										className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Delete team
									</button>
								)}
							</div>
						</div>
						<div className="mt-6">
							<TabNavigation
								activeTab={activeTab}
								onTabChange={navigateToTab}
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{activeTab === "home" && (
					<div className="grid gap-6 md:grid-cols-2">
						<div
							className={`rounded-xl p-6 shadow-sm ${darkMode ? "bg-gray-800" : "bg-white"}`}
						>
							<h3 className="text-lg font-semibold mb-2">Team Info</h3>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Last updated:{" "}
								{new Date(teamData.meta.updatedAt).toLocaleString()}
							</p>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Version: {teamData.meta.version}
							</p>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Status: {teamData.meta.status}
							</p>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Subteams: {subteams?.length ?? 0}
							</p>
							<div className="mt-4 flex flex-wrap gap-2">
								<p className="text-xs text-gray-500 dark:text-gray-400">
									Use the header controls to manage membership and deletion.
								</p>
							</div>
						</div>
						<div
							className={`rounded-xl p-6 shadow-sm space-y-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}
						>
							<div>
								<h3 className="text-lg font-semibold mb-2">Join Codes</h3>
								<div className="space-y-2">
									<div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
										<div>
											<p className="font-medium">Member code</p>
											<p className="text-gray-500 dark:text-gray-400">
												Share with members to join.
											</p>
										</div>
										<div className="flex items-center space-x-2">
											<span className="font-mono text-sm">
												{teamData.meta.memberCode}
											</span>
											<button
												type="button"
												onClick={() =>
													navigator.clipboard.writeText(
														teamData.meta.memberCode,
													)
												}
												className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
											>
												Copy
											</button>
										</div>
									</div>
									{isCaptain && teamData.meta.captainCode && (
										<div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
											<div>
												<p className="font-medium">Captain code</p>
												<p className="text-gray-500 dark:text-gray-400">
													Only share with captains.
												</p>
											</div>
											<div className="flex items-center space-x-2">
												<span className="font-mono text-sm">
													{teamData.meta.captainCode}
												</span>
												<button
													type="button"
													onClick={() =>
														navigator.clipboard.writeText(
															teamData.meta.captainCode ?? "",
														)
													}
													className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
												>
													Copy
												</button>
											</div>
										</div>
									)}
								</div>
							</div>
							<div>
								<h3 className="text-lg font-semibold mb-2">Roster Snapshot</h3>
								<p className="text-2xl font-bold">
									{teamData.members.length}{" "}
									{teamData.members.length === 1 ? "person" : "people"}
								</p>
								<p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
									Assignments: {teamData.assignments.length}
								</p>
							</div>
						</div>
					</div>
				)}

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

				{activeTab === "roster" && activeSubteamId && (
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
				)}

				{activeTab === "assignments" && (
					<div className={darkMode ? "text-white" : "text-gray-900"}>
						Assignments tab - TODO
					</div>
				)}
			</div>

			{/* Join codes modal */}
			{showCodes && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div
						className={`w-full max-w-lg rounded-lg p-6 shadow-xl ${darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
					>
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold">Join codes</h3>
							<button
								type="button"
								onClick={() => setShowCodes(false)}
								className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<div className="space-y-3">
							<div
								className={`rounded-lg border p-3 ${darkMode ? "border-gray-700" : "border-gray-200"}`}
							>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">Member code</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											Share with members to join.
										</p>
									</div>
									<button
										type="button"
										onClick={() =>
											navigator.clipboard.writeText(teamData.meta.memberCode)
										}
										className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
									>
										<Clipboard className="mr-1 h-4 w-4" />
										Copy
									</button>
								</div>
								<p className="mt-2 font-mono text-sm">
									{teamData.meta.memberCode}
								</p>
							</div>
							{isCaptain && teamData.meta.captainCode && (
								<div
									className={`rounded-lg border p-3 ${darkMode ? "border-gray-700" : "border-gray-200"}`}
								>
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium">Captain code</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">
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
											className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
										>
											<Clipboard className="mr-1 h-4 w-4" />
											Copy
										</button>
									</div>
									<p className="mt-2 font-mono text-sm">
										{teamData.meta.captainCode}
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Confirm modal */}
			{confirmAction && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div
						className={`w-full max-w-md rounded-lg p-6 shadow-xl ${darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
					>
						<h3 className="text-lg font-semibold mb-2">
							{confirmAction === "leave" ? "Leave team?" : "Delete team?"}
						</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
							{confirmAction === "leave"
								? "You will lose access immediately."
								: "This cannot be undone and removes all team data."}
						</p>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setConfirmAction(null)}
								className="rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => {
									const action = confirmAction;
									setConfirmAction(null);
									if (action === "leave") {
										handleLeaveTeam();
									} else {
										handleArchiveTeam();
									}
								}}
								className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${
									confirmAction === "leave"
										? "bg-gray-700 hover:bg-gray-800"
										: "bg-red-600 hover:bg-red-700"
								}`}
							>
								{confirmAction === "leave" ? "Leave team" : "Delete team"}
							</button>
						</div>
					</div>
				</div>
			)}
		</TeamLayout>
	);
}
