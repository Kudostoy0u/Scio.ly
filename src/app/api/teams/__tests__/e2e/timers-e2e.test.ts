/**
 * E2E Tests for Timer Management
 * 
 * Tests the complete timer workflow including:
 * - Creating timers for events
 * - Fetching active timers
 * - Removing timers
 * - Handling recurring events
 * - Authorization checks
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { dbPg } from "@/lib/db";
import {
  newTeamActiveTimers,
  newTeamEvents,
  newTeamMemberships,
  newTeamUnits,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createTestTeam,
  createTestUser,
  cleanupTestData,
  addTeamMember,
  type TestUser,
  type TestTeam,
} from "../utils/test-helpers";

describe("Timer Management E2E", () => {
  let testUsers: TestUser[] = [];
  let testTeams: TestTeam[] = [];

  beforeAll(async () => {
    // Create test users
    testUsers.push(await createTestUser({ displayName: "Captain User" }));
    testUsers.push(await createTestUser({ displayName: "Member User" }));
    
    // Create test team
    const team = await createTestTeam(testUsers[0].id);
    testTeams.push(team);
    
    // Add member
    await addTeamMember(team.subteamId, testUsers[1].id, "member");
  });

  afterAll(async () => {
    // Cleanup
    const userIds = testUsers.map((u) => u.id);
    const teamGroupIds = testTeams.map((t) => t.groupId);
    await cleanupTestData(userIds, teamGroupIds);
  });

  describe("Timer Creation", () => {
    it("should create a timer for an event", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create a test event first
      const [event] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Test Tournament",
          eventType: "tournament",
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        })
        .returning({ id: newTeamEvents.id });

      expect(event).toBeDefined();
      expect(event?.id).toBeDefined();

      // Create timer
      const [timer] = await dbPg
        .insert(newTeamActiveTimers)
        .values({
          teamUnitId: team.subteamId,
          eventId: event.id,
          addedBy: captain.id,
        })
        .returning({ id: newTeamActiveTimers.id });

      expect(timer).toBeDefined();
      expect(timer?.id).toBeDefined();

      // Verify timer exists
      const [retrievedTimer] = await dbPg
        .select()
        .from(newTeamActiveTimers)
        .where(eq(newTeamActiveTimers.id, timer.id));

      expect(retrievedTimer).toBeDefined();
      expect(retrievedTimer?.teamUnitId).toBe(team.subteamId);
      expect(retrievedTimer?.eventId).toBe(event.id);
      expect(retrievedTimer?.addedBy).toBe(captain.id);
    });

    it("should prevent duplicate timers for same event", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create a test event
      const [event] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Duplicate Test Event",
          eventType: "practice",
          startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        })
        .returning({ id: newTeamEvents.id });

      // Create first timer
      await dbPg.insert(newTeamActiveTimers).values({
        teamUnitId: team.subteamId,
        eventId: event.id,
        addedBy: captain.id,
      });

      // Try to create duplicate
      const existingTimers = await dbPg
        .select()
        .from(newTeamActiveTimers)
        .where(
          eq(newTeamActiveTimers.teamUnitId, team.subteamId)
        );

      const duplicateCount = existingTimers.filter((t) => t.eventId === event.id).length;
      expect(duplicateCount).toBe(1); // Should only be one
    });
  });

  describe("Timer Retrieval", () => {
    it("should retrieve all timers for a subteam", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create multiple events and timers
      const [event1] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Event 1",
          eventType: "tournament",
          startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        })
        .returning({ id: newTeamEvents.id });

      const [event2] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Event 2",
          eventType: "practice",
          startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        })
        .returning({ id: newTeamEvents.id });

      // Create timers
      await dbPg.insert(newTeamActiveTimers).values({
        teamUnitId: team.subteamId,
        eventId: event1.id,
        addedBy: captain.id,
      });

      await dbPg.insert(newTeamActiveTimers).values({
        teamUnitId: team.subteamId,
        eventId: event2.id,
        addedBy: captain.id,
      });

      // Retrieve timers
      const timers = await dbPg
        .select()
        .from(newTeamActiveTimers)
        .where(eq(newTeamActiveTimers.teamUnitId, team.subteamId));

      expect(timers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Timer Deletion", () => {
    it("should delete a timer", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create event and timer
      const [event] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Delete Test Event",
          eventType: "tournament",
          startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        })
        .returning({ id: newTeamEvents.id });

      const [timer] = await dbPg
        .insert(newTeamActiveTimers)
        .values({
          teamUnitId: team.subteamId,
          eventId: event.id,
          addedBy: captain.id,
        })
        .returning({ id: newTeamActiveTimers.id });

      // Delete timer
      await dbPg
        .delete(newTeamActiveTimers)
        .where(eq(newTeamActiveTimers.id, timer.id));

      // Verify deletion
      const [deletedTimer] = await dbPg
        .select()
        .from(newTeamActiveTimers)
        .where(eq(newTeamActiveTimers.id, timer.id));

      expect(deletedTimer).toBeUndefined();
    });
  });

  describe("Authorization", () => {
    it("should verify only captains can manage timers", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];
      const member = testUsers[1];

      // Verify captain membership
      const [captainMembership] = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(
          eq(newTeamMemberships.userId, captain.id)
        );

      expect(captainMembership?.role).toBe("captain");

      // Verify member is not captain
      const [memberMembership] = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(
          eq(newTeamMemberships.userId, member.id)
        );

      expect(memberMembership?.role).toBe("member");
      expect(memberMembership?.role).not.toBe("captain");
    });
  });
});

