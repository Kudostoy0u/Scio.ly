import { describe, expect, it } from "vitest";
import { buildIdQuestionFromApiRow } from "./idBuild";

describe("buildIdQuestionFromApiRow", () => {
  const row = {
    question: "specimen?",
    answers: ["Calcite"],
    names: ["Calcite"],
    images: ["https://img/test1.jpg", "https://img/test2.jpg"],
    difficulty: 0.4,
    event: "Rocks and Minerals",
  };

  it("builds an FRQ question when types is free-response", () => {
    const q = buildIdQuestionFromApiRow(row, {
      eventName: "Rocks and Minerals",
      types: "free-response",
      namePool: [],
    });
    expect(q.answers.length).toBeGreaterThan(0);
    expect(q.options).toBeUndefined();
  });

  it("builds an MCQ question when types is multiple-choice", () => {
    const q = buildIdQuestionFromApiRow(row, {
      eventName: "Rocks and Minerals",
      types: "multiple-choice",
      namePool: ["Quartz", "Halite", "Gypsum"],
    });
    expect(Array.isArray(q.options)).toBe(true);
    expect(q.answers.length).toBe(1);
  });
});
