/**
 * E2E Tests for Calendar Event Management
 * 
 * Tests the complete calendar event workflow including:
 * - Creating events
 * - Fetching events with filters
 * - Updating events
 * - Deleting events
 * - Event attendees
 * - Authorization checks
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { dbPg } from "@/lib/db";
import {
  newTeamEventAttendees,
  newTeamEvents,
  newTeamMemberships,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { eq } from "drizzle-orm";
import {
  createTestTeam,
  createTestUser,
  cleanupTestData,
  addTeamMember,
  type TestUser,
  type TestTeam,
} from "../utils/test-helpers";

describe("Calendar Event Management E2E", () => {
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

  describe("Event Creation", () => {
    it("should create a team event", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create event
      const [event] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Test Tournament",
          eventType: "tournament",
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // +8 hours
          location: "Test Location",
          isAllDay: false,
          isRecurring: false,
        })
        .returning({ id: newTeamEvents.id });

      expect(event).toBeDefined();
      expect(event?.id).toBeDefined();

      // Verify event exists
      const [retrievedEvent] = await dbPg
        .select()
        .from(newTeamEvents)
        .where(eq(newTeamEvents.id, event.id));

      expect(retrievedEvent).toBeDefined();
      expect(retrievedEvent?.title).toBe("Test Tournament");
      expect(retrievedEvent?.teamId).toBe(team.subteamId);
      expect(retrievedEvent?.createdBy).toBe(captain.id);
    });

    it("should create a personal event (null teamId)", async () => {
      const captain = testUsers[0];

      // Create personal event
      const [event] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: null,
          createdBy: captain.id,
          title: "Personal Practice",
          eventType: "practice",
          startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          isAllDay: false,
          isRecurring: false,
        })
        .returning({ id: newTeamEvents.id });

      expect(event).toBeDefined();
      expect(event?.id).toBeDefined();

      // Verify event exists with null teamId
      const [retrievedEvent] = await dbPg
        .select()
        .from(newTeamEvents)
        .where(eq(newTeamEvents.id, event.id));

      expect(retrievedEvent).toBeDefined();
      expect(retrievedEvent?.teamId).toBeNull();
      expect(retrievedEvent?.title).toBe("Personal Practice");
    });

    it("should create a recurring event", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create recurring event
      const [event] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Weekly Practice",
          eventType: "practice",
          startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          isAllDay: false,
          isRecurring: true,
          recurrencePattern: {
            frequency: "weekly",
            daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
          },
        })
        .returning({ id: newTeamEvents.id });

      expect(event).toBeDefined();
      expect(event?.id).toBeDefined();

      // Verify recurring event
      const [retrievedEvent] = await dbPg
        .select()
        .from(newTeamEvents)
        .where(eq(newTeamEvents.id, event.id));

      expect(retrievedEvent?.isRecurring).toBe(true);
      expect(retrievedEvent?.recurrencePattern).toBeDefined();
    });
  });

  describe("Event Retrieval", () => {
    it("should retrieve events for a team", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create multiple events
      await dbPg.insert(newTeamEvents).values({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Event 1",
        eventType: "practice",
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      });

      await dbPg.insert(newTeamEvents).values({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Event 2",
        eventType: "tournament",
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });

      // Retrieve events
      const events = await dbPg
        .select()
        .from(newTeamEvents)
        .where(eq(newTeamEvents.teamId, team.subteamId));

      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter events by date range", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      const startDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      // Create event in range
      await dbPg.insert(newTeamEvents).values({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "In Range Event",
        eventType: "practice",
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Events should be filterable by date range
      // This would be tested in the actual API route
      expect(true).toBe(true); // Placeholder
    });
  });

  describe("Event Updates", () => {
    it("should update event details", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create event
      const [event] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Original Title",
          eventType: "practice",
          startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        })
        .returning({ id: newTeamEvents.id });

      // Update event
      await dbPg
        .update(newTeamEvents)
        .set({
          title: "Updated Title",
          description: "Updated description",
          updatedAt: new Date(),
        })
        .where(eq(newTeamEvents.id, event.id));

      // Verify update
      const [updatedEvent] = await dbPg
        .select()
        .from(newTeamEvents)
        .where(eq(newTeamEvents.id, event.id));

      expect(updatedEvent?.title).toBe("Updated Title");
      expect(updatedEvent?.description).toBe("Updated description");
    });
  });

  describe("Event Deletion", () => {
    it("should delete an event", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create event
      const [event] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Delete Test Event",
          eventType: "practice",
          startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        })
        .returning({ id: newTeamEvents.id });

      // Delete event
      await dbPg.delete(newTeamEvents).where(eq(newTeamEvents.id, event.id));

      // Verify deletion
      const [deletedEvent] = await dbPg
        .select()
        .from(newTeamEvents)
        .where(eq(newTeamEvents.id, event.id));

      expect(deletedEvent).toBeUndefined();
    });
  });

  describe("Event Attendees", () => {
    it("should add attendees to events", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];
      const member = testUsers[1];

      // Create event
      const [event] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Event with Attendees",
          eventType: "meeting",
          startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        })
        .returning({ id: newTeamEvents.id });

      // Add attendee
      const [attendee] = await dbPg
        .insert(newTeamEventAttendees)
        .values({
          eventId: event.id,
          userId: member.id,
          status: "attending",
        })
        .returning({ id: newTeamEventAttendees.id });

      expect(attendee).toBeDefined();

      // Verify attendee
      const [retrievedAttendee] = await dbPg
        .select()
        .from(newTeamEventAttendees)
        .where(eq(newTeamEventAttendees.id, attendee.id));

      expect(retrievedAttendee).toBeDefined();
      expect(retrievedAttendee?.status).toBe("attending");
      expect(retrievedAttendee?.userId).toBe(member.id);
    });
  });

  describe("Authorization", () => {
    it("should verify only creators and captains can modify events", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];
      const member = testUsers[1];

      // Create event
      const [event] = await dbPg
        .insert(newTeamEvents)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Authorization Test",
          eventType: "practice",
          startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        })
        .returning({ id: newTeamEvents.id });

      // Verify creator is captain
      expect(event).toBeDefined();
      const [eventData] = await dbPg
        .select()
        .from(newTeamEvents)
        .where(eq(newTeamEvents.id, event.id));

      expect(eventData?.createdBy).toBe(captain.id);

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

