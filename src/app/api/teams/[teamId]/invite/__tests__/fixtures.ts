/**
 * Test fixtures for team invite route tests
 */

export const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
export const mockInvitedUserId = "123e4567-e89b-12d3-a456-426614174001";
export const mockMembershipId = "123e4567-e89b-12d3-a456-426614174002";
export const mockTeamUnitId1 = "123e4567-e89b-12d3-a456-426614174003";
export const mockTeamUnitId2 = "123e4567-e89b-12d3-a456-426614174004";
export const mockNotificationId = "123e4567-e89b-12d3-a456-426614174005";

export const mockUser = {
  id: mockUserId,
  email: "test@example.com",
};

export const mockTeamInfo = {
  teamUnitIds: [mockTeamUnitId1, mockTeamUnitId2],
};

export const mockInvitedUser = {
  id: mockInvitedUserId,
  email: "invited@example.com",
  display_name: "Invited User",
  first_name: "Invited",
  last_name: "User",
  username: "inviteduser",
};

export const mockMembership = {
  id: mockMembershipId,
  role: "captain",
  team_id: mockTeamUnitId1,
};

export const mockTeamCodes = {
  user_code: "user123",
  captain_code: "captain123",
};

export const mockTeamGroup = {
  school: "Test School",
  division: "C",
  slug: "test-school-c",
};

export const mockNotification = {
  id: mockNotificationId,
};

export const mockSearchResults = [
  {
    id: "user-1",
    email: "user1@example.com",
    display_name: "User One",
    first_name: "User",
    last_name: "One",
    username: "user1",
    photo_url: null,
  },
  {
    id: "user-2",
    email: "user2@example.com",
    display_name: "User Two",
    first_name: "User",
    last_name: "Two",
    username: "user2",
    photo_url: null,
  },
];

