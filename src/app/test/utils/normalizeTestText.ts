export function normalizeTestText(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return input;

  let text = input;

  // 1) Replace private-use glyphs from the problematic font with intended symbols
  // U+F0AE -> →
  text = text.replace(/\uF0AE/g, '→');

  // U+F0D7 followed by U+F020 (space) -> ×
  text = text.replace(/\uF0D7\uF020/g, '×');

  // U+F088 -> ⇌
  text = text.replace(/\uF088/g, '⇌');

  // 2) Smart delta to en dash replacement
  // Convert "…<alnum><spaces>∆<spaces>[s|h]…" into en dash between the alnum group and trailing S/H
  // Only replace when there's an alphanumeric immediately before ∆ (ignoring spaces)
  // and after optional spaces there is S or H (case-insensitive)
  text = text.replace(/([A-Za-z0-9])\s*∆\s*([sShH])/g, '$1–$2');

  return text;
}

export function normalizeQuestionText(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return input;

  // First run the generic normalizations
  let text = normalizeTestText(input);

  // If both A) and B) (case-insensitive) exist, truncate at last A)
  const upper = text.toUpperCase();
  if (upper.includes('A)') && upper.includes('B)')) {
    const lastAIndex = upper.lastIndexOf('A)');
    if (lastAIndex !== -1) {
      text = text.slice(0, lastAIndex).trimEnd();
    }
  } else if (upper.includes('A. ') && upper.includes('B. ')) {
    // If both A. and B. (case-insensitive, dot-space) exist, truncate at last 'A. '
    const lastAIndex = upper.lastIndexOf('A. ');
    if (lastAIndex !== -1) {
      text = text.slice(0, lastAIndex).trimEnd();
    }
  }

  return text;
}


