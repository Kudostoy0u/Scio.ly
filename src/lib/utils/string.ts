export function stripTrailingParenthetical(input: string): string {
  if (typeof input !== 'string') return input as unknown as string;
  return input.replace(/\s*\([^)]*\)\s*$/, '').trimEnd();
}


