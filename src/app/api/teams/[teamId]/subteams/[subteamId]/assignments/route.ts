import { dbPg } from "@/lib/db";
import {
  newTeamAssignmentQuestions,
  newTeamAssignmentRoster,
  newTeamAssignments,
} from "@/lib/db/schema/assignments";
import { users } from "@/lib/db/schema/core";
import { newTeamNotifications } from "@/lib/db/schema/notifications";
import { newTeamMemberships } from "@/lib/db/schema/teams";
import { AssignmentQuestionSchema } from "@/lib/schemas/question";
import { NotificationSyncService } from "@/lib/services/notification-sync";
import { getServerUser } from "@/lib/supabaseServer";
import { parseDifficulty } from "@/lib/types/difficulty";
import { getUserTeamMemberships, resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/teams/[teamId]/subteams/[subteamId]/assignments - Get subteam assignments
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string; subteamId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: "Database configuration error",
          details: "DATABASE_URL environment variable is missing",
        },
        { status: 500 }
      );
    }

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId, subteamId } = await params;

    // Resolve team slug to team units
    const teamInfo = await resolveTeamSlugToUnits(teamId);

    // Check if user is member of any team unit in this group
    const memberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);

    if (memberships.length === 0) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    // Verify the subteamId is valid and belongs to this team group
    if (!teamInfo.teamUnitIds.includes(subteamId)) {
      return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
    }

    // Get assignments for this specific subteam with creator information using Drizzle ORM
    const assignmentsResult = await dbPg
      .select({
        id: newTeamAssignments.id,
        title: newTeamAssignments.title,
        description: newTeamAssignments.description,
        assignmentType: newTeamAssignments.assignmentType,
        dueDate: newTeamAssignments.dueDate,
        points: newTeamAssignments.points,
        isRequired: newTeamAssignments.isRequired,
        maxAttempts: newTeamAssignments.maxAttempts,
        createdAt: newTeamAssignments.createdAt,
        createdBy: newTeamAssignments.createdBy,
        creatorName: users.displayName,
        creatorEmail: users.email,
      })
      .from(newTeamAssignments)
      .leftJoin(users, eq(newTeamAssignments.createdBy, users.id))
      .where(eq(newTeamAssignments.teamId, subteamId))
      .orderBy(desc(newTeamAssignments.createdAt));

    // Get roster assignments for each assignment with user information
    const assignmentIds = assignmentsResult.map((a) => a.id);
    const rosterResult =
      assignmentIds.length > 0
        ? await dbPg
            .select({
              assignmentId: newTeamAssignmentRoster.assignmentId,
              studentName: newTeamAssignmentRoster.studentName,
              userId: newTeamAssignmentRoster.userId,
              email: users.email,
              username: users.username,
              displayName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
            })
            .from(newTeamAssignmentRoster)
            .leftJoin(users, eq(newTeamAssignmentRoster.userId, users.id))
            .where(inArray(newTeamAssignmentRoster.assignmentId, assignmentIds))
        : [];

    // Group roster by assignment ID
    const rosterByAssignment: Record<string, unknown[]> = {};
    for (const roster of rosterResult) {
      if (!roster.assignmentId) {
        continue;
      }
      if (!rosterByAssignment[roster.assignmentId]) {
        rosterByAssignment[roster.assignmentId] = [];
      }
      rosterByAssignment[roster.assignmentId]?.push({
        student_name: roster.studentName,
        user_id: roster.userId,
        email: roster.email,
        username: roster.username,
        display_name: roster.displayName,
      });
    }

    // Format assignments with roster information
    const assignments = assignmentsResult.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      assignment_type: assignment.assignmentType,
      due_date: assignment.dueDate?.toISOString() || null,
      points: assignment.points,
      is_required: assignment.isRequired,
      max_attempts: assignment.maxAttempts,
      created_at: assignment.createdAt?.toISOString() || null,
      created_by: {
        id: assignment.createdBy,
        name: assignment.creatorName || "Unknown",
        email: assignment.creatorEmail || "unknown@example.com",
      },
      roster: rosterByAssignment[assignment.id] || [],
    }));

    return NextResponse.json({ assignments });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/teams/[teamId]/subteams/[subteamId]/assignments - Create subteam assignment
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex assignment creation with validation and question processing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; subteamId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: "Database configuration error",
          details: "DATABASE_URL environment variable is missing",
        },
        { status: 500 }
      );
    }

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId, subteamId } = await params;
    const body = await request.json();
    const {
      title,
      description,
      assignment_type = "homework",
      due_date,
      points,
      is_required = true,
      max_attempts,
      roster_members,
      questions,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Resolve team slug to team units
    const teamInfo = await resolveTeamSlugToUnits(teamId);

    // Check if user is captain or co-captain of any team unit in this group
    const memberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);

    if (memberships.length === 0) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    const isCaptain = memberships.some((m) => ["captain", "co_captain"].includes(m.role));
    if (!isCaptain) {
      return NextResponse.json({ error: "Only captains can create assignments" }, { status: 403 });
    }

    // Verify the subteamId is valid and belongs to this team group
    if (!teamInfo.teamUnitIds.includes(subteamId)) {
      return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
    }

    // Create assignment using Drizzle ORM
    const [assignment] = await dbPg
      .insert(newTeamAssignments)
      .values({
        teamId: subteamId,
        createdBy: user.id,
        title,
        description,
        assignmentType: assignment_type,
        dueDate: due_date ? new Date(due_date) : null,
        points,
        isRequired: is_required,
        maxAttempts: max_attempts,
      })
      .returning();

    // Create roster assignments for selected members
    if (roster_members && roster_members.length > 0) {
      // Get team members to match roster names with user IDs
      const teamMembersResult = await dbPg
        .select({
          userId: newTeamMemberships.userId,
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(newTeamMemberships)
        .leftJoin(users, eq(newTeamMemberships.userId, users.id))
        .where(
          and(eq(newTeamMemberships.teamId, subteamId), eq(newTeamMemberships.status, "active"))
        );

      // Create a map of names to user IDs
      const nameToUserId = new Map<string, string>();
      for (const member of teamMembersResult) {
        const displayName =
          member.displayName ||
          (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : null);
        if (displayName) {
          nameToUserId.set(displayName.toLowerCase().trim(), member.userId);
        }
      }

      const rosterInserts = roster_members.map((studentName: string) => {
        const userId = nameToUserId.get(studentName.toLowerCase().trim()) || null;
        return {
          assignmentId: assignment?.id ?? "",
          studentName,
          userId,
          subteamId: subteamId,
        };
      });

      await dbPg.insert(newTeamAssignmentRoster).values(rosterInserts);
    }

    /**
     * Save assignment questions to database
     *
     * Frontend sends: { answers: [0], question_text: "...", question_type: "multiple_choice", options: [...] }
     * Database expects: { correct_answer: "A", question_text: "...", question_type: "multiple_choice", options: "[...]" }
     *
     * CRITICAL VALIDATION: All questions MUST have a valid answers array.
     */
    if (questions && Array.isArray(questions) && questions.length > 0) {
      let validatedQuestions: z.infer<typeof AssignmentQuestionSchema>[];
      try {
        validatedQuestions = questions.map((question, index) => {
          try {
            return AssignmentQuestionSchema.parse(question);
          } catch (error) {
            if (error instanceof z.ZodError) {
              const errorMessages = error.issues?.map(
                (issue) => `${issue.path.join(".")}: ${issue.message}`
              ) || ["Unknown validation error"];
              throw new Error(
                `Question ${index + 1} validation failed:\n${errorMessages.join("\n")}`
              );
            }
            throw error;
          }
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: "Invalid questions provided",
            details: error instanceof Error ? error.message : "Unknown validation error",
          },
          { status: 400 }
        );
      }

      const assignmentId = assignment?.id;
      if (!assignmentId) {
        return NextResponse.json({ error: "Failed to create assignment record" }, { status: 500 });
      }

      const questionInserts = validatedQuestions.map((q, index: number) => {
        let correctAnswer: string | null = null;

        if (q.question_type === "multiple_choice") {
          correctAnswer = q.answers
            .map((ans) => {
              if (typeof ans !== "number" || ans < 0) {
                throw new Error(`Invalid answer index ${ans} for question ${index + 1}`);
              }
              return String.fromCharCode(65 + ans);
            })
            .join(",");
        } else {
          correctAnswer = q.answers.map((ans) => String(ans)).join(",");
        }

        if (!correctAnswer || correctAnswer.trim() === "") {
          throw new Error(`Failed to convert answers for question ${index + 1}`);
        }

        return {
          assignmentId,
          questionText: q.question_text,
          questionType: q.question_type,
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer,
          points: q.points || 1,
          orderIndex: q.order_index ?? index,
          imageData: q.imageData ?? null,
          difficulty: parseDifficulty(q.difficulty),
        };
      });

      await dbPg.insert(newTeamAssignmentQuestions).values(questionInserts);
    }

    // Create notifications for all team members in this subteam
    // Check if creator is in the selected roster by looking at the roster assignments we just created
    let creatorInRoster = false;
    if (roster_members && roster_members.length > 0) {
      // Get the creator's display name to match against roster members
      const creatorResult = await dbPg
        .select({
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (creatorResult.length > 0) {
        const creator = creatorResult[0];
        if (!creator) {
          return NextResponse.json({ error: "Creator not found" }, { status: 404 });
        }
        const creatorDisplayName =
          creator.displayName ||
          (creator.firstName && creator.lastName
            ? `${creator.firstName} ${creator.lastName}`
            : null);

        if (creatorDisplayName) {
          creatorInRoster = roster_members.some(
            (memberName: string) =>
              memberName.toLowerCase().trim() === creatorDisplayName.toLowerCase().trim()
          );
        }
      }
    }

    // Build the where condition - exclude creator only if they're not in the roster
    const whereConditions = [
      eq(newTeamMemberships.teamId, subteamId),
      eq(newTeamMemberships.status, "active"),
    ];

    if (!creatorInRoster) {
      whereConditions.push(ne(newTeamMemberships.userId, user.id));
    }

    const membersResult = await dbPg
      .select({ userId: newTeamMemberships.userId })
      .from(newTeamMemberships)
      .where(and(...whereConditions));

    // Create notifications for each member using Drizzle ORM
    for (const member of membersResult) {
      const notificationResult = await dbPg
        .insert(newTeamNotifications)
        .values({
          userId: member.userId,
          teamId: subteamId, // Use the subteam ID, not the group ID
          notificationType: "assignment_invitation",
          title: `New assignment: ${title}`,
          message: description || "You have been assigned to complete this assignment",
          data: {
            assignment_id: assignment?.id ?? "",
            due_date: due_date,
            assignment_type: assignment_type,
            points: points,
          },
        })
        .returning({ id: newTeamNotifications.id });

      // Sync notification to Supabase for client-side access
      if (notificationResult.length > 0 && notificationResult[0]) {
        try {
          await NotificationSyncService.syncNotificationToSupabase(notificationResult[0].id);
        } catch (_syncError) {
          // Don't fail the entire request if sync fails
        }
      }
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
