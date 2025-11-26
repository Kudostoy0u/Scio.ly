import api from "@/app/api";
import {
  normalizeOptionAnswerLabels,
  normalizeQuestionText,
  normalizeTestText,
} from "@/app/test/utils/normalizeTestText";
import { buildAbsoluteUrl, normalizeQuestionMedia } from "@/app/test/utils/questionMedia";
import type { Question } from "@/app/utils/geminiService";
import { buildApiParams, difficultyRanges } from "@/app/utils/questionUtils";
import { getEventOfflineQuestions } from "@/app/utils/storage";

export type RouterParams = Record<string, unknown>;

// Helper function to filter questions by type
function filterQuestionsByType(
  questions: Record<string, unknown>[],
  typesSel: string
): Record<string, unknown>[] {
  if (typesSel === "multiple-choice") {
    return questions.filter((q) => Array.isArray(q.options) && q.options.length > 0);
  }
  if (typesSel === "free-response") {
    return questions.filter((q) => !Array.isArray(q.options) || q.options.length === 0);
  }
  return questions;
}

// Helper function to get filtered offline questions
async function getFilteredOfflineQuestions(
  eventName: string,
  typesSel: string
): Promise<Record<string, unknown>[] | null> {
  const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const cached = await getEventOfflineQuestions(slug);
  if (!Array.isArray(cached) || cached.length === 0) {
    return null;
  }
  return filterQuestionsByType(cached, typesSel);
}

export function supportsIdEvent(eventName?: string): boolean {
  if (!eventName) {
    return false;
  }
  const base = typeof eventName === "string" ? eventName.split(" - ")[0] : "";
  const supportedEvents = new Set([
    "Rocks and Minerals",
    "Entomology",
    "Anatomy & Physiology",
    "Dynamic Planet",
    "Water Quality",
    "Remote Sensing",
    "Circuit Lab",
    "Astronomy",
    "Designer Genes",
    "Forensics",
    "Meteorology",
    "Potions and Poisons",
    "Solar System",
  ]);
  if (base === "Anatomy") {
    return supportedEvents.has("Anatomy & Physiology");
  }
  return supportedEvents.has(eventName || "") || supportedEvents.has(base || "");
}

export async function fetchBaseQuestions(
  routerParams: RouterParams,
  count: number
): Promise<Question[]> {
  const paramsObj = { ...routerParams };
  // IMPORTANT: Do NOT rewrite hyphenated Anatomy event names here.
  // The DB/API expects the full hyphenated name (e.g., "Anatomy - Sense Organs").
  // Past attempts to map to a base event name caused empty results.
  const params = buildApiParams(paramsObj, count);
  const apiUrl = `${api.questions}?${params}`;

  const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
  const typesSel = (routerParams.types as string) || "multiple-choice";

  let questions: Question[] = [];

  if (isOffline) {
    const eventName = routerParams.eventName as string | undefined;
    if (!eventName) {
      throw new Error("No offline data available for this event.");
    }
    const filtered = await getFilteredOfflineQuestions(eventName, typesSel);
    if (!filtered) {
      throw new Error("No offline data available for this event.");
    }
    questions = filtered as unknown as Question[];
  } else {
    // Try API first
    let response: Response | null = null;
    try {
      response = await fetch(apiUrl);
    } catch {
      response = null;
    }

    if (response?.ok) {
      const apiResponse = await response.json();
      const apiData = apiResponse as { data?: unknown[] };
      questions = (apiData.data || []) as unknown as Question[];
    } else {
      // Fallback to offline cache
      const eventName = routerParams.eventName as string | undefined;
      if (eventName) {
        const filtered = await getFilteredOfflineQuestions(eventName, typesSel);
        if (filtered) {
          questions = filtered as unknown as Question[];
        }
      }
      if (questions.length === 0) {
        throw new Error("Failed to load questions.");
      }
    }
  }

  // Apply final filtering by question type
  const finalFiltered = filterQuestionsByType(
    questions as unknown as Record<string, unknown>[],
    typesSel
  );
  return normalizeQuestionMedia(finalFiltered as unknown as Question[]);
}

export async function fetchIdQuestions(
  routerParams: RouterParams,
  idCount: number
): Promise<Question[]> {
  if (idCount <= 0) {
    return [];
  }
  const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
  let source: unknown[] = [];
  if (!isOffline) {
    try {
      const params = new URLSearchParams();
      const eventName = typeof routerParams.eventName === "string" ? routerParams.eventName : "";
      params.set("event", eventName);
      params.set("limit", String(idCount));
      if (routerParams.types) {
        if (routerParams.types === "multiple-choice") {
          params.set("question_type", "mcq");
        } else if (routerParams.types === "free-response") {
          params.set("question_type", "frq");
        }
      }
      const difficulties = Array.isArray(routerParams.difficulties)
        ? routerParams.difficulties
        : [];
      if (difficulties.length > 0) {
        const allRanges = difficulties
          .map((d: unknown) => {
            if (typeof d === "string" && d in difficultyRanges) {
              const range = difficultyRanges[d];
              return typeof range === "object" && range !== null && "min" in range && "max" in range
                ? (range as { min: number; max: number })
                : undefined;
            }
            return undefined;
          })
          .filter((r): r is { min: number; max: number } => r !== undefined);
        if (allRanges.length > 0) {
          const minValue = Math.min(...allRanges.map((r) => r.min));
          const maxValue = Math.max(...allRanges.map((r) => r.max));
          params.set("difficulty_min", minValue.toFixed(2));
          params.set("difficulty_max", maxValue.toFixed(2));
        }
      }
      const subtopics = Array.isArray(routerParams.subtopics) ? routerParams.subtopics : [];
      if (subtopics.length > 0) {
        params.set("subtopics", subtopics.map(String).join(","));
      }
      if (routerParams.pureIdOnly === true) {
        params.set("pure_id_only", "true");
      }
      const resp = await fetch(`${api.idQuestions}?${params.toString()}`);
      const json = await resp.json();
      source = Array.isArray(json?.data) ? json.data : [];
    } catch {
      // Ignore errors
    }
  }
  const idQuestions: Question[] = source.map((row) => {
    const rowRecord = row as Record<string, unknown>;
    return {
      id: typeof rowRecord.id === "string" ? rowRecord.id : undefined,
      question: typeof rowRecord.question === "string" ? rowRecord.question : "",
      options: Array.isArray(rowRecord.options) ? (rowRecord.options as string[]) : [],
      answers: Array.isArray(rowRecord.answers) ? (rowRecord.answers as (number | string)[]) : [],
      difficulty: typeof rowRecord.difficulty === "number" ? rowRecord.difficulty : 0.5,
      event: typeof rowRecord.event === "string" ? rowRecord.event : undefined,
      subtopics: Array.isArray(rowRecord.subtopics) ? (rowRecord.subtopics as string[]) : [],
      imageData: buildAbsoluteUrl(
        Array.isArray(rowRecord.images) && rowRecord.images.length > 0
          ? String(rowRecord.images[Math.floor(Math.random() * rowRecord.images.length)])
          : undefined
      ),
    };
  });
  return idQuestions;
}

export function dedupeById(arr: Question[]): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const q of arr) {
    const id = q.id;
    if (id) {
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
    }
    out.push(q);
  }
  return out;
}

export function dedupeByText(arr: Question[]): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const q of arr) {
    const text =
      typeof q.question === "string" ? normalizeQuestionText(q.question).trim().toLowerCase() : "";
    if (text) {
      if (seen.has(text)) {
        continue;
      }
      seen.add(text);
    }
    out.push(q);
  }
  return out;
}

export function finalizeQuestions(questions: Question[]): Question[] {
  const finalized = normalizeQuestionMedia(questions);
  for (const question of finalized) {
    if (question.question) {
      question.question = normalizeQuestionText(question.question);
    }
    if (Array.isArray(question.options)) {
      question.options = question.options.map((option) =>
        typeof option === "string" ? normalizeTestText(option) : option
      );
      const normalized = normalizeOptionAnswerLabels(
        question.options as string[],
        Array.isArray(question.answers) ? question.answers : []
      );
      question.options = normalized.options;
      if (Array.isArray(question.answers)) {
        question.answers = normalized.answers;
      }
    }
    if (Array.isArray(question.answers)) {
      question.answers = question.answers.map((answer) =>
        typeof answer === "string" ? normalizeTestText(answer) : answer
      );
    }
  }
  return finalized;
}
