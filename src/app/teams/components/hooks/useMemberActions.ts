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
	const inviteMember = trpc.teams.inviteMember.useMutation();
	const promoteToRole = trpc.teams.promoteToRole.useMutation();
	const createLinkInvitation = trpc.teams.createLinkInvitation.useMutation();

	const refresh = async () => {
		await invalidateTeam(teamSlug);
	};

	return {
		handleRemoveSelfFromSubteam: async (_subteamId: string) => {
			toast.info("Leaving subteams via the new flow is coming soon.");
			await refresh();
		},

		handleRemoveOtherFromSubteam: async (member: Member, subteamId: string) => {
			try {
				await deleteRosterEntry.mutateAsync({
					teamSlug,
					subteamId,
					eventName: "General",
					slotIndex: 0,
				});
				toast.success(`Removed ${getDisplayName(member)} from subteam`);
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to remove from subteam",
				);
			}
		},

		handleRemoveEvent: async (
			member: Member,
			event: string,
			subteamId: string,
		) => {
			try {
				await deleteRosterEntry.mutateAsync({
					teamSlug,
					subteamId,
					eventName: event,
					slotIndex: 0,
				});
				toast.success(`Removed ${getDisplayName(member)} from ${event}`);
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to remove event",
				);
			}
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
			try {
				const entry: {
					eventName: string;
					displayName: string;
					userId?: string;
				} = {
					eventName,
					displayName: getDisplayName(member),
				};

				// Only include userId if member has a valid ID (not empty string or unlinked)
				if (member.id && !member.isUnlinked) {
					entry.userId = member.id;
				}

				await upsertRosterEntry.mutateAsync({
					teamSlug,
					subteamId,
					entry,
				});
				toast.success(`Added ${getDisplayName(member)} to ${eventName}`);
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to add event",
				);
			}
		},

		handleSubteamAssign: async (member: Member, subteamId: string) => {
			try {
				const entry: {
					eventName: string;
					slotIndex: number;
					displayName: string;
					userId?: string;
				} = {
					eventName: "General",
					slotIndex: 0,
					displayName: getDisplayName(member),
				};

				// Only include userId if member has a valid ID (not empty string or unlinked)
				if (member.id && !member.isUnlinked) {
					entry.userId = member.id;
				}

				await upsertRosterEntry.mutateAsync({
					teamSlug,
					subteamId,
					entry,
				});
				toast.success(`Assigned ${getDisplayName(member)} to subteam`);
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to assign subteam",
				);
			}
		},

		handleInviteSubmit: async (username: string) => {
			try {
				await inviteMember.mutateAsync({
					teamSlug,
					invitedUsername: username,
					role: "member",
				});
				toast.success(`Invited ${username} to the team`);
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to invite user",
				);
			}
		},

		handleLinkInviteSubmit: async (memberName: string, username: string) => {
			try {
				await createLinkInvitation.mutateAsync({
					teamSlug,
					rosterDisplayName: memberName,
					invitedUsername: username,
				});
				toast.success(`Link invite sent to ${username}`);
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to send link invite",
				);
				throw error;
			}
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
			try {
				await deleteRosterEntry.mutateAsync({
					teamSlug,
					subteamId: member.subteam?.id ?? member.subteamId ?? null,
					eventName: "General",
					slotIndex: 0,
				});
				toast.success(`Removed ${getDisplayName(member)} from team roster`);
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to remove member",
				);
			}
		},

		handlePromoteToCaptain: async (member: Member) => {
			try {
				if (!member.id || member.isUnlinked) {
					toast.error("User must be linked to an account before they can be promoted to captain");
					return;
				}
				await promoteToRole.mutateAsync({
					teamSlug,
					userId: member.id,
					newRole: "captain",
				});
				toast.success(`Promoted ${getDisplayName(member)} to captain`);
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to promote member",
				);
			}
		},
	};
}
