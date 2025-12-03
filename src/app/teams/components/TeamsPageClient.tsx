"use client";

import { useAuth } from "@/app/contexts/authContext";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import CreateTeamModal from "./CreateTeamModal";
import JoinTeamModal from "./JoinTeamModal";
import TeamsLanding from "./TeamsLanding";

function PendingInviteModal({
	invite,
	onAccept,
	onDecline,
	onClose,
}: {
	invite: {
		slug: string;
		name: string;
		school: string;
		division: string;
		role: "captain" | "member";
	};
	onAccept: () => void;
	onDecline: () => void;
	onClose: () => void;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
							Join {invite.name || invite.school}
						</h3>
						<p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
							We found an invite for your Supabase account to the{" "}
							{invite.school} ({invite.division}) team.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
						aria-label="Close invite prompt"
					>
						×
					</button>
				</div>
				<div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
					<div>
						<div className="font-semibold">{invite.school}</div>
						<div className="text-xs text-gray-500 dark:text-gray-400">
							Role: {invite.role === "captain" ? "Captain" : "Member"}
						</div>
					</div>
					<span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-100">
						Invite
					</span>
				</div>
				<div className="mt-6 flex justify-end gap-2">
					<button
						type="button"
						onClick={onDecline}
						className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
					>
						Skip
					</button>
					<button
						type="button"
						onClick={onAccept}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
					>
						Join team
					</button>
				</div>
			</div>
		</div>
	);
}

export default function TeamsPageClient() {
	const { user } = useAuth();
	const router = useRouter();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
	const [activeInvite, setActiveInvite] = useState<{
		slug: string;
		name: string;
		school: string;
		division: string;
		role: "captain" | "member";
	} | null>(null);
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
		const nextInvite = pendingInvites?.invites?.[0];
		if (nextInvite) {
			setActiveInvite(nextInvite);
			setShowInviteModal(true);
		} else {
			setActiveInvite(null);
			setShowInviteModal(false);
		}
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
			<div className="p-6 text-center text-gray-600">
				Sign in to see your teams.
			</div>
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
			{showInviteModal && activeInvite && (
				<PendingInviteModal
					invite={activeInvite}
					onClose={() => setShowInviteModal(false)}
					onDecline={() => {
						setShowInviteModal(false);
						declineInviteMutation.mutate({ teamSlug: activeInvite.slug });
					}}
					onAccept={() => {
						acceptInviteMutation.mutate({ teamSlug: activeInvite.slug });
					}}
				/>
			)}
			<JoinTeamModal
				isOpen={isJoinModalOpen}
				onClose={() => setIsJoinModalOpen(false)}
				onJoinTeam={handleJoinTeam}
			/>
		</>
	);
}
