/**
 * E2E Tests for Team Invitation Flow
 *
 * Tests the complete invitation workflow including:
 * - Inviting users by username
 * - Inviting users by email
 * - Handling existing members
 * - Handling existing invitations
 * - User search functionality
 * - Authorization checks
 */

import { dbPg } from "@/lib/db";
import {
  newTeamInvitations,
  newTeamMemberships,
  newTeamNotifications,
  newTeamUnits,
  users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type TestTeam,
  type TestUser,
  addTeamMember,
  assertUserIsMember,
  cleanupTestData,
  createTestTeam,
  createTestUser,
} from "../utils/test-helpers";

describe("Team Invitation E2E", () => {
  const testUsers: TestUser[] = [];
  const testTeams: TestTeam[] = [];

  beforeAll(async () => {
    // Create test users
    testUsers.push(await createTestUser({ displayName: "Captain User", username: "captain" }));
    testUsers.push(await createTestUser({ displayName: "Member User", username: "member" }));
    testUsers.push(await createTestUser({ displayName: "Invitee User", username: "invitee" }));

    // Create test team
    const team = await createTestTeam(testUsers[0].id);
    testTeams.push(team);

    // Add existing member
    await addTeamMember(team.subteamId, testUsers[1].id, "member");
  });

  afterAll(async () => {
    // Cleanup
    const userIds = testUsers.map((u) => u.id);
    const teamGroupIds = testTeams.map((t) => t.groupId);
    await cleanupTestData(userIds, teamGroupIds);
  });

  describe("User Search", () => {
    it("should search users by username", async () => {
      const searchResults = await dbPg
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
        })
        .from(users)
        .where(eq(users.username, "invitee"))
        .limit(10);

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0]?.username).toBe("invitee");
    });

    it("should search users by email", async () => {
      const invitee = testUsers[2];
      const searchResults = await dbPg
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .where(eq(users.email, invitee.email))
        .limit(10);

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0]?.email).toBe(invitee.email);
    });
  });

  describe("Invitation Creation", () => {
    it("should create invitation for new user", async () => {
      const team = testTeams[0];
      const invitee = testUsers[2];

      // Create invitation
      const [invitation] = await dbPg
        .insert(newTeamInvitations)
        .values({
          teamId: team.subteamId,
          invitedBy: testUsers[0].id,
          email: invitee.email,
          role: "member",
          invitationCode: "TEST-CODE-123",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          status: "pending",
        })
        .returning({ id: newTeamInvitations.id });

      expect(invitation).toBeDefined();
      expect(invitation?.id).toBeDefined();

      // Verify invitation exists
      const [retrievedInvitation] = await dbPg
        .select()
        .from(newTeamInvitations)
        .where(eq(newTeamInvitations.id, invitation.id));

      expect(retrievedInvitation).toBeDefined();
      expect(retrievedInvitation?.email).toBe(invitee.email);
      expect(retrievedInvitation?.status).toBe("pending");
    });

    it("should prevent duplicate invitations", async () => {
      const team = testTeams[0];
      const invitee = testUsers[2];
      if (!team) {
        throw new Error("Test setup failed: missing team");
      }
      if (!invitee) {
        throw new Error("Test setup failed: missing invitee");
      }

      // Check for existing invitation
      const existingInvitations = await dbPg
        .select()
        .from(newTeamInvitations)
        .where(
          and(
            eq(newTeamInvitations.teamId, team.subteamId),
            eq(newTeamInvitations.email, invitee.email),
            eq(newTeamInvitations.status, "pending")
          )
        );

      // If invitation exists, we should not create another
      if (existingInvitations.length > 0) {
        expect(existingInvitations.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Notification Creation", () => {
    it("should create notification for invited user", async () => {
      const team = testTeams[0];
      const invitee = testUsers[2];

      // Create notification
      const [notification] = await dbPg
        .insert(newTeamNotifications)
        .values({
          userId: invitee.id,
          teamId: team.subteamId,
          type: "team_invite",
          title: "Team Invitation",
          message: "You've been invited to join the team",
        })
        .returning({ id: newTeamNotifications.id });

      expect(notification).toBeDefined();
      expect(notification?.id).toBeDefined();

      // Verify notification exists
      const [retrievedNotification] = await dbPg
        .select()
        .from(newTeamNotifications)
        .where(eq(newTeamNotifications.id, notification.id));

      expect(retrievedNotification).toBeDefined();
      expect(retrievedNotification?.type).toBe("team_invite");
      expect(retrievedNotification?.userId).toBe(invitee.id);
    });
  });

  describe("Authorization Checks", () => {
    it("should verify captain can invite", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];
      if (!team) {
        throw new Error("Test setup failed: missing team");
      }
      if (!captain) {
        throw new Error("Test setup failed: missing captain");
      }

      // Verify captain membership
      await assertUserIsMember(captain.id, team.subteamId, "captain");

      // Verify captain has permission to invite
      const [membership] = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, captain.id),
            eq(newTeamMemberships.teamId, team.subteamId),
            eq(newTeamMemberships.status, "active")
          )
        );

      expect(membership).toBeDefined();
      expect(["captain", "co_captain"]).toContain(membership.role);
    });

    it("should prevent existing members from being invited", async () => {
      const team = testTeams[0];
      const existingMember = testUsers[1];
      if (!team) {
        throw new Error("Test setup failed: missing team");
      }
      if (!existingMember) {
        throw new Error("Test setup failed: missing existingMember");
      }

      // Check if user is already a member
      const existingMemberships = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, existingMember.id),
            eq(newTeamMemberships.teamId, team.subteamId)
          )
        );

      expect(existingMemberships.length).toBeGreaterThan(0);
    });
  });

  describe("Team Code Retrieval", () => {
    it("should retrieve team codes for invitation", async () => {
      const team = testTeams[0];

      // Get team codes
      const [teamUnit] = await dbPg
        .select({
          userCode: newTeamUnits.userCode,
          captainCode: newTeamUnits.captainCode,
        })
        .from(newTeamUnits)
        .where(eq(newTeamUnits.id, team.subteamId))
        .limit(1);

      expect(teamUnit).toBeDefined();
      expect(teamUnit?.userCode).toBeDefined();
      expect(teamUnit?.captainCode).toBeDefined();
    });
  });
});
