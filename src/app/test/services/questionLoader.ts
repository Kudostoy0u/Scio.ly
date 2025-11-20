import type { Question } from "@/app/utils/geminiService";
import { buildApiParams, difficultyRanges } from "@/app/utils/questionUtils";
import { getEventOfflineQuestions } from "@/app/utils/storage";
import api from "@/app/api";
import {
  normalizeOptionAnswerLabels,
  normalizeQuestionText,
  normalizeTestText,
} from "@/app/test/utils/normalizeTestText";
import { buildAbsoluteUrl, normalizeQuestionMedia } from "@/app/test/utils/questionMedia";

export type RouterParams = Record<string, any>;

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
  let apiResponse: any = null;
  const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
  if (isOffline) {
    const evt = routerParams.eventName as string | undefined;
    if (evt) {
      const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const cached = await getEventOfflineQuestions(slug);
      if (Array.isArray(cached) && cached.length > 0) {
        const typesSel = (routerParams.types as string) || "multiple-choice";
        const filtered =
          typesSel === "multiple-choice"
            ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
            : typesSel === "free-response"
              ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
              : cached;
        apiResponse = { success: true, data: filtered };
      }
    }
    if (!apiResponse) {
      throw new Error("No offline data available for this event.");
    }
  } else {
    let response: Response | null = null;
    try {
      response = await fetch(apiUrl);
    } catch {
      response = null;
    }
    if (response?.ok) {
      apiResponse = await response.json();
    } else {
      const evt = routerParams.eventName as string | undefined;
      if (evt) {
        const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const cached = await getEventOfflineQuestions(slug);
        if (Array.isArray(cached) && cached.length > 0) {
          const typesSel = (routerParams.types as string) || "multiple-choice";
          const filtered =
            typesSel === "multiple-choice"
              ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
              : typesSel === "free-response"
                ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
                : cached;
          apiResponse = { success: true, data: filtered };
        }
      }
      if (!apiResponse) {
        throw new Error("Failed to load questions.");
      }
    }
  }
  const allQuestions = apiResponse.data || [];
  // Filter by requested question types
  const typesSel = (routerParams.types as string) || "multiple-choice";
  const filtered =
    typesSel === "multiple-choice"
      ? allQuestions.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
      : typesSel === "free-response"
        ? allQuestions.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
        : allQuestions;
  return normalizeQuestionMedia(filtered);
}

export async function fetchIdQuestions(
  routerParams: RouterParams,
  idCount: number
): Promise<Question[]> {
  if (idCount <= 0) {
    return [];
  }
  const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
  let source: any[] = [];
  if (!isOffline) {
    try {
      const params = new URLSearchParams();
      params.set("event", routerParams.eventName || "");
      params.set("limit", String(idCount));
      if (routerParams.types) {
        if (routerParams.types === "multiple-choice") {
          params.set("question_type", "mcq");
        } else if (routerParams.types === "free-response") {
          params.set("question_type", "frq");
        }
      }
      if (routerParams.difficulties && routerParams.difficulties.length > 0) {
        const allRanges = routerParams.difficulties
          .map((d: string) => difficultyRanges[d])
          .filter(Boolean);
        if (allRanges.length > 0) {
          const minValue = Math.min(...allRanges.map((r: any) => r.min));
          const maxValue = Math.max(...allRanges.map((r: any) => r.max));
          params.set("difficulty_min", minValue.toFixed(2));
          params.set("difficulty_max", maxValue.toFixed(2));
        }
      }
      if (routerParams.subtopics && routerParams.subtopics.length > 0) {
        params.set("subtopics", routerParams.subtopics.join(","));
      }
      if (routerParams.pureIdOnly === true) {
        params.set("pure_id_only", "true");
      }
      const resp = await fetch(`${api.idQuestions}?${params.toString()}`);
      const json = await resp.json();
      source = Array.isArray(json?.data) ? json.data : [];
    } catch {}
  }
  const idQuestions: Question[] = source.map((row: any) => ({
    id: row.id,
    question: row.question,
    options: row.options || [],
    answers: row.answers || [],
    difficulty: row.difficulty ?? 0.5,
    event: row.event,
    subtopics: row.subtopics || [],
    imageData: buildAbsoluteUrl(
      Array.isArray(row.images) && row.images.length > 0
        ? row.images[Math.floor(Math.random() * row.images.length)]
        : undefined
    ),
  }));
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
  finalized.forEach((question) => {
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
  });
  return finalized;
}
