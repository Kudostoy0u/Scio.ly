import type { Question } from "@/app/utils/geminiService";

export type PrepareInput = {
  baseQuestions: Question[];
  eventName?: string;
  idPercentage?: string | number | undefined;
};

export type PrepareResult = {
  finalQuestions: Question[];
  idIndices: number[];
  idCount: number;
  baseCount: number;
};

export function prepareUnlimitedQuestions(input: PrepareInput): PrepareResult {
  const { baseQuestions, eventName, idPercentage } = input;
  const pctRaw =
    typeof idPercentage === "string" ? Number.parseInt(idPercentage) : (idPercentage ?? 0);
  const pct = Math.max(
    0,
    Math.min(100, Number.isFinite(pctRaw as number) ? (pctRaw as number) : 0)
  );

  const totalQuestionsCount = pct === 100 ? 1000 : baseQuestions.length;
  const idCount = Math.round((pct / 100) * totalQuestionsCount);
  const baseCount = Math.max(0, totalQuestionsCount - idCount);

  let finalQuestions: Question[];
  if (pct === 100) {
    finalQuestions = Array.from(
      { length: idCount },
      (_, i) =>
        ({
          question: "[Loading ID Question...]",
          answers: [],
          difficulty: 0.5,
          event: eventName,
          _isIdPlaceholder: true,
          _placeholderId: i,
        } as Question & { _isIdPlaceholder?: boolean; _placeholderId?: number })
    );
  } else {
    const trimmedBase = baseQuestions.slice(0, baseCount);
    const idPlaceholders: Question[] = Array.from(
      { length: idCount },
      (_, i) =>
        ({
          question: "[Loading ID Question...]",
          answers: [],
          difficulty: 0.5,
          event: eventName,
          _isIdPlaceholder: true,
          _placeholderId: i,
        } as Question & { _isIdPlaceholder?: boolean; _placeholderId?: number })
    );
    finalQuestions = [...trimmedBase, ...idPlaceholders];
  }

  // Shuffle deterministically not required; caller can shuffle. Here preserve order
  const idIndices: number[] = [];
  finalQuestions.forEach((q, idx) => {
    if ("_isIdPlaceholder" in q && q._isIdPlaceholder) {
      idIndices.push(idx);
    }
  });

  return { finalQuestions, idIndices, idCount, baseCount };
}
