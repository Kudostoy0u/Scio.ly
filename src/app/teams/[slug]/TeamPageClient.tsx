/**
 * Team Page Client Component (v2)
 *
 * Consumes hydrated team data from React Query (tRPC backed).
 * All tabs read from the same cache to keep data consistent.
 */

"use client";

import ConfirmModal from "@/app/components/ConfirmModal";
import Modal from "@/app/components/Modal";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import {
	useInvalidateTeam,
	useTeamCacheInvalidation,
	useTeamFullCacheOnly,
} from "@/lib/hooks/useTeam";
import { trpc } from "@/lib/trpc/client";
import { getQueryKey } from "@trpc/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Clipboard, LogOut, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import AssignmentsTab from "../components/AssignmentsTab";
import NotImplemented from "../components/NotImplemented";
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
	const { user, loading: authLoading } = useAuth();
	const queryClient = useQueryClient();
	const utils = trpc.useUtils();
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

	const { error: manifestError, isError: manifestHasError } =
		useTeamCacheInvalidation(teamSlug);

	const { data: teamData, error } = useTeamFullCacheOnly(teamSlug);
	const subteams = teamData?.subteams ?? [];
	const { updateTeamData } = useInvalidateTeam();
	const userTeamsQueryKey = useMemo(
		() => getQueryKey(trpc.teams.listUserTeams, undefined, "query"),
		[],
	);
	const hasUserTeamsCache = useSyncExternalStore(
		(listener) => queryClient.getQueryCache().subscribe(listener),
		() => !!queryClient.getQueryState(userTeamsQueryKey)?.data,
		() => !!queryClient.getQueryState(userTeamsQueryKey)?.data,
	);
	const { data: userTeamsData } = trpc.teams.listUserTeams.useQuery(undefined, {
		enabled: hasUserTeamsCache,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	});

	const createSubteamMutation = trpc.teams.createSubteam.useMutation();
	const renameSubteamMutation = trpc.teams.renameSubteam.useMutation();
	const deleteSubteamMutation = trpc.teams.deleteSubteam.useMutation();
	const leaveTeamMutation = trpc.teams.leaveTeam.useMutation();
	const archiveTeamMutation = trpc.teams.archiveTeam.useMutation();

	const teamQueryKey = { teamSlug };
	const snapshotTeam = () => utils.teams.full.getData(teamQueryKey);
	const restoreTeam = (snapshot: typeof teamData | undefined) => {
		updateTeamData(teamSlug, () => snapshot);
	};
	const snapshotUserTeams = () => utils.teams.listUserTeams.getData();
	const restoreUserTeams = (
		snapshot: ReturnType<typeof utils.teams.listUserTeams.getData>,
	) => {
		utils.teams.listUserTeams.setData(undefined, () => snapshot);
	};

	useEffect(() => {
		if (authLoading) {
			return;
		}
		if (!user) {
			router.replace("/auth");
			return;
		}
	}, [authLoading, router, user]);

	useEffect(() => {
		if (!manifestHasError || !manifestError) {
			return;
		}
		const errorCode =
			manifestError &&
			typeof manifestError === "object" &&
			"data" in manifestError &&
			manifestError.data &&
			typeof manifestError.data === "object" &&
			"code" in manifestError.data
				? (manifestError.data.code as string)
				: null;
		if (errorCode !== "NOT_FOUND" && errorCode !== "FORBIDDEN") {
			return;
		}
		utils.teams.listUserTeams.setData(undefined, (prev) => {
			if (!prev) return prev;
			return {
				...prev,
				teams: (prev.teams ?? []).filter((team) => team.slug !== teamSlug),
			};
		});
		utils.teams.full.setData({ teamSlug }, undefined);
		if (typeof window !== "undefined") {
			const lastVisited = window.localStorage.getItem("teams:lastVisited");
			if (lastVisited === teamSlug) {
				window.localStorage.removeItem("teams:lastVisited");
			}
		}
		router.replace("/teams?view=all");
	}, [manifestError, manifestHasError, router, teamSlug, utils]);

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
		if (typeof window === "undefined") {
			return;
		}
		window.localStorage.setItem("teams:lastVisited", teamSlug);
	}, [teamSlug]);

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

	if (error && !teamData) {
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

	const teamMeta = teamData?.meta ?? {
		teamId: "",
		slug: teamSlug,
		name: "",
		school: "",
		division: "",
		updatedAt: "",
		version: 0,
		userRole: "member" as const,
		status: "active",
		memberCode: "",
		captainCode: null,
	};

	const isAdmin = teamMeta.userRole === "admin";
	const isCaptain = teamMeta.userRole === "captain" || isAdmin;

	const navigateToTab = (tab: TabName) => {
		if (typeof window !== "undefined") {
			window.location.hash = `#${tab}`;
		}
		setActiveTab(tab);
	};

	const handleCreateSubteam = async () => {
		const snapshot = snapshotTeam();
		const tempId = `temp-${Date.now()}-${Math.random()
			.toString(36)
			.slice(2, 10)}`;
		const nextOrder =
			Math.max(0, ...subteams.map((subteam) => subteam.displayOrder ?? 0)) + 1;
		const baseIndex = subteams.length;
		const letter = String.fromCharCode("A".charCodeAt(0) + baseIndex);
		const tempName = `Team ${letter}`;
		const tempCreatedAt = new Date().toISOString();
		if (teamMeta.teamId) {
			updateTeamData(teamSlug, (prev) => {
				if (!prev) return prev;
				return {
					...prev,
					subteams: [
						...prev.subteams,
						{
							id: tempId,
							teamId: teamMeta.teamId,
							name: tempName,
							description: null,
							rosterNotes: null,
							displayOrder: nextOrder,
							createdAt: tempCreatedAt,
						},
					],
				};
			});
			setActiveSubteamId(tempId);
		}

		try {
			const created = await createSubteamMutation.mutateAsync({
				teamSlug,
			});
			toast.success("Subteam created");
			updateTeamData(teamSlug, (prev) => {
				if (!prev) return prev;
				return {
					...prev,
					subteams: prev.subteams.map((subteam) =>
						subteam.id === tempId
							? {
									...subteam,
									id: created.id,
									name: created.name,
									description: created.description,
									displayOrder: created.displayOrder,
								}
							: subteam,
					),
				};
			});
			setActiveSubteamId(created.id);
		} catch (mutationError) {
			restoreTeam(snapshot);
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
		const snapshot = snapshotTeam();
		updateTeamData(teamSlug, (prev) => {
			if (!prev) return prev;
			return {
				...prev,
				subteams: prev.subteams.map((subteam) =>
					subteam.id === subteamId
						? { ...subteam, name: newName.trim() }
						: subteam,
				),
			};
		});
		try {
			await renameSubteamMutation.mutateAsync({
				teamSlug,
				subteamId,
				newName: newName.trim(),
			});
			toast.success("Subteam renamed");
		} catch (mutationError) {
			restoreTeam(snapshot);
			toast.error(
				mutationError instanceof Error
					? mutationError.message
					: "Failed to rename subteam",
			);
		}
	};

	const handleDeleteSubteam = (subteamId: string, subteamName: string) => {
		if (!isCaptain) {
			return;
		}
		setDeleteSubteamConfirm({ subteamId, subteamName });
	};

	const confirmDeleteSubteam = async () => {
		if (!deleteSubteamConfirm) return;

		const { subteamId } = deleteSubteamConfirm;
		setDeleteSubteamConfirm(null);

		const snapshot = snapshotTeam();
		const nextSubteamId =
			subteams?.find((subteam) => subteam.id !== subteamId)?.id ?? null;
		updateTeamData(teamSlug, (prev) => {
			if (!prev) return prev;
			return {
				...prev,
				subteams: prev.subteams.filter((subteam) => subteam.id !== subteamId),
			};
		});
		if (activeSubteamId === subteamId) {
			setActiveSubteamId(nextSubteamId);
		}

		try {
			await deleteSubteamMutation.mutateAsync({ teamSlug, subteamId });
			toast.success("Subteam deleted");
		} catch (mutationError) {
			restoreTeam(snapshot);
			toast.error(
				mutationError instanceof Error
					? mutationError.message
					: "Failed to delete subteam",
			);
		}
	};

	const handleLeaveTeam = async () => {
		const snapshotTeams = snapshotUserTeams();
		const snapshot = snapshotTeam();
		utils.teams.listUserTeams.setData(undefined, (current) => {
			if (!current) return current;
			return {
				...current,
				teams: (current.teams ?? []).filter((team) => team.slug !== teamSlug),
			};
		});
		utils.teams.full.setData(teamQueryKey, undefined);
		try {
			await leaveTeamMutation.mutateAsync({ teamSlug });
			toast.success("You left the team");
			router.push("/teams");
		} catch (mutationError) {
			restoreTeam(snapshot);
			restoreUserTeams(snapshotTeams);
			toast.error(
				mutationError instanceof Error
					? mutationError.message
					: "Unable to leave team",
			);
		}
	};

	const handleArchiveTeam = async () => {
		const snapshotTeams = snapshotUserTeams();
		const snapshot = snapshotTeam();
		utils.teams.listUserTeams.setData(undefined, (current) => {
			if (!current) return current;
			return {
				...current,
				teams: (current.teams ?? []).filter((team) => team.slug !== teamSlug),
			};
		});
		utils.teams.full.setData(teamQueryKey, undefined);
		try {
			await archiveTeamMutation.mutateAsync({ teamSlug });
			toast.success("Team deleted");
			router.push("/teams");
		} catch (mutationError) {
			restoreTeam(snapshot);
			restoreUserTeams(snapshotTeams);
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
			{layoutTab === "settings" ? (
				<NotImplemented
					title="Under Construction"
					description="We're currently building out the team settings page. Check back soon for management features!"
				/>
			) : (
				<>
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
											{teamMeta.name || teamMeta.school || teamSlug}
										</h1>
										<p
											className={`mt-1 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
										>
											Division {teamMeta.division || "—"} •{" "}
											{isCaptain ? "Captain" : "Member"}{" "}
											{teamMeta.status === "archived" && (
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
										{isAdmin && (
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
											id: teamMeta.teamId,
											school: teamMeta.school,
											division: teamMeta.division as "B" | "C",
											slug: teamMeta.slug,
										}}
										isCaptain={isCaptain}
										activeSubteamId={activeSubteamId}
										subteams={
											subteams?.map(
												(s: {
													id: string;
													name: string;
													createdAt: string;
													description: string | null;
												}) => ({
													id: s.id,
													name: s.name,
													team_id: teamMeta.teamId,
													description: s.description ?? "",
													created_at: s.createdAt,
												}),
											) ?? []
										}
										onSubteamChange={setActiveSubteamId}
										onCreateSubteam={handleCreateSubteam}
										onEditSubteam={handleRenameSubteam}
										onDeleteSubteam={
											isCaptain ? handleDeleteSubteam : undefined
										}
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
										id: teamMeta.teamId,
										school: teamMeta.school,
										division: teamMeta.division as "B" | "C",
										slug: teamMeta.slug,
									}}
									isCaptain={isCaptain}
									isAdmin={isAdmin}
									activeSubteamId={activeSubteamId}
									subteams={
										subteams?.map(
											(s: {
												id: string;
												name: string;
												createdAt: string;
												description: string | null;
											}) => ({
												id: s.id,
												name: s.name,
												team_id: teamMeta.teamId,
												description: s.description ?? "",
												created_at: s.createdAt,
											}),
										) ?? []
									}
									onSubteamChange={setActiveSubteamId}
								/>
							)}

							{activeTab === "stream" &&
								(activeSubteamId ? (
									<StreamTab
										team={{
											id: teamMeta.teamId,
											school: teamMeta.school,
											division: teamMeta.division as "B" | "C",
											slug: teamMeta.slug,
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
								<AssignmentsTab
									teamSlug={teamSlug}
									isCaptain={isCaptain}
									activeSubteamId={activeSubteamId}
									onCreateAssignment={() => {
										// Handled internally by AssignmentsTab
									}}
								/>
							)}
						</div>
					</div>

					{/* Join codes modal */}
					<Modal
						isOpen={showCodes}
						onClose={() => setShowCodes(false)}
						title="Join codes"
						maxWidth="lg"
					>
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
										onClick={async () => {
											try {
												await navigator.clipboard.writeText(
													teamMeta.memberCode,
												);
												toast.success("Member code copied to clipboard!");
											} catch (_error) {
												toast.error("Failed to copy code");
											}
										}}
										className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
									>
										<Clipboard className="mr-1.5 h-4 w-4" />
										Copy
									</button>
								</div>
								<p
									className={`mt-2 font-mono text-sm break-all ${darkMode ? "text-blue-400" : "text-blue-600"}`}
								>
									{teamMeta.memberCode}
								</p>
							</div>
							{isCaptain && teamMeta.captainCode && (
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
											onClick={async () => {
												try {
													await navigator.clipboard.writeText(
														teamMeta.captainCode ?? "",
													);
													toast.success("Captain code copied to clipboard!");
												} catch (_error) {
													toast.error("Failed to copy code");
												}
											}}
											className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
										>
											<Clipboard className="mr-1.5 h-4 w-4" />
											Copy
										</button>
									</div>
									<p
										className={`mt-2 font-mono text-sm break-all ${darkMode ? "text-blue-400" : "text-blue-600"}`}
									>
										{teamMeta.captainCode}
									</p>
								</div>
							)}
						</div>
					</Modal>

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
						confirmText={
							confirmAction === "leave" ? "Leave team" : "Delete team"
						}
						confirmVariant={confirmAction === "leave" ? "warning" : "danger"}
					/>

					{/* Confirm modal for delete subteam */}
					<ConfirmModal
						isOpen={isCaptain && deleteSubteamConfirm !== null}
						onClose={() => setDeleteSubteamConfirm(null)}
						onConfirm={confirmDeleteSubteam}
						title="Delete subteam?"
						message={`Delete ${deleteSubteamConfirm?.subteamName || "this subteam"}? This will remove its roster entries.`}
						confirmText="Delete"
						confirmVariant="danger"
					/>
				</>
			)}
		</TeamLayout>
	);
}
