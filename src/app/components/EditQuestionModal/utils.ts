import logger from "@/lib/utils/logger";

const DIGIT_REGEX = /^\d+$/;

export function computeCorrectAnswerIndices(options: string[], answers: unknown[]): number[] {
  if (!Array.isArray(options) || options.length === 0 || !Array.isArray(answers)) {
    return [];
  }

  logger.log("🔍 [COMPUTE-INDICES] Input:", { options, answers });

  const zeroBasedNums = answers
    .map((a) =>
      typeof a === "number"
        ? a
        : typeof a === "string" && DIGIT_REGEX.test(a)
          ? Number.parseInt(a, 10)
          : null
    )
    .filter((n): n is number => n !== null && n >= 0 && n < options.length);

  logger.log("🔍 [COMPUTE-INDICES] Output:", zeroBasedNums);
  return zeroBasedNums;
}
