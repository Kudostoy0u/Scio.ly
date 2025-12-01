import { useTeamStore } from "@/app/hooks/useTeamStore";
import { handleApiError } from "@/lib/stores/teams/utils";
import { trpc } from "@/lib/trpc/client";
import logger from "@/lib/utils/logger";
import { toast } from "react-toastify";
import type { Subteam } from "../../roster/rosterUtils";

export function useSubteamHandlers(teamSlug: string) {
  const {
    getSubteams,
    loadSubteams,
    updateSubteam,
    deleteSubteam,
    invalidateCache,
    updateSubteams,
  } = useTeamStore();

  const createSubteamMutation = trpc.teams.createSubteam.useMutation();
  const updateSubteamMutation = trpc.teams.updateSubteam.useMutation();
  const deleteSubteamMutation = trpc.teams.deleteSubteam.useMutation();
  const reorderSubteamsMutation = trpc.teams.reorderSubteams.useMutation();

  const handleCreateSubteam = async (
    setActiveSubteamId: (id: string) => void,
    name?: string
  ): Promise<void> => {
    try {
      // Auto-generate name based on existing subteams
      const subteamsData = getSubteams(teamSlug);
      const nextLetter = String.fromCharCode(65 + subteamsData.length); // A, B, C, etc.
      const subteamName = name?.trim() || `Team ${nextLetter}`;

      const result = await createSubteamMutation.mutateAsync({
        teamSlug,
        name: subteamName,
      });

      // Optimistically add the subteam to the store immediately
      const currentSubteams = getSubteams(teamSlug);
      const newSubteam: Subteam = {
        id: result.id,
        name: subteamName,
        team_id: result.team_id,
        description: result.description || "",
        created_at: result.created_at ? result.created_at.toISOString() : new Date().toISOString(),
      };
      // Update store with new subteam immediately for instant UI update
      updateSubteams(teamSlug, [...currentSubteams, newSubteam]);

      // Set the new subteam as active immediately
      setActiveSubteamId(result.id);

      // Show success toast
      toast.success(`Subteam "${subteamName}" created successfully!`);

      // Invalidate and reload to ensure data is in sync
      invalidateCache(`subteams-${teamSlug}`);
      invalidateCache(`members-${teamSlug}-all`);

      // Reload subteams data in the background to ensure sync
      loadSubteams(teamSlug).catch((error) => {
        logger.error("Failed to reload subteams after creation:", error);
      });
    } catch (error) {
      logger.error("Failed to create subteam:", error);
      const errorMessage = handleApiError(error, "createSubteam");
      toast.error(errorMessage);
    }
  };

  const handleEditSubteam = async (subteamId: string, newName: string): Promise<void> => {
    try {
      // Optimistically update the UI immediately
      updateSubteam(teamSlug, subteamId, { name: newName });

      await updateSubteamMutation.mutateAsync({
        teamSlug,
        subteamId,
        name: newName,
      });

      // Show success toast
      toast.success(`Subteam renamed to "${newName}" successfully!`);

      // Invalidate members cache to refresh People tab
      invalidateCache(`members-${teamSlug}-all`);
      invalidateCache(`members-${teamSlug}-${subteamId}`);

      // Invalidate subteams cache to ensure PeopleTab gets updated subteam names
      invalidateCache(`subteams-${teamSlug}`);

      // Reload subteams data to get updated data
      await loadSubteams(teamSlug);
    } catch (error) {
      logger.error("Failed to update subteam:", error);
      // Revert optimistic update on error
      invalidateCache(`subteams-${teamSlug}`);
      const errorMessage = handleApiError(error, "updateSubteam");
      toast.error(errorMessage);
    }
  };

  const handleDeleteSubteam = async (
    subteamId: string,
    activeSubteamId: string | null,
    setActiveSubteamId: (id: string | null) => void
  ): Promise<void> => {
    try {
      await deleteSubteamMutation.mutateAsync({
        teamSlug,
        subteamId,
      });

      // Optimistically remove the subteam from the store
      deleteSubteam(teamSlug, subteamId);

      // If the deleted subteam was active, switch to the first remaining subteam
      if (activeSubteamId === subteamId) {
        const remainingSubteams = getSubteams(teamSlug);
        if (remainingSubteams.length > 0) {
          const firstRemaining = remainingSubteams[0];
          if (firstRemaining) {
            setActiveSubteamId(firstRemaining.id);
          }
        } else {
          setActiveSubteamId(null);
        }
      }

      // Show success toast
      toast.success("Subteam deleted successfully!");

      // Invalidate members cache to refresh People tab
      invalidateCache(`members-${teamSlug}-all`);

      // Invalidate subteams cache to ensure PeopleTab gets updated subteam data
      invalidateCache(`subteams-${teamSlug}`);

      // Reload subteams data to get updated data
      await loadSubteams(teamSlug);
    } catch (error) {
      logger.error("Failed to delete subteam:", error);
      const errorMessage = handleApiError(error, "deleteSubteam");
      toast.error(errorMessage);
    }
  };

  const handleReorderSubteams = async (subteamIds: string[]): Promise<void> => {
    try {
      await reorderSubteamsMutation.mutateAsync({
        teamSlug,
        subteamIds,
      });

      // Optimistically update the store
      const currentSubteams = getSubteams(teamSlug);
      const reorderedSubteams = subteamIds
        .map((id) => currentSubteams.find((s) => s.id === id))
        .filter((s): s is Subteam => s !== undefined);

      if (reorderedSubteams.length === subteamIds.length) {
        updateSubteams(teamSlug, reorderedSubteams);
      }

      // Invalidate cache and reload to ensure sync
      invalidateCache(`subteams-${teamSlug}`);
      loadSubteams(teamSlug).catch((error) => {
        logger.error("Failed to reload subteams after reorder:", error);
      });
    } catch (error) {
      logger.error("Failed to reorder subteams:", error);
      const errorMessage = handleApiError(error, "reorderSubteams");
      toast.error(errorMessage);
      // Reload to revert optimistic update
      invalidateCache(`subteams-${teamSlug}`);
      loadSubteams(teamSlug).catch((error) => {
        logger.error("Failed to reload subteams after reorder error:", error);
      });
    }
  };

  return {
    handleCreateSubteam,
    handleEditSubteam,
    handleDeleteSubteam,
    handleReorderSubteams,
  };
}
