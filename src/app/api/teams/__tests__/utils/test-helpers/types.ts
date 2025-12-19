export interface TestUser {
	id: string;
	email: string;
	username: string;
	displayName: string;
	firstName?: string;
	lastName?: string;
}

export interface TestTeam {
	groupId: string;
	teamId: string; // Unified team ID
	subteamId: string;
	slug: string;
	captainCode: string;
	userCode: string;
	school: string;
	division: "B" | "C";
	description?: string;
}

export type TeamGroupRecord = {
	id: string;
	school: string;
	division: "B" | "C";
	slug: string;
	createdBy: string;
};

export type TeamUnitRecord = {
	id: string;
	teamId: string; // The parent team group ID
	name: string; // The subteam name (e.g. 'A')
	description: string;
	captainCode: string;
	userCode: string;
	createdBy: string;
};

export type TeamMembershipRecord = {
	userId: string;
	teamId: string;
	role: "captain" | "member";
	status: "active" | "inactive";
};

export type TeamRosterRecord = {
	id: string;
	teamId: string;
	subteamId: string;
	eventName: string;
	slotIndex: number;
	displayName: string;
	studentName: string;
	userId: string | null;
};

export type TeamStreamPostRecord = {
	id: string;
	teamId: string;
	subteamId: string;
	authorId: string;
	content: string;
};

export type TeamEventRecord = {
	id: string;
	teamId: string;
	subteamId?: string | null;
	createdBy: string;
	title: string;
	eventType: string;
	startTime: Date;
	endTime?: Date;
	location?: string;
	allDay?: boolean;
	isRecurring?: boolean;
	recurrencePattern?: unknown;
	description?: string;
	updatedAt?: Date;
};

export type TeamEventAttendeeRecord = {
	id: string;
	eventId: string;
	userId: string;
	status: string;
};

export type AssignmentRecord = {
	id: string;
	teamId: string;
	subteamId?: string | null;
	createdBy: string;
	title: string;
	description?: string;
	assignmentType: string;
	isRequired?: boolean;
};

export type AssignmentQuestionRecord = {
	id: string;
	assignmentId: string;
	questionText: string;
	questionType: string;
	correctAnswer?: string;
	orderIndex: number;
	points?: number;
};

export type AssignmentRosterRecord = {
	id: string;
	assignmentId: string;
	studentName: string;
	displayName: string;
	userId?: string;
	subteamId: string;
};

export type AssignmentSubmissionRecord = {
	id: string;
	assignmentId: string;
	userId: string;
	content: string;
	status: string;
	attemptNumber: number;
};

export type TeamInvitationRecord = {
	id: string;
	teamId: string;
	invitedBy: string;
	email: string;
	role: string;
	invitationCode: string;
	expiresAt: Date;
	status: "pending" | "accepted" | "revoked";
	message?: string;
};

export type TeamNotificationRecord = {
	id: string;
	userId: string;
	teamId: string;
	type: string;
	title: string;
	content: string;
	isRead: boolean;
	createdAt: Date;
};

export type TeamActiveTimerRecord = {
	id: string;
	teamId: string;
	subteamId: string;
	eventId: string;
	addedBy: string;
	addedAt: Date;
};
