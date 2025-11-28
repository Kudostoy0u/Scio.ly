/**
 * Test fixtures for team members route tests
 */

export const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
export const mockTeamId = "team-slug-123";
export const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
export const mockSubteamId = "123e4567-e89b-12d3-a456-426614174002";

export const otherUserId = "123e4567-e89b-12d3-a456-426614174003";
export const user1Id = "123e4567-e89b-12d3-a456-426614174003";
export const user2Id = "123e4567-e89b-12d3-a456-426614174004";
export const subteam1Id = "123e4567-e89b-12d3-a456-426614174005";
export const subteam2Id = "123e4567-e89b-12d3-a456-426614174006";
export const linkedUserId = "123e4567-e89b-12d3-a456-426614174003";

export const mockUser = { id: mockUserId };

export const mockTeamGroup = { id: mockGroupId };

export const mockUserProfile = {
  name: "John Doe",
  email: "john@example.com",
  username: "johndoe",
};

export const mockSubteamMember = {
  userId: otherUserId,
  role: "captain",
  joinedAt: new Date("2024-01-01"),
  teamUnitId: mockSubteamId,
  teamId: mockSubteamId,
  description: "Team A",
};

export const mockUserProfileData = {
  id: otherUserId,
  email: "jane@example.com",
  displayName: "Jane Smith",
  firstName: "Jane",
  lastName: "Smith",
  username: "janesmith",
};

export const mockUnlinkedRosterMember = {
  studentName: "Alice Johnson",
  teamUnitId: mockSubteamId,
  eventName: null,
  teamId: mockSubteamId,
  description: "Division B Team A",
};

export const mockTeamAccessNoAccess = {
  hasAccess: false,
  isCreator: false,
  hasSubteamMembership: false,
  hasRosterEntries: false,
  subteamRole: undefined,
  subteamMemberships: [],
  rosterSubteams: [],
};

export const mockTeamAccessCreator = {
  hasAccess: true,
  isCreator: true,
  hasSubteamMembership: false,
  hasRosterEntries: false,
  subteamMemberships: [],
  rosterSubteams: [],
};

export const mockTeamAccessSubteamMember = {
  hasAccess: true,
  isCreator: false,
  hasSubteamMembership: true,
  hasRosterEntries: false,
  subteamRole: "captain",
  subteamMemberships: [{ subteamId: mockSubteamId, teamId: mockSubteamId, role: "captain" }],
  rosterSubteams: [],
};
