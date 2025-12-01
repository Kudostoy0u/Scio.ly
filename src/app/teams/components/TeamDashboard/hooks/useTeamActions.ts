import { handleApiError } from "@/lib/stores/teams/utils";
import { trpc } from "@/lib/trpc/client";
import logger from "@/lib/utils/logger";
import { toast } from "react-toastify";

export function useTeamActions(teamSlug: string) {
  const exitTeamMutation = trpc.teams.exitTeam.useMutation();
  const archiveTeamMutation = trpc.teams.archiveTeam.useMutation();

  const handleExitTeam = async (): Promise<void> => {
    try {
      await exitTeamMutation.mutateAsync({
        teamSlug,
      });

      toast.success("Successfully exited team");
      // Redirect to teams page after successful exit
      window.location.href = "/teams";
    } catch (error) {
      logger.error("Failed to exit team:", error);
      const errorMessage = handleApiError(error, "exitTeam");
      toast.error(errorMessage);
    }
  };

  const handleArchiveTeam = async (): Promise<void> => {
    try {
      await archiveTeamMutation.mutateAsync({
        teamSlug,
      });

      toast.success("Team archived successfully");
      // Redirect to teams page after successful archive
      window.location.href = "/teams";
    } catch (error) {
      logger.error("Failed to archive team:", error);
      const errorMessage = handleApiError(error, "archiveTeam");
      toast.error(errorMessage);
    }
  };

  return {
    handleExitTeam,
    handleArchiveTeam,
  };
}
