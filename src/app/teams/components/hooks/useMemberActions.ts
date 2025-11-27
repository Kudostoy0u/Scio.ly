import { invalidateCache } from "@/lib/cache/teamCacheManager";
import { trpc } from "@/lib/trpc/client";
import logger from "@/lib/utils/logger";
import { useCallback } from "react";
import { toast } from "react-toastify";
import type { Member } from "../../types";
import { getDisplayName } from "../../utils/displayNameUtils";

interface UseMemberActionsProps {
  teamSlug: string;
  selectedSubteam: string;
  loadMembers: (slug: string, subteamId?: string) => Promise<void>;
  filteredMembers: Member[];
}

export function useMemberActions({
  teamSlug,
  selectedSubteam,
  loadMembers,
  filteredMembers,
}: UseMemberActionsProps) {
  const updateRosterMutation = trpc.teams.updateRoster.useMutation();
  const removeRosterEntryMutation = trpc.teams.removeRosterEntry.useMutation();
  const exitSubteamMutation = trpc.teams.exitSubteam.useMutation();

  const invalidateMemberCaches = useCallback(
    (subteamId: string) => {
      invalidateCache("members", teamSlug, "all");
      if (selectedSubteam !== "all") {
        invalidateCache("members", teamSlug, selectedSubteam);
      }
      invalidateCache("members", teamSlug, subteamId);
    },
    [teamSlug, selectedSubteam]
  );

  const reloadMembersData = useCallback(async () => {
    await loadMembers(teamSlug, selectedSubteam === "all" ? undefined : selectedSubteam);
    await loadMembers(teamSlug, undefined);
  }, [teamSlug, selectedSubteam, loadMembers]);

  const handleRemoveSelfFromSubteam = useCallback(
    async (subteamId: string) => {
      await exitSubteamMutation.mutateAsync({
        teamSlug,
        subteamId,
      });
      toast.success("Removed yourself from subteam");
      invalidateMemberCaches(subteamId);
      await reloadMembersData();
    },
    [teamSlug, exitSubteamMutation, invalidateMemberCaches, reloadMembersData]
  );

  const handleRemoveOtherFromSubteam = useCallback(
    async (member: Member, subteamId: string, _subteamName: string) => {
      const response = await fetch(`/api/teams/${teamSlug}/roster/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: member.id,
          subteamId,
        }),
      });

      if (response.ok) {
        toast.success(`Removed ${member.name} from subteam`);
        invalidateMemberCaches(subteamId);
        await reloadMembersData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to remove subteam badge");
        throw new Error("Failed to remove from subteam");
      }
    },
    [teamSlug, invalidateMemberCaches, reloadMembersData]
  );

  const handleRemoveEvent = useCallback(
    async (member: Member, event: string, subteamId: string, subteamName: string) => {
      try {
        await removeRosterEntryMutation.mutateAsync({
          teamSlug,
          subteamId,
          eventName: event,
          userId: member.id || undefined,
          studentName: getDisplayName(member),
        });

        toast.success(`Removed ${getDisplayName(member)} from ${event} in ${subteamName}`);

        setTimeout(() => {
          invalidateCache("members", teamSlug, selectedSubteam === "all" ? "all" : selectedSubteam);
          loadMembers(teamSlug, selectedSubteam === "all" ? undefined : selectedSubteam);
          invalidateCache("roster", teamSlug, subteamId);
        }, 100);
      } catch (e) {
        logger.error("Failed to remove event badge:", e);
        toast.error("Failed to remove event badge");
        throw e;
      }
    },
    [teamSlug, selectedSubteam, removeRosterEntryMutation, loadMembers]
  );

  const handleAddEvent = useCallback(
    async (member: Member, eventName: string, subteamId: string) => {
      try {
        const studentName = getDisplayName(member);

        await updateRosterMutation.mutateAsync({
          teamSlug,
          subteamId,
          eventName,
          slotIndex: 0,
          studentName,
          userId: member.id || undefined,
        });

        toast.success(`Added ${getDisplayName(member)} to ${eventName}`);

        setTimeout(() => {
          invalidateCache("members", teamSlug, selectedSubteam === "all" ? "all" : selectedSubteam);
          loadMembers(teamSlug, selectedSubteam === "all" ? undefined : selectedSubteam);
          invalidateCache("roster", teamSlug, subteamId);
        }, 100);
      } catch (error) {
        logger.error("Failed to add event:", error);
        toast.error("Failed to add event");
        throw error;
      }
    },
    [teamSlug, selectedSubteam, updateRosterMutation, loadMembers]
  );

  const handleSubteamAssign = useCallback(
    async (member: Member, subteamId: string) => {
      try {
        const response = await fetch(`/api/teams/${teamSlug}/roster`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subteamId,
            eventName: "General",
            slotIndex: 0,
            studentName: member.name,
            userId: member.id,
          }),
        });

        if (response.ok) {
          const subteam = filteredMembers
            .find((m) => m.id === member.id)
            ?.subteams?.find((s) => s.id === subteamId);
          toast.success(`Assigned ${member.name} to ${subteam?.name || "subteam"}`);

          setTimeout(() => {
            invalidateCache(
              "members",
              teamSlug,
              selectedSubteam === "all" ? "all" : selectedSubteam
            );
            loadMembers(teamSlug, selectedSubteam === "all" ? undefined : selectedSubteam);
          }, 100);
        } else {
          await response.json();
          toast.error("Failed to assign subteam");
          throw new Error("Failed to assign subteam");
        }
      } catch (error) {
        logger.error("Failed to assign subteam:", error);
        throw error;
      }
    },
    [teamSlug, selectedSubteam, filteredMembers, loadMembers]
  );

  const handleInviteSubmit = useCallback(
    async (username: string) => {
      try {
        const response = await fetch(`/api/teams/${teamSlug}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            role: "member",
          }),
        });

        if (response.ok) {
          toast.success(`Invitation sent to ${username}`);
          loadMembers(teamSlug, selectedSubteam === "all" ? undefined : selectedSubteam);
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to send invitation");
        }
      } catch (_error) {
        toast.error("Failed to send invitation");
      }
    },
    [teamSlug, selectedSubteam, loadMembers]
  );

  const handleLinkInviteSubmit = useCallback(
    async (memberName: string, username: string) => {
      try {
        const member = filteredMembers.find((m) => m.name === memberName);
        if (!member) {
          toast.error("Member not found");
          return;
        }

        const subteamId =
          (member as Member).subteam?.id ||
          member.subteamId ||
          (selectedSubteam !== "all" ? selectedSubteam : null);
        if (!subteamId) {
          toast.error("Unable to determine subteam for this member");
          return;
        }

        const response = await fetch(`/api/teams/${teamSlug}/roster/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subteamId,
            studentName: memberName,
            username,
            message: `You've been invited to link your account to the roster entry "${memberName}"`,
          }),
        });

        if (response.ok) {
          toast.success(`Link invitation sent to ${username}`);
          loadMembers(teamSlug, selectedSubteam === "all" ? undefined : selectedSubteam);
          return true;
        }
        const error = await response.json();
        toast.error(error.error || "Failed to send link invitation");
        return false;
      } catch (_error) {
        toast.error("Failed to send link invitation");
        return false;
      }
    },
    [teamSlug, selectedSubteam, filteredMembers, loadMembers]
  );

  const handleCancelLinkInvite = useCallback(
    async (memberName: string) => {
      try {
        const member = filteredMembers.find((m) => m.name === memberName);
        if (!member) {
          toast.error("Member not found");
          return;
        }

        const subteamId =
          (member as Member).subteam?.id ||
          member.subteamId ||
          (selectedSubteam !== "all" ? selectedSubteam : null);
        if (!subteamId) {
          toast.error("Unable to determine subteam for this member");
          return;
        }

        const response = await fetch(`/api/teams/${teamSlug}/roster/invite/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subteamId,
            studentName: memberName,
          }),
        });

        if (response.ok) {
          toast.success("Link invitation cancelled");
          loadMembers(teamSlug, selectedSubteam === "all" ? undefined : selectedSubteam);
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to cancel link invitation");
        }
      } catch (_error) {
        toast.error("Failed to cancel link invitation");
      }
    },
    [teamSlug, selectedSubteam, filteredMembers, loadMembers]
  );

  const handleCancelInvitation = useCallback(
    async (member: Member) => {
      if (!member.invitationCode) {
        toast.error("No invitation code found");
        return;
      }

      try {
        const response = await fetch(`/api/teams/${teamSlug}/invite/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invitationCode: member.invitationCode,
          }),
        });

        if (response.ok) {
          toast.success(`Invitation cancelled for ${getDisplayName(member)}`);
          loadMembers(teamSlug, selectedSubteam === "all" ? undefined : selectedSubteam);
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to cancel invitation");
        }
      } catch (_error) {
        toast.error("Failed to cancel invitation");
      }
    },
    [teamSlug, selectedSubteam, loadMembers]
  );

  const removeLinkedMember = useCallback(
    async (member: Member) => {
      const response = await fetch(`/api/teams/${teamSlug}/members/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: member.id,
        }),
      });

      if (response.ok) {
        toast.success(`${member.name} has been removed from the team`);
        const subteamParam = selectedSubteam === "all" ? "" : `?subteamId=${selectedSubteam}`;
        const refreshResponse = await fetch(`/api/teams/${teamSlug}/members${subteamParam}`);
        if (refreshResponse.ok) {
          loadMembers(teamSlug, selectedSubteam === "all" ? undefined : selectedSubteam);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove member");
      }
    },
    [teamSlug, selectedSubteam, loadMembers]
  );

  const removeUnlinkedMember = useCallback(
    async (member: Member) => {
      const response = await fetch(`/api/teams/${teamSlug}/roster/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: getDisplayName(member),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          `${getDisplayName(member)} has been removed from the roster (${result.removedEntries} entries)`
        );
        loadMembers(teamSlug, selectedSubteam === "all" ? undefined : selectedSubteam);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove roster entry");
      }
    },
    [teamSlug, selectedSubteam, loadMembers]
  );

  const handleRemoveMember = useCallback(
    async (member: Member, userId: string | undefined) => {
      if (member.role === "captain") {
        toast.error("Cannot remove team captain");
        return;
      }

      if (member.id === userId) {
        toast.error("Cannot remove yourself");
        return;
      }

      if (!confirm(`Are you sure you want to remove ${getDisplayName(member)} from the team?`)) {
        return;
      }

      try {
        if (member.id) {
          await removeLinkedMember(member);
        } else {
          await removeUnlinkedMember(member);
        }
      } catch (_error) {
        toast.error("Failed to remove member");
      }
    },
    [removeLinkedMember, removeUnlinkedMember]
  );

  const handlePromoteToCaptain = useCallback(
    async (member: Member) => {
      if (member.role === "captain") {
        toast.error("User is already a captain");
        return;
      }

      if (!member.id) {
        toast.error("Cannot promote unlinked members to captain");
        return;
      }

      if (!confirm(`Are you sure you want to promote ${member.name} to captain?`)) {
        return;
      }

      try {
        const response = await fetch(`/api/teams/${teamSlug}/members/promote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: member.id,
            newRole: "captain",
          }),
        });

        if (response.ok) {
          toast.success(`${member.name} has been promoted to captain`);
          loadMembers(teamSlug, selectedSubteam === "all" ? undefined : selectedSubteam);
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to promote member");
        }
      } catch (_error) {
        toast.error("Failed to promote member");
      }
    },
    [teamSlug, selectedSubteam, loadMembers]
  );

  return {
    handleRemoveSelfFromSubteam,
    handleRemoveOtherFromSubteam,
    handleRemoveEvent,
    handleAddEvent,
    handleSubteamAssign,
    handleInviteSubmit,
    handleLinkInviteSubmit,
    handleCancelLinkInvite,
    handleCancelInvitation,
    handleRemoveMember,
    handlePromoteToCaptain,
  };
}
