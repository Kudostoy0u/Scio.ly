"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { getCachedUserProfile } from "@/app/utils/userProfileCache";
import type { TeamFullData } from "@/lib/server/teams/shared";
import { trpc } from "@/lib/trpc/client";
import { generateDisplayName } from "@/lib/utils/content/displayNameUtils";
import { getQueryKey } from "@trpc/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { toast } from "react-toastify";
import CreateTeamModal from "./CreateTeamModal";
import JoinTeamModal from "./JoinTeamModal";
import TeamInvitationModal, {
	type TeamInvitationModalInvite,
} from "./TeamInvitationModal";
import TeamsLanding from "./TeamsLanding";

export default function TeamsPageClient() {
	const { user } = useAuth();
	const router = useRouter();
	const queryClient = useQueryClient();
	const searchParams = useSearchParams();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
	const [showInviteModal, setShowInviteModal] = useState(false);

	const utils = trpc.useUtils();
	const listUserTeamsQueryKey = useMemo(
		() => getQueryKey(trpc.teams.listUserTeams, undefined, "query"),
		[],
	);
	const cachedTeamsData = useSyncExternalStore(
		(listener) => queryClient.getQueryCache().subscribe(listener),
		() => queryClient.getQueryState(listUserTeamsQueryKey)?.data,
		() => queryClient.getQueryState(listUserTeamsQueryKey)?.data,
	) as
		| {
				teams: Array<{
					id: string;
					slug: string;
					name?: string | null;
					school: string;
					division?: string | null;
					role?: string | null;
				}>;
		  }
		| undefined;
	const viewAll = searchParams.get("view") === "all";
	const tab = searchParams.get("tab");
	const skipAutoRedirect = viewAll || tab === "settings";
	const justUnlinked = useMemo(() => {
		if (typeof document === "undefined") {
			return false;
		}
		return document.cookie
			.split(";")
			.some((cookie) => cookie.trim().startsWith("teamsJustUnlinked="));
	}, []);
	const pendingInvitesQuery = trpc.teams.pendingInvites.useQuery(undefined, {
		enabled: !!user?.id,
		staleTime: 0,
		refetchOnMount: "always",
		refetchOnWindowFocus: false,
	});
	const pendingInvites = pendingInvitesQuery.data;
	const hasPendingInvites = (pendingInvites?.invites?.length ?? 0) > 0;
	const shouldAutoRedirect =
		!!user?.id &&
		!skipAutoRedirect &&
		!justUnlinked &&
		!!cachedTeamsData?.teams?.length &&
		!hasPendingInvites &&
		pendingInvitesQuery.isFetched;
	const hasRedirectedRef = useRef(false);
	const { data, isLoading } = trpc.teams.listUserTeams.useQuery(undefined, {
		enabled: !!user?.id && !cachedTeamsData,
		staleTime: 30_000,
	});

	const acceptInviteMutation = trpc.teams.acceptInvite.useMutation({
		onSuccess: async (res) => {
			toast.success("Joined team");
			router.push(`/teams/${res.slug}`);
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Unable to join invitation",
			);
		},
	});

	const declineInviteMutation = trpc.teams.declineInvite.useMutation({
		onSuccess: async () => {
			toast.info("Invite dismissed");
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Unable to dismiss invite",
			);
		},
	});

	useEffect(() => {
		if (pendingInvites?.invites && pendingInvites.invites.length > 0) {
			setShowInviteModal(true);
			return;
		}
		setShowInviteModal(false);
	}, [pendingInvites?.invites]);

	const createTeamMutation = trpc.teams.createTeam.useMutation({
		onSuccess: async () => {
			await utils.teams.listUserTeams.invalidate();
		},
	});
	const joinTeamMutation = trpc.teams.joinTeam.useMutation({
		onSuccess: async () => {
			await utils.teams.listUserTeams.invalidate();
		},
	});

	const teamsSource = data ?? cachedTeamsData;
	const userTeams =
		teamsSource?.teams.map((team) => ({
			id: team.id,
			slug: team.slug,
			name: team.name || `${team.school} ${team.division}`,
			school: team.school,
			division: (team.division ?? "C") as "B" | "C",
			members: [
				{
					id: user?.id || "me",
					name: user?.email || "You",
					email: user?.email || "",
					role: (team.role as "admin" | "captain" | "member") ?? "member",
				},
			],
		})) ?? [];

	const handleCreateTeam = async (teamData: {
		school: string;
		division: "B" | "C";
	}) => {
		try {
			const result = await createTeamMutation.mutateAsync(teamData);
			const subteam = result.defaultSubteam;
			const now = new Date().toISOString();
			const profile = user?.id ? await getCachedUserProfile(user.id) : null;
			const { name: resolvedName } = generateDisplayName(
				{
					displayName: profile?.display_name ?? null,
					firstName: null,
					lastName: null,
					username: profile?.username ?? null,
					email: user?.email ?? null,
				},
				user?.id ?? "unknown",
			);
			const creatorName = resolvedName || user?.email || "Team Owner";
			if (subteam) {
				const seed: TeamFullData = {
					meta: {
						teamId: result.id,
						slug: result.slug,
						name: result.name || result.school || teamData.school,
						school: result.school || teamData.school,
						division: result.division,
						updatedAt: now,
						version: 1,
						userRole: "admin",
						status: "active",
						memberCode: result.memberCode ?? "",
						captainCode: result.captainCode ?? null,
					},
					subteams: [
						{
							id: subteam.id,
							teamId: result.id,
							name: subteam.name,
							description: subteam.description,
							rosterNotes: null,
							displayOrder: subteam.displayOrder,
							createdAt: subteam.createdAt || now,
						},
					],
					members: [
						{
							id: user?.id ?? "unknown",
							name: creatorName,
							email: user?.email ?? null,
							role: "admin",
							status: "active",
							events: [],
							subteamId: subteam.id,
							subteamName: subteam.name,
							subteam: {
								id: subteam.id,
								name: subteam.name,
								description: subteam.description ?? null,
							},
							isUnlinked: false,
							username: profile?.username ?? null,
							joinedAt: now,
							isPendingInvitation: false,
							hasPendingLinkInvite: false,
						},
					],
					rosterEntries: [],
					assignments: [],
				};
				utils.teams.full.setData({ teamSlug: result.slug }, seed);
				utils.teams.assignments.setData({ teamSlug: result.slug }, []);
				utils.teams.getStream.setData(
					{ teamSlug: result.slug, subteamId: subteam.id },
					[],
				);
				utils.teams.getTimers.setData(
					{ teamSlug: result.slug, subteamId: subteam.id },
					[],
				);
				utils.teams.getTournaments.setData(
					{ teamSlug: result.slug, subteamId: subteam.id },
					[],
				);
				utils.teams.getRosterNotes.setData(
					{ teamSlug: result.slug, subteamId: subteam.id },
					{ id: subteam.id, rosterNotes: null },
				);
			}
			utils.teams.listUserTeams.setData(undefined, (prev) => {
				const nextTeams = [
					...(prev?.teams ?? []),
					{
						id: result.id,
						slug: result.slug,
						name: result.name || result.school || teamData.school,
						school: result.school || teamData.school,
						division: result.division,
						status: "active",
						role: "admin" as const,
					},
				];
				return { teams: nextTeams };
			});
			toast.success("Team created");
			router.push(`/teams/${result.slug}`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create team",
			);
		}
	};

	const handleJoinTeam = async (joinData: { code: string }) => {
		try {
			const result = await joinTeamMutation.mutateAsync({
				code: joinData.code,
			});
			toast.success("Joined team");
			utils.teams.listUserTeams.setData(undefined, (prev) => {
				const nextTeams = [
					...(prev?.teams ?? []),
					{
						id: result.id,
						slug: result.slug,
						name: result.name || result.school || "Team",
						school: result.school || result.name || "Team",
						division: result.division,
						status: "active",
						role: "member" as const,
					},
				];
				return { teams: nextTeams };
			});
			router.push(`/teams/${result.slug}`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to join team",
			);
		}
	};

	useEffect(() => {
		if (!shouldAutoRedirect) {
			return;
		}
		if (hasRedirectedRef.current) {
			return;
		}
		const teams = cachedTeamsData?.teams ?? [];
		const lastVisited =
			typeof window !== "undefined"
				? window.localStorage.getItem("teams:lastVisited")
				: null;
		const lastMatch = lastVisited
			? teams.find((team) => team.slug === lastVisited)
			: null;
		const targetSlug = lastMatch?.slug ?? teams[0]?.slug;
		if (targetSlug) {
			hasRedirectedRef.current = true;
			router.replace(`/teams/${targetSlug}`);
		}
	}, [cachedTeamsData, router, shouldAutoRedirect]);

	if (shouldAutoRedirect) {
		return null;
	}

	if (!user?.id) {
		return (
			<TeamsLanding
				userTeams={[]}
				onCreateTeam={() => router.push("/login?redirect=/teams")}
				onJoinTeam={() => router.push("/login?redirect=/teams")}
				onTeamSelect={() => router.push("/login?redirect=/teams")}
				isPreviewMode
			/>
		);
	}

	if (isLoading && !cachedTeamsData) {
		return (
			<div className="flex items-center justify-center min-h-[200px]">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
			</div>
		);
	}

	return (
		<>
			<TeamsLanding
				userTeams={userTeams}
				onCreateTeam={() => setIsCreateModalOpen(true)}
				onJoinTeam={() => setIsJoinModalOpen(true)}
				onTeamSelect={(team) => router.push(`/teams/${team.slug}`)}
			/>
			<CreateTeamModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				onCreateTeam={handleCreateTeam}
			/>
			{showInviteModal && pendingInvites?.invites?.length ? (
				<TeamInvitationModal
					invites={pendingInvites.invites.map(
						(invite): TeamInvitationModalInvite => ({
							id: invite.slug,
							teamSlug: invite.slug,
							teamName: invite.name || invite.school,
							school: invite.school,
							division: invite.division,
							role: invite.role,
						}),
					)}
					onClose={() => setShowInviteModal(false)}
					onAccept={async (invite) => {
						const snapshotInvites = pendingInvites;
						const snapshotTeams = utils.teams.listUserTeams.getData();
						utils.teams.pendingInvites.setData(undefined, (prev) => {
							const nextInvites =
								prev?.invites?.filter(
									(item) => item.slug !== invite.teamSlug,
								) ?? [];
							return { invites: nextInvites };
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
									role: invite.role,
								},
							];
							return { teams: nextTeams };
						});
						try {
							await acceptInviteMutation.mutateAsync({
								teamSlug: invite.teamSlug,
							});
						} catch {
							utils.teams.pendingInvites.setData(
								undefined,
								() => snapshotInvites,
							);
							utils.teams.listUserTeams.setData(undefined, () => snapshotTeams);
						}
					}}
					onDecline={async (invite) => {
						const snapshotInvites = pendingInvites;
						utils.teams.pendingInvites.setData(undefined, (prev) => {
							const nextInvites =
								prev?.invites?.filter(
									(item) => item.slug !== invite.teamSlug,
								) ?? [];
							return { invites: nextInvites };
						});
						try {
							await declineInviteMutation.mutateAsync({
								teamSlug: invite.teamSlug,
							});
						} catch {
							utils.teams.pendingInvites.setData(
								undefined,
								() => snapshotInvites,
							);
						}
					}}
				/>
			) : null}
			<JoinTeamModal
				isOpen={isJoinModalOpen}
				onClose={() => setIsJoinModalOpen(false)}
				onJoinTeam={handleJoinTeam}
			/>
		</>
	);
}
