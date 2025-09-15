// Percentage to letter grade with plus/minus using traditional US high school scale
// Returns 'N/A' for invalid inputs

export function getLetterGradeFromPercentage(percentageInput: number | string): string {
  if (percentageInput === null || percentageInput === undefined) return 'N/A';
  const percentage = typeof percentageInput === 'string' ? Number(percentageInput) : percentageInput;
  if (!Number.isFinite(percentage)) return 'N/A';

  const p = Math.max(0, Math.min(100, Math.round(percentage)));

  if (p >= 97) return 'A+';
  if (p >= 93) return 'A';
  if (p >= 90) return 'A-';
  if (p >= 87) return 'B+';
  if (p >= 83) return 'B';
  if (p >= 80) return 'B-';
  if (p >= 77) return 'C+';
  if (p >= 73) return 'C';
  if (p >= 70) return 'C-';
  if (p >= 67) return 'D+';
  if (p >= 63) return 'D';
  if (p >= 60) return 'D-';
  return 'F';
}

export function percentageFromEarnedAndTotal(earned: number, total: number): number {
  if (!Number.isFinite(earned) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((earned / total) * 100);
}


