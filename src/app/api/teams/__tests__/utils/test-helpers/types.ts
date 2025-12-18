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
	groupId: string;
	teamId: string;
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
	teamUnitId: string;
	eventName: string;
	slotIndex: number;
	studentName: string;
	userId: string | null;
};

export type TeamStreamPostRecord = {
	id: string;
	teamUnitId: string;
	authorId: string;
	content: string;
};

export type TeamEventRecord = {
	id: string;
	teamId: string | null;
	createdBy: string;
	title: string;
	eventType: string;
	startTime: Date;
	endTime?: Date;
	location?: string;
	isAllDay?: boolean;
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
	notificationType: string;
	title: string;
	message: string;
	isRead: boolean;
	readAt?: Date;
	createdAt: Date;
};

export type TeamActiveTimerRecord = {
	id: string;
	teamUnitId: string;
	eventId: string;
	addedBy: string;
	addedAt: Date;
};
