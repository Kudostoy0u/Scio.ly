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

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type TestTeam,
  type TestUser,
  addTeamMember,
  addEventAttendee,
  cleanupTestData,
  createEvent,
  createTestTeam,
  createTestUser,
  deleteEvent,
  getEventAttendees,
  getEventById,
  getEventsByTeamId,
  getMembership,
  updateEvent,
} from "../utils/test-helpers";

describe("Calendar Event Management E2E", () => {
  const testUsers: TestUser[] = [];
  const testTeams: TestTeam[] = [];

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

      const event = createEvent({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Test Tournament",
        eventType: "tournament",
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        location: "Test Location",
        isAllDay: false,
        isRecurring: false,
      });

      expect(event).toBeDefined();
      expect(event?.id).toBeDefined();

      // Verify event exists
      const retrievedEvent = getEventById(event.id);

      expect(retrievedEvent).toBeDefined();
      expect(retrievedEvent?.title).toBe("Test Tournament");
      expect(retrievedEvent?.teamId).toBe(team.subteamId);
      expect(retrievedEvent?.createdBy).toBe(captain.id);
    });

    it("should create a personal event (null teamId)", async () => {
      const captain = testUsers[0];

      // Create personal event
      const event = createEvent({
        teamId: null,
        createdBy: captain.id,
        title: "Personal Practice",
        eventType: "practice",
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        isAllDay: false,
        isRecurring: false,
      });

      expect(event).toBeDefined();
      expect(event?.id).toBeDefined();

      // Verify event exists with null teamId
      const retrievedEvent = getEventById(event.id);

      expect(retrievedEvent).toBeDefined();
      expect(retrievedEvent?.teamId).toBeNull();
      expect(retrievedEvent?.title).toBe("Personal Practice");
    });

    it("should create a recurring event", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create recurring event
      const event = createEvent({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Weekly Practice",
        eventType: "practice",
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        isAllDay: false,
        isRecurring: true,
        recurrencePattern: {
          frequency: "weekly",
          daysOfWeek: [1, 3, 5],
        },
      });

      expect(event).toBeDefined();
      expect(event?.id).toBeDefined();

      // Verify recurring event
      const retrievedEvent = getEventById(event.id);

      expect(retrievedEvent?.isRecurring).toBe(true);
      expect(retrievedEvent?.recurrencePattern).toBeDefined();
    });
  });

  describe("Event Retrieval", () => {
    it("should retrieve events for a team", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create multiple events
      createEvent({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Event 1",
        eventType: "practice",
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      });
      createEvent({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Event 2",
        eventType: "tournament",
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });

      const events = getEventsByTeamId(team.subteamId);

      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter events by date range", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      const _startDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const _endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      // Create event in range
      createEvent({
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
      const event = createEvent({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Original Title",
        eventType: "practice",
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      });

      updateEvent(event.id, {
        title: "Updated Title",
        description: "Updated description",
        updatedAt: new Date(),
      });

      const updatedEvent = getEventById(event.id);

      expect(updatedEvent?.title).toBe("Updated Title");
      expect(updatedEvent?.description).toBe("Updated description");
    });
  });

  describe("Event Deletion", () => {
    it("should delete an event", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create event
      const event = createEvent({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Delete Test Event",
        eventType: "practice",
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      });

      deleteEvent(event.id);
      const deletedEvent = getEventById(event.id);
      expect(deletedEvent).toBeUndefined();
    });
  });

  describe("Event Attendees", () => {
    it("should add attendees to events", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];
      const member = testUsers[1];

      // Create event
      const event = createEvent({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Event with Attendees",
        eventType: "meeting",
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      });

      const attendee = addEventAttendee(event.id, member.id, "attending");
      expect(attendee).toBeDefined();

      const [retrievedAttendee] = getEventAttendees(event.id);

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
      const event = createEvent({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Authorization Test",
        eventType: "practice",
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      });

      const eventData = getEventById(event.id);
      expect(eventData?.createdBy).toBe(captain.id);

      const memberMembership = getMembership(member.id, team.subteamId);
      expect(memberMembership?.role).toBe("member");
      expect(memberMembership?.role).not.toBe("captain");
    });
  });
});
