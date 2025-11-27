const UPPERCASE_LETTER_TEST_REGEX = /[A-Z]/;

// Helper function to get triplet for character
export function getTripletForChar(
  char: string,
  isTestSubmitted: boolean,
  correctMapping: Record<string, string>,
  solution: Record<string, string> | undefined
): string {
  if (isTestSubmitted && correctMapping[char]) {
    return correctMapping[char];
  }
  return solution?.[char] || "";
}

// Helper function to create placeholder triplet
export function createPlaceholderTriplet(triplet: string): string {
  if (triplet.length === 0) {
    return "xxx";
  }
  return triplet + "x".repeat(3 - triplet.length);
}

// Helper function to process character for triplets
function processCharForTriplets(
  char: string,
  index: number,
  isTestSubmitted: boolean,
  correctMapping: Record<string, string>,
  solution: Record<string, string> | undefined,
  triplets: string[],
  incompleteTriplets: Set<number>
): void {
  if (!UPPERCASE_LETTER_TEST_REGEX.test(char)) {
    return;
  }
  const triplet = getTripletForChar(char, isTestSubmitted, correctMapping, solution);
  if (triplet.length === 3) {
    triplets.push(triplet);
  } else {
    const placeholder = createPlaceholderTriplet(triplet);
    triplets.push(placeholder);
    incompleteTriplets.add(index);
  }
}

// Helper function to build triplets from text
export function buildTripletsFromText(
  text: string,
  isTestSubmitted: boolean,
  correctMapping: Record<string, string>,
  solution: Record<string, string> | undefined
): { triplets: string[]; incompleteTriplets: Set<number> } {
  const triplets: string[] = [];
  const incompleteTriplets: Set<number> = new Set();
  for (const [index, char] of text.split("").entries()) {
    processCharForTriplets(
      char,
      index,
      isTestSubmitted,
      correctMapping,
      solution,
      triplets,
      incompleteTriplets
    );
  }
  return { triplets, incompleteTriplets };
}
