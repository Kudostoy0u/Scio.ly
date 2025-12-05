/**
 * Test fixtures for roster invite route tests
 */

export const mockUser = {
	id: "user-123",
	email: "test@example.com",
} as any;

export const mockInvitedUser = {
	id: "invited-user-123",
	email: "invited@example.com",
	display_name: "Invited User",
	first_name: "Invited",
	last_name: "User",
	username: "inviteduser",
} as any;

export const mockMembership = {
	role: "captain",
};

export const mockGroup = {
	id: "group-123",
};

export const mockSubteam = {
	id: "123e4567-e89b-12d3-a456-426614174000",
};

export const mockTeamInfo = {
	groupId: "group-123",
	teamUnitIds: ["unit-123"],
} as any;

export const mockInvitation = {
	id: "invitation-123",
	team_id: "123e4567-e89b-12d3-a456-426614174000",
	student_name: "Test Student",
	invited_user_id: "invited-user-123",
	invited_by: "user-123",
	message:
		'You\'ve been invited to link your account to the roster entry "Test Student"',
	status: "pending",
	created_at: "2024-01-01T00:00:00.000Z",
	expires_at: "2024-01-01T00:00:00.000Z",
};

export const mockNotification = {
	id: "notification-123",
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
];

// Regex patterns for test validation
export const SUBTEAM_ID_REGEX = /subteam id.*invalid|uuid/i;
export const INVITATION_SENT_REGEX = /roster link invitation already sent/i;
