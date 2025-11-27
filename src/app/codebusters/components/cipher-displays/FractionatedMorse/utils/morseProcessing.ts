// Helper function to create morse map
export function createMorseMap(): { [key: string]: string } {
  return {
    A: ".-",
    B: "-...",
    C: "-.-.",
    D: "-..",
    E: ".",
    F: "..-.",
    G: "--.",
    H: "....",
    I: "..",
    J: ".---",
    K: "-.-",
    L: ".-..",
    M: "--",
    N: "-.",
    O: "---",
    P: ".--.",
    Q: "--.-",
    R: ".-.",
    S: "...",
    T: "-",
    U: "..-",
    V: "...-",
    W: ".--",
    X: "-..-",
    Y: "-.--",
    Z: "--..",
  };
}

// Helper function to create reverse morse map
export function createReverseMorseMap(morseMap: { [key: string]: string }): {
  [key: string]: string;
} {
  const reverseMap: { [key: string]: string } = {};
  for (const [letter, morse] of Object.entries(morseMap)) {
    reverseMap[morse] = letter;
  }
  return reverseMap;
}

// Helper function to add letter to plaintext
function addLetterToPlaintext(
  morse: string,
  morseStartIndex: number,
  plaintextLetters: string[],
  reverseMorseMap: { [key: string]: string }
): void {
  const letter = reverseMorseMap[morse];
  if (letter) {
    const inputIndex = Math.floor(morseStartIndex / 3);
    if (inputIndex < plaintextLetters.length) {
      plaintextLetters[inputIndex] += letter;
    }
  }
}

// Helper function to process morse character
function processMorseCharacter(
  char: string,
  currentMorse: string,
  morseStartIndex: number,
  currentIndex: number,
  plaintextLetters: string[],
  reverseMorseMap: { [key: string]: string }
): { currentMorse: string; morseStartIndex: number; currentIndex: number } {
  if (char === "x") {
    if (currentMorse.length > 0) {
      addLetterToPlaintext(currentMorse, morseStartIndex, plaintextLetters, reverseMorseMap);
    }
    return { currentMorse: "", morseStartIndex, currentIndex: currentIndex + 1 };
  }
  const newMorseStartIndex = currentMorse.length === 0 ? currentIndex : morseStartIndex;
  return {
    currentMorse: currentMorse + char,
    morseStartIndex: newMorseStartIndex,
    currentIndex: currentIndex + 1,
  };
}

// Helper function to handle double x separator
function handleDoubleXSeparator(
  i: number,
  morseString: string,
  currentIndex: number,
  plaintextLetters: string[]
): { shouldSkip: boolean; newIndex: number } {
  if (i + 1 < morseString.length && morseString[i + 1] === "x" && i + 2 < morseString.length) {
    const inputIndex = Math.floor(currentIndex / 3);
    if (inputIndex < plaintextLetters.length) {
      const letter = plaintextLetters[inputIndex];
      if (letter && !letter.includes("/")) {
        plaintextLetters[inputIndex] = `${letter}/`;
      }
    }
    return { shouldSkip: true, newIndex: currentIndex + 1 };
  }
  return { shouldSkip: false, newIndex: currentIndex };
}

// Helper function to finalize remaining morse
function finalizeRemainingMorse(
  currentMorse: string,
  morseStartIndex: number,
  plaintextLetters: string[],
  reverseMorseMap: { [key: string]: string }
): void {
  if (currentMorse.length > 0) {
    addLetterToPlaintext(currentMorse, morseStartIndex, plaintextLetters, reverseMorseMap);
  }
}

// Helper function to process x character
function processXCharacter(
  i: number,
  morseString: string,
  currentMorse: string,
  morseStartIndex: number,
  currentIndex: number,
  plaintextLetters: string[],
  reverseMorseMap: { [key: string]: string }
): { newMorse: string; newMorseStartIndex: number; newIndex: number; skipNext: boolean } {
  if (currentMorse.length > 0) {
    addLetterToPlaintext(currentMorse, morseStartIndex, plaintextLetters, reverseMorseMap);
  }
  const doubleXResult = handleDoubleXSeparator(i, morseString, currentIndex, plaintextLetters);
  if (doubleXResult.shouldSkip) {
    return {
      newMorse: "",
      newMorseStartIndex: morseStartIndex,
      newIndex: doubleXResult.newIndex,
      skipNext: true,
    };
  }
  return {
    newMorse: "",
    newMorseStartIndex: morseStartIndex,
    newIndex: currentIndex + 1,
    skipNext: false,
  };
}

const MORSE_PATTERN_REGEX = /[.-]/;

export function calculatePlaintextLetters(triplets: string[]): string[] {
  const morseMap = createMorseMap();
  const reverseMorseMap = createReverseMorseMap(morseMap);
  const plaintextLetters: string[] = Array.from({ length: triplets.length }, () => "");
  const morseString = triplets.join("");

  let currentIndex = 0;
  let currentMorse = "";
  let morseStartIndex = 0;

  for (let i = 0; i < morseString.length; i++) {
    const char = morseString[i];
    if (char === undefined) {
      continue;
    }

    if (char === "x") {
      const xResult = processXCharacter(
        i,
        morseString,
        currentMorse,
        morseStartIndex,
        currentIndex,
        plaintextLetters,
        reverseMorseMap
      );
      currentMorse = xResult.newMorse;
      morseStartIndex = xResult.newMorseStartIndex;
      currentIndex = xResult.newIndex;
      if (xResult.skipNext) {
        i++;
      }
    } else {
      const result = processMorseCharacter(
        char,
        currentMorse,
        morseStartIndex,
        currentIndex,
        plaintextLetters,
        reverseMorseMap
      );
      currentMorse = result.currentMorse;
      morseStartIndex = result.morseStartIndex;
      currentIndex = result.currentIndex;
    }
  }

  finalizeRemainingMorse(currentMorse, morseStartIndex, plaintextLetters, reverseMorseMap);

  const filteredPlaintextLetters = plaintextLetters.map((letters) =>
    letters === "xxx" || letters.includes("xxx") ? "" : letters
  );

  return filteredPlaintextLetters;
}

export function removeTrailingPartialTriplets(triplets: string[]): void {
  const morseJoined = triplets.join("");
  const lastSeparator = morseJoined.lastIndexOf("x");
  if (lastSeparator !== -1) {
    const trailing = morseJoined.slice(lastSeparator + 1);
    const isTrailingPartial = MORSE_PATTERN_REGEX.test(trailing);
    if (isTrailingPartial) {
      const dropFrom = Math.floor((lastSeparator + 1) / 3);
      triplets.splice(dropFrom);
    }
  }
}
