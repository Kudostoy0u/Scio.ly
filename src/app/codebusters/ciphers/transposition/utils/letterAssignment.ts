// Helper function to assign non-zero digits to leading letters
export function assignLeadingLetters(
  leadingLetters: Set<string>,
  shuffled: number[],
  mapping: Record<string, number>
): { usedIndex: number; success: boolean } {
  let usedIndex = 0;
  for (const lead of Array.from(leadingLetters)) {
    let idx = usedIndex;
    while (idx < shuffled.length && shuffled[idx] === 0) {
      idx++;
    }
    if (idx >= shuffled.length) {
      return { usedIndex, success: false };
    }
    const shuffledIdx = shuffled[idx];
    const shuffledUsed = shuffled[usedIndex];
    if (shuffledIdx === undefined || shuffledUsed === undefined) {
      return { usedIndex, success: false };
    }
    mapping[lead] = shuffledIdx;
    shuffled[usedIndex] = shuffledIdx;
    shuffled[idx] = shuffledUsed;
    usedIndex++;
  }
  return { usedIndex, success: true };
}

// Helper function to assign remaining digits to other letters
export function assignRemainingLetters(
  letters: string[],
  shuffled: number[],
  mapping: Record<string, number>,
  startIndex: number
): boolean {
  let usedIndex = startIndex;
  for (const letter of letters) {
    if (mapping[letter] !== undefined) {
      continue;
    }
    if (usedIndex >= shuffled.length) {
      return false;
    }
    const shuffledVal = shuffled[usedIndex];
    if (shuffledVal === undefined) {
      return false;
    }
    mapping[letter] = shuffledVal;
    usedIndex++;
  }
  return true;
}

export function assignLetterDigits(
  letters: string[],
  leadingLetters: Set<string>
): Record<string, number> | null {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const shuffled = [...digits].sort(() => Math.random() - 0.5);
  const mapping: Record<string, number> = {};

  const leadingResult = assignLeadingLetters(leadingLetters, shuffled, mapping);
  if (!leadingResult.success) {
    return null;
  }

  const remainingSuccess = assignRemainingLetters(
    letters,
    shuffled,
    mapping,
    leadingResult.usedIndex
  );
  if (!remainingSuccess) {
    return null;
  }

  return mapping;
}
