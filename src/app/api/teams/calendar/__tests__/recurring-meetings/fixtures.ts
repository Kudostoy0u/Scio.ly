/**
 * Test fixtures for recurring meetings route tests
 */

export const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
export const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
export const mockTeamId = "123e4567-e89b-12d3-a456-426614174002";
export const mockMeetingId = "123e4567-e89b-12d3-a456-426614174003";

export const mockUser = { id: mockUserId };

export const mockTeamSlug = "neuqua-c-mgk6zb75";

export const mockRecurringMeeting = {
  id: "meeting-1",
  team_id: mockTeamId,
  created_by: "123e4567-e89b-12d3-a456-426614174003",
  title: "Weekly Practice",
  description: "Regular team practice",
  location: "Gym",
  days_of_week: [1, 3],
  start_time: "15:00",
  end_time: "17:00",
  exceptions: [],
  created_at: "2024-01-01T00:00:00Z",
  creator_email: "captain@example.com",
  creator_name: "Captain Name",
};

export const mockRecurringMeetingWithExceptions = {
  ...mockRecurringMeeting,
  days_of_week: [1, 3, 5],
  exceptions: ["2024-01-15", "2024-01-22"],
};

export const mockMembershipCaptain = {
  role: "captain",
  teamId: mockTeamId,
};

export const mockMembershipCoCaptain = {
  role: "co_captain",
  teamId: mockTeamId,
};

export const mockMembershipMember = {
  role: "member",
  teamId: mockTeamId,
};
