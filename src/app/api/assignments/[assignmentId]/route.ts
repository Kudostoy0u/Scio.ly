import { dbPg } from "@/lib/db/index";
import {
  newTeamAssignmentQuestions,
  newTeamAssignmentRoster,
  newTeamAssignments,
} from "@/lib/db/schema/assignments";
import { users } from "@/lib/db/schema/core";
import { FrontendQuestionSchema } from "@/lib/schemas/question";
import { getServerUser } from "@/lib/supabaseServer";
import { parseDifficulty } from "@/lib/types/difficulty";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ANSWER_LETTER_REGEX = /^[A-Z]$/i;

function parseCodebustersQuestion(
  q: QuestionRow,
  _index: number
): ReturnType<typeof FrontendQuestionSchema.parse> {
  let codebustersData: CodebustersData | null = null;
  if (q.options) {
    try {
      codebustersData = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
    } catch (_parseError) {
      // If parsing fails, codebustersData remains null and will use fallback values
    }
  }

  // Check if this is a parameters record (for dynamic generation)
  if (codebustersData?.type === "parameters") {
    return {
      id: q.id,
      questionText: "Dynamic Codebusters Generation",
      questionType: "codebusters_params",
      parameters: codebustersData,
      points: 0,
      orderIndex: 0,
      imageData: null,
    } as unknown as ReturnType<typeof FrontendQuestionSchema.parse>;
  }

  // Regular Codebusters question
  const codebustersQuestion = {
    id: q.id,
    question: q.questionText,
    questionText: q.questionText,
    type: "codebusters" as const,
    questionType: "codebusters",
    author: codebustersData?.author || "Unknown",
    quote: q.questionText,
    cipherType: codebustersData?.cipherType || "Random Aristocrat",
    difficulty: parseDifficulty(q.difficulty),
    division: codebustersData?.division || "C",
    charLength: codebustersData?.charLength || 100,
    encrypted: codebustersData?.encrypted || "",
    key: codebustersData?.key || "",
    hint: codebustersData?.hint || "",
    solution: codebustersData?.solution || q.correctAnswer,
    answers: [codebustersData?.solution || q.correctAnswer],
    correctAnswer: codebustersData?.solution || q.correctAnswer,
    points: q.points,
    order: q.orderIndex,
    orderIndex: q.orderIndex,
    imageData: q.imageData || null,
  };

  try {
    return FrontendQuestionSchema.parse(codebustersQuestion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues?.map((err) => `${err.path.join(".")}: ${err.message}`) || [
        "Unknown validation error",
      ];
      throw new Error(`Codebusters question validation failed:\n${errorMessages.join("\n")}`);
    }
    throw error;
  }
}

function parseOptions(q: QuestionRow): string[] | undefined {
  if (!q.options) {
    return undefined;
  }
  let parsedOptions = q.options;
  if (typeof q.options === "string") {
    try {
      parsedOptions = JSON.parse(q.options);
    } catch {
      parsedOptions = [q.options];
    }
  }

  if (Array.isArray(parsedOptions)) {
    return parsedOptions.map((opt: unknown) => {
      if (typeof opt === "string") {
        return opt;
      }
      if (opt && typeof opt === "object" && "text" in opt && typeof opt.text === "string") {
        return opt.text;
      }
      return String(opt);
    });
  }
  return undefined;
}

function convertMcqAnswer(
  answerStr: string,
  options: string[] | undefined,
  index: number
): number[] {
  const answerParts = answerStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s);

  if (answerParts.length === 0) {
    throw new Error(`Invalid correct_answer format for MCQ question ${index + 1}: "${answerStr}"`);
  }

  return answerParts.map((part) => {
    if (ANSWER_LETTER_REGEX.test(part)) {
      const idx = part.toUpperCase().charCodeAt(0) - 65;
      if (idx < 0 || idx >= (options?.length || 0)) {
        throw new Error(
          `Answer letter "${part}" out of range for question ${index + 1} with ${options?.length || 0} options`
        );
      }
      return idx;
    }
    const num = Number.parseInt(part);
    if (Number.isNaN(num) || num < 0 || num >= (options?.length || 0)) {
      throw new Error(
        `Answer index "${part}" out of range for question ${index + 1} with ${options?.length || 0} options`
      );
    }
    return num;
  });
}

function convertAnswers(
  q: QuestionRow,
  options: string[] | undefined,
  index: number
): (string | number)[] {
  if (q.correctAnswer === null || q.correctAnswer === undefined || q.correctAnswer === "") {
    return [];
  }

  if (q.questionType === "multiple_choice") {
    const answerStr = String(q.correctAnswer).trim();
    return convertMcqAnswer(answerStr, options, index);
  }

  return [q.correctAnswer];
}

function parseRegularQuestion(
  q: QuestionRow,
  options: string[] | undefined,
  _index: number
): ReturnType<typeof FrontendQuestionSchema.parse> {
  const answers = convertAnswers(q, options, _index);

  if (answers.length === 0) {
    throw new Error(
      `Assignment question ${_index + 1} has no valid answers. This assignment cannot be loaded until all questions have valid answers. Question: "${q.questionText?.substring(0, 50)}..." Please contact an administrator to fix this assignment.`
    );
  }

  const question = {
    id: q.id,
    question: q.questionText,
    type: q.questionType === "multiple_choice" ? ("mcq" as const) : ("frq" as const),
    options: options,
    answers: answers,
    points: q.points,
    order: q.orderIndex,
    imageData: q.imageData || null,
    difficulty: parseDifficulty(q.difficulty),
  };

  try {
    return FrontendQuestionSchema.parse(question);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues?.map((err) => `${err.path.join(".")}: ${err.message}`) || [
        "Unknown validation error",
      ];
      throw new Error(`Question validation failed:\n${errorMessages.join("\n")}`);
    }
    throw error;
  }
}

interface AssignmentRow {
  id: string;
  title: string;
  description: string | null;
  assignmentType: string;
  dueDate: string | null;
  points: number;
  isRequired: boolean;
  maxAttempts: number | null;
  createdAt: string;
  updatedAt: string;
  creatorEmail: string;
  creatorName: string | null;
}

interface QuestionRow {
  id: string;
  questionText: string;
  questionType: string;
  options: unknown; // JSONB - can be string, array, or object
  correctAnswer: string | null;
  points: number;
  orderIndex: number;
  imageData: string | null;
  difficulty: string | null;
}

interface CodebustersData {
  type?: string;
  author?: string;
  cipherType?: string;
  division?: string;
  charLength?: number;
  encrypted?: string;
  key?: string;
  hint?: string;
  solution?: string;
}

// GET /api/assignments/[assignmentId] - Get assignment details and questions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
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

    const { assignmentId } = await params;

    // Get assignment details with creator information
    const assignmentResult = await dbPg
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
        updatedAt: newTeamAssignments.updatedAt,
        creatorEmail: users.email,
        creatorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      })
      .from(newTeamAssignments)
      .innerJoin(users, eq(newTeamAssignments.createdBy, users.id))
      .where(eq(newTeamAssignments.id, assignmentId))
      .limit(1);

    if (assignmentResult.length === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const assignmentRow = assignmentResult[0];
    if (!assignmentRow) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    const assignment: AssignmentRow = {
      id: String(assignmentRow.id),
      title: String(assignmentRow.title),
      description: assignmentRow.description as string | null,
      assignmentType: String(assignmentRow.assignmentType),
      dueDate: assignmentRow.dueDate ? assignmentRow.dueDate.toISOString() : null,
      points: assignmentRow.points ?? 0,
      isRequired: assignmentRow.isRequired ?? true,
      maxAttempts: assignmentRow.maxAttempts ?? null,
      createdAt: assignmentRow.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: assignmentRow.updatedAt?.toISOString() ?? new Date().toISOString(),
      creatorEmail: String(assignmentRow.creatorEmail),
      creatorName: assignmentRow.creatorName as string | null,
    };

    // Check if user is assigned to this assignment
    const rosterResult = await dbPg
      .select({
        studentName: newTeamAssignmentRoster.studentName,
        userId: newTeamAssignmentRoster.userId,
        subteamId: newTeamAssignmentRoster.subteamId,
      })
      .from(newTeamAssignmentRoster)
      .where(
        and(
          eq(newTeamAssignmentRoster.assignmentId, assignmentId),
          or(
            eq(newTeamAssignmentRoster.userId, user.id),
            eq(newTeamAssignmentRoster.studentName, user.email ?? "")
          )
        )
      )
      .limit(1);

    if (rosterResult.length === 0) {
      return NextResponse.json({ error: "Not assigned to this assignment" }, { status: 403 });
    }

    /**
     * Load assignment questions from database
     *
     * Database schema:
     * - question_text: The question text
     * - question_type: 'multiple_choice', 'free_response', or 'codebusters'
     * - options: JSONB array of strings for MCQ (e.g., ["Option A", "Option B"])
     * - correct_answer: String stored as "A" or "0" for MCQ, text for FRQ
     * - points: Integer score value
     * - order_index: Display order
     * - image_data: Optional image URL
     */
    const questionsResult = await dbPg
      .select({
        id: newTeamAssignmentQuestions.id,
        questionText: newTeamAssignmentQuestions.questionText,
        questionType: newTeamAssignmentQuestions.questionType,
        options: newTeamAssignmentQuestions.options,
        correctAnswer: newTeamAssignmentQuestions.correctAnswer,
        points: newTeamAssignmentQuestions.points,
        orderIndex: newTeamAssignmentQuestions.orderIndex,
        imageData: newTeamAssignmentQuestions.imageData,
        difficulty: newTeamAssignmentQuestions.difficulty,
      })
      .from(newTeamAssignmentQuestions)
      .where(eq(newTeamAssignmentQuestions.assignmentId, assignmentId))
      .orderBy(asc(newTeamAssignmentQuestions.orderIndex));

    /**
     * Format questions for the frontend test system
     *
     * Frontend Contract:
     * - question: Question text (normalized)
     * - type: 'mcq' | 'frq' | 'codebusters'
     * - options: Array of strings (for MCQ only)
     * - answers: CRITICAL - Array of numbers for MCQ (0-based indices), strings for FRQ
     * - points: Score value
     * - order: Display order
     * - imageData: Optional image URL
     *
     * GUARANTEE: Every question returned from this endpoint has a valid, non-empty answers array.
     * Questions with missing/invalid answers are REJECTED with a detailed error.
     */
    const questions = questionsResult.map((row, index: number) => {
      const q: QuestionRow = {
        id: String(row.id),
        questionText: String(row.questionText),
        questionType: String(row.questionType),
        options: row.options,
        correctAnswer: row.correctAnswer as string | null,
        points: row.points ?? 1,
        orderIndex: row.orderIndex ?? 0,
        imageData: row.imageData as string | null,
        difficulty: row.difficulty ? String(row.difficulty) : null,
      };

      if (q.questionType === "codebusters") {
        return parseCodebustersQuestion(q, index);
      }

      const options = parseOptions(q);
      return parseRegularQuestion(q, options, index);
    });

    return NextResponse.json({
      assignment: {
        ...assignment,
        questions,
        questionsCount: questions.length,
      },
    });
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
