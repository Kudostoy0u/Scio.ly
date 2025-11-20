import { queryCockroachDB } from "@/lib/cockroachdb";
import { FrontendQuestionSchema } from "@/lib/schemas/question";
import { getServerUser } from "@/lib/supabaseServer";
import { parseDifficulty } from "@/lib/types/difficulty";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

    // Get assignment details
    const assignmentResult = await queryCockroachDB<any>(
      `SELECT 
         a.id,
         a.title,
         a.description,
         a.assignment_type,
         a.due_date,
         a.points,
         a.is_required,
         a.max_attempts,
         a.created_at,
         a.updated_at,
         u.email as creator_email,
         COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as creator_name
       FROM new_team_assignments a
       JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const assignment = assignmentResult.rows[0];

    // Check if user is assigned to this assignment
    const rosterResult = await queryCockroachDB<any>(
      `SELECT student_name, user_id, subteam_id
       FROM new_team_assignment_roster
       WHERE assignment_id = $1 AND (user_id = $2 OR student_name = $3)`,
      [assignmentId, user.id, user.email]
    );

    if (rosterResult.rows.length === 0) {
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
    const questionsResult = await queryCockroachDB<any>(
      `SELECT
         id,
         question_text,
         question_type,
         options,
         correct_answer,
         points,
         order_index,
         image_data,
         difficulty
       FROM new_team_assignment_questions
       WHERE assignment_id = $1
       ORDER BY order_index ASC`,
      [assignmentId]
    );

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
    const questions = questionsResult.rows.map((q: any, index: number) => {
      // Special handling for Codebusters questions
      if (q.question_type === "codebusters") {
        let codebustersData: any = null;
        if (q.options) {
          try {
            codebustersData = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
          } catch (_parseError) {}
        }

        // Check if this is a parameters record (for dynamic generation)
        if (codebustersData?.type === "parameters") {
          return {
            id: q.id,
            question_text: "Dynamic Codebusters Generation",
            question_type: "codebusters_params",
            parameters: codebustersData,
            points: 0,
            order_index: 0,
            image_data: null,
          };
        }

        // Regular Codebusters question
        const codebustersQuestion = {
          id: q.id,
          question: q.question_text,
          question_text: q.question_text,
          type: "codebusters" as const,
          question_type: "codebusters",
          author: codebustersData?.author || "Unknown",
          quote: q.question_text,
          cipherType: codebustersData?.cipherType || "Random Aristocrat",
          difficulty: parseDifficulty(q.difficulty), // Strict validation - throws error if invalid
          division: codebustersData?.division || "C",
          charLength: codebustersData?.charLength || 100,
          encrypted: codebustersData?.encrypted || "",
          key: codebustersData?.key || "",
          hint: codebustersData?.hint || "",
          solution: codebustersData?.solution || q.correct_answer,
          answers: [codebustersData?.solution || q.correct_answer], // FRQ format
          correct_answer: codebustersData?.solution || q.correct_answer,
          points: q.points,
          order: q.order_index,
          order_index: q.order_index,
          imageData: q.image_data || null,
          image_data: q.image_data || null,
        };

        // Validate the question with strict schema
        try {
          return FrontendQuestionSchema.parse(codebustersQuestion);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errorMessages = error.issues?.map(
              (err) => `${err.path.join(".")}: ${err.message}`
            ) || ["Unknown validation error"];
            throw new Error(`Codebusters question validation failed:\n${errorMessages.join("\n")}`);
          }
          throw error;
        }
      }

      // Parse options from JSONB
      let options: string[] | undefined;
      if (q.options) {
        let parsedOptions = q.options;
        if (typeof q.options === "string") {
          try {
            parsedOptions = JSON.parse(q.options);
          } catch {
            parsedOptions = [q.options];
          }
        }

        if (Array.isArray(parsedOptions)) {
          options = parsedOptions.map((opt: any) => {
            if (typeof opt === "string") {
              return opt;
            }
            if (typeof opt === "object" && opt.text) {
              return opt.text;
            }
            return String(opt);
          });
        }
      }

      /**
       * Convert database answer format to frontend format
       *
       * Database Format:
       * - MCQ: correct_answer = "A" or "0" or "A,B" (letters or indices)
       * - FRQ: correct_answer = "answer text"
       *
       * Frontend Format:
       * - MCQ: answers = [0] or [1, 2] (numeric indices)
       * - FRQ: answers = ["answer text"]
       *
       * CRITICAL: This conversion MUST produce a valid, non-empty answers array.
       * If the database has invalid data, we REJECT the question with an error.
       */
      let answers: (string | number)[] = [];

      if (q.correct_answer !== null && q.correct_answer !== undefined && q.correct_answer !== "") {
        if (q.question_type === "multiple_choice") {
          // For MCQ, convert letter/text answers to numeric indices
          const answerStr = String(q.correct_answer).trim();

          // Handle comma-separated multiple answers (e.g., "A,B" or "0,1")
          const answerParts = answerStr
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s);

          if (answerParts.length === 0) {
            throw new Error(
              `Invalid correct_answer format for MCQ question ${index + 1}: "${q.correct_answer}"`
            );
          }

          answers = answerParts.map((part) => {
            // Check if it's a letter (A, B, C, etc.)
            if (part.match(/^[A-Z]$/i)) {
              const idx = part.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, etc.
              if (idx < 0 || idx >= (options?.length || 0)) {
                throw new Error(
                  `Answer letter "${part}" out of range for question ${index + 1} with ${options?.length || 0} options`
                );
              }
              return idx;
            }
            // Otherwise try to parse as number
            const num = Number.parseInt(part);
            if (Number.isNaN(num) || num < 0 || num >= (options?.length || 0)) {
              throw new Error(
                `Answer index "${part}" out of range for question ${index + 1} with ${options?.length || 0} options`
              );
            }
            return num;
          });
        } else {
          // For FRQ/Codebusters, use the answer as-is
          answers = [q.correct_answer];
        }
      }

      // CRITICAL VALIDATION: Reject questions with invalid/missing answers
      if (!answers || answers.length === 0) {
        throw new Error(
          `Assignment question ${index + 1} has no valid answers. This assignment cannot be loaded until all questions have valid answers. Question: "${q.question_text?.substring(0, 50)}..." Please contact an administrator to fix this assignment.`
        );
      }

      const question = {
        id: q.id,
        question: q.question_text,
        type: q.question_type === "multiple_choice" ? ("mcq" as const) : ("frq" as const),
        options: options,
        answers: answers, // CRITICAL: Always present, always an array
        points: q.points,
        order: q.order_index,
        imageData: q.image_data || null,
        difficulty: parseDifficulty(q.difficulty), // Strict validation - throws error if invalid
      };

      // Validate the question with strict schema
      try {
        return FrontendQuestionSchema.parse(question);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.issues?.map(
            (err) => `${err.path.join(".")}: ${err.message}`
          ) || ["Unknown validation error"];
          throw new Error(`Question validation failed:\n${errorMessages.join("\n")}`);
        }
        throw error;
      }
    });

    return NextResponse.json({
      assignment: {
        ...assignment,
        questions,
        questions_count: questions.length,
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
