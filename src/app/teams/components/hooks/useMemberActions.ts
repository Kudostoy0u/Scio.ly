import { useInvalidateTeam } from "@/lib/hooks/useTeam";
import { trpc } from "@/lib/trpc/client";
import { toast } from "react-toastify";
import type { Member } from "../../types";
import { getDisplayName } from "../../utils/displayNameUtils";

interface UseMemberActionsProps {
	teamSlug: string;
	selectedSubteam: string;
}

export function useMemberActions({
	teamSlug,
	selectedSubteam: _selectedSubteam,
}: UseMemberActionsProps) {
	const { invalidateTeam } = useInvalidateTeam();
	const upsertRosterEntry = trpc.teams.upsertRosterEntry.useMutation();
	const deleteRosterEntry = trpc.teams.removeRosterEntry.useMutation();

	const refresh = async () => {
		await invalidateTeam(teamSlug);
	};

	return {
		handleRemoveSelfFromSubteam: async (_subteamId: string) => {
			toast.info("Leaving subteams via the new flow is coming soon.");
			await refresh();
		},

		handleRemoveOtherFromSubteam: async (member: Member, subteamId: string) => {
			await deleteRosterEntry.mutateAsync({
				teamSlug,
				subteamId,
				eventName: "General",
				slotIndex: 0,
			});
			toast.success(`Removed ${getDisplayName(member)} from subteam`);
			await refresh();
		},

		handleRemoveEvent: async (
			member: Member,
			event: string,
			subteamId: string,
		) => {
			await deleteRosterEntry.mutateAsync({
				teamSlug,
				subteamId,
				eventName: event,
				slotIndex: 0,
			});
			toast.success(`Removed ${getDisplayName(member)} from ${event}`);
			await refresh();
		},

		handleAddEvent: async (
			member: Member,
			eventName: string,
			subteamId: string,
		) => {
			if (member.events?.includes(eventName)) {
				toast.info(`${getDisplayName(member)} is already on ${eventName}`);
				return;
			}
			await upsertRosterEntry.mutateAsync({
				teamSlug,
				subteamId,
				entry: {
					eventName,
					displayName: getDisplayName(member),
					userId: member.id || undefined,
				},
			});
			toast.success(`Added ${getDisplayName(member)} to ${eventName}`);
			await refresh();
		},

		handleSubteamAssign: async (member: Member, subteamId: string) => {
			await upsertRosterEntry.mutateAsync({
				teamSlug,
				subteamId,
				entry: {
					eventName: "General",
					slotIndex: 0,
					displayName: getDisplayName(member),
					userId: member.id || undefined,
				},
			});
			toast.success(`Assigned ${getDisplayName(member)} to subteam`);
			await refresh();
		},

		handleInviteSubmit: async (_username: string) => {
			toast.info("Invites will be rebuilt on the new backend soon.");
		},

		handleLinkInviteSubmit: async (_memberName: string, _username: string) => {
			toast.info("Link invites will be rebuilt on the new backend soon.");
			return true as const;
		},

		handleCancelLinkInvite: async (_memberName: string) => {
			toast.info(
				"Link invite cancellation will be rebuilt on the new backend soon.",
			);
		},

		handleCancelInvitation: async (_member: Member) => {
			toast.info(
				"Invitation cancellation will be rebuilt on the new backend soon.",
			);
		},

		handleRemoveMember: async (member: Member) => {
			await deleteRosterEntry.mutateAsync({
				teamSlug,
				subteamId: member.subteam?.id ?? member.subteamId ?? null,
				eventName: "General",
				slotIndex: 0,
			});
			toast.success(`Removed ${getDisplayName(member)} from team roster`);
			await refresh();
		},

		handlePromoteToCaptain: () => {
			toast.info("Role changes will be rebuilt on the new backend soon.");
		},
	};
}
