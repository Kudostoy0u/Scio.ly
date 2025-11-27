import { assignLetterDigits } from "./letterAssignment";
import { toUniqueLetters } from "./wordBank";
import { createLeadingLetters, generateSolutionWords, validateWords } from "./wordGeneration";

// Helper function to convert word to number using mapping
function wordToNumber(word: string, mapping: Record<string, number>): number {
  let num = 0;
  for (const ch of word) {
    const mapped = mapping[ch];
    if (mapped === undefined) {
      throw new Error(`No mapping found for character: ${ch}`);
    }
    num = num * 10 + mapped;
  }
  return num;
}

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

// Helper function to try generating an equation for given words
export function tryGenerateEquation(
  w1: string,
  w2: string,
  w3: string,
  operation: "+" | "-",
  uniqueWords: string[]
): {
  equation: string;
  numericExample: string;
  digitGroups: Array<{ digits: string; word: string }>;
  operation: "+" | "-";
} | null {
  if (!validateWords(w1, w2, w3)) {
    return null;
  }

  const allLetters = toUniqueLetters(w1 + w2 + w3);
  const leadingLetters = createLeadingLetters(w1, w2, w3);
  const mapping = assignLetterDigits(allLetters, leadingLetters);
  if (!mapping) {
    return null;
  }

  const toNumber = (word: string): number => wordToNumber(word, mapping);
  const n1 = toNumber(w1);
  const n2 = toNumber(w2);
  const n3 = toNumber(w3);

  let equation: string | null = null;
  let numericExample: string | null = null;
  let op: "+" | "-" = "+";

  if (operation === "-" && n1 > n2 && n1 - n2 === n3) {
    equation = `${w1} - ${w2} = ${w3}`;
    numericExample = `${n1} - ${n2} = ${n3}`;
    op = "-";
  } else if (operation === "+" && n1 + n2 === n3) {
    equation = `${w1} + ${w2} = ${w3}`;
    numericExample = `${n1} + ${n2} = ${n3}`;
    op = "+";
  }

  if (!(equation && numericExample)) {
    return null;
  }

  const numSolutionWords = Math.floor(Math.random() * 3) + 3;
  const solutionWords = generateSolutionWords(allLetters, mapping, numSolutionWords, uniqueWords);
  if (solutionWords.length < 3) {
    return null;
  }

  const digitGroups = createDigitGroups(solutionWords, toNumber);
  return { equation, numericExample, digitGroups, operation: op };
}

// Helper function to attempt generating cryptarithm with multiple tries
export function attemptGenerateCryptarithm(
  operation: "+" | "-",
  maxAttempts: number,
  uniqueWords: string[],
  pickWord: (exclude?: Set<string>) => string
): {
  equation: string;
  numericExample: string;
  digitGroups: Array<{ digits: string; word: string }>;
  operation: "+" | "-";
} | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const w1 = pickWord();
    const w2 = pickWord(new Set([w1]));
    const w3 = pickWord(new Set([w1, w2]));

    const result = tryGenerateEquation(w1, w2, w3, operation, uniqueWords);
    if (result) {
      return result;
    }
  }
  return null;
}
