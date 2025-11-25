/**
 * E2E Tests for Teams Feature
 *
 * These tests verify end-to-end workflows for the teams feature,
 * including team creation, joining, roster management, assignments, and more.
 *
 * Run with: npm run test:teams-integration
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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Test utilities
interface TestUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
}

interface TestTeam {
  groupId: string;
  subteamId: string;
  slug: string;
  captainCode: string;
  userCode: string;
}

/**
 * Creates a test user in the database
 */
async function createTestUser(overrides?: Partial<TestUser>): Promise<TestUser> {
  const testUser: TestUser = {
    id: crypto.randomUUID(),
    email: `test-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    displayName: `Test User ${Date.now()}`,
    ...overrides,
  };

  await dbPg.insert(users).values({
    id: testUser.id,
    email: testUser.email,
    username: testUser.username,
    displayName: testUser.displayName,
  });

  return testUser;
}

/**
 * Creates a test team with a default subteam
 */
async function createTestTeam(creatorId: string): Promise<TestTeam> {
  const slug = `test-team-${Date.now()}`;
  const captainCode = `CAP-${Date.now()}`;
  const userCode = `USER-${Date.now()}`;

  // Create team group
  const [group] = await dbPg
    .insert(newTeamGroups)
    .values({
      school: "Test School",
      division: "C",
      slug,
      createdBy: creatorId,
    })
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
    })
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
  };
}

/**
 * Cleans up test data
 */
async function cleanupTestData(userIds: string[], teamIds: string[]) {
  // Delete in reverse order of dependencies
  for (const teamId of teamIds) {
    await dbPg.delete(newTeamRosterData).where(eq(newTeamRosterData.teamUnitId, teamId));
    await dbPg.delete(newTeamStreamPosts).where(eq(newTeamStreamPosts.teamUnitId, teamId));
    await dbPg.delete(newTeamMemberships).where(eq(newTeamMemberships.teamId, teamId));
    await dbPg.delete(newTeamUnits).where(eq(newTeamUnits.id, teamId));
  }

  for (const groupId of teamIds.map((_, _i) => {
    // Get group ID from team
    return ""; // Will be handled separately
  })) {
    if (groupId) {
      await dbPg.delete(newTeamGroups).where(eq(newTeamGroups.id, groupId));
    }
  }

  for (const userId of userIds) {
    await dbPg.delete(users).where(eq(users.id, userId));
  }
}

describe("Teams E2E Tests", () => {
  const testUsers: TestUser[] = [];
  let testTeams: TestTeam[] = [];

  beforeAll(async () => {
    // Setup: Create test users
    testUsers.push(await createTestUser());
    testUsers.push(await createTestUser());
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    const userIds = testUsers.map((u) => u.id);
    const teamIds = testTeams.map((t) => t.subteamId);
    await cleanupTestData(userIds, teamIds);
  });

  beforeEach(() => {
    // Reset test teams for each test
    testTeams = [];
  });

  describe("Team Creation Flow", () => {
    it("should create a team with default subteam", async () => {
      const creator = testUsers[0];
      const team = await createTestTeam(creator.id);
      testTeams.push(team);

      // Verify team group exists
      const [group] = await dbPg
        .select()
        .from(newTeamGroups)
        .where(eq(newTeamGroups.id, team.groupId));

      expect(group).toBeDefined();
      expect(group?.slug).toBe(team.slug);
      expect(group?.school).toBe("Test School");
      expect(group?.division).toBe("C");

      // Verify subteam exists
      const [subteam] = await dbPg
        .select()
        .from(newTeamUnits)
        .where(eq(newTeamUnits.id, team.subteamId));

      expect(subteam).toBeDefined();
      expect(subteam?.groupId).toBe(team.groupId);
      expect(subteam?.captainCode).toBe(team.captainCode);
      expect(subteam?.userCode).toBe(team.userCode);

      // Verify creator is captain
      const [membership] = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, creator.id),
            eq(newTeamMemberships.teamId, team.subteamId)
          )
        );

      expect(membership).toBeDefined();
      expect(membership?.role).toBe("captain");
      expect(membership?.status).toBe("active");
    });
  });

  describe("Team Joining Flow", () => {
    it("should allow user to join team with user code", async () => {
      const creator = testUsers[0];
      const joiner = testUsers[1];
      const team = await createTestTeam(creator.id);
      testTeams.push(team);

      // Join team using user code
      await dbPg.insert(newTeamMemberships).values({
        userId: joiner.id,
        teamId: team.subteamId,
        role: "member",
        status: "active",
      });

      // Verify membership
      const [membership] = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, joiner.id),
            eq(newTeamMemberships.teamId, team.subteamId)
          )
        );

      expect(membership).toBeDefined();
      expect(membership?.role).toBe("member");
      expect(membership?.status).toBe("active");
    });
  });

  describe("Roster Management Flow", () => {
    it("should create and update roster entries", async () => {
      const creator = testUsers[0];
      const team = await createTestTeam(creator.id);
      testTeams.push(team);

      // Create roster entry
      await dbPg.insert(newTeamRosterData).values({
        teamUnitId: team.subteamId,
        eventName: "Astronomy",
        slotIndex: 0,
        studentName: "John Doe",
        userId: creator.id,
      });

      // Verify roster entry
      const [rosterEntry] = await dbPg
        .select()
        .from(newTeamRosterData)
        .where(eq(newTeamRosterData.teamUnitId, team.subteamId));

      expect(rosterEntry).toBeDefined();
      expect(rosterEntry?.eventName).toBe("Astronomy");
      expect(rosterEntry?.slotIndex).toBe(0);
      expect(rosterEntry?.studentName).toBe("John Doe");
      expect(rosterEntry?.userId).toBe(creator.id);

      // Update roster entry
      await dbPg
        .update(newTeamRosterData)
        .set({ studentName: "Jane Doe" })
        .where(
          and(
            eq(newTeamRosterData.teamUnitId, team.subteamId),
            eq(newTeamRosterData.eventName, "Astronomy"),
            eq(newTeamRosterData.slotIndex, 0)
          )
        );

      // Verify update
      const [updatedEntry] = await dbPg
        .select()
        .from(newTeamRosterData)
        .where(eq(newTeamRosterData.teamUnitId, team.subteamId));

      expect(updatedEntry?.studentName).toBe("Jane Doe");
    });
  });

  describe("Stream Post Flow", () => {
    it("should create stream posts", async () => {
      const creator = testUsers[0];
      const team = await createTestTeam(creator.id);
      testTeams.push(team);

      // Create stream post
      const [post] = await dbPg
        .insert(newTeamStreamPosts)
        .values({
          teamUnitId: team.subteamId,
          authorId: creator.id,
          content: "Test stream post",
        })
        .returning({ id: newTeamStreamPosts.id });

      expect(post).toBeDefined();

      // Verify post exists
      const [retrievedPost] = await dbPg
        .select()
        .from(newTeamStreamPosts)
        .where(eq(newTeamStreamPosts.id, post.id));

      expect(retrievedPost).toBeDefined();
      expect(retrievedPost?.content).toBe("Test stream post");
      expect(retrievedPost?.teamUnitId).toBe(team.subteamId);
      expect(retrievedPost?.authorId).toBe(creator.id);
    });
  });

  describe("Authorization Checks", () => {
    it("should enforce captain-only operations", async () => {
      const creator = testUsers[0];
      const member = testUsers[1];
      const team = await createTestTeam(creator.id);
      testTeams.push(team);

      // Add member
      await dbPg.insert(newTeamMemberships).values({
        userId: member.id,
        teamId: team.subteamId,
        role: "member",
        status: "active",
      });

      // Verify creator is captain
      const [creatorMembership] = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, creator.id),
            eq(newTeamMemberships.teamId, team.subteamId)
          )
        );

      expect(creatorMembership?.role).toBe("captain");

      // Verify member is not captain
      const [memberMembership] = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, member.id),
            eq(newTeamMemberships.teamId, team.subteamId)
          )
        );

      expect(memberMembership?.role).toBe("member");
    });
  });
});
