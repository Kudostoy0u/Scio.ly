/**
 * Test Helpers for Teams API Tests
 *
 * Provides utilities for creating test data, mocking requests, and cleaning up test fixtures.
 */

import { dbPg } from "@/lib/db";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamRosterData,
  newTeamStreamPosts,
  newTeamUnits,
  users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
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
}

/**
 * Creates a test user in the database
 */
export async function createTestUser(overrides?: Partial<TestUser>): Promise<TestUser> {
  const timestamp = Date.now();
  const testUser: TestUser = {
    id: crypto.randomUUID(),
    email: `test-${timestamp}@example.com`,
    username: `testuser-${timestamp}`,
    displayName: `Test User ${timestamp}`,
    ...overrides,
  };

  await dbPg.insert(users).values([
    {
      id: testUser.id,
      email: testUser.email,
      username: testUser.username,
      displayName: testUser.displayName,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
    },
  ]);

  return testUser;
}

/**
 * Creates a test team with a default subteam
 */
export async function createTestTeam(
  creatorId: string,
  overrides?: Partial<TestTeam>
): Promise<TestTeam> {
  const timestamp = Date.now();
  const slug = overrides?.slug || `test-team-${timestamp}`;
  const captainCode = overrides?.captainCode || `CAP-${timestamp}`;
  const userCode = overrides?.userCode || `USER-${timestamp}`;
  const school = overrides?.school || "Test School";
  const division = overrides?.division || "C";

  // Create team group
  const [group] = await dbPg
    .insert(newTeamGroups)
    .values({
      school,
      division,
      slug,
      createdBy: creatorId,
    } as typeof newTeamGroups.$inferInsert)
    .returning({ id: newTeamGroups.id });

  if (!group) {
    throw new Error("Failed to create test team group");
  }

  // Create default subteam
  const [subteam] = await dbPg
    .insert(newTeamUnits)
    .values({
      groupId: group.id,
      teamId: "Team 1",
      description: "Test Subteam",
      captainCode,
      userCode,
      createdBy: creatorId,
    } as typeof newTeamUnits.$inferInsert)
    .returning({ id: newTeamUnits.id });

  if (!subteam) {
    throw new Error("Failed to create test subteam");
  }

  // Add creator as captain
  await dbPg.insert(newTeamMemberships).values({
    userId: creatorId,
    teamId: subteam.id,
    role: "captain",
    status: "active",
  });

  return {
    groupId: group.id,
    subteamId: subteam.id,
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
  await dbPg.insert(newTeamMemberships).values({
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
  await dbPg.insert(newTeamRosterData).values({
    teamUnitId,
    eventName,
    slotIndex,
    studentName,
    userId: userId || null,
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
  const [post] = await dbPg
    .insert(newTeamStreamPosts)
    .values({
      teamUnitId,
      authorId,
      content,
    })
    .returning({ id: newTeamStreamPosts.id });

  if (!post) {
    throw new Error("Failed to create stream post");
  }

  return post.id;
}

// ==================== CLEANUP UTILITIES ====================

/**
 * Cleans up test data
 */
export async function cleanupTestData(userIds: string[], teamGroupIds: string[]): Promise<void> {
  // Get all subteam IDs for the groups
  const firstGroupId = teamGroupIds.length > 0 ? teamGroupIds[0] : undefined;
  const subteams = firstGroupId
    ? await dbPg
        .select({ id: newTeamUnits.id })
        .from(newTeamUnits)
        .where(eq(newTeamUnits.groupId, firstGroupId))
    : [];

  const subteamIds = subteams.map((s) => s.id);

  // Delete in reverse order of dependencies
  for (const subteamId of subteamIds) {
    await dbPg.delete(newTeamRosterData).where(eq(newTeamRosterData.teamUnitId, subteamId));
    await dbPg.delete(newTeamStreamPosts).where(eq(newTeamStreamPosts.teamUnitId, subteamId));
    await dbPg.delete(newTeamMemberships).where(eq(newTeamMemberships.teamId, subteamId));
  }

  for (const subteamId of subteamIds) {
    await dbPg.delete(newTeamUnits).where(eq(newTeamUnits.id, subteamId));
  }

  for (const groupId of teamGroupIds) {
    await dbPg.delete(newTeamGroups).where(eq(newTeamGroups.id, groupId));
  }

  for (const userId of userIds) {
    await dbPg.delete(users).where(eq(users.id, userId));
  }
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
  const [membership] = await dbPg
    .select()
    .from(newTeamMemberships)
    .where(
      and(
        eq(newTeamMemberships.userId, userId),
        eq(newTeamMemberships.teamId, teamId),
        eq(newTeamMemberships.status, "active")
      )
    );

  if (!membership) {
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
  const [membership] = await dbPg
    .select()
    .from(newTeamMemberships)
    .where(and(eq(newTeamMemberships.userId, userId), eq(newTeamMemberships.teamId, teamId)));

  if (membership) {
    throw new Error(`User ${userId} is unexpectedly a member of team ${teamId}`);
  }
}
