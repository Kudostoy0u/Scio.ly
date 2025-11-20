// Shared utilities for substitution-based ciphers

export const ALPHABET_26 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const ALPHABET_27_SPANISH = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
export const ALPHABET_27_INDEX_ORDER = "ABCDEFGHIJKLMNOPQRSTUVWXYZÑ";

export const generateKeywordAlphabet = (keyword: string): string => {
  const cleanKeyword = (keyword || "").toUpperCase().replace(/[^A-Z]/g, "");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ch of cleanKeyword) {
    if (!seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  for (const ch of ALPHABET_26) {
    if (!seen.has(ch)) {
      out.push(ch);
    }
  }
  return out.join("");
};

export const rotateAlphabet = (alphabet: string, shift: number): string => {
  if (alphabet.length === 0) {
    return alphabet;
  }
  const s = ((shift % alphabet.length) + alphabet.length) % alphabet.length;
  return alphabet.slice(s) + alphabet.slice(0, s);
};

export const findDerangementShift = (plainAlphabet: string, cipherAlphabet: string): number => {
  const len = Math.min(plainAlphabet.length, cipherAlphabet.length);
  for (let s = 1; s < len; s++) {
    let ok = true;
    for (let i = 0; i < len; i++) {
      if (plainAlphabet[i] === cipherAlphabet[(i + s) % len]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return s;
    }
  }
  return 1;
};

export const getRandomDerangementShift = (
  plainAlphabet: string,
  cipherAlphabet: string
): number => {
  const len = Math.min(plainAlphabet.length, cipherAlphabet.length);
  // try randomized shifts first
  const candidates = Array.from({ length: len - 1 }, (_, i) => i + 1);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = candidates[i];
    const temp2 = candidates[j];
    if (temp !== undefined && temp2 !== undefined) {
      candidates[i] = temp2;
      candidates[j] = temp;
    }
  }
  for (const s of candidates) {
    let ok = true;
    for (let i = 0; i < len; i++) {
      if (plainAlphabet[i] === cipherAlphabet[(i + s) % len]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return s;
    }
  }
  // fallback to deterministic minimal
  return findDerangementShift(plainAlphabet, cipherAlphabet);
};

export const generateDerangementFromAlphabet = (alphabet: string): string => {
  const arr = alphabet.split("");
  for (let i = arr.length; i > 1; i--) {
    const j = Math.floor(Math.random() * (i - 1));
    const temp = arr[i - 1];
    const temp2 = arr[j];
    if (temp !== undefined && temp2 !== undefined) {
      arr[i - 1] = temp2;
      arr[j] = temp;
    }
  }
  for (let i = 0; i < alphabet.length; i++) {
    if (arr[i] === alphabet[i]) {
      const k = (i + 1) % arr.length;
      const temp = arr[i];
      const temp2 = arr[k];
      if (temp !== undefined && temp2 !== undefined) {
        arr[i] = temp2;
        arr[k] = temp;
      }
    }
  }
  return arr.join("");
};

export const buildSubstitutionMap = (
  plainAlphabet: string,
  cipherAlphabet: string
): Record<string, string> => {
  const len = Math.min(plainAlphabet.length, cipherAlphabet.length);
  const map: Record<string, string> = {};
  for (let i = 0; i < len; i++) {
    const plainChar = plainAlphabet[i];
    const cipherChar = cipherAlphabet[i];
    if (plainChar !== undefined && cipherChar !== undefined) {
      map[plainChar] = cipherChar;
    }
  }
  return map;
};

export const applySubstitutionAristocrat = (
  text: string,
  map: Record<string, string>,
  lettersRegex: RegExp = /[A-Z]/g
): string => {
  return text.toUpperCase().replace(lettersRegex, (ch) => map[ch] || ch);
};

export const applySubstitutionPatristocrat = (
  text: string,
  map: Record<string, string>,
  lettersRegex: RegExp = /[A-Z]/g
): string => {
  const cleaned = text
    .toUpperCase()
    .replace(new RegExp(`[^${lettersRegex.source.replace(/[\\/]/g, "")}]`, "g"), "");
  const letters = cleaned
    .replace(/[^A-ZÑ]/g, "")
    .split("")
    .map((ch) => map[ch] || ch);
  const grouped: string[] = [];
  for (let i = 0; i < letters.length; i += 5) {
    grouped.push(letters.slice(i, i + 5).join(""));
  }
  return grouped.join(" ");
};

export const normalizeSpanishText = (text: string): string => {
  return text
    .toUpperCase()
    .replace(/Á/g, "A")
    .replace(/É/g, "E")
    .replace(/Í/g, "I")
    .replace(/Ó/g, "O")
    .replace(/Ú/g, "U")
    .replace(/Ü/g, "U");
};

export const getLetterFrequencies = (text: string): { [key: string]: number } => {
  const frequencies: { [key: string]: number } = {};
  const upper = text.toUpperCase();
  const isXeno = upper.includes("Ñ");
  const alphabet = isXeno ? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const l of alphabet) {
    frequencies[l] = 0;
  }
  for (const ch of upper) {
    if (isXeno ? /[A-ZÑ]/.test(ch) : /[A-Z]/.test(ch)) {
      const currentFreq = frequencies[ch];
      if (currentFreq !== undefined) {
        frequencies[ch] = currentFreq + 1;
      }
    }
  }
  if (isXeno && frequencies.Ñ === undefined) {
    frequencies.Ñ = 0;
  }
  return frequencies;
};
