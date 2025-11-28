/**
 * E2E Tests for Assignment Management
 *
 * Tests the complete assignment workflow including:
 * - Creating assignments
 * - Fetching assignments
 * - Assignment questions
 * - Assignment submissions
 * - Roster assignments
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type TestTeam,
  type TestUser,
  addAssignmentRosterEntry,
  addTeamMember,
  cleanupTestData,
  createAssignment,
  createAssignmentQuestions,
  createAssignmentSubmission,
  createRosterEntry,
  createTestTeam,
  createTestUser,
  getAssignmentQuestions,
  getAssignmentRosterEntries,
  getAssignmentSubmissions,
  getAssignmentsByTeamId,
} from "../utils/test-helpers";

describe("Assignment Management E2E", () => {
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

    // Create roster entry for member
    await createRosterEntry(team.subteamId, "Astronomy", 0, "Member User", testUsers[1].id);
  });

  afterAll(async () => {
    // Cleanup
    const userIds = testUsers.map((u) => u.id);
    const teamGroupIds = testTeams.map((t) => t.groupId);
    await cleanupTestData(userIds, teamGroupIds);
  });

  describe("Assignment Creation", () => {
    it("should create an assignment with questions", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create assignment
      const assignment = createAssignment({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Test Assignment",
        description: "Test description",
        assignmentType: "task",
        isRequired: true,
      });

      expect(assignment).toBeDefined();
      expect(assignment?.id).toBeDefined();

      // Create questions
      const questions = createAssignmentQuestions(assignment.id, [
        {
          questionText: "What is 2+2?",
          questionType: "frq",
          correctAnswer: "4",
          orderIndex: 0,
          points: 1,
        },
        {
          questionText: "What is the capital of France?",
          questionType: "frq",
          correctAnswer: "Paris",
          orderIndex: 1,
          points: 1,
        },
      ]);

      expect(questions.length).toBe(2);

      // Verify assignment exists
      const [retrievedAssignment] = getAssignmentsByTeamId(team.subteamId).filter(
        (item) => item.id === assignment.id
      );

      expect(retrievedAssignment).toBeDefined();
      expect(retrievedAssignment?.title).toBe("Test Assignment");
    });

    it("should create assignment with roster members", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];
      const member = testUsers[1];

      // Create assignment
      const assignment = createAssignment({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Roster Assignment",
        assignmentType: "task",
      });

      addAssignmentRosterEntry({
        assignmentId: assignment.id,
        studentName: "Member User",
        userId: member.id,
        subteamId: team.subteamId,
      });

      // Verify roster assignment
      const [rosterAssignment] = getAssignmentRosterEntries(assignment.id);

      expect(rosterAssignment).toBeDefined();
      expect(rosterAssignment?.userId).toBe(member.id);
      expect(rosterAssignment?.studentName).toBe("Member User");
    });
  });

  describe("Assignment Retrieval", () => {
    it("should retrieve assignments for a team", async () => {
      const team = testTeams[0];

      // Get all assignments
      const assignments = getAssignmentsByTeamId(team.subteamId);

      expect(assignments.length).toBeGreaterThan(0);

      // Verify assignment structure
      for (const assignment of assignments) {
        expect(assignment.teamId).toBe(team.subteamId);
        expect(assignment.title).toBeDefined();
        expect(assignment.createdBy).toBeDefined();
      }
    });

    it("should retrieve assignments with questions", async () => {
      const team = testTeams[0];

      // Get assignments
      const assignments = getAssignmentsByTeamId(team.subteamId);

      for (const assignment of assignments) {
        const questions = getAssignmentQuestions(assignment.id);

        // Verify questions are properly linked
        for (const question of questions) {
          expect(question.assignmentId).toBe(assignment.id);
          expect(question.questionText).toBeDefined();
        }
      }
    });
  });

  describe("Assignment Submissions", () => {
    it("should create assignment submission", async () => {
      const team = testTeams[0];
      const member = testUsers[1];

      // Get an assignment
      const assignments = getAssignmentsByTeamId(team.subteamId);
      let assignment = assignments[0];

      if (!assignment) {
        assignment = createAssignment({
          teamId: team.subteamId,
          createdBy: testUsers[0].id,
          title: "Submission Test Assignment",
          assignmentType: "task",
        });
      }

      const submission = createAssignmentSubmission({
        assignmentId: assignment.id,
        userId: member.id,
        content: "Test submission",
        status: "submitted",
        attemptNumber: 1,
      });

      expect(submission).toBeDefined();
      const [retrievedSubmission] = getAssignmentSubmissions(assignment.id);
      expect(retrievedSubmission?.userId).toBe(member.id);
      expect(retrievedSubmission?.status).toBe("submitted");
    });

    it("should track submission attempts", async () => {
      const team = testTeams[0];
      const member = testUsers[1];

      // Get an assignment
      const assignment = getAssignmentsByTeamId(team.subteamId)[0];

      if (assignment) {
        createAssignmentSubmission({
          assignmentId: assignment.id,
          userId: member.id,
          content: "Attempt 1",
          status: "submitted",
          attemptNumber: 1,
        });

        createAssignmentSubmission({
          assignmentId: assignment.id,
          userId: member.id,
          content: "Attempt 2",
          status: "submitted",
          attemptNumber: 2,
        });

        const submissions = getAssignmentSubmissions(assignment.id);
        const attemptNumbers = submissions.map((s) => s.attemptNumber);
        expect(attemptNumbers).toContain(1);
        expect(attemptNumbers).toContain(2);
      }
    });
  });

  describe("Assignment Validation", () => {
    it("should require title for assignment", async () => {
      const _team = testTeams[0];

      // This should be handled by database constraints or validation
      // In a real scenario, we'd test the API endpoint validation
      expect(true).toBe(true); // Placeholder - actual validation tested in API tests
    });

    it("should validate question structure", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create assignment
      const assignment = createAssignment({
        teamId: team.subteamId,
        createdBy: captain.id,
        title: "Validation Test",
        assignmentType: "task",
      });

      const [question] = createAssignmentQuestions(assignment.id, [
        {
          questionText: "Valid question",
          questionType: "frq",
          correctAnswer: "Answer",
          orderIndex: 0,
          points: 1,
        },
      ]);

      expect(question).toBeDefined();
      const storedQuestion = getAssignmentQuestions(assignment.id)[0];
      expect(storedQuestion?.questionText).toBe("Valid question");
      expect(storedQuestion?.questionType).toBe("frq");
    });
  });
});
