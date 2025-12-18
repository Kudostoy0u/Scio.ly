"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
	const [showInviteModal, setShowInviteModal] = useState(false);

	const utils = trpc.useUtils();
	const { data, isLoading } = trpc.teams.listUserTeams.useQuery(undefined, {
		enabled: !!user?.id,
		staleTime: 30_000,
	});
	const { data: pendingInvites } = trpc.teams.pendingInvites.useQuery(
		undefined,
		{ enabled: !!user?.id, staleTime: 10_000 },
	);

	const acceptInviteMutation = trpc.teams.acceptInvite.useMutation({
		onSuccess: async (res) => {
			toast.success("Joined team");
			await Promise.all([
				utils.teams.listUserTeams.invalidate(),
				utils.teams.pendingInvites.invalidate(),
			]);
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
			await utils.teams.pendingInvites.invalidate();
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

	const userTeams =
		data?.teams.map((team) => ({
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
					role: (team.role as "captain" | "member") ?? "member",
				},
			],
		})) ?? [];

	const handleCreateTeam = async (teamData: {
		school: string;
		division: "B" | "C";
	}) => {
		try {
			const result = await createTeamMutation.mutateAsync(teamData);
			toast.success("Team created");
			await utils.teams.listUserTeams.invalidate();
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
			await utils.teams.listUserTeams.invalidate();
			router.push(`/teams/${result.slug}`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to join team",
			);
		}
	};

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

	if (isLoading) {
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
						await acceptInviteMutation.mutateAsync({
							teamSlug: invite.teamSlug,
						});
					}}
					onDecline={async (invite) => {
						await declineInviteMutation.mutateAsync({
							teamSlug: invite.teamSlug,
						});
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
