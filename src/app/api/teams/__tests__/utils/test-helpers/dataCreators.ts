import { randomUUID } from "node:crypto";
import { mockDb } from "./mockDb";
import type { TestTeam, TestUser } from "./types";

const nextId = (prefix?: string) =>
	prefix ? `${prefix}-${randomUUID()}` : randomUUID();

export function createTestUser(overrides?: Partial<TestUser>): TestUser {
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

export function createTestTeam(
	creatorId: string,
	overrides?: Partial<TestTeam>,
): TestTeam {
	const uniqueSuffix = randomUUID().slice(0, 8);
	const slug = overrides?.slug || `test-team-${uniqueSuffix}`;
	const captainCode = overrides?.captainCode || `CAP-${uniqueSuffix}`;
	const userCode = overrides?.userCode || `USER-${uniqueSuffix}`;
	const school = overrides?.school || "Test School";
	const division = overrides?.division || "C";
	const groupId = overrides?.groupId ?? nextId();
	const subteamId = overrides?.subteamId ?? nextId();
	const teamIdString = overrides?.teamId ?? groupId;

	mockDb.teamGroups.set(groupId, {
		id: groupId,
		school,
		division,
		slug,
		createdBy: creatorId,
	});

	mockDb.teamUnits.set(subteamId, {
		id: subteamId,
		teamId: groupId,
		name: "A",
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
		teamId: teamIdString,
		subteamId,
		slug,
		captainCode,
		userCode,
		school,
		division,
	};
}

export function addTeamMember(
	teamId: string,
	userId: string,
	role: "captain" | "member" = "member",
): void {
	mockDb.memberships.set(`${userId}:${teamId}`, {
		userId,
		teamId,
		role,
		status: "active",
	});
}

const rosterKey = (teamUnitId: string, eventName: string, slotIndex: number) =>
	`${teamUnitId}:${eventName}:${slotIndex}`;

export function createRosterEntry(
	subteamId: string,
	eventName: string,
	slotIndex: number,
	studentName: string,
	userId?: string,
): void {
	const id = nextId();
	// Resolve teamId from subteamId
	const subteam = mockDb.teamUnits.get(subteamId);
	const teamId = subteam?.teamId ?? subteamId;

	mockDb.rosterEntries.set(rosterKey(subteamId, eventName, slotIndex), {
		id,
		teamId,
		subteamId,
		eventName,
		slotIndex,
		studentName,
		displayName: studentName,
		userId: userId ?? null,
	});
}

export function cleanupTestData(
	_userIds: string[],
	_teamGroupIds: string[],
): void {
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
