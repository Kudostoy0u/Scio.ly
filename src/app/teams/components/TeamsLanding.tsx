"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { trpc } from "@/lib/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { Calendar, Landmark, Settings, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import NotImplemented from "./NotImplemented";
import { TeamActionSection } from "./TeamActionSection";
import TeamCalendar from "./TeamCalendar";
import { TeamCard } from "./TeamCard";
import TeamInvitationModal, {
	type TeamInvitationModalInvite,
} from "./TeamInvitationModal";
import TeamLayout from "./TeamLayout";

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
		role: "admin" | "captain" | "member";
	}>;
}

interface TeamsLandingProps {
	onCreateTeam: () => void;
	onJoinTeam: () => void;
	userTeams: Team[];
	onTeamSelect: (team: Team) => void;
	isPreviewMode?: boolean;
}

export default function TeamsLanding({
	onCreateTeam,
	onJoinTeam,
	userTeams,
	onTeamSelect: _onTeamSelect,
	isPreviewMode = false,
}: TeamsLandingProps) {
	const { darkMode } = useTheme();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [activeTab, setActiveTab] = useState<"home" | "upcoming" | "settings">(
		"home",
	);

	// Read tab from URL query parameter
	useEffect(() => {
		const tabParam = searchParams.get("tab");
		if (tabParam === "settings") {
			setActiveTab("settings");
		} else if (tabParam === "upcoming") {
			setActiveTab("upcoming");
		} else {
			setActiveTab("home");
		}
	}, [searchParams]);
	const [showLinkInviteModal, setShowLinkInviteModal] = useState(false);
	const [shouldFetchLinkInvites, setShouldFetchLinkInvites] = useState(false);
	const dismissedLinkInviteIdsRef = useRef<Set<string>>(new Set());
	const hasMountedRef = useRef(false);
	const queryClient = useQueryClient();
	const acceptLinkInvite = trpc.teams.acceptLinkInvite.useMutation();
	const declineLinkInvite = trpc.teams.declineLinkInvite.useMutation();
	const utils = trpc.useUtils();

	// Read from cache using useSyncExternalStore to avoid render-phase updates
	const linkInvitesQueryKey = getQueryKey(
		trpc.teams.pendingLinkInvites,
		undefined,
		"query",
	);
	type LinkInvite = {
		id: string;
		teamId: string;
		slug: string;
		teamName: string;
		school: string;
		division: string;
		rosterDisplayName: string;
	};
	const cachedLinkInvitesData = useSyncExternalStore(
		(listener) => queryClient.getQueryCache().subscribe(listener),
		() => queryClient.getQueryState(linkInvitesQueryKey)?.data,
		() => queryClient.getQueryState(linkInvitesQueryKey)?.data,
	) as { linkInvites: LinkInvite[] } | undefined;

	// Enable query after initial render to avoid render-phase updates
	useEffect(() => {
		hasMountedRef.current = true;
		if (!isPreviewMode) {
			setShouldFetchLinkInvites(true);
		}
	}, [isPreviewMode]);

	// Fetch pending link invitations (only after mount)
	const { data: fetchedLinkInvitesData } =
		trpc.teams.pendingLinkInvites.useQuery(undefined, {
			enabled: shouldFetchLinkInvites && !isPreviewMode,
			staleTime: 0,
			refetchOnMount: "always",
			refetchOnWindowFocus: false,
		});

	// Use fetched data if available, otherwise fall back to cached data
	const linkInvitesData = fetchedLinkInvitesData ?? cachedLinkInvitesData;
	const visibleLinkInvites = linkInvitesData?.linkInvites?.filter(
		(invite) => !dismissedLinkInviteIdsRef.current.has(invite.id),
	);

	// Show modal if there are pending link invites
	useEffect(() => {
		setShowLinkInviteModal((visibleLinkInvites?.length ?? 0) > 0);
	}, [visibleLinkInvites]);

	// Check if user is a captain of any team
	const isCaptain = userTeams.some((team) =>
		team.members.some(
			(member) => member.role === "captain" || member.role === "admin",
		),
	);

	const handleTabChange = (tab: "home" | "upcoming" | "settings") => {
		if (tab === "upcoming") {
			router.push("/teams/calendar");
		} else {
			setActiveTab(tab);
		}
	};

	const handleNavigateToMainDashboard = () => {
		// Already on the main dashboard, just ensure we're on home tab
		setActiveTab("home");
	};

	// Convert TeamsLanding Team type to Sidebar Team type
	const sidebarTeams = userTeams.map((team) => ({
		id: team.id,
		name: team.name,
		slug: team.slug,
		school: team.school,
		division: team.division,
	}));

	// Handle team selection from sidebar
	const handleSidebarTeamSelect = (sidebarTeam: {
		id: string;
		name: string;
		slug: string;
		school: string;
		division: "B" | "C";
	}) => {
		// Find the full team object and call the original handler
		const fullTeam = userTeams.find((team) => team.id === sidebarTeam.id);
		if (fullTeam) {
			// Navigate directly to team page, clearing any query parameters
			router.push(`/teams/${fullTeam.slug}`);
		}
	};

	return (
		<TeamLayout
			activeTab={activeTab}
			onTabChangeAction={handleTabChange}
			userTeams={sidebarTeams}
			onTeamSelect={handleSidebarTeamSelect}
			onNavigateToMainDashboard={handleNavigateToMainDashboard}
		>
			{activeTab === "home" && (
				<div className="p-8">
					<div className="max-w-4xl mx-auto">
						{isPreviewMode ? (
							/* Preview Mode Content */
							<div>
								<div className="text-center py-12">
									<div
										className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}
									>
										<Landmark
											className={`w-12 h-12 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
										/>
									</div>
									<h2
										className={`text-3xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
									>
										Team Management Made Simple
									</h2>
									<p
										className={`text-lg mb-8 max-w-2xl mx-auto ${darkMode ? "text-gray-300" : "text-gray-600"}`}
									>
										Create teams, manage rosters, track assignments, and
										collaborate with your Science Olympiad team.{" "}
										<span className="text-blue-500 font-bold">
											Sign in to get started{" "}
										</span>
										with your team management journey.
									</p>

									<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
										<div
											className={`p-6 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
										>
											<div
												className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto ${darkMode ? "bg-blue-900" : "bg-blue-100"}`}
											>
												<Users
													className={`w-6 h-6 ${darkMode ? "text-blue-300" : "text-blue-600"}`}
												/>
											</div>
											<h3
												className={`text-lg font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
											>
												Team Creation
											</h3>
											<p
												className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
											>
												Create teams with custom divisions and invite members
												with unique codes.
											</p>
										</div>

										<div
											className={`p-6 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
										>
											<div
												className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto ${darkMode ? "bg-green-900" : "bg-green-100"}`}
											>
												<Calendar
													className={`w-6 h-6 ${darkMode ? "text-green-300" : "text-green-600"}`}
												/>
											</div>
											<h3
												className={`text-lg font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
											>
												Event Management
											</h3>
											<p
												className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
											>
												Organize Science Olympiad events and track team member
												assignments.
											</p>
										</div>

										<div
											className={`p-6 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
										>
											<div
												className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto ${darkMode ? "bg-purple-900" : "bg-purple-100"}`}
											>
												<Settings
													className={`w-6 h-6 ${darkMode ? "text-purple-300" : "text-purple-600"}`}
												/>
											</div>
											<h3
												className={`text-lg font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
											>
												Collaboration
											</h3>
											<p
												className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
											>
												Share materials, coordinate practices, and manage team
												communications.
											</p>
										</div>
									</div>
								</div>
							</div>
						) : userTeams.length > 0 ? (
							/* Teams List */
							<div>
								<div className="flex items-center justify-between mb-6">
									<h2
										className={`text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
									>
										Your Teams
									</h2>
									<TeamActionSection
										onCreateTeam={onCreateTeam}
										onJoinTeam={onJoinTeam}
										isCompact={true}
									/>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{userTeams.map((team) => (
										<TeamCard
											key={team.id}
											team={team}
											onClick={(teamSlug) => router.push(`/teams/${teamSlug}`)}
										/>
									))}
								</div>
							</div>
						) : (
							/* Empty State */
							<div className="text-center">
								{/* Illustration */}
								<div className="mb-8 px-4 overflow-hidden">
									<div className="relative w-full max-w-96 h-48 sm:h-64 mx-auto">
										{/* Window frame */}
										<div
											className={`absolute inset-0 rounded-lg shadow-lg border-2 ${
												darkMode
													? "bg-gray-800 border-gray-600"
													: "bg-white border-gray-200"
											}`}
										>
											<div className="p-2 sm:p-4">
												<div className="flex items-center space-x-1 sm:space-x-2 mb-2 sm:mb-4">
													<div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-400 rounded-full" />
													<div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-full" />
													<div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full" />
												</div>
												<div className="grid grid-cols-2 gap-1 sm:gap-2 h-20 sm:h-32">
													<div
														className={`rounded flex items-center justify-center ${
															darkMode ? "bg-blue-900" : "bg-blue-100"
														}`}
													>
														<div
															className={`w-6 h-6 sm:w-8 sm:h-8 rounded ${darkMode ? "bg-blue-600" : "bg-blue-300"}`}
														/>
													</div>
													<div
														className={`rounded flex items-center justify-center ${
															darkMode ? "bg-green-900" : "bg-green-100"
														}`}
													>
														<div
															className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full ${
																darkMode ? "bg-green-600" : "bg-green-300"
															}`}
														/>
													</div>
												</div>
											</div>
										</div>

										{/* Decorative elements */}
										<div
											className={`absolute left-0 sm:-left-4 top-12 sm:top-8 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
												darkMode ? "bg-pink-600" : "bg-pink-300"
											}`}
										>
											<div
												className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${darkMode ? "bg-pink-400" : "bg-pink-100"}`}
											/>
										</div>
										<div
											className={`absolute right-0 sm:-right-4 top-8 sm:top-16 w-4 h-4 sm:w-6 sm:h-6 rounded flex items-center justify-center ${
												darkMode ? "bg-yellow-600" : "bg-yellow-300"
											}`}
										>
											<div
												className={`w-2 h-2 sm:w-3 sm:h-3 rounded ${darkMode ? "bg-yellow-400" : "bg-yellow-100"}`}
											/>
										</div>
										<div
											className={`absolute -bottom-2 sm:-bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-6 sm:w-12 sm:h-8 rounded flex items-center justify-center ${
												darkMode ? "bg-blue-700" : "bg-blue-200"
											}`}
										>
											<div
												className={`w-6 h-3 sm:w-8 sm:h-4 rounded ${darkMode ? "bg-blue-500" : "bg-blue-100"}`}
											/>
										</div>
									</div>
								</div>

								{/* Call to action */}
								<h2
									className={`text-2xl font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									Add a team to get started
								</h2>

								{/* Action buttons */}
								<TeamActionSection
									onCreateTeam={onCreateTeam}
									onJoinTeam={onJoinTeam}
								/>

								{/* Help text */}
								<div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
									Don&apos;t see your teams? Try another account.
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{activeTab === "upcoming" && (
				<TeamCalendar
					teamId={userTeams[0]?.id}
					isCaptain={isCaptain}
					teamSlug={undefined}
				/>
			)}

			{activeTab === "settings" && (
				<NotImplemented
					title="Under Construction"
					description="We're currently building out the team settings page. Check back soon for management features!"
				/>
			)}

			{/* Link Invite Modal */}
			{showLinkInviteModal &&
				visibleLinkInvites &&
				visibleLinkInvites.length > 0 && (
					<TeamInvitationModal
						invites={visibleLinkInvites.map(
							(invite: LinkInvite): TeamInvitationModalInvite => ({
								id: invite.id,
								teamSlug: invite.slug,
								teamName: invite.teamName,
								school: invite.school,
								division: invite.division,
								rosterDisplayName: invite.rosterDisplayName,
							}),
						)}
						onClose={() => setShowLinkInviteModal(false)}
						onAccept={async (invite) => {
							dismissedLinkInviteIdsRef.current.add(invite.id);
							const snapshotInvites = linkInvitesData;
							const snapshotTeams = utils.teams.listUserTeams.getData();
							utils.teams.pendingLinkInvites.setData(undefined, (prev) => {
								const nextInvites =
									prev?.linkInvites?.filter(
										(item: LinkInvite) => item.id !== invite.id,
									) ?? [];
								return { linkInvites: nextInvites };
							});
							utils.teams.listUserTeams.setData(undefined, (prev) => {
								const exists = prev?.teams?.some(
									(team) => team.slug === invite.teamSlug,
								);
								if (exists) {
									return prev ?? { teams: [] };
								}
								const nextTeams = [
									...(prev?.teams ?? []),
									{
										id: invite.teamSlug,
										slug: invite.teamSlug,
										name: invite.teamName,
										school: invite.school,
										division: invite.division,
										status: "active",
										role: "member" as const,
									},
								];
								return { teams: nextTeams };
							});
							try {
								await acceptLinkInvite.mutateAsync({
									linkInviteId: invite.id,
								});
								toast.success("Joined team");
							} catch (error) {
								utils.teams.pendingLinkInvites.setData(
									undefined,
									() => snapshotInvites,
								);
								utils.teams.listUserTeams.setData(
									undefined,
									() => snapshotTeams,
								);
								throw error;
							}
							setShowLinkInviteModal(false);
						}}
						onDecline={async (invite) => {
							dismissedLinkInviteIdsRef.current.add(invite.id);
							const snapshotInvites = linkInvitesData;
							utils.teams.pendingLinkInvites.setData(undefined, (prev) => {
								const nextInvites =
									prev?.linkInvites?.filter(
										(item: LinkInvite) => item.id !== invite.id,
									) ?? [];
								return { linkInvites: nextInvites };
							});
							try {
								await declineLinkInvite.mutateAsync({
									linkInviteId: invite.id,
								});
								toast.info("Invite dismissed");
							} catch (error) {
								utils.teams.pendingLinkInvites.setData(
									undefined,
									() => snapshotInvites,
								);
								throw error;
							}
							setShowLinkInviteModal(false);
						}}
					/>
				)}
		</TeamLayout>
	);
}
