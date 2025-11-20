/**
 * Transposition cipher encryption functions
 */

import { FALLBACK_WORDS, getCustomWordBank } from "@/app/codebusters/utils/common";
import type { ColumnarTranspositionResult, CryptarithmResult } from "@/app/codebusters/ciphers/types/cipherTypes";

/**
 * Encrypts text using Columnar Transposition cipher
 * @param {string} text - Text to encrypt
 * @returns {ColumnarTranspositionResult} Encrypted text and key
 */
export const encryptColumnarTransposition = (text: string): ColumnarTranspositionResult => {
  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");
  const keyLength = Math.floor(Math.random() * 5) + 3; // 3-7 characters

  const key = Array.from({ length: keyLength }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");

  const matrix: string[][] = [];
  for (let i = 0; i < Math.ceil(cleanText.length / keyLength); i++) {
    matrix[i] = [];
    for (let j = 0; j < keyLength; j++) {
      const index = i * keyLength + j;
      const char = index < cleanText.length ? cleanText[index] : undefined;
      matrix[i]![j] = char !== undefined ? char : "X";
    }
  }

  const keyArray = key.split("");
  const keyOrder = keyArray
    .map((char, index) => ({ char, index }))
    .sort((a, b) => a.char.localeCompare(b.char))
    .map((item) => item.index);

  let encrypted = "";
  for (const colIndex of keyOrder) {
    if (colIndex === undefined) continue;
    for (let i = 0; i < matrix.length; i++) {
      const row = matrix[i];
      const char = row?.[colIndex];
      if (char !== undefined) {
        encrypted += char;
      }
    }
  }

  return { encrypted, key };
};

/**
 * Encrypts text using Cryptarithm cipher
 * @param {string} text - Text to encrypt
 * @returns {CryptarithmResult} Encrypted text and cryptarithm data
 */
export const encryptCryptarithm = (_text: string): CryptarithmResult => {
  const custom = getCustomWordBank();
  const wordBank = (custom && custom.length > 0 ? custom : FALLBACK_WORDS).map((w) =>
    w.toUpperCase()
  );

  // Expanded word bank for better variety
  const expandedWords = [
    "SEND", "MORE", "MONEY", "EAT", "THAT", "APPLE", "HEAT", "PLATE", "THE",
    "WORD", "CODE", "CIPHER", "SECRET", "PUZZLE", "SOLVE", "BRAIN", "LOGIC",
    "MATH", "NUMBER", "DIGIT", "LETTER", "ALPHA", "BETA", "GAMMA", "DELTA",
    "ALPHA", "OMEGA", "PI", "SIGMA", "THETA", "LAMBDA", "PHI", "PSI", "RHO",
    "STAR", "MOON", "SUN", "EARTH", "MARS", "VENUS", "JUPITER", "SATURN",
    "BOOK", "PAGE", "STORY", "TALE", "NOVEL", "POEM", "VERSE", "SONG",
    "MUSIC", "SOUND", "VOICE", "TONE", "NOTE", "CHORD", "SCALE", "MELODY",
    "DANCE", "MOVE", "STEP", "JUMP", "RUN", "WALK", "RACE", "SPEED",
    "FAST", "SLOW", "QUICK", "RAPID", "SWIFT", "FLEET", "AGILE", "NIMBLE",
    "STRONG", "POWER", "FORCE", "MIGHT", "ENERGY", "VIGOR", "STRENGTH", "MUSCLE",
    "WATER", "OCEAN", "RIVER", "LAKE", "STREAM", "WAVE", "TIDE", "CURRENT",
    "FIRE", "FLAME", "HEAT", "BURN", "SPARK", "GLOW", "LIGHT", "BRIGHT",
    "DARK", "NIGHT", "SHADE", "SHADOW", "BLACK", "DEEP", "DUSK", "DAWN",
    "TIME", "HOUR", "MINUTE", "SECOND", "CLOCK", "WATCH", "TIMER", "ALARM",
    "SPACE", "STAR", "PLANET", "GALAXY", "UNIVERSE", "COSMOS", "VOID", "EMPTY",
    "SOLID", "LIQUID", "GAS", "MATTER", "ATOM", "PARTICLE", "MOLECULE", "ELEMENT",
  ];

  // Combine word banks and filter to valid words (2-6 letters, all uppercase)
  const allWords = [...wordBank, ...expandedWords]
    .map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((w) => w.length >= 2 && w.length <= 6);

  // Remove duplicates
  const uniqueWords = Array.from(new Set(allWords));

  const pickWord = (exclude: Set<string> = new Set()): string => {
    const available = uniqueWords.filter((w) => !exclude.has(w));
    if (available.length === 0) {
      return uniqueWords[Math.floor(Math.random() * uniqueWords.length)] || "WORD";
    }
    const index = Math.floor(Math.random() * available.length);
    return available[index] || "WORD";
  };

  const toUniqueLetters = (w: string): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ch of w) {
      if (/^[A-Z]$/.test(ch) && !seen.has(ch)) {
        seen.add(ch);
        out.push(ch);
      }
    }
    return out;
  };

  const assignLetterDigits = (
    letters: string[],
    leadingLetters: Set<string>
  ): Record<string, number> | null => {
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffled = [...digits].sort(() => Math.random() - 0.5);
    const mapping: Record<string, number> = {};
    let usedIndex = 0;

    // Assign non-zero digits to leading letters
    for (const lead of Array.from(leadingLetters)) {
      let idx = usedIndex;
      while (idx < shuffled.length && shuffled[idx] === 0) {
        idx++;
      }
      if (idx >= shuffled.length) {
        return null;
      }
      const shuffledIdx = shuffled[idx];
      const shuffledUsed = shuffled[usedIndex];
      if (shuffledIdx === undefined || shuffledUsed === undefined) {
        return null;
      }
      mapping[lead] = shuffledIdx;
      shuffled[usedIndex] = shuffledIdx;
      shuffled[idx] = shuffledUsed;
      usedIndex++;
    }

    // Assign remaining digits to other letters
    for (const letter of letters) {
      if (mapping[letter] !== undefined) {
        continue;
      }
      if (usedIndex >= shuffled.length) {
        return null;
      }
      const shuffledVal = shuffled[usedIndex];
      if (shuffledVal === undefined) {
        return null;
      }
      mapping[letter] = shuffledVal;
      usedIndex++;
    }

    return mapping;
  };

  const generateCryptarithm = (): {
    equation: string;
    numericExample: string | null;
    digitGroups: Array<{ digits: string; word: string }>;
    operation: "+" | "-";
  } => {
    const isSubtraction = Math.random() < 0.5;
    const attempts = 200; // Increased attempts for better success rate

    for (let attempt = 0; attempt < attempts; attempt++) {
      // Pick three unique words
      const w1 = pickWord();
      const w2 = pickWord(new Set([w1]));
      const w3 = pickWord(new Set([w1, w2]));

      // Ensure words are different
      if (w1 === w2 || w1 === w3 || w2 === w3) {
        continue;
      }

      if (w1.length < 2 || w2.length < 2 || w3.length < 2) {
        continue;
      }
      if (w1.length > 6 || w2.length > 6 || w3.length > 6) {
        continue;
      }

      const allLetters = toUniqueLetters(w1 + w2 + w3);
      if (allLetters.length > 10) {
        continue;
      }

      const w1First = w1[0];
      const w2First = w2[0];
      const w3First = w3[0];
      const leadingLetters = new Set<string>();
      if (w1First !== undefined) leadingLetters.add(w1First);
      if (w2First !== undefined) leadingLetters.add(w2First);
      if (w3First !== undefined) leadingLetters.add(w3First);

      const mapping = assignLetterDigits(allLetters, leadingLetters);
      if (!mapping) {
        continue;
      }

      const toNumber = (word: string): number => {
        let num = 0;
        for (const ch of word) {
          const mapped = mapping[ch];
          if (mapped === undefined) {
            throw new Error(`No mapping found for character: ${ch}`);
          }
          num = num * 10 + mapped;
        }
        return num;
      };

      const n1 = toNumber(w1);
      const n2 = toNumber(w2);
      const n3 = toNumber(w3);

      // Try addition or subtraction
      if (isSubtraction) {
        if (n1 > n2 && n1 - n2 === n3) {
          const equation = `${w1} - ${w2} = ${w3}`;
          const numericExample = `${n1} - ${n2} = ${n3}`;
          const digitGroups = [
            { digits: n1.toString().split("").join(" "), word: w1 },
            { digits: n2.toString().split("").join(" "), word: w2 },
            { digits: n3.toString().split("").join(" "), word: w3 },
          ];
          return { equation, numericExample, digitGroups, operation: "-" };
        }
      } else {
        if (n1 + n2 === n3) {
          const equation = `${w1} + ${w2} = ${w3}`;
          const numericExample = `${n1} + ${n2} = ${n3}`;
          const digitGroups = [
            { digits: n1.toString().split("").join(" "), word: w1 },
            { digits: n2.toString().split("").join(" "), word: w2 },
            { digits: n3.toString().split("").join(" "), word: w3 },
          ];
          return { equation, numericExample, digitGroups, operation: "+" };
        }
      }
    }

    // If subtraction failed, try addition
    if (isSubtraction) {
      for (let attempt = 0; attempt < 200; attempt++) {
        const w1 = pickWord();
        const w2 = pickWord(new Set([w1]));
        const w3 = pickWord(new Set([w1, w2]));

        if (w1 === w2 || w1 === w3 || w2 === w3) {
          continue;
        }

        if (w1.length < 2 || w2.length < 2 || w3.length < 2) {
          continue;
        }
        if (w1.length > 6 || w2.length > 6 || w3.length > 6) {
          continue;
        }

        const allLetters = toUniqueLetters(w1 + w2 + w3);
        if (allLetters.length > 10) {
          continue;
        }

        const w1First = w1[0];
        const w2First = w2[0];
        const w3First = w3[0];
        const leadingLetters = new Set<string>();
        if (w1First !== undefined) leadingLetters.add(w1First);
        if (w2First !== undefined) leadingLetters.add(w2First);
        if (w3First !== undefined) leadingLetters.add(w3First);

        const mapping = assignLetterDigits(allLetters, leadingLetters);
        if (!mapping) {
          continue;
        }

        const toNumber = (word: string): number => {
          let num = 0;
          for (const ch of word) {
            const mapped = mapping[ch];
            if (mapped === undefined) {
              throw new Error(`No mapping found for character: ${ch}`);
            }
            num = num * 10 + mapped;
          }
          return num;
        };

        const n1 = toNumber(w1);
        const n2 = toNumber(w2);
        const n3 = toNumber(w3);

        if (n1 + n2 === n3) {
          const equation = `${w1} + ${w2} = ${w3}`;
          const numericExample = `${n1} + ${n2} = ${n3}`;
          const digitGroups = [
            { digits: n1.toString().split("").join(" "), word: w1 },
            { digits: n2.toString().split("").join(" "), word: w2 },
            { digits: n3.toString().split("").join(" "), word: w3 },
          ];
          return { equation, numericExample, digitGroups, operation: "+" };
        }
      }
    }

    // Final fallback with unique words
    const fallbackWords = [
      { w1: "SEND", w2: "MORE", w3: "MONEY", n1: 9567, n2: 1085, n3: 10652 },
      { w1: "EAT", w2: "THAT", w3: "APPLE", n1: 819, n2: 9219, n3: 10038 },
      { w1: "HEAT", w2: "THE", w3: "PLATE", n1: 2819, n2: 928, n3: 3747 },
      { w1: "WORD", w2: "CODE", w3: "CIPHER", n1: 7423, n2: 4631, n3: 12054 },
      { w1: "SOLVE", w2: "PUZZLE", w3: "BRAIN", n1: 58421, n2: 799421, n3: 857842 },
    ];

    const fallback = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
    if (!fallback) {
      throw new Error("Failed to generate cryptarithm");
    }

    return {
      equation: `${fallback.w1} + ${fallback.w2} = ${fallback.w3}`,
      numericExample: `${fallback.n1} + ${fallback.n2} = ${fallback.n3}`,
      digitGroups: [
        { digits: fallback.n1.toString().split("").join(" "), word: fallback.w1 },
        { digits: fallback.n2.toString().split("").join(" "), word: fallback.w2 },
        { digits: fallback.n3.toString().split("").join(" "), word: fallback.w3 },
      ],
      operation: "+",
    };
  };

  const cryptarithmData = generateCryptarithm();
  const encrypted = cryptarithmData.equation;

  return { encrypted, cryptarithmData };
};
