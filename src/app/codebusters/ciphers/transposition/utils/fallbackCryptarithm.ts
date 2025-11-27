import { toUniqueLetters } from "./wordBank";
import { generateSolutionWords } from "./wordGeneration";

const FALLBACK_WORDS = [
  { w1: "SEND", w2: "MORE", w3: "MONEY", n1: 9567, n2: 1085, n3: 10652 },
  { w1: "EAT", w2: "THAT", w3: "APPLE", n1: 819, n2: 9219, n3: 10038 },
  { w1: "HEAT", w2: "THE", w3: "PLATE", n1: 2819, n2: 928, n3: 3747 },
  { w1: "WORD", w2: "CODE", w3: "CIPHER", n1: 7423, n2: 4631, n3: 12054 },
  { w1: "SOLVE", w2: "PUZZLE", w3: "BRAIN", n1: 58421, n2: 799421, n3: 857842 },
];

// Helper function to create digit groups from solution words
function createDigitGroups(
  solutionWords: string[],
  toNumber: (word: string) => number
): Array<{ digits: string; word: string }> {
  return solutionWords.map((word) => {
    const num = toNumber(word);
    return {
      digits: num.toString().split("").join(" "),
      word: word,
    };
  });
}

export function generateFallbackCryptarithm(uniqueWords: string[]): {
  equation: string;
  numericExample: string;
  digitGroups: Array<{ digits: string; word: string }>;
  operation: "+";
} {
  const fallback = FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
  if (!fallback) {
    throw new Error("Failed to generate cryptarithm");
  }

  const fallbackLetters = toUniqueLetters(fallback.w1 + fallback.w2 + fallback.w3);
  const fallbackMapping: Record<string, number> = {};

  const extractMapping = (word: string, num: number): void => {
    const numStr = num.toString();
    for (let i = 0; i < word.length && i < numStr.length; i++) {
      const letter = word[i];
      const digit = Number.parseInt(numStr[i] || "0", 10);
      if (letter !== undefined) {
        fallbackMapping[letter] = digit;
      }
    }
  };

  extractMapping(fallback.w1, fallback.n1);
  extractMapping(fallback.w2, fallback.n2);
  extractMapping(fallback.w3, fallback.n3);

  const fallbackToNumber = (word: string): number => {
    let num = 0;
    for (const ch of word) {
      const mapped = fallbackMapping[ch];
      if (mapped !== undefined) {
        num = num * 10 + mapped;
      } else {
        num = num * 10 + (ch.charCodeAt(0) % 10);
      }
    }
    return num;
  };

  const numSolutionWords = Math.floor(Math.random() * 3) + 3;
  const fallbackSolutionWords = generateSolutionWords(
    fallbackLetters,
    fallbackMapping,
    numSolutionWords,
    uniqueWords
  );

  const solutionWords =
    fallbackSolutionWords.length >= 3
      ? fallbackSolutionWords
      : [fallback.w1, fallback.w2, fallback.w3];

  const digitGroups = createDigitGroups(solutionWords, fallbackToNumber);

  return {
    equation: `${fallback.w1} + ${fallback.w2} = ${fallback.w3}`,
    numericExample: `${fallback.n1} + ${fallback.n2} = ${fallback.n3}`,
    digitGroups,
    operation: "+",
  };
}
