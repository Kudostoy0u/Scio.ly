import { useAuth } from "@/app/contexts/AuthContext";
import { useInvalidateTeam } from "@/lib/hooks/useTeam";
import type { TeamFullData, TeamMember } from "@/lib/server/teams/shared";
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
	const { user } = useAuth();
	const { invalidateTeam, updateTeamData } = useInvalidateTeam();
	const upsertRosterEntry = trpc.teams.upsertRosterEntry.useMutation();
	const deleteRosterEntry = trpc.teams.removeRosterEntry.useMutation();
	const inviteMember = trpc.teams.inviteMember.useMutation();
	const promoteToRole = trpc.teams.promoteToRole.useMutation();
	const createLinkInvitation = trpc.teams.createLinkInvitation.useMutation();
	const cancelLinkInvite = trpc.teams.cancelLinkInvite.useMutation();
	const kickMember = trpc.teams.kickMember.useMutation();

	const refresh = async () => {
		await invalidateTeam(teamSlug);
	};

	const UUID_RE =
		/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$/;

	const requireSubteamId = (subteamId: string, actionLabel: string) => {
		const normalized = subteamId.trim();
		if (!normalized || normalized === "all" || !UUID_RE.test(normalized)) {
			toast.error(`Select a subteam to ${actionLabel}`);
			return null;
		}
		return normalized;
	};

	const maybeLinkedUserId = (member: Member) => {
		if (member.isUnlinked) return undefined;
		const value = (member.id ?? "").trim();
		return value && UUID_RE.test(value) ? value : undefined;
	};

	return {
		handleRemoveSelfFromSubteam: async (subteamId: string) => {
			if (!user?.id) {
				toast.error("You need to be signed in to leave a subteam");
				return;
			}
			const normalizedSubteamId = requireSubteamId(
				subteamId,
				"leave this subteam",
			);
			if (!normalizedSubteamId) return;
			try {
				await deleteRosterEntry.mutateAsync({
					teamSlug,
					subteamId: normalizedSubteamId,
					removeAllOccurrences: true,
					userId: user.id,
				});
				toast.success("Removed from subteam");
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to remove from subteam",
				);
			}
		},

		handleRemoveOtherFromSubteam: async (member: Member, subteamId: string) => {
			const normalizedSubteamId = requireSubteamId(
				subteamId,
				"remove a member from this subteam",
			);
			if (!normalizedSubteamId) return;
			try {
				await deleteRosterEntry.mutateAsync({
					teamSlug,
					subteamId: normalizedSubteamId,
					removeAllOccurrences: true,
					displayName: getDisplayName(member),
					userId: maybeLinkedUserId(member),
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
			const normalizedSubteamId = requireSubteamId(
				subteamId,
				"remove an event from this subteam",
			);
			if (!normalizedSubteamId) return;
			try {
				await deleteRosterEntry.mutateAsync({
					teamSlug,
					subteamId: normalizedSubteamId,
					eventName: event,
					displayName: getDisplayName(member),
					userId: maybeLinkedUserId(member),
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
			const normalizedSubteamId = requireSubteamId(
				subteamId,
				"add an event to this subteam",
			);
			if (!normalizedSubteamId) return;
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
					subteamId: normalizedSubteamId,
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
			const normalizedSubteamId = requireSubteamId(
				subteamId,
				"assign a member to a subteam",
			);
			if (!normalizedSubteamId) return;
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
					subteamId: normalizedSubteamId,
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

		handleCancelLinkInvite: async (memberName: string) => {
			try {
				await cancelLinkInvite.mutateAsync({
					teamSlug,
					rosterDisplayName: memberName,
				});
				toast.success(`Link invitation cancelled for ${memberName}`);
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to cancel link invitation",
				);
			}
		},

		handleCancelInvitation: async (_member: Member) => {
			toast.info(
				"Invitation cancellation will be rebuilt on the new backend soon.",
			);
		},

		handleRemoveMember: async (member: Member) => {
			try {
				if (!member.isUnlinked && member.id) {
					await kickMember.mutateAsync({ teamSlug, userId: member.id });
					updateTeamData(teamSlug, (prev) => {
						if (!prev) return prev;
						return {
							...prev,
							rosterEntries: (prev.rosterEntries ?? []).filter(
								(e: TeamFullData["rosterEntries"][0]) => e.userId !== member.id,
							),
							members: (prev.members ?? []).filter(
								(m: TeamMember) => m.id !== member.id,
							),
						};
					});
					toast.success(`Removed ${getDisplayName(member)} from team`);
				} else {
					await deleteRosterEntry.mutateAsync({
						teamSlug,
						subteamId: null,
						removeAllOccurrences: true,
						displayName: getDisplayName(member),
					});
					updateTeamData(teamSlug, (prev) => {
						if (!prev) return prev;
						const displayName = getDisplayName(member);
						return {
							...prev,
							rosterEntries: (prev.rosterEntries ?? []).filter(
								(e: TeamFullData["rosterEntries"][0]) =>
									!(e.userId === null && e.displayName === displayName),
							),
							members: (prev.members ?? []).filter((m: TeamMember) => {
								if (!m.isUnlinked) return true;
								return !(
									m.name?.toLowerCase() === displayName.toLowerCase() &&
									(m.subteamId ?? null) === (member.subteamId ?? null)
								);
							}),
						};
					});
					toast.success(`Removed ${getDisplayName(member)} from roster`);
				}
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to remove member",
				);
			}
		},

		handlePromoteToCaptain: async (member: Member) => {
			try {
				if (!member.id || member.isUnlinked) {
					toast.error(
						"User must be linked to an account before they can be promoted to captain",
					);
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

		handleDemoteCaptainToMember: async (member: Member) => {
			try {
				if (!member.id || member.isUnlinked) {
					toast.error("User must be linked to an account");
					return;
				}
				await promoteToRole.mutateAsync({
					teamSlug,
					userId: member.id,
					newRole: "member",
				});
				toast.success(`Demoted ${getDisplayName(member)} to member`);
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to demote member",
				);
			}
		},

		handlePromoteToAdmin: async (member: Member) => {
			try {
				if (!member.id || member.isUnlinked) {
					toast.error("User must be linked to an account");
					return;
				}
				await promoteToRole.mutateAsync({
					teamSlug,
					userId: member.id,
					newRole: "admin",
				});
				toast.success(`Promoted ${getDisplayName(member)} to admin`);
				await refresh();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to promote member",
				);
			}
		},
	};
}
