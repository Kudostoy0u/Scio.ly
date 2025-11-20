import type { Question } from "@/app/utils/geminiService";
import { shuffleArray } from "@/app/utils/questionUtils";

export function buildIdQuestionFromApiRow(
  row: any,
  params: { eventName?: string; types?: string; namePool: string[] }
): Question {
  const imgs: string[] = Array.isArray(row.images) ? row.images : [];
  const chosenImg = imgs.length > 0 ? imgs[Math.floor(Math.random() * imgs.length)] : undefined;

  const types = params.types || "multiple-choice";

  const isMcqMode = types === "multiple-choice" || (types === "both" && Math.random() >= 0.5);

  let frqPrompt = "Identify the specimen shown in the image.";
  if (params.eventName?.startsWith("Anatomy")) {
    frqPrompt = "Identify the anatomical structure shown in the image.";
  }

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
    return /^[A-Za-z][A-Za-z\s\-()']+[A-Za-z)]$/.test(t);
  };

  const toCleanString = (val: unknown): string | null => {
    if (typeof val !== "string") {
      return null;
    }
    const s = val.trim();
    return s.length > 0 && isPlausibleName(s) ? s : null;
  };

  const extractCorrectLabel = (): string | null => {
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

  if (!isMcqMode) {
    const label = extractCorrectLabel();
    const answers =
      Array.isArray(row?.names) && row.names.length > 0
        ? row.names.map(toCleanString).filter((x: string | null): x is string => !!x)
        : Array.isArray(row?.answers)
          ? row.answers.map(toCleanString).filter((x: string | null): x is string => !!x)
          : [];
    const finalAnswers = answers.length > 0 ? answers : label ? [label] : [];
    return {
      question: frqPrompt,
      answers: finalAnswers,
      difficulty: row.difficulty ?? 0.5,
      event: params.eventName || "Unknown Event",
      imageData: chosenImg,
    } as Question;
  }

  const correctLabel = extractCorrectLabel();
  if (!correctLabel) {
    // Fallback to FRQ if we cannot confidently determine the correct label for MCQ
    return {
      question: frqPrompt,
      answers: [],
      difficulty: row.difficulty ?? 0.5,
      event: params.eventName || "Unknown Event",
      imageData: chosenImg,
    } as Question;
  }

  const poolSet = new Set<string>();
  for (const n of params.namePool || []) {
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

  const allCandidates = Array.from(poolSet);
  const distractors = shuffleArray(allCandidates).slice(0, 3);
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
