"use client";

import { useAuth } from "@/app/contexts/authContext";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import CreateTeamModal from "./CreateTeamModal";
import JoinTeamModal from "./JoinTeamModal";
import TeamsLanding from "./TeamsLanding";

export default function TeamsPageClient() {
	const { user } = useAuth();
	const router = useRouter();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

	const utils = trpc.useUtils();
	const { data, isLoading } = trpc.teams.listUserTeams.useQuery(undefined, {
		enabled: !!user?.id,
		staleTime: 30_000,
	});

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
			<JoinTeamModal
				isOpen={isJoinModalOpen}
				onClose={() => setIsJoinModalOpen(false)}
				onJoinTeam={handleJoinTeam}
			/>
		</>
	);
}
