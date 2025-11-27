import { toast } from "react-toastify";

// Handle solution change with duplicate letter validation
export function handleSolutionChangeWithValidation(
  solution: { [key: string]: string } | undefined,
  isTestSubmitted: boolean,
  cipherLetter: string,
  newPlainLetter: string,
  onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void,
  quoteIndex: number
): void {
  if (isTestSubmitted) {
    return;
  }

  // Check for duplicate letters in the current solution
  const existingPlainLetters = Object.values(solution || {}).filter((letter) => letter !== "");

  // If the new letter already exists and it's not the same as the current value for this cipher letter
  if (
    existingPlainLetters.includes(newPlainLetter) &&
    newPlainLetter !== solution?.[cipherLetter]
  ) {
    toast.warning(
      `Letter "${newPlainLetter}" is already used in the replacement table. Each letter can only be used once.`
    );
    return;
  }

  // Proceed with the solution change
  onSolutionChange(quoteIndex, cipherLetter, newPlainLetter);
}
