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

  // 2) Replace ^∆ with ^- in all scenarios
  text = text.replace(/\^∆/g, '^-');

  // 3) Remove point annotations like [2 pt], [3 pts], [1 point], [5 points]
  // and their parenthesized forms (2 pt), etc., anywhere in the string (case-insensitive)
  // Allow optional spaces inside the brackets/parentheses and after the number
  const pointPattern = /\s*[\(\[]\s*\d+(?:\.\d+)?\s*(?:pt|pts|point|points)\s*[\)\]]\s*/gi;
  if (pointPattern.test(text)) {
    text = text.replace(pointPattern, ' ');
  }
  // Collapse multiple spaces created by removals
  text = text.replace(/\s{2,}/g, ' ').trim();

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


// Detect and strip sequential leading labels like "A.", "B.", ... or "A)", "B)", ...
// across an options list. Only strips when ALL options follow the sequential pattern
// starting from A/a and there is non-empty text after the label.
function parseLeadingLetterLabel(text: string): { letter: string; rest: string } | null {
  if (typeof text !== 'string') return null;
  const match = text.match(/^\s*([A-Za-z])[\.)]\s*(.+)$/);
  if (!match) return null;
  const letter = match[1];
  const rest = match[2]?.trim() || '';
  if (!rest) return null;
  return { letter, rest };
}

function isSequentialFromA(labels: string[]): boolean {
  if (labels.length === 0) return false;
  // Accept either uppercase or lowercase, but must start from A/a and be consecutive
  const first = labels[0];
  const firstCode = first.toUpperCase().charCodeAt(0);
  if (firstCode !== 'A'.charCodeAt(0)) return false;
  for (let i = 0; i < labels.length; i++) {
    const code = labels[i].toUpperCase().charCodeAt(0);
    if (code !== 'A'.charCodeAt(0) + i) return false;
  }
  return true;
}

export function normalizeOptionAnswerLabels(
  options: string[],
  answers: (string | number)[]
): { options: string[]; answers: (string | number)[] } {
  try {
    if (!Array.isArray(options) || options.length === 0) {
      return { options: options || [], answers };
    }
    const parsed = options.map(parseLeadingLetterLabel);
    if (parsed.every(p => p !== null)) {
      const letters = parsed.map(p => (p as { letter: string }).letter);
      if (isSequentialFromA(letters)) {
        const strippedOptions = parsed.map(p => (p as { rest: string }).rest);
        const strippedAnswers = Array.isArray(answers)
          ? answers.map(a => {
              if (typeof a !== 'string') return a;
              const pa = parseLeadingLetterLabel(a);
              return pa ? pa.rest : a;
            })
          : answers;
        return { options: strippedOptions, answers: strippedAnswers };
      }
    }
    return { options, answers };
  } catch {
    return { options, answers };
  }
}


