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
	const utils = trpc.useUtils();
	const upsertRosterEntry = trpc.teams.upsertRosterEntry.useMutation();
	const deleteRosterEntry = trpc.teams.removeRosterEntry.useMutation();
	const inviteMember = trpc.teams.inviteMember.useMutation();
	const cancelInvite = trpc.teams.cancelInvite.useMutation();
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

	const snapshotTeam = () => utils.teams.full.getData({ teamSlug });
	const restoreTeam = (snapshot: TeamFullData | undefined) => {
		updateTeamData(teamSlug, () => snapshot);
	};

	const getSubteamInfo = (
		team: TeamFullData,
		subteamId: string,
	): { id: string; name: string; description: string | null } | null => {
		const subteam = team.subteams?.find((item) => item.id === subteamId);
		if (!subteam) {
			return null;
		}
		return {
			id: subteam.id,
			name: subteam.name,
			description: subteam.description ?? null,
		};
	};

	const matchesMember = (candidate: TeamMember, target: Member): boolean => {
		if (!target.isUnlinked && target.id && candidate.id === target.id) {
			return true;
		}
		if (target.isUnlinked) {
			const targetName = getDisplayName(target).toLowerCase();
			const candidateName = (candidate.name ?? "").toLowerCase();
			if (candidateName !== targetName) {
				return false;
			}
			const targetSubteam = target.subteamId ?? null;
			return (candidate.subteamId ?? null) === targetSubteam;
		}
		return false;
	};

	const updateRosterEntries = (
		updater: (
			entries: TeamFullData["rosterEntries"],
		) => TeamFullData["rosterEntries"],
	) => {
		updateTeamData(teamSlug, (prev) => {
			if (!prev) return prev;
			return {
				...prev,
				rosterEntries: updater(prev.rosterEntries ?? []),
			};
		});
	};

	const updateMembers = (updater: (members: TeamMember[]) => TeamMember[]) => {
		updateTeamData(teamSlug, (prev) => {
			if (!prev) return prev;
			return {
				...prev,
				members: updater(prev.members ?? []),
			};
		});
	};

	const getNextSlotIndex = (
		entries: TeamFullData["rosterEntries"],
		subteamId: string,
		eventName: string,
	) => {
		const slots = entries
			.filter(
				(entry) =>
					entry.subteamId === subteamId && entry.eventName === eventName,
			)
			.map((entry) => entry.slotIndex);
		return slots.length ? Math.max(...slots) + 1 : 0;
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
			const snapshot = snapshotTeam();
			updateRosterEntries((entries) =>
				entries.filter(
					(entry) =>
						entry.subteamId !== normalizedSubteamId || entry.userId !== user.id,
				),
			);
			updateMembers((members) =>
				members.map((member) => {
					if (member.id !== user.id) {
						return member;
					}
					if ((member.subteamId ?? null) !== normalizedSubteamId) {
						return member;
					}
					return {
						...member,
						subteamId: null,
						subteamName: null,
						subteam: null,
						events: [],
					};
				}),
			);
			try {
				await deleteRosterEntry.mutateAsync({
					teamSlug,
					subteamId: normalizedSubteamId,
					removeAllOccurrences: true,
					userId: user.id,
				});
				toast.success("Removed from subteam");
			} catch (error) {
				restoreTeam(snapshot);
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
			const snapshot = snapshotTeam();
			const displayName = getDisplayName(member);
			updateRosterEntries((entries) =>
				entries.filter((entry) => {
					if (entry.subteamId !== normalizedSubteamId) return true;
					if (entry.displayName !== displayName) return true;
					if (member.id && entry.userId && entry.userId !== member.id) {
						return true;
					}
					return false;
				}),
			);
			updateMembers((members) =>
				members.map((candidate) => {
					if (!matchesMember(candidate, member)) {
						return candidate;
					}
					if ((candidate.subteamId ?? null) !== normalizedSubteamId) {
						return candidate;
					}
					return {
						...candidate,
						subteamId: null,
						subteamName: null,
						subteam: null,
						events: [],
					};
				}),
			);
			try {
				await deleteRosterEntry.mutateAsync({
					teamSlug,
					subteamId: normalizedSubteamId,
					removeAllOccurrences: true,
					displayName,
					userId: maybeLinkedUserId(member),
				});
				toast.success(`Removed ${displayName} from subteam`);
			} catch (error) {
				restoreTeam(snapshot);
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
			const snapshot = snapshotTeam();
			const displayName = getDisplayName(member);
			updateRosterEntries((entries) =>
				entries.filter(
					(entry) =>
						!(
							entry.subteamId === normalizedSubteamId &&
							entry.eventName === event &&
							entry.displayName === displayName
						),
				),
			);
			updateMembers((members) =>
				members.map((candidate) => {
					if (!matchesMember(candidate, member)) {
						return candidate;
					}
					return {
						...candidate,
						events: (candidate.events ?? []).filter(
							(eventName) => eventName !== event,
						),
					};
				}),
			);
			try {
				await deleteRosterEntry.mutateAsync({
					teamSlug,
					subteamId: normalizedSubteamId,
					eventName: event,
					displayName,
					userId: maybeLinkedUserId(member),
				});
				toast.success(`Removed ${displayName} from ${event}`);
			} catch (error) {
				restoreTeam(snapshot);
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
			const snapshot = snapshotTeam();
			const displayName = getDisplayName(member);
			updateTeamData(teamSlug, (prev) => {
				if (!prev) return prev;
				const entries = prev.rosterEntries ?? [];
				const alreadyAssigned = entries.some(
					(entry) =>
						entry.subteamId === normalizedSubteamId &&
						entry.eventName === eventName &&
						entry.displayName === displayName,
				);
				if (alreadyAssigned) {
					return prev;
				}
				const nextSlotIndex = getNextSlotIndex(
					entries,
					normalizedSubteamId,
					eventName,
				);
				const nextEntry = {
					id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
					teamId: prev.meta.teamId,
					subteamId: normalizedSubteamId,
					eventName,
					slotIndex: nextSlotIndex,
					displayName,
					userId: maybeLinkedUserId(member) ?? null,
				};
				return {
					...prev,
					rosterEntries: [...entries, nextEntry],
				};
			});
			updateMembers((members) =>
				members.map((candidate) => {
					if (!matchesMember(candidate, member)) {
						return candidate;
					}
					const nextEvents = new Set(candidate.events ?? []);
					nextEvents.add(eventName);
					return { ...candidate, events: Array.from(nextEvents) };
				}),
			);
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
			} catch (error) {
				restoreTeam(snapshot);
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
			const snapshot = snapshotTeam();
			const displayName = getDisplayName(member);
			updateTeamData(teamSlug, (prev) => {
				if (!prev) return prev;
				const entries = prev.rosterEntries ?? [];
				const alreadyAssigned = entries.some(
					(entry) =>
						entry.subteamId === normalizedSubteamId &&
						entry.eventName === "General" &&
						entry.displayName === displayName,
				);
				if (alreadyAssigned) {
					return prev;
				}
				const nextSlotIndex = getNextSlotIndex(
					entries,
					normalizedSubteamId,
					"General",
				);
				const nextEntry = {
					id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
					teamId: prev.meta.teamId,
					subteamId: normalizedSubteamId,
					eventName: "General",
					slotIndex: nextSlotIndex,
					displayName,
					userId: maybeLinkedUserId(member) ?? null,
				};
				return {
					...prev,
					rosterEntries: [...entries, nextEntry],
				};
			});
			updateTeamData(teamSlug, (prev) => {
				if (!prev) return prev;
				const subteamInfo = getSubteamInfo(prev, normalizedSubteamId);
				return {
					...prev,
					members: (prev.members ?? []).map((candidate) => {
						if (!matchesMember(candidate, member)) {
							return candidate;
						}
						const nextEvents = new Set(candidate.events ?? []);
						nextEvents.add("General");
						return {
							...candidate,
							subteamId: normalizedSubteamId,
							subteamName: subteamInfo?.name ?? candidate.subteamName ?? null,
							subteam: subteamInfo,
							events: Array.from(nextEvents),
						};
					}),
				};
			});
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
			} catch (error) {
				restoreTeam(snapshot);
				toast.error(
					error instanceof Error ? error.message : "Failed to assign subteam",
				);
			}
		},

		handleInviteSubmit: async (username: string) => {
			const normalizedUsername = username.trim();
			const snapshot = snapshotTeam();
			const optimisticId = `pending-${normalizedUsername.toLowerCase()}`;
			updateTeamData(teamSlug, (prev) => {
				if (!prev) return prev;
				const existing = (prev.members ?? []).some(
					(member) =>
						member.username?.toLowerCase() === normalizedUsername.toLowerCase(),
				);
				if (existing) {
					return prev;
				}
				return {
					...prev,
					members: [
						...(prev.members ?? []),
						{
							id: optimisticId,
							name: normalizedUsername,
							email: null,
							role: "member",
							status: "pending",
							events: [],
							subteamId: null,
							subteamName: null,
							subteam: null,
							isUnlinked: false,
							username: normalizedUsername,
							joinedAt: null,
							isPendingInvitation: true,
							hasPendingLinkInvite: false,
						},
					],
				};
			});
			try {
				const result = await inviteMember.mutateAsync({
					teamSlug,
					invitedUsername: normalizedUsername,
					role: "member",
				});
				updateTeamData(teamSlug, (prev) => {
					if (!prev) return prev;
					return {
						...prev,
						members: (prev.members ?? []).map((member) => {
							if (member.id !== optimisticId) {
								return member;
							}
							return {
								...member,
								id: result.invitedUserId ?? member.id,
								username: result.invitedUsername ?? member.username,
							};
						}),
					};
				});
				toast.success(`Invited ${normalizedUsername} to the team`);
			} catch (error) {
				restoreTeam(snapshot);
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
			const member = _member;
			if (!member.id || member.isUnlinked) {
				toast.error("No pending invite to cancel");
				return;
			}
			const snapshot = snapshotTeam();
			updateTeamData(teamSlug, (prev) => {
				if (!prev) return prev;
				return {
					...prev,
					members: (prev.members ?? []).filter(
						(item) => !(item.id === member.id && item.isPendingInvitation),
					),
				};
			});
			if (!UUID_RE.test(member.id)) {
				toast.success("Invitation cancelled");
				return;
			}
			try {
				await cancelInvite.mutateAsync({
					teamSlug,
					invitedUserId: member.id,
				});
				toast.success("Invitation cancelled");
			} catch (error) {
				restoreTeam(snapshot);
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to cancel invitation",
				);
			}
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
			const snapshot = snapshotTeam();
			try {
				if (!member.id || member.isUnlinked) {
					toast.error(
						"User must be linked to an account before they can be promoted to captain",
					);
					return;
				}
				updateTeamData(teamSlug, (prev) => {
					if (!prev) return prev;
					return {
						...prev,
						members: (prev.members ?? []).map((item) =>
							item.id === member.id ? { ...item, role: "captain" } : item,
						),
					};
				});
				await promoteToRole.mutateAsync({
					teamSlug,
					userId: member.id,
					newRole: "captain",
				});
				toast.success(`Promoted ${getDisplayName(member)} to captain`);
			} catch (error) {
				restoreTeam(snapshot);
				toast.error(
					error instanceof Error ? error.message : "Failed to promote member",
				);
			}
		},

		handleDemoteCaptainToMember: async (member: Member) => {
			const snapshot = snapshotTeam();
			try {
				if (!member.id || member.isUnlinked) {
					toast.error("User must be linked to an account");
					return;
				}
				updateTeamData(teamSlug, (prev) => {
					if (!prev) return prev;
					return {
						...prev,
						members: (prev.members ?? []).map((item) =>
							item.id === member.id ? { ...item, role: "member" } : item,
						),
					};
				});
				await promoteToRole.mutateAsync({
					teamSlug,
					userId: member.id,
					newRole: "member",
				});
				toast.success(`Demoted ${getDisplayName(member)} to member`);
			} catch (error) {
				restoreTeam(snapshot);
				toast.error(
					error instanceof Error ? error.message : "Failed to demote member",
				);
			}
		},

		handlePromoteToAdmin: async (member: Member) => {
			const snapshot = snapshotTeam();
			try {
				if (!member.id || member.isUnlinked) {
					toast.error("User must be linked to an account");
					return;
				}
				updateTeamData(teamSlug, (prev) => {
					if (!prev) return prev;
					return {
						...prev,
						members: (prev.members ?? []).map((item) =>
							item.id === member.id ? { ...item, role: "admin" } : item,
						),
					};
				});
				await promoteToRole.mutateAsync({
					teamSlug,
					userId: member.id,
					newRole: "admin",
				});
				toast.success(`Promoted ${getDisplayName(member)} to admin`);
			} catch (error) {
				restoreTeam(snapshot);
				toast.error(
					error instanceof Error ? error.message : "Failed to promote member",
				);
			}
		},
	};
}
