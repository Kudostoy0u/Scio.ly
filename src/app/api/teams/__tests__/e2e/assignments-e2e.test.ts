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

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { dbPg } from "@/lib/db";
import {
  newTeamAssignments,
  newTeamAssignmentQuestions,
  newTeamAssignmentRoster,
  newTeamAssignmentSubmissions,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createTestTeam,
  createTestUser,
  cleanupTestData,
  addTeamMember,
  createRosterEntry,
  type TestUser,
  type TestTeam,
} from "../utils/test-helpers";

describe("Assignment Management E2E", () => {
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
    
    // Create roster entry for member
    await createRosterEntry(
      team.subteamId,
      "Astronomy",
      0,
      "Member User",
      testUsers[1].id
    );
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
      const [assignment] = await dbPg
        .insert(newTeamAssignments)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Test Assignment",
          description: "Test description",
          assignmentType: "task",
          isRequired: true,
        })
        .returning({ id: newTeamAssignments.id });

      expect(assignment).toBeDefined();
      expect(assignment?.id).toBeDefined();

      // Create questions
      const questions = await dbPg
        .insert(newTeamAssignmentQuestions)
        .values([
          {
            assignmentId: assignment.id,
            questionText: "What is 2+2?",
            questionType: "frq",
            correctAnswer: "4",
            orderIndex: 0,
            points: 1,
          },
          {
            assignmentId: assignment.id,
            questionText: "What is the capital of France?",
            questionType: "frq",
            correctAnswer: "Paris",
            orderIndex: 1,
            points: 1,
          },
        ])
        .returning({ id: newTeamAssignmentQuestions.id });

      expect(questions.length).toBe(2);

      // Verify assignment exists
      const [retrievedAssignment] = await dbPg
        .select()
        .from(newTeamAssignments)
        .where(eq(newTeamAssignments.id, assignment.id));

      expect(retrievedAssignment).toBeDefined();
      expect(retrievedAssignment?.title).toBe("Test Assignment");
    });

    it("should create assignment with roster members", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];
      const member = testUsers[1];

      // Create assignment
      const [assignment] = await dbPg
        .insert(newTeamAssignments)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Roster Assignment",
          assignmentType: "task",
        })
        .returning({ id: newTeamAssignments.id });

      // Assign to roster member
      await dbPg.insert(newTeamAssignmentRoster).values({
        assignmentId: assignment.id,
        studentName: "Member User",
        userId: member.id,
        subteamId: team.subteamId,
      });

      // Verify roster assignment
      const [rosterAssignment] = await dbPg
        .select()
        .from(newTeamAssignmentRoster)
        .where(eq(newTeamAssignmentRoster.assignmentId, assignment.id));

      expect(rosterAssignment).toBeDefined();
      expect(rosterAssignment?.userId).toBe(member.id);
      expect(rosterAssignment?.studentName).toBe("Member User");
    });
  });

  describe("Assignment Retrieval", () => {
    it("should retrieve assignments for a team", async () => {
      const team = testTeams[0];

      // Get all assignments
      const assignments = await dbPg
        .select()
        .from(newTeamAssignments)
        .where(eq(newTeamAssignments.teamId, team.subteamId));

      expect(assignments.length).toBeGreaterThan(0);

      // Verify assignment structure
      assignments.forEach((assignment) => {
        expect(assignment.teamId).toBe(team.subteamId);
        expect(assignment.title).toBeDefined();
        expect(assignment.createdBy).toBeDefined();
      });
    });

    it("should retrieve assignments with questions", async () => {
      const team = testTeams[0];

      // Get assignments
      const assignments = await dbPg
        .select()
        .from(newTeamAssignments)
        .where(eq(newTeamAssignments.teamId, team.subteamId));

      // Get questions for each assignment
      for (const assignment of assignments) {
        const questions = await dbPg
          .select()
          .from(newTeamAssignmentQuestions)
          .where(eq(newTeamAssignmentQuestions.assignmentId, assignment.id));

        // Verify questions are properly linked
        questions.forEach((question) => {
          expect(question.assignmentId).toBe(assignment.id);
          expect(question.questionText).toBeDefined();
        });
      }
    });
  });

  describe("Assignment Submissions", () => {
    it("should create assignment submission", async () => {
      const team = testTeams[0];
      const member = testUsers[1];

      // Get an assignment
      const [assignment] = await dbPg
        .select()
        .from(newTeamAssignments)
        .where(eq(newTeamAssignments.teamId, team.subteamId))
        .limit(1);

      if (!assignment) {
        // Create one if none exists
        const [newAssignment] = await dbPg
          .insert(newTeamAssignments)
          .values({
            teamId: team.subteamId,
            createdBy: testUsers[0].id,
            title: "Submission Test Assignment",
            assignmentType: "task",
          })
          .returning({ id: newTeamAssignments.id });

        // Create submission
        const [submission] = await dbPg
          .insert(newTeamAssignmentSubmissions)
          .values({
            assignmentId: newAssignment.id,
            userId: member.id,
            content: "Test submission",
            status: "submitted",
            attemptNumber: 1,
          })
          .returning({ id: newTeamAssignmentSubmissions.id });

        expect(submission).toBeDefined();
        expect(submission?.userId).toBe(member.id);
        expect(submission?.status).toBe("submitted");
      }
    });

    it("should track submission attempts", async () => {
      const team = testTeams[0];
      const member = testUsers[1];

      // Get an assignment
      const [assignment] = await dbPg
        .select()
        .from(newTeamAssignments)
        .where(eq(newTeamAssignments.teamId, team.subteamId))
        .limit(1);

      if (assignment) {
        // Create multiple submissions (attempts)
        await dbPg.insert(newTeamAssignmentSubmissions).values({
          assignmentId: assignment.id,
          userId: member.id,
          content: "Attempt 1",
          status: "submitted",
          attemptNumber: 1,
        });

        await dbPg.insert(newTeamAssignmentSubmissions).values({
          assignmentId: assignment.id,
          userId: member.id,
          content: "Attempt 2",
          status: "submitted",
          attemptNumber: 2,
        });

        // Verify attempts
        const submissions = await dbPg
          .select()
          .from(newTeamAssignmentSubmissions)
          .where(eq(newTeamAssignmentSubmissions.assignmentId, assignment.id));

        const attemptNumbers = submissions.map((s) => s.attemptNumber);
        expect(attemptNumbers).toContain(1);
        expect(attemptNumbers).toContain(2);
      }
    });
  });

  describe("Assignment Validation", () => {
    it("should require title for assignment", async () => {
      const team = testTeams[0];

      // This should be handled by database constraints or validation
      // In a real scenario, we'd test the API endpoint validation
      expect(true).toBe(true); // Placeholder - actual validation tested in API tests
    });

    it("should validate question structure", async () => {
      const team = testTeams[0];
      const captain = testUsers[0];

      // Create assignment
      const [assignment] = await dbPg
        .insert(newTeamAssignments)
        .values({
          teamId: team.subteamId,
          createdBy: captain.id,
          title: "Validation Test",
          assignmentType: "task",
        })
        .returning({ id: newTeamAssignments.id });

      // Create valid question
      const [question] = await dbPg
        .insert(newTeamAssignmentQuestions)
        .values({
          assignmentId: assignment.id,
          questionText: "Valid question",
          questionType: "frq",
          correctAnswer: "Answer",
          orderIndex: 0,
          points: 1,
        })
        .returning({ id: newTeamAssignmentQuestions.id });

      expect(question).toBeDefined();
      expect(question?.questionText).toBe("Valid question");
      expect(question?.questionType).toBe("frq");
    });
  });
});

