import { useTeamStore } from "@/app/hooks/useTeamStore";
import { trpc } from "@/lib/trpc/client";
import { toast } from "react-toastify";

export function useSubteamHandlers(teamSlug: string) {
  const { getSubteams, loadSubteams, updateSubteam, deleteSubteam, invalidateCache } =
    useTeamStore();

  const createSubteamMutation = trpc.teams.createSubteam.useMutation();
  const updateSubteamMutation = trpc.teams.updateSubteam.useMutation();
  const deleteSubteamMutation = trpc.teams.deleteSubteam.useMutation();

  const handleCreateSubteam = async (
    name: string,
    setActiveSubteamId: (id: string) => void
  ): Promise<void> => {
    try {
      // Generate default name if none provided
      let subteamName = name;
      if (!name.trim()) {
        const subteamsData = getSubteams(teamSlug);
        const nextLetter = String.fromCharCode(65 + subteamsData.length); // A, B, C, etc.
        subteamName = `Team ${nextLetter}`;
      }

      const result = await createSubteamMutation.mutateAsync({
        teamSlug,
        name: subteamName,
      });

      // Show success toast
      toast.success(`Subteam "${subteamName}" created successfully!`);

      // Clear subteams cache to ensure fresh data
      invalidateCache(`subteams-${teamSlug}`);

      // Also invalidate members cache to refresh People tab
      invalidateCache(`members-${teamSlug}-all`);

      // Reload subteams data to get the new subteam
      await loadSubteams(teamSlug);

      // Set the new subteam as active after reload
      setActiveSubteamId(result.id);
    } catch (_error) {
      toast.error("Failed to create subteam. Please try again.");
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
    } catch (_error) {
      // Revert optimistic update on error
      invalidateCache(`subteams-${teamSlug}`);
      toast.error("Failed to update subteam name. Please try again.");
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
    } catch (_error) {
      toast.error("Failed to delete subteam. Please try again.");
    }
  };

  return {
    handleCreateSubteam,
    handleEditSubteam,
    handleDeleteSubteam,
  };
}
