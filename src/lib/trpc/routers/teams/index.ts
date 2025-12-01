import { router } from "@/lib/trpc/server";
import { basicQueriesRouter } from "./operations/basic-queries";
import { dashboardQueriesRouter } from "./operations/dashboard-queries";
import { memberOperationsRouter } from "./operations/member-operations";
import { rosterOperationsRouter } from "./operations/roster-operations";
import { streamOperationsRouter } from "./operations/stream-operations";
import { subteamOperationsRouter } from "./operations/subteam-operations";
import { teamMutationsRouter } from "./operations/team-mutations";

/**
 * Teams Router
 *
 * This router combines all team-related operations into a single, organized router.
 * The original 2600+ line file has been refactored into smaller, focused modules:
 *
 * - basic-queries.ts: Basic GET/query operations (teams, subteams, members, rosters, assignments)
 * - dashboard-queries.ts: Dashboard and batch loading operations
 * - team-mutations.ts: Team creation, joining, exiting, and archiving operations
 * - subteam-operations.ts: CRUD operations for subteams
 * - roster-operations.ts: Roster management operations (create, update, delete)
 * - member-operations.ts: Member and invitation management operations
 * - stream-operations.ts: Stream posts, timers, and tournaments (batchable)
 *
 * Total endpoints: 28
 * Largest file: 515 lines (all files are now under 600 lines)
 */
export const teamsRouter = router({
  // Basic query operations (6 endpoints)
  getUserTeams: basicQueriesRouter.getUserTeams,
  getSubteams: basicQueriesRouter.getSubteams,
  getPeople: basicQueriesRouter.getPeople,
  getMembers: basicQueriesRouter.getMembers,
  getRoster: basicQueriesRouter.getRoster,
  getAssignments: basicQueriesRouter.getAssignments,

  // Dashboard query operations (3 endpoints)
  batchLoadTeamData: dashboardQueriesRouter.batchLoadTeamData,
  getTeamDashboard: dashboardQueriesRouter.getTeamDashboard,
  getTeamPageData: dashboardQueriesRouter.getTeamPageData,

  // Stream operations (4 endpoints - batchable)
  getStream: streamOperationsRouter.getStream,
  getTimers: streamOperationsRouter.getTimers,
  getTournaments: streamOperationsRouter.getTournaments,
  getStreamData: streamOperationsRouter.getStreamData, // Batch endpoint for stream + timers + tournaments

  // Team mutation operations (5 endpoints)
  createTeam: teamMutationsRouter.createTeam,
  joinTeam: teamMutationsRouter.joinTeam,
  exitSubteam: teamMutationsRouter.exitSubteam,
  exitTeam: teamMutationsRouter.exitTeam,
  archiveTeam: teamMutationsRouter.archiveTeam,

  // Subteam operations (4 endpoints)
  createSubteam: subteamOperationsRouter.createSubteam,
  updateSubteam: subteamOperationsRouter.updateSubteam,
  deleteSubteam: subteamOperationsRouter.deleteSubteam,
  reorderSubteams: subteamOperationsRouter.reorderSubteams,

  // Roster operations (3 endpoints)
  updateRoster: rosterOperationsRouter.updateRoster,
  updateRosterBulk: rosterOperationsRouter.updateRosterBulk,
  removeRosterEntry: rosterOperationsRouter.removeRosterEntry,

  // Member operations (4 endpoints)
  inviteMember: memberOperationsRouter.inviteMember,
  cancelInvitation: memberOperationsRouter.cancelInvitation,
  removeMember: memberOperationsRouter.removeMember,
  promoteMember: memberOperationsRouter.promoteMember,
});
