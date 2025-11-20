import { describe, expect, it } from "vitest";
import { getLetterGradeFromPercentage, percentageFromEarnedAndTotal } from "./grade";

describe("getLetterGradeFromPercentage", () => {
  it("returns N/A for invalid inputs", () => {
    expect(getLetterGradeFromPercentage(Number.NaN as any)).toBe("N/A");
    expect(getLetterGradeFromPercentage("abc" as any)).toBe("N/A");
    expect(getLetterGradeFromPercentage(null as any)).toBe("N/A");
    expect(getLetterGradeFromPercentage(undefined as any)).toBe("N/A");
  });
  it("clamps and rounds percentage and maps to letter", () => {
    expect(getLetterGradeFromPercentage(97)).toBe("A+");
    expect(getLetterGradeFromPercentage(93)).toBe("A");
    expect(getLetterGradeFromPercentage(90.4)).toBe("A-");
    expect(getLetterGradeFromPercentage(87)).toBe("B+");
    expect(getLetterGradeFromPercentage(83)).toBe("B");
    expect(getLetterGradeFromPercentage(80)).toBe("B-");
    expect(getLetterGradeFromPercentage(77)).toBe("C+");
    expect(getLetterGradeFromPercentage(73)).toBe("C");
    expect(getLetterGradeFromPercentage(70)).toBe("C-");
    expect(getLetterGradeFromPercentage(67)).toBe("D+");
    expect(getLetterGradeFromPercentage(63)).toBe("D");
    expect(getLetterGradeFromPercentage(60)).toBe("D-");
    expect(getLetterGradeFromPercentage(59)).toBe("F");
  });
  it("accepts string inputs", () => {
    expect(getLetterGradeFromPercentage("97")).toBe("A+");
  });
  it("clamps out-of-range inputs", () => {
    expect(getLetterGradeFromPercentage(1000)).toBe("A+");
    expect(getLetterGradeFromPercentage(-10)).toBe("F");
  });
});

describe("percentageFromEarnedAndTotal", () => {
  it("handles invalid parameters", () => {
    expect(percentageFromEarnedAndTotal(Number.NaN as any, 10)).toBe(0);
    expect(percentageFromEarnedAndTotal(5, Number.NaN as any)).toBe(0);
    expect(percentageFromEarnedAndTotal(5, 0)).toBe(0);
    expect(percentageFromEarnedAndTotal(5, -2)).toBe(0);
  });
  it("computes rounded percentage", () => {
    expect(percentageFromEarnedAndTotal(5, 10)).toBe(50);
    expect(percentageFromEarnedAndTotal(7, 9)).toBe(78); // 77.7 -> 78
    expect(percentageFromEarnedAndTotal(9, 9)).toBe(100);
  });
});
