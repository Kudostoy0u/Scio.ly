// biome-ignore lint/performance/noBarrelFile: This file provides a centralized export point for team helper utilities
export {
  UUID_REGEX,
  TEAM_STATUS,
  MEMBER_ROLES,
  DIVISIONS,
} from "./constants";
export {
  resolveTeamSlugToGroupId,
  getGroupBySlug,
  getActiveTeamUnitIds,
  getUsersWithRosterEntries,
  getMembersWithSubteamMemberships,
  getUsersWithoutSubteam,
  getTeamMembersForGroup,
  getAllTeamMembersForDashboard,
  getRosterDataForSubteam,
  getActiveSubteams,
  getAssignmentsForSubteams,
} from "./data-access";
export {
  mapUsersToMembers,
  processRosterData,
  processRosterDataForDisplay,
  processMembersData,
  processMembersDataWithSubteam,
  buildMemberEventsLookup,
  findMatchingTeamMember,
  normalizeEventName,
} from "./data-processing";
export {
  checkTeamAccessOrThrow,
  checkTeamGroupAccessOrThrow,
  validateSubteamBelongsToGroup,
  determineUserIdToLink,
  buildSubteamWhereCondition,
  ensureUserDisplayName,
} from "./validation";
export {
  syncPeopleFromRosterForSubteam,
  syncPeopleFromRosterForGroup,
  syncRosterFromPeopleEntry,
  addEventToPerson,
  removeEventFromPerson,
  changePersonSubteam,
  removePersonFromSubteam,
} from "./people-sync";
