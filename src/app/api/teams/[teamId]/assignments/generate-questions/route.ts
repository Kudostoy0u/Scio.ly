import { AssignmentQuestionSchema, QuestionGenerationRequestSchema } from "@/lib/schemas/question";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getDifficultyRange, parseDifficulty } from "@/lib/types/difficulty";
import { getEventCapabilities, validateEventName } from "@/lib/utils/eventConfig";
import { isUserCaptain, resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    if (temp !== undefined && shuffled[j] !== undefined) {
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
  }
  return shuffled;
};

const URL_REGEX = /^https?:\/\//i;
const LETTER_REGEX = /^[A-Z]$/i;

const buildAbsoluteUrl = <T extends string | undefined>(src?: T, origin?: string): T => {
  if (!src) {
    return undefined as T;
  }
  try {
    if (URL_REGEX.test(src)) {
      return src as T;
    }
    if (origin && src.startsWith("/")) {
      return `${origin}${src}` as T;
    }
    return src as T;
  } catch {
    return src as T;
  }
};

interface QuestionCandidate {
  id?: string;
  question?: string;
  question_text?: string;
  questionText?: string;
  question_type?: string;
  questionType?: string;
  correct_answer?: string | number | (string | number)[];
  correctAnswer?: string | number | (string | number)[];
  options?: unknown[];
  answers?: unknown[];
  difficulty?: number | string | null;
  subtopic?: string;
  subtopics?: string[];
  imageData?: string;
  images?: unknown;
  [key: string]: unknown;
}

const isQuestionCandidate = (value: unknown): value is QuestionCandidate => {
  return typeof value === "object" && value !== null;
};

const sanitizeQuestionArray = (value: unknown): QuestionCandidate[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isQuestionCandidate);
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex question generation logic with validation and filtering
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await params;
    const body = await request.json();

    // Strict validation of request body
    const validatedRequest = QuestionGenerationRequestSchema.parse(body);

    const {
      event_name,
      question_count,
      question_types,
      subtopics,
      time_limit_minutes,
      division,
      id_percentage: idPercentage,
      pure_id_only: pureIdOnly,
      difficulties,
    } = validatedRequest;

    // Event name mapping for special cases
    const eventNameMapping: Record<string, string> = {
      "Dynamic Planet": "Dynamic Planet - Oceanography",
      "Water Quality": "Water Quality - Freshwater",
      "Materials Science": "Materials Science - Nanomaterials",
    };

    // Handle Anatomy & Physiology distribution
    const anatomyEvents = ["Anatomy - Endocrine", "Anatomy - Nervous", "Anatomy - Sense Organs"];

    let eventName = validateEventName(event_name);
    let targetEvents: string[] = [eventName];

    // Apply event name mapping
    if (eventName) {
      const mappedEventName = eventNameMapping[eventName];
      if (mappedEventName) {
        eventName = mappedEventName;
        targetEvents = [eventName];
      }
    }

    // Handle Anatomy & Physiology distribution
    if (eventName === "Anatomy & Physiology") {
      targetEvents = anatomyEvents;
    }

    const capabilities = getEventCapabilities(eventName);

    // Resolve team slug to team units and verify user has access
    const teamInfo = await resolveTeamSlugToUnits(teamId);

    // Check if user is captain or co-captain of any team unit in this group
    const isCaptain = await isUserCaptain(user.id, teamInfo.teamUnitIds);

    if (!isCaptain) {
      return NextResponse.json({ error: "Only captains can generate questions" }, { status: 403 });
    }

    // Fetch questions from multiple events if needed (e.g., Anatomy & Physiology)
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const allQuestions: QuestionCandidate[] = [];

    // Calculate distribution for multiple events
    const calculateEventDistribution = (totalQuestions: number, numEvents: number): number[] => {
      const basePerEvent = Math.floor(totalQuestions / numEvents);
      const remainder = totalQuestions % numEvents;
      const distribution = new Array(numEvents).fill(basePerEvent);

      // Distribute remainder to first few events
      for (let i = 0; i < remainder; i++) {
        distribution[i]++;
      }

      return distribution;
    };

    const eventDistribution = calculateEventDistribution(question_count, targetEvents.length);

    for (let i = 0; i < targetEvents.length; i++) {
      const targetEvent = targetEvents[i];
      const currentEventLimit = eventDistribution[i];
      if (!targetEvent || currentEventLimit === undefined) {
        continue;
      }

      // Build query parameters for question fetching
      const queryParams = new URLSearchParams();
      queryParams.set("event", targetEvent);
      queryParams.set("limit", String(Math.min(currentEventLimit, capabilities.maxQuestions)));

      // Handle question types - only set question_type if it's not "both"
      if (question_types.includes("multiple_choice") && !question_types.includes("free_response")) {
        queryParams.set("question_type", "mcq");
      } else if (
        question_types.includes("free_response") &&
        !question_types.includes("multiple_choice")
      ) {
        queryParams.set("question_type", "frq");
      }
      // If both types are included, don't set question_type parameter to allow both types

      // Handle division - use 'both' or the only available division
      if (division !== "both") {
        queryParams.set("division", division);
      }

      // Handle subtopics
      if (subtopics && subtopics.length > 0) {
        queryParams.set("subtopics", subtopics.join(","));
      }

      // Handle difficulties with strict validation
      if (difficulties && difficulties.length > 0 && !difficulties.includes("any")) {
        try {
          const { min, max } = getDifficultyRange(difficulties);
          queryParams.set("difficulty_min", min.toFixed(2));
          queryParams.set("difficulty_max", max.toFixed(2));
        } catch (error) {
          throw new Error(
            `Invalid difficulty configuration: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // Fetch questions from the main questions API
      const apiUrl = `${origin}/api/questions?${queryParams.toString()}`;

      const questionsResponse = await fetch(apiUrl, {
        cache: "no-store",
      });

      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        const eventQuestionsRaw = Array.isArray(questionsData.data)
          ? questionsData.data
          : questionsData.data?.questions || [];
        const eventQuestions = sanitizeQuestionArray(eventQuestionsRaw);

        allQuestions.push(...eventQuestions);
      }
    }

    let questions: QuestionCandidate[] = allQuestions;

    // Handle image support - fetch from id-questions API if needed
    if (pureIdOnly) {
      // Only fetch ID questions from all target events
      const idQuestions: QuestionCandidate[] = [];

      const pureIdDistribution = calculateEventDistribution(question_count, targetEvents.length);

      for (let i = 0; i < targetEvents.length; i++) {
        const targetEvent = targetEvents[i];
        const currentEventLimit = pureIdDistribution[i];
        if (!targetEvent || currentEventLimit === undefined) {
          continue;
        }

        const idQueryParams = new URLSearchParams();
        idQueryParams.set("event", targetEvent);
        idQueryParams.set("limit", String(currentEventLimit));
        idQueryParams.set("pure_id_only", "true");

        if (
          question_types.includes("multiple_choice") &&
          !question_types.includes("free_response")
        ) {
          idQueryParams.set("question_type", "mcq");
        } else if (
          question_types.includes("free_response") &&
          !question_types.includes("multiple_choice")
        ) {
          idQueryParams.set("question_type", "frq");
        }
        // If both types are included, don't set question_type parameter to allow both types

        if (subtopics && subtopics.length > 0) {
          idQueryParams.set("subtopics", subtopics.join(","));
        }

        if (division !== "both") {
          idQueryParams.set("division", division);
        }

        // Handle difficulties for ID questions with strict validation
        if (difficulties && difficulties.length > 0 && !difficulties.includes("any")) {
          try {
            const { min, max } = getDifficultyRange(difficulties);
            idQueryParams.set("difficulty_min", min.toFixed(2));
            idQueryParams.set("difficulty_max", max.toFixed(2));
          } catch (error) {
            throw new Error(
              `Invalid difficulty configuration for ID questions: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }

        const idQuestionsUrl = `${origin}/api/id-questions?${idQueryParams.toString()}`;
        const idQuestionsResponse = await fetch(idQuestionsUrl, {
          cache: "no-store",
        });

        if (idQuestionsResponse.ok) {
          const idQuestionsData = await idQuestionsResponse.json();
          const eventIdQuestions = sanitizeQuestionArray(idQuestionsData.data);
          idQuestions.push(...eventIdQuestions);
        }
      }

      questions = idQuestions;
    } else if (idPercentage !== undefined && idPercentage > 0) {
      // Fetch mixed questions from all target events
      const idQuestionsCount = Math.round((idPercentage / 100) * question_count);
      const regularQuestionsCount = question_count - idQuestionsCount;

      const regularQuestions: QuestionCandidate[] = [];
      const idQuestions: QuestionCandidate[] = [];

      // Fetch regular questions from all target events
      if (regularQuestionsCount > 0) {
        const regularDistribution = calculateEventDistribution(
          regularQuestionsCount,
          targetEvents.length
        );

        for (let i = 0; i < targetEvents.length; i++) {
          const targetEvent = targetEvents[i];
          const currentEventLimit = regularDistribution[i];
          if (!targetEvent || currentEventLimit === undefined) {
            continue;
          }

          const regularQueryParams = new URLSearchParams();
          regularQueryParams.set("event", targetEvent);
          regularQueryParams.set("limit", String(currentEventLimit));

          if (
            question_types.includes("multiple_choice") &&
            !question_types.includes("free_response")
          ) {
            regularQueryParams.set("question_type", "mcq");
          } else if (
            question_types.includes("free_response") &&
            !question_types.includes("multiple_choice")
          ) {
            regularQueryParams.set("question_type", "frq");
          }
          // If both types are included, don't set question_type parameter to allow both types

          if (division !== "both") {
            regularQueryParams.set("division", division);
          }

          if (subtopics && subtopics.length > 0) {
            regularQueryParams.set("subtopics", subtopics.join(","));
          }

          const regularResponse = await fetch(
            `${origin}/api/questions?${regularQueryParams.toString()}`,
            {
              cache: "no-store",
            }
          );

          if (regularResponse.ok) {
            const regularData = await regularResponse.json();
            const eventRegularQuestions = sanitizeQuestionArray(
              Array.isArray(regularData.data) ? regularData.data : regularData.data?.questions || []
            );
            regularQuestions.push(...eventRegularQuestions);
          }
        }
      }

      // Fetch ID questions from all target events
      if (idQuestionsCount > 0) {
        const idDistribution = calculateEventDistribution(idQuestionsCount, targetEvents.length);

        for (let i = 0; i < targetEvents.length; i++) {
          const targetEvent = targetEvents[i];
          const currentEventLimit = idDistribution[i];
          if (!targetEvent || currentEventLimit === undefined) {
            continue;
          }

          const idQueryParams = new URLSearchParams();
          idQueryParams.set("event", targetEvent);
          idQueryParams.set("limit", String(currentEventLimit));

          if (
            question_types.includes("multiple_choice") &&
            !question_types.includes("free_response")
          ) {
            idQueryParams.set("question_type", "mcq");
          } else if (
            question_types.includes("free_response") &&
            !question_types.includes("multiple_choice")
          ) {
            idQueryParams.set("question_type", "frq");
          }
          // If both types are included, don't set question_type parameter to allow both types

          if (subtopics && subtopics.length > 0) {
            idQueryParams.set("subtopics", subtopics.join(","));
          }

          if (division !== "both") {
            idQueryParams.set("division", division);
          }

          const idQuestionsUrl = `${origin}/api/id-questions?${idQueryParams.toString()}`;
          const idQuestionsResponse = await fetch(idQuestionsUrl, {
            cache: "no-store",
          });

          if (idQuestionsResponse.ok) {
            const idQuestionsData = await idQuestionsResponse.json();
            const eventIdQuestions = sanitizeQuestionArray(idQuestionsData.data);
            idQuestions.push(...eventIdQuestions);
          }
        }
      }

      // Combine and shuffle the results
      const allMixedQuestions = [...regularQuestions, ...idQuestions];
      questions = shuffleArray(allMixedQuestions).slice(0, question_count);
    }

    /**
     * Format and validate questions for assignment
     *
     * CRITICAL: This function ensures EVERY question has a valid answers field.
     * Questions without valid answers are REJECTED with a clear error message.
     *
     * @throws {Error} If any question is missing valid answers
     */
    const validQuestions = questions
      .filter((question) => {
        const optionList = Array.isArray(question.options) ? question.options : undefined;
        const answerList = Array.isArray(question.answers) ? question.answers : undefined;
        const hasContent = (optionList?.length ?? 0) > 0 || (answerList?.length ?? 0) > 0;
        return hasContent;
      })
      .slice(0, question_count)
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex question transformation logic with validation
      .map((question, index: number) => {
        const optionList = Array.isArray(question.options) ? question.options : undefined;
        const answerList = Array.isArray(question.answers) ? question.answers : undefined;
        const isMcq = (optionList?.length ?? 0) > 0;

        /**
         * Extract correct answer indices from question data
         *
         * Supports multiple formats:
         * 1. answers array with numeric indices: [0], [1, 2]
         * 2. answers array with string indices: ["0"], ["1", "2"]
         * 3. correct_answer as letter: "A", "B"
         * 4. correct_answer as number: 0, 1
         *
         * @returns Array of numbers for MCQ, array of strings for FRQ
         */
        let answers: (number | string)[] = [];

        // Try extracting from answers field first (preferred)
        if (answerList && answerList.length > 0) {
          if (isMcq) {
            // For MCQ, convert to numeric indices
            answers = answerList.map((a: unknown) => {
              const num = typeof a === "number" ? a : Number.parseInt(String(a));
              if (Number.isNaN(num) || num < 0 || num >= (optionList?.length ?? 0)) {
                throw new Error(
                  `Invalid answer index ${a} for question: ${
                    question.question || question.question_text
                  }`
                );
              }
              return num;
            });
          } else {
            // For FRQ, keep as strings
            answers = answerList.map((a: unknown) => String(a));
          }
        }
        // Fallback: try extracting from correct_answer field
        else if (
          question.correct_answer !== null &&
          question.correct_answer !== undefined &&
          question.correct_answer !== ""
        ) {
          const correctAnswer = question.correct_answer ?? question.correctAnswer;
          if (isMcq) {
            const answerStr = String(correctAnswer).trim();

            // Handle comma-separated answers (e.g., "A,B" or "0,1")
            const parts = answerStr
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s);

            answers = parts.map((part) => {
              // Try parsing as letter (A, B, C, etc.)
              if (LETTER_REGEX.test(part)) {
                const index = part.toUpperCase().charCodeAt(0) - 65;
                if (index < 0 || index >= (optionList?.length ?? 0)) {
                  throw new Error(
                    `Invalid answer letter "${part}" for question with ${
                      optionList?.length ?? 0
                    } options: ${question.question || question.question_text}`
                  );
                }
                return index;
              }
              // Try parsing as number
              const num = Number.parseInt(part);
              if (Number.isNaN(num) || num < 0 || num >= (optionList?.length ?? 0)) {
                throw new Error(
                  `Invalid answer "${part}" for question: ${question.question || question.question_text}`
                );
              }
              return num;
            });
          } else {
            // For FRQ, use the answer directly
            answers = [String(correctAnswer)];
          }
        }

        // CRITICAL VALIDATION: Reject questions without valid answers
        if (!answers || answers.length === 0) {
          // Error message for debugging (unused but kept for potential logging)
          // biome-ignore lint/complexity/noVoid: Intentional void for debugging info
          void [
            "❌ INVALID QUESTION - No valid answers found",
            `Question: "${question.question || question.question_text}"`,
            `Type: ${question.question_type || (isMcq ? "MCQ" : "FRQ")}`,
            `Has answers field: ${!!question.answers}`,
            `Has correct_answer field: ${!!question.correct_answer}`,
            `Answers value: ${JSON.stringify(question.answers)}`,
            `Correct answer value: ${JSON.stringify(question.correct_answer)}`,
          ].join("\n  ");
          throw new Error(
            `Question "${
              question.question || question.question_text
            }" has no valid answers. Cannot generate assignment with invalid questions.`
          );
        }

        const formattedQuestion = {
          question_text: question.question || question.question_text || question.questionText,
          question_type: isMcq ? "multiple_choice" : "free_response",
          options: isMcq ? optionList : undefined,
          answers: answers, // GUARANTEED: Always present, always valid, always non-empty array
          points: 1,
          order_index: index,
          difficulty: parseDifficulty(question.difficulty), // Strict validation - throws error if invalid
          imageData: (() => {
            let candidate = question.imageData;
            if (!candidate && Array.isArray(question.images) && question.images.length > 0) {
              const images = question.images as unknown[];
              const validImages = images.filter((img): img is string => typeof img === "string");
              if (validImages.length > 0) {
                candidate = validImages[Math.floor(Math.random() * validImages.length)];
              }
            }
            return buildAbsoluteUrl(candidate, origin);
          })(),
        };

        // Debug logging for formatted question difficulty
        if (index < 3) {
          // Debug logging can be added here if needed
        }

        // Validate the formatted question with strict schema
        try {
          return AssignmentQuestionSchema.parse(formattedQuestion);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errorMessages = error.issues?.map(
              (err) => `${err.path.join(".")}: ${err.message}`
            ) || ["Unknown validation error"];
            throw new Error(
              `Question ${index + 1} validation failed:\n${errorMessages.join("\n")}`
            );
          }
          throw new Error(
            `Question ${index + 1} validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }

        // Double-check the formatted question (belt and suspenders)
        // biome-ignore lint/correctness/noUnreachable: Defensive check - answers are validated above but this provides extra safety
        if (!formattedQuestion.answers || formattedQuestion.answers.length === 0) {
          throw new Error(
            `INTERNAL ERROR: Formatted question has invalid answers: ${formattedQuestion.question_text}`
          );
        }

        return formattedQuestion;
      });

    if (validQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "No valid questions found for this event",
          suggestions: [
            "Try a different event name",
            "Check if the event supports the selected question types",
            "Verify the division selection",
          ],
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      questions: validQuestions,
      metadata: {
        eventName,
        questionCount: validQuestions.length,
        capabilities,
        timeLimit: time_limit_minutes,
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
