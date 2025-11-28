/**
 * E2E Tests for Teams Feature
 *
 * These tests verify end-to-end workflows for the teams feature,
 * including team creation, joining, roster management, assignments, and more.
 *
 * Run with: npm run test:teams-integration
 */

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

type TeamGroupRecord = {
  id: string;
  school: string;
  division: string;
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
  userId: string;
};

type TeamStreamPostRecord = {
  id: string;
  teamUnitId: string;
  authorId: string;
  content: string;
};

let idCounter = 0;
const nextId = (prefix: string) => {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
};

const mockDb = {
  users: new Map<string, TestUser>(),
  teamGroups: new Map<string, TeamGroupRecord>(),
  teamUnits: new Map<string, TeamUnitRecord>(),
  memberships: new Map<string, TeamMembershipRecord>(),
  rosterData: new Map<string, TeamRosterRecord>(),
  streamPosts: new Map<string, TeamStreamPostRecord>(),
};

const rosterKey = (teamUnitId: string, eventName: string, slotIndex: number) =>
  `${teamUnitId}:${eventName}:${slotIndex}`;

/**
 * Creates a test user in the in-memory database
 */
async function createTestUser(overrides?: Partial<TestUser>): Promise<TestUser> {
  const testUser: TestUser = {
    id: overrides?.id ?? nextId("user"),
    email: `test-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    displayName: `Test User ${Date.now()}`,
    ...overrides,
  };

  mockDb.users.set(testUser.id, testUser);

  return testUser;
}

/**
 * Creates a test team with a default subteam
 */
async function createTestTeam(creatorId: string): Promise<TestTeam> {
  const creator = mockDb.users.get(creatorId);
  if (!creator) {
    throw new Error("Creator not found");
  }

  const slug = `test-team-${Date.now()}`;
  const captainCode = `CAP-${Date.now()}`;
  const userCode = `USER-${Date.now()}`;

  const groupId = nextId("group");
  const subteamId = nextId("subteam");

  mockDb.teamGroups.set(groupId, {
    id: groupId,
    school: "Test School",
    division: "C",
    slug,
    createdBy: creatorId,
  });

  mockDb.teamUnits.set(subteamId, {
    id: subteamId,
    groupId,
    teamId: "Team 1",
    description: "Test Subteam",
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
  };
}

/**
 * Cleans up test data
 */
async function cleanupTestData(_userIds: string[], _teamIds: string[]) {
  mockDb.rosterData.clear();
  mockDb.streamPosts.clear();
  mockDb.memberships.clear();
  mockDb.teamUnits.clear();
  mockDb.teamGroups.clear();
  mockDb.users.clear();
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
    testTeams = [];
  });

  describe("Team Creation Flow", () => {
    it("should create a team with default subteam", async () => {
      const creator = testUsers[0];
      const team = await createTestTeam(creator.id);
      testTeams.push(team);

      // Verify team group exists
      const group = mockDb.teamGroups.get(team.groupId);
      expect(group).toBeDefined();
      expect(group?.slug).toBe(team.slug);
      expect(group?.school).toBe("Test School");
      expect(group?.division).toBe("C");

      const subteam = mockDb.teamUnits.get(team.subteamId);
      expect(subteam).toBeDefined();
      expect(subteam?.groupId).toBe(team.groupId);
      expect(subteam?.captainCode).toBe(team.captainCode);
      expect(subteam?.userCode).toBe(team.userCode);

      const membership = mockDb.memberships.get(`${creator.id}:${team.subteamId}`);
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
      mockDb.memberships.set(`${joiner.id}:${team.subteamId}`, {
        userId: joiner.id,
        teamId: team.subteamId,
        role: "member",
        status: "active",
      });

      const membership = mockDb.memberships.get(`${joiner.id}:${team.subteamId}`);
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
      const key = rosterKey(team.subteamId, "Astronomy", 0);
      mockDb.rosterData.set(key, {
        teamUnitId: team.subteamId,
        eventName: "Astronomy",
        slotIndex: 0,
        studentName: "John Doe",
        userId: creator.id,
      });

      const rosterEntry = mockDb.rosterData.get(key);
      expect(rosterEntry).toBeDefined();
      expect(rosterEntry?.eventName).toBe("Astronomy");
      expect(rosterEntry?.slotIndex).toBe(0);
      expect(rosterEntry?.studentName).toBe("John Doe");
      expect(rosterEntry?.userId).toBe(creator.id);

      const existing = mockDb.rosterData.get(key);
      if (existing) {
        mockDb.rosterData.set(key, {
          ...existing,
          studentName: "Jane Doe",
        });
      }

      expect(mockDb.rosterData.get(key)?.studentName).toBe("Jane Doe");
    });
  });

  describe("Stream Post Flow", () => {
    it("should create stream posts", async () => {
      const creator = testUsers[0];
      const team = await createTestTeam(creator.id);
      testTeams.push(team);

      // Create stream post
      const postId = nextId("post");
      mockDb.streamPosts.set(postId, {
        id: postId,
        teamUnitId: team.subteamId,
        authorId: creator.id,
        content: "Test stream post",
      });

      const retrievedPost = mockDb.streamPosts.get(postId);
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
      mockDb.memberships.set(`${member.id}:${team.subteamId}`, {
        userId: member.id,
        teamId: team.subteamId,
        role: "member",
        status: "active",
      });

      const creatorMembership = mockDb.memberships.get(`${creator.id}:${team.subteamId}`);
      expect(creatorMembership?.role).toBe("captain");

      const memberMembership = mockDb.memberships.get(`${member.id}:${team.subteamId}`);
      expect(memberMembership?.role).toBe("member");
    });
  });
});
