import { describe, expect, it } from "vitest";
import { prepareUnlimitedQuestions } from "./prepare";

const makeQ = (i: number) => ({
  question: `Q${i}`,
  answers: [0],
  difficulty: 0.5,
  event: "Rocks and Minerals",
  options: ["A", "B", "C", "D"],
});

describe("prepareUnlimitedQuestions", () => {
  it("returns only placeholders when pct is 100", () => {
    const base = Array.from({ length: 10 }, (_, i) => makeQ(i));
    const out = prepareUnlimitedQuestions({
      baseQuestions: base,
      eventName: "Rocks and Minerals",
      idPercentage: 100,
    });
    expect(out.idCount).toBeGreaterThan(0);
    expect(out.baseCount).toBe(0);
    expect(out.finalQuestions.every((q) => (q as any)._isIdPlaceholder)).toBe(true);
  });

  it("splits base and id placeholders according to percentage", () => {
    const base = Array.from({ length: 20 }, (_, i) => makeQ(i));
    const out = prepareUnlimitedQuestions({
      baseQuestions: base,
      eventName: "Rocks and Minerals",
      idPercentage: 50,
    });
    expect(out.finalQuestions.length).toBe(20);
    expect(out.idCount).toBe(10);
    expect(out.baseCount).toBe(10);
    expect(out.idIndices.length).toBe(10);
  });

  it("handles invalid percentage values safely", () => {
    const base = Array.from({ length: 10 }, (_, i) => makeQ(i));
    const out = prepareUnlimitedQuestions({
      baseQuestions: base,
      idPercentage: "not-a-number" as any,
    });
    expect(out.idCount).toBe(0);
    expect(out.finalQuestions.length).toBe(10);
  });
});
