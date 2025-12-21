import { randomUUID } from "node:crypto";
import { mockDb } from "./mockDb";
import type {
	AssignmentQuestionRecord,
	AssignmentRecord,
	AssignmentRosterRecord,
	AssignmentSubmissionRecord,
	TeamActiveTimerRecord,
	TeamEventRecord,
	TeamInvitationRecord,
	TeamNotificationRecord,
	TeamRosterRecord,
} from "./types";

const nextId = (prefix?: string) =>
	prefix ? `${prefix}-${randomUUID()}` : randomUUID();

const rosterKey = (teamUnitId: string, eventName: string, slotIndex: number) =>
	`${teamUnitId}:${eventName}:${slotIndex}`;

export function getTeamGroup(groupId: string) {
	return mockDb.teamGroups.get(groupId);
}

export function getTeamUnit(teamUnitId: string) {
	return mockDb.teamUnits.get(teamUnitId);
}

export function getMembership(userId: string, teamId: string) {
	return mockDb.memberships.get(`${userId}:${teamId}`);
}

export function getRosterEntries(subteamId: string) {
	return Array.from(mockDb.rosterEntries.values()).filter(
		(entry) => entry.subteamId === subteamId,
	);
}

export function getRosterEntry(
	subteamId: string,
	eventName: string,
	slotIndex: number,
) {
	return mockDb.rosterEntries.get(rosterKey(subteamId, eventName, slotIndex));
}

export function updateRosterEntry(
	subteamId: string,
	eventName: string,
	slotIndex: number,
	updates: Partial<TeamRosterRecord>,
) {
	const key = rosterKey(subteamId, eventName, slotIndex);
	const entry = mockDb.rosterEntries.get(key);
	if (entry) {
		mockDb.rosterEntries.set(key, { ...entry, ...updates });
	}
}

export function createEvent(data: Omit<TeamEventRecord, "id">) {
	const id = nextId("event");
	mockDb.events.set(id, { id, ...data });
	return { id };
}

export function getEventById(eventId: string) {
	return mockDb.events.get(eventId);
}

export function getEventsByTeamId(teamId: string | null) {
	return Array.from(mockDb.events.values()).filter(
		(event) => event.teamId === teamId,
	);
}

export function updateEvent(
	eventId: string,
	updates: Partial<TeamEventRecord>,
) {
	const event = mockDb.events.get(eventId);
	if (event) {
		mockDb.events.set(eventId, { ...event, ...updates });
	}
}

export function deleteEvent(eventId: string) {
	mockDb.events.delete(eventId);
}

export function addEventAttendee(
	eventId: string,
	userId: string,
	status: string,
) {
	const id = nextId("attendee");
	mockDb.eventAttendees.set(id, { id, eventId, userId, status });
	return { id };
}

export function getEventAttendees(eventId: string) {
	return Array.from(mockDb.eventAttendees.values()).filter(
		(attendee) => attendee.eventId === eventId,
	);
}

export function createAssignment(data: Omit<AssignmentRecord, "id">) {
	const id = nextId("assignment");
	mockDb.assignments.set(id, { id, ...data });
	return { id };
}

export function getAssignmentsByTeamId(teamId: string) {
	return Array.from(mockDb.assignments.values()).filter(
		(assignment) => assignment.teamId === teamId,
	);
}

export function createAssignmentQuestions(
	assignmentId: string,
	questions: Omit<AssignmentQuestionRecord, "id" | "assignmentId">[],
) {
	return questions.map((question) => {
		const id = nextId("question");
		mockDb.assignmentQuestions.set(id, { id, assignmentId, ...question });
		return { id };
	});
}

export function getAssignmentQuestions(assignmentId: string) {
	return Array.from(mockDb.assignmentQuestions.values()).filter(
		(question) => question.assignmentId === assignmentId,
	);
}

export function addAssignmentRosterEntry(
	data: Omit<AssignmentRosterRecord, "id">,
) {
	const id = nextId("assignment-roster");
	mockDb.assignmentRoster.set(id, { id, ...data });
	return { id };
}

export function getAssignmentRosterEntries(assignmentId: string) {
	return Array.from(mockDb.assignmentRoster.values()).filter(
		(entry) => entry.assignmentId === assignmentId,
	);
}

export function createAssignmentSubmission(
	data: Omit<AssignmentSubmissionRecord, "id">,
) {
	const id = nextId("assignment-submission");
	mockDb.assignmentSubmissions.set(id, { id, ...data });
	return { id };
}

export function getAssignmentSubmissions(assignmentId: string) {
	return Array.from(mockDb.assignmentSubmissions.values()).filter(
		(submission) => submission.assignmentId === assignmentId,
	);
}

export function findUsersByUsername(username: string) {
	return Array.from(mockDb.users.values()).filter(
		(user) => user.username === username,
	);
}

export function findUsersByEmail(email: string) {
	return Array.from(mockDb.users.values()).filter(
		(user) => user.email === email,
	);
}

export function createTeamInvitation(
	data: Omit<TeamInvitationRecord, "id" | "status"> & {
		status?: TeamInvitationRecord["status"];
	},
) {
	const id = nextId();
	const invitation: TeamInvitationRecord = {
		id,
		status: data.status ?? "pending",
		...data,
	};
	mockDb.teamInvitations.set(id, invitation);
	return { id };
}

export function getTeamInvitationById(invitationId: string) {
	return mockDb.teamInvitations.get(invitationId);
}

export function getTeamInvitations(filter: {
	teamId?: string;
	email?: string;
	status?: TeamInvitationRecord["status"];
}) {
	return Array.from(mockDb.teamInvitations.values()).filter((invitation) => {
		if (filter.teamId && invitation.teamId !== filter.teamId) {
			return false;
		}
		if (filter.email && invitation.email !== filter.email) {
			return false;
		}
		if (filter.status && invitation.status !== filter.status) {
			return false;
		}
		return true;
	});
}

export function createTeamNotification(
	data: Omit<TeamNotificationRecord, "id" | "createdAt" | "isRead"> & {
		isRead?: boolean;
	},
) {
	const id = nextId();
	const notification: TeamNotificationRecord = {
		id,
		createdAt: new Date(),
		isRead: data.isRead ?? false,
		...data,
	};
	mockDb.teamNotifications.set(id, notification);
	return { id };
}

export function getTeamNotificationById(notificationId: string) {
	return mockDb.teamNotifications.get(notificationId);
}

export function getNotificationsByUser(userId: string) {
	return Array.from(mockDb.teamNotifications.values()).filter(
		(notification) => notification.userId === userId,
	);
}

export function updateTeamNotification(
	notificationId: string,
	updates: Partial<TeamNotificationRecord>,
) {
	const existing = mockDb.teamNotifications.get(notificationId);
	if (existing) {
		mockDb.teamNotifications.set(notificationId, { ...existing, ...updates });
	}
}

export function deleteTeamNotification(notificationId: string) {
	mockDb.teamNotifications.delete(notificationId);
}

export function addActiveTimer(
	data: Omit<TeamActiveTimerRecord, "id" | "addedAt">,
) {
	const id = nextId();
	const timer: TeamActiveTimerRecord = {
		id,
		addedAt: new Date(),
		...data,
	};
	mockDb.activeTimers.set(id, timer);
	return { id };
}

export function getActiveTimersByTeamUnit(subteamId: string) {
	return Array.from(mockDb.activeTimers.values()).filter(
		(timer) => timer.subteamId === subteamId,
	);
}

export function deleteActiveTimer(timerId: string) {
	mockDb.activeTimers.delete(timerId);
}

export function getMembershipsByTeamId(teamId: string) {
	return Array.from(mockDb.memberships.values()).filter(
		(membership) => membership.teamId === teamId,
	);
}

export function getMembershipsByGroupId(groupId: string) {
	const teamUnitIds = Array.from(mockDb.teamUnits.values())
		.filter((unit) => unit.teamId === groupId)
		.map((unit) => unit.id);

	return Array.from(mockDb.memberships.values()).filter((membership) =>
		teamUnitIds.includes(membership.teamId),
	);
}

export function getMembershipsByUser(userId: string) {
	return Array.from(mockDb.memberships.values()).filter(
		(membership) => membership.userId === userId,
	);
}
