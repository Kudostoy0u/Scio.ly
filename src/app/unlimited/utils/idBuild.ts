import type { Question } from "@/app/utils/geminiService";
import { shuffleArray } from "@/app/utils/questionUtils";

// Regex pattern for ID validation
const ID_VALIDATION_REGEX = /^[A-Za-z][A-Za-z\s\-()']+[A-Za-z)]$/;

const isPlausibleName = (s: string): boolean => {
  if (!s) {
    return false;
  }
  const t = s.trim();
  if (t.length < 2 || t.length > 60) {
    return false;
  }
  if (t.includes("->")) {
    return false;
  }
  // Disallow long numeric/figure references
  const digitCount = (t.match(/\d/g) || []).length;
  if (digitCount > 4) {
    return false;
  }
  // Allow letters, spaces, hyphens, apostrophes, parentheses
  return ID_VALIDATION_REGEX.test(t);
};

const toCleanString = (val: unknown): string | null => {
  if (typeof val !== "string") {
    return null;
  }
  const s = val.trim();
  return s.length > 0 && isPlausibleName(s) ? s : null;
};

const extractCorrectLabel = (row: Record<string, unknown>): string | null => {
  // Prefer explicit names list
  if (Array.isArray(row?.names) && row.names.length > 0) {
    const label = toCleanString(row.names[0]);
    if (label) {
      return label;
    }
  }
  // If answers reference options by index
  if (Array.isArray(row?.answers) && Array.isArray(row?.options) && row.answers.length > 0) {
    const first = row.answers[0];
    if (typeof first === "number" && first >= 0 && first < row.options.length) {
      const label = toCleanString(row.options[first]);
      if (label) {
        return label;
      }
    }
  }
  // If answers include direct strings
  if (Array.isArray(row?.answers) && row.answers.length > 0) {
    const label = toCleanString(row.answers[0]);
    if (label) {
      return label;
    }
  }
  return null;
};

const getFRQAnswers = (row: Record<string, unknown>, correctLabel: string | null): string[] => {
  const answers =
    Array.isArray(row?.names) && row.names.length > 0
      ? row.names.map(toCleanString).filter((x: string | null): x is string => !!x)
      : Array.isArray(row?.answers)
        ? row.answers.map(toCleanString).filter((x: string | null): x is string => !!x)
        : [];
  return answers.length > 0 ? answers : correctLabel ? [correctLabel] : [];
};

const buildDistractorPool = (
  row: Record<string, unknown>,
  correctLabel: string,
  namePool: string[]
): string[] => {
  const poolSet = new Set<string>();
  for (const n of namePool || []) {
    const c = toCleanString(n);
    if (c) {
      poolSet.add(c);
    }
  }
  // Exclude correct label from distractor pool
  poolSet.delete(correctLabel);
  // Supplement with names from this row, excluding correct
  if (Array.isArray(row?.names)) {
    for (const n of row.names) {
      const c = toCleanString(n);
      if (c && c !== correctLabel) {
        poolSet.add(c);
      }
    }
  }
  return Array.from(poolSet);
};

const getFRQPrompt = (eventName?: string): string => {
  return eventName?.startsWith("Anatomy")
    ? "Identify the anatomical structure shown in the image."
    : "Identify the specimen shown in the image.";
};

const selectRandomImage = (images: unknown): string | undefined => {
  const imgs: string[] = Array.isArray(images) ? images : [];
  return imgs.length > 0 ? imgs[Math.floor(Math.random() * imgs.length)] : undefined;
};

export function buildIdQuestionFromApiRow(
  row: Record<string, unknown>,
  params: { eventName?: string; types?: string; namePool: string[] }
): Question {
  const chosenImg = selectRandomImage(row.images);
  const types = params.types || "multiple-choice";
  const isMcqMode = types === "multiple-choice" || (types === "both" && Math.random() >= 0.5);
  const frqPrompt = getFRQPrompt(params.eventName);
  const correctLabel = extractCorrectLabel(row);

  if (!isMcqMode) {
    const finalAnswers = getFRQAnswers(row, correctLabel);
    return {
      question: frqPrompt,
      answers: finalAnswers,
      difficulty: row.difficulty ?? 0.5,
      event: params.eventName || "Unknown Event",
      imageData: chosenImg,
    } as Question;
  }

  if (!correctLabel) {
    // Fallback to FRQ if we cannot confidently determine the correct label for MCQ
    return {
      question: frqPrompt,
      answers: [],
      difficulty: typeof row.difficulty === "number" ? row.difficulty : 0.5,
      event: params.eventName || "Unknown Event",
      imageData: chosenImg,
    } as Question;
  }

  const distractorPool = buildDistractorPool(row, correctLabel, params.namePool);
  const distractors = shuffleArray(distractorPool).slice(0, 3);

  if (distractors.length < 3) {
    // Not enough quality distractors → degrade to FRQ to avoid broken MCQs
    return {
      question: frqPrompt,
      answers: [correctLabel],
      difficulty: row.difficulty ?? 0.5,
      event: params.eventName || "Unknown Event",
      imageData: chosenImg,
    } as Question;
  }

  const options = shuffleArray([correctLabel, ...distractors]);
  const correctIndex = options.indexOf(correctLabel);
  return {
    question: frqPrompt,
    options,
    answers: [correctIndex],
    difficulty: row.difficulty ?? 0.5,
    event: params.eventName || "Unknown Event",
    imageData: chosenImg,
  } as Question;
}
