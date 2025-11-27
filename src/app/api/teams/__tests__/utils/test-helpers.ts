/**
 * Test Helpers for Teams API Tests
 *
 * Provides utilities for creating test data, mocking requests, and cleaning up test fixtures.
 */

import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";

// ==================== TEST DATA CREATION ====================

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

/**
 * Creates a test user in the database
 */
// ============ In-memory data store ============

type TeamGroupRecord = {
  id: string;
  school: string;
  division: "B" | "C";
  slug: string;
  createdBy: string;
};

type TeamUnitRecord = {
  id: string;
  groupId: string;
  teamId: string;
  description: string;
  captainCode: string;
  userCode: string;
  createdBy: string;
};

type TeamMembershipRecord = {
  userId: string;
  teamId: string;
  role: "captain" | "co_captain" | "member";
  status: "active" | "inactive";
};

type TeamRosterRecord = {
  teamUnitId: string;
  eventName: string;
  slotIndex: number;
  studentName: string;
  userId: string | null;
};

type TeamStreamPostRecord = {
  id: string;
  teamUnitId: string;
  authorId: string;
  content: string;
};

type TeamEventRecord = {
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

type TeamEventAttendeeRecord = {
  id: string;
  eventId: string;
  userId: string;
  status: string;
};

type AssignmentRecord = {
  id: string;
  teamId: string;
  createdBy: string;
  title: string;
  description?: string;
  assignmentType: string;
  isRequired?: boolean;
};

type AssignmentQuestionRecord = {
  id: string;
  assignmentId: string;
  questionText: string;
  questionType: string;
  correctAnswer?: string;
  orderIndex: number;
  points?: number;
};

type AssignmentRosterRecord = {
  id: string;
  assignmentId: string;
  studentName: string;
  userId?: string;
  subteamId: string;
};

type AssignmentSubmissionRecord = {
  id: string;
  assignmentId: string;
  userId: string;
  content: string;
  status: string;
  attemptNumber: number;
};

type TeamInvitationRecord = {
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

type TeamNotificationRecord = {
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

type TeamActiveTimerRecord = {
  id: string;
  teamUnitId: string;
  eventId: string;
  addedBy: string;
  addedAt: Date;
};

const mockDb = {
  users: new Map<string, TestUser>(),
  teamGroups: new Map<string, TeamGroupRecord>(),
  teamUnits: new Map<string, TeamUnitRecord>(),
  memberships: new Map<string, TeamMembershipRecord>(),
  rosterEntries: new Map<string, TeamRosterRecord>(),
  streamPosts: new Map<string, TeamStreamPostRecord>(),
  events: new Map<string, TeamEventRecord>(),
  eventAttendees: new Map<string, TeamEventAttendeeRecord>(),
  assignments: new Map<string, AssignmentRecord>(),
  assignmentQuestions: new Map<string, AssignmentQuestionRecord>(),
  assignmentRoster: new Map<string, AssignmentRosterRecord>(),
  assignmentSubmissions: new Map<string, AssignmentSubmissionRecord>(),
  teamInvitations: new Map<string, TeamInvitationRecord>(),
  teamNotifications: new Map<string, TeamNotificationRecord>(),
  activeTimers: new Map<string, TeamActiveTimerRecord>(),
};

const nextId = (prefix?: string) => (prefix ? `${prefix}-${randomUUID()}` : randomUUID());

const rosterKey = (teamUnitId: string, eventName: string, slotIndex: number) =>
  `${teamUnitId}:${eventName}:${slotIndex}`;

// ============ Test Data Creation ============

export async function createTestUser(overrides?: Partial<TestUser>): Promise<TestUser> {
  const uniqueSuffix = randomUUID();
  const testUser: TestUser = {
    id: overrides?.id ?? nextId(),
    email: overrides?.email ?? `test-${uniqueSuffix}@example.com`,
    username: overrides?.username ?? `testuser-${uniqueSuffix}`,
    displayName: overrides?.displayName ?? `Test User ${uniqueSuffix}`,
    ...overrides,
  };

  mockDb.users.set(testUser.id, testUser);

  return testUser;
}

/**
 * Creates a test team with a default subteam
 */
export async function createTestTeam(
  creatorId: string,
  overrides?: Partial<TestTeam>
): Promise<TestTeam> {
  const uniqueSuffix = randomUUID().slice(0, 8);
  const slug = overrides?.slug || `test-team-${uniqueSuffix}`;
  const captainCode = overrides?.captainCode || `CAP-${uniqueSuffix}`;
  const userCode = overrides?.userCode || `USER-${uniqueSuffix}`;
  const school = overrides?.school || "Test School";
  const division = overrides?.division || "C";
  const teamIdString = overrides?.slug ? `${overrides.slug}-team` : `team-${uniqueSuffix}`;
  const groupId = overrides?.groupId ?? nextId();
  const subteamId = overrides?.subteamId ?? nextId();

  mockDb.teamGroups.set(groupId, {
    id: groupId,
    school,
    division,
    slug,
    createdBy: creatorId,
  });

  mockDb.teamUnits.set(subteamId, {
    id: subteamId,
    groupId,
    teamId: teamIdString,
    description: overrides?.description ?? "Test Subteam",
    captainCode,
    userCode,
    createdBy: creatorId,
  });

  mockDb.memberships.set(`${creatorId}:${subteamId}`, {
    userId: creatorId,
    teamId: subteamId,
    role: "captain",
    status: "active",
  });

  return {
    groupId,
    subteamId,
    slug,
    captainCode,
    userCode,
    school,
    division,
  };
}

/**
 * Adds a member to a team
 */
export async function addTeamMember(
  teamId: string,
  userId: string,
  role: "captain" | "co_captain" | "member" = "member"
): Promise<void> {
  mockDb.memberships.set(`${userId}:${teamId}`, {
    userId,
    teamId,
    role,
    status: "active",
  });
}

/**
 * Creates a roster entry
 */
export async function createRosterEntry(
  teamUnitId: string,
  eventName: string,
  slotIndex: number,
  studentName: string,
  userId?: string
): Promise<void> {
  mockDb.rosterEntries.set(rosterKey(teamUnitId, eventName, slotIndex), {
    teamUnitId,
    eventName,
    slotIndex,
    studentName,
    userId: userId ?? null,
  });
}

/**
 * Creates a stream post
 */
export async function createStreamPost(
  teamUnitId: string,
  authorId: string,
  content: string
): Promise<string> {
  const postId = nextId("post");
  mockDb.streamPosts.set(postId, {
    id: postId,
    teamUnitId,
    authorId,
    content,
  });
  return postId;
}

// ==================== CLEANUP UTILITIES ====================

/**
 * Cleans up test data
 */
export async function cleanupTestData(_userIds: string[], _teamGroupIds: string[]): Promise<void> {
  mockDb.rosterEntries.clear();
  mockDb.streamPosts.clear();
  mockDb.memberships.clear();
  mockDb.teamUnits.clear();
  mockDb.teamGroups.clear();
  mockDb.events.clear();
  mockDb.eventAttendees.clear();
  mockDb.assignments.clear();
  mockDb.assignmentQuestions.clear();
  mockDb.assignmentRoster.clear();
  mockDb.assignmentSubmissions.clear();
  mockDb.teamInvitations.clear();
  mockDb.teamNotifications.clear();
  mockDb.activeTimers.clear();
  mockDb.users.clear();
}

// ==================== MOCK REQUEST UTILITIES ====================

/**
 * Creates a mock NextRequest for testing
 */
type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

export function createMockRequest(
  url: string,
  method = "GET",
  body?: unknown,
  headers?: Record<string, string>
): NextRequest {
  const requestInit: NextRequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
}

/**
 * Creates a mock request with authentication
 */
export function createAuthenticatedRequest(
  url: string,
  userId: string,
  method = "GET",
  body?: unknown
): NextRequest {
  return createMockRequest(url, method, body, {
    Authorization: `Bearer mock-token-${userId}`,
  });
}

// ==================== ASSERTION HELPERS ====================

/**
 * Asserts that a user is a member of a team
 */
export async function assertUserIsMember(
  userId: string,
  teamId: string,
  expectedRole?: "captain" | "co_captain" | "member"
): Promise<void> {
  const membership = mockDb.memberships.get(`${userId}:${teamId}`);
  if (!membership || membership.status !== "active") {
    throw new Error(`User ${userId} is not a member of team ${teamId}`);
  }

  if (expectedRole && membership.role !== expectedRole) {
    throw new Error(`User ${userId} has role ${membership.role}, expected ${expectedRole}`);
  }
}

/**
 * Asserts that a user is NOT a member of a team
 */
export async function assertUserIsNotMember(userId: string, teamId: string): Promise<void> {
  const membership = mockDb.memberships.get(`${userId}:${teamId}`);
  if (membership) {
    throw new Error(`User ${userId} is unexpectedly a member of team ${teamId}`);
  }
}

// ============ Additional helpers for tests ============

export function getTeamGroup(groupId: string) {
  return mockDb.teamGroups.get(groupId);
}

export function getTeamUnit(teamUnitId: string) {
  return mockDb.teamUnits.get(teamUnitId);
}

export function getMembership(userId: string, teamId: string) {
  return mockDb.memberships.get(`${userId}:${teamId}`);
}

export function getRosterEntries(teamUnitId: string) {
  return Array.from(mockDb.rosterEntries.values()).filter((entry) => entry.teamUnitId === teamUnitId);
}

export function getRosterEntry(teamUnitId: string, eventName: string, slotIndex: number) {
  return mockDb.rosterEntries.get(rosterKey(teamUnitId, eventName, slotIndex));
}

export function updateRosterEntry(
  teamUnitId: string,
  eventName: string,
  slotIndex: number,
  updates: Partial<TeamRosterRecord>
) {
  const key = rosterKey(teamUnitId, eventName, slotIndex);
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
  return Array.from(mockDb.events.values()).filter((event) => event.teamId === teamId);
}

export function updateEvent(eventId: string, updates: Partial<TeamEventRecord>) {
  const event = mockDb.events.get(eventId);
  if (event) {
    mockDb.events.set(eventId, { ...event, ...updates });
  }
}

export function deleteEvent(eventId: string) {
  mockDb.events.delete(eventId);
}

export function addEventAttendee(eventId: string, userId: string, status: string) {
  const id = nextId("attendee");
  mockDb.eventAttendees.set(id, { id, eventId, userId, status });
  return { id };
}

export function getEventAttendees(eventId: string) {
  return Array.from(mockDb.eventAttendees.values()).filter((attendee) => attendee.eventId === eventId);
}

export function createAssignment(data: Omit<AssignmentRecord, "id">) {
  const id = nextId("assignment");
  mockDb.assignments.set(id, { id, ...data });
  return { id };
}

export function getAssignmentsByTeamId(teamId: string) {
  return Array.from(mockDb.assignments.values()).filter((assignment) => assignment.teamId === teamId);
}

export function createAssignmentQuestions(
  assignmentId: string,
  questions: Omit<AssignmentQuestionRecord, "id" | "assignmentId">[]
) {
  return questions.map((question) => {
    const id = nextId("question");
    mockDb.assignmentQuestions.set(id, { id, assignmentId, ...question });
    return { id };
  });
}

export function getAssignmentQuestions(assignmentId: string) {
  return Array.from(mockDb.assignmentQuestions.values()).filter(
    (question) => question.assignmentId === assignmentId
  );
}

export function addAssignmentRosterEntry(data: Omit<AssignmentRosterRecord, "id">) {
  const id = nextId("assignment-roster");
  mockDb.assignmentRoster.set(id, { id, ...data });
  return { id };
}

export function getAssignmentRosterEntries(assignmentId: string) {
  return Array.from(mockDb.assignmentRoster.values()).filter(
    (entry) => entry.assignmentId === assignmentId
  );
}

export function createAssignmentSubmission(data: Omit<AssignmentSubmissionRecord, "id">) {
  const id = nextId("assignment-submission");
  mockDb.assignmentSubmissions.set(id, { id, ...data });
  return { id };
}

export function getAssignmentSubmissions(assignmentId: string) {
  return Array.from(mockDb.assignmentSubmissions.values()).filter(
    (submission) => submission.assignmentId === assignmentId
  );
}

// ==================== INVITATIONS & NOTIFICATIONS ====================

export function findUsersByUsername(username: string) {
  return Array.from(mockDb.users.values()).filter((user) => user.username === username);
}

export function findUsersByEmail(email: string) {
  return Array.from(mockDb.users.values()).filter((user) => user.email === email);
}

export function createTeamInvitation(data: Omit<TeamInvitationRecord, "id" | "status"> & { status?: TeamInvitationRecord["status"] }) {
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

export function getTeamInvitations(filter: { teamId?: string; email?: string; status?: TeamInvitationRecord["status"] }) {
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
  data: Omit<TeamNotificationRecord, "id" | "createdAt" | "isRead"> & { isRead?: boolean }
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
  return Array.from(mockDb.teamNotifications.values()).filter((notification) => notification.userId === userId);
}

export function updateTeamNotification(notificationId: string, updates: Partial<TeamNotificationRecord>) {
  const existing = mockDb.teamNotifications.get(notificationId);
  if (existing) {
    mockDb.teamNotifications.set(notificationId, { ...existing, ...updates });
  }
}

export function deleteTeamNotification(notificationId: string) {
  mockDb.teamNotifications.delete(notificationId);
}

// ==================== TIMERS & MEMBERSHIPS ====================

export function addActiveTimer(data: Omit<TeamActiveTimerRecord, "id" | "addedAt">) {
  const id = nextId();
  const timer: TeamActiveTimerRecord = {
    id,
    addedAt: new Date(),
    ...data,
  };
  mockDb.activeTimers.set(id, timer);
  return { id };
}

export function getActiveTimersByTeamUnit(teamUnitId: string) {
  return Array.from(mockDb.activeTimers.values()).filter((timer) => timer.teamUnitId === teamUnitId);
}

export function deleteActiveTimer(timerId: string) {
  mockDb.activeTimers.delete(timerId);
}

export function getMembershipsByTeamId(teamId: string) {
  return Array.from(mockDb.memberships.values()).filter((membership) => membership.teamId === teamId);
}

export function getMembershipsByGroupId(groupId: string) {
  const teamUnitIds = Array.from(mockDb.teamUnits.values())
    .filter((unit) => unit.groupId === groupId)
    .map((unit) => unit.id);

  return Array.from(mockDb.memberships.values()).filter((membership) =>
    teamUnitIds.includes(membership.teamId)
  );
}

export function getMembershipsByUser(userId: string) {
  return Array.from(mockDb.memberships.values()).filter((membership) => membership.userId === userId);
}
