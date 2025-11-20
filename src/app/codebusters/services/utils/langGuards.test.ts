import { describe, expect, it } from "vitest";
import { isLangObject } from "./langGuards";

describe("isLangObject", () => {
  it("returns true for object with en and es arrays", () => {
    expect(isLangObject({ en: [], es: [] })).toBe(true);
  });

  it("returns false for missing properties", () => {
    expect(isLangObject({ en: [] } as any)).toBe(false);
    expect(isLangObject({ es: [] } as any)).toBe(false);
    expect(isLangObject([])).toBe(false);
    expect(isLangObject(null)).toBe(false);
  });
});
