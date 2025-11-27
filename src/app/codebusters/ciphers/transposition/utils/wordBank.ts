import { FALLBACK_WORDS, getCustomWordBank } from "@/app/codebusters/utils/common";

// Expanded word bank for better variety
const EXPANDED_WORDS = [
  "SEND",
  "MORE",
  "MONEY",
  "EAT",
  "THAT",
  "APPLE",
  "HEAT",
  "PLATE",
  "THE",
  "WORD",
  "CODE",
  "CIPHER",
  "SECRET",
  "PUZZLE",
  "SOLVE",
  "BRAIN",
  "LOGIC",
  "MATH",
  "NUMBER",
  "DIGIT",
  "LETTER",
  "ALPHA",
  "BETA",
  "GAMMA",
  "DELTA",
  "ALPHA",
  "OMEGA",
  "PI",
  "SIGMA",
  "THETA",
  "LAMBDA",
  "PHI",
  "PSI",
  "RHO",
  "STAR",
  "MOON",
  "SUN",
  "EARTH",
  "MARS",
  "VENUS",
  "JUPITER",
  "SATURN",
  "BOOK",
  "PAGE",
  "STORY",
  "TALE",
  "NOVEL",
  "POEM",
  "VERSE",
  "SONG",
  "MUSIC",
  "SOUND",
  "VOICE",
  "TONE",
  "NOTE",
  "CHORD",
  "SCALE",
  "MELODY",
  "DANCE",
  "MOVE",
  "STEP",
  "JUMP",
  "RUN",
  "WALK",
  "RACE",
  "SPEED",
  "FAST",
  "SLOW",
  "QUICK",
  "RAPID",
  "SWIFT",
  "FLEET",
  "AGILE",
  "NIMBLE",
  "STRONG",
  "POWER",
  "FORCE",
  "MIGHT",
  "ENERGY",
  "VIGOR",
  "STRENGTH",
  "MUSCLE",
  "WATER",
  "OCEAN",
  "RIVER",
  "LAKE",
  "STREAM",
  "WAVE",
  "TIDE",
  "CURRENT",
  "FIRE",
  "FLAME",
  "HEAT",
  "BURN",
  "SPARK",
  "GLOW",
  "LIGHT",
  "BRIGHT",
  "DARK",
  "NIGHT",
  "SHADE",
  "SHADOW",
  "BLACK",
  "DEEP",
  "DUSK",
  "DAWN",
  "TIME",
  "HOUR",
  "MINUTE",
  "SECOND",
  "CLOCK",
  "WATCH",
  "TIMER",
  "ALARM",
  "SPACE",
  "STAR",
  "PLANET",
  "GALAXY",
  "UNIVERSE",
  "COSMOS",
  "VOID",
  "EMPTY",
  "SOLID",
  "LIQUID",
  "GAS",
  "MATTER",
  "ATOM",
  "PARTICLE",
  "MOLECULE",
  "ELEMENT",
];

const UPPERCASE_LETTER_REGEX = /^[A-Z]$/;

export function getUniqueWords(): string[] {
  const custom = getCustomWordBank();
  const wordBank = (custom && custom.length > 0 ? custom : FALLBACK_WORDS).map((w) =>
    w.toUpperCase()
  );

  // Combine word banks and filter to valid words (2-6 letters, all uppercase)
  const allWords = [...wordBank, ...EXPANDED_WORDS]
    .map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((w) => w.length >= 2 && w.length <= 6);

  // Remove duplicates
  return Array.from(new Set(allWords));
}

export function pickWord(uniqueWords: string[], exclude: Set<string> = new Set()): string {
  const available = uniqueWords.filter((w) => !exclude.has(w));
  if (available.length === 0) {
    return uniqueWords[Math.floor(Math.random() * uniqueWords.length)] || "WORD";
  }
  const index = Math.floor(Math.random() * available.length);
  return available[index] || "WORD";
}

export function toUniqueLetters(w: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ch of w) {
    if (UPPERCASE_LETTER_REGEX.test(ch) && !seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  return out;
}
