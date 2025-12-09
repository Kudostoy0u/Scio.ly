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
	const teamIdString = overrides?.slug
		? `${overrides.slug}-team`
		: `team-${uniqueSuffix}`;
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

export function addTeamMember(
	teamId: string,
	userId: string,
	role: "captain" | "co_captain" | "member" = "member",
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
	teamUnitId: string,
	eventName: string,
	slotIndex: number,
	studentName: string,
	userId?: string,
): void {
	mockDb.rosterEntries.set(rosterKey(teamUnitId, eventName, slotIndex), {
		teamUnitId,
		eventName,
		slotIndex,
		studentName,
		userId: userId ?? null,
	});
}

export function createStreamPost(
	teamUnitId: string,
	authorId: string,
	content: string,
): string {
	const postId = nextId("post");
	mockDb.streamPosts.set(postId, {
		id: postId,
		teamUnitId,
		authorId,
		content,
	});
	return postId;
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
