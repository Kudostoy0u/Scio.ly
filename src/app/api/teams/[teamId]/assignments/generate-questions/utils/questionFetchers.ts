import { calculateEventDistribution } from "./arrayUtils";
import { buildIdQuestionQueryParams, buildQuestionQueryParams } from "./queryBuilders";
import { type QuestionCandidate, sanitizeQuestionArray } from "./questionUtils";

export async function fetchQuestionsFromEvents(
  targetEvents: string[],
  questionCount: number,
  questionTypes: string[],
  division: string,
  subtopics: string[] | undefined,
  difficulties: string[] | undefined,
  origin: string,
  maxQuestions: number
): Promise<QuestionCandidate[]> {
  const allQuestions: QuestionCandidate[] = [];
  const eventDistribution = calculateEventDistribution(questionCount, targetEvents.length);

  for (let i = 0; i < targetEvents.length; i++) {
    const targetEvent = targetEvents[i];
    const currentEventLimit = eventDistribution[i];
    if (!targetEvent || currentEventLimit === undefined) {
      continue;
    }

    const queryParams = buildQuestionQueryParams(
      targetEvent,
      Math.min(currentEventLimit, maxQuestions),
      questionTypes,
      division,
      subtopics,
      difficulties
    );

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

  return allQuestions;
}

export async function fetchIdQuestionsFromEvents(
  targetEvents: string[],
  questionCount: number,
  questionTypes: string[],
  division: string,
  subtopics: string[] | undefined,
  difficulties: string[] | undefined,
  origin: string,
  pureIdOnly = false
): Promise<QuestionCandidate[]> {
  const idQuestions: QuestionCandidate[] = [];
  const pureIdDistribution = calculateEventDistribution(questionCount, targetEvents.length);

  for (let i = 0; i < targetEvents.length; i++) {
    const targetEvent = targetEvents[i];
    const currentEventLimit = pureIdDistribution[i];
    if (!targetEvent || currentEventLimit === undefined) {
      continue;
    }

    const idQueryParams = buildIdQuestionQueryParams(
      targetEvent,
      currentEventLimit,
      questionTypes,
      division,
      subtopics,
      difficulties,
      pureIdOnly
    );

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

  return idQuestions;
}
