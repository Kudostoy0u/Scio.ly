import { describe, expect, it } from "vitest";
import { parseQuestion } from "./parseQuestion";

describe("parseQuestion", () => {
  it("parses stringified question object", () => {
    const raw = JSON.stringify({ question: "Q", options: ["A"], answers: [0], difficulty: 0.6 });
    const q = parseQuestion(raw)!;
    expect(q.question).toBe("Q");
    expect(q.options?.length).toBe(1);
    expect(q.answers[0]).toBe(0);
    expect(q.difficulty).toBe(0.6);
  });

  it("handles plain string payloads", () => {
    const q = parseQuestion("Plain text");
    expect(q?.question).toBe("Plain text");
    expect(q?.answers.length).toBe(0);
  });

  it("handles object payloads", () => {
    const q = parseQuestion({ question: "Obj", answers: ["A"], difficulty: 0.3 } as any)!;
    expect(q.question).toBe("Obj");
    expect(q.answers[0]).toBe("A");
    expect(q.difficulty).toBe(0.3);
  });
});
