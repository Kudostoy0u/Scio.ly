import { trpc } from "@/lib/trpc/client";
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
    } catch (_error) {
      toast.error("Failed to exit team");
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
    } catch (_error) {
      toast.error("Failed to archive team");
    }
  };

  return {
    handleExitTeam,
    handleArchiveTeam,
  };
}
