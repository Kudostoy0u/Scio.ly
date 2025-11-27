import { getDifficultyRange } from "@/lib/types/difficulty";

export function buildQuestionQueryParams(
  event: string,
  limit: number,
  questionTypes: string[],
  division: string,
  subtopics?: string[],
  difficulties?: string[]
): URLSearchParams {
  const queryParams = new URLSearchParams();
  queryParams.set("event", event);
  queryParams.set("limit", String(limit));

  // Handle question types - only set question_type if it's not "both"
  if (questionTypes.includes("multiple_choice") && !questionTypes.includes("free_response")) {
    queryParams.set("question_type", "mcq");
  } else if (
    questionTypes.includes("free_response") &&
    !questionTypes.includes("multiple_choice")
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

  return queryParams;
}

export function buildIdQuestionQueryParams(
  event: string,
  limit: number,
  questionTypes: string[],
  division: string,
  subtopics?: string[],
  difficulties?: string[],
  pureIdOnly = false
): URLSearchParams {
  const queryParams = buildQuestionQueryParams(
    event,
    limit,
    questionTypes,
    division,
    subtopics,
    difficulties
  );
  if (pureIdOnly) {
    queryParams.set("pure_id_only", "true");
  }
  return queryParams;
}
