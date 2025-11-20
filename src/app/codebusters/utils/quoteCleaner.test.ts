import { describe, expect, it } from "vitest";
import { cleanQuote } from "./quoteCleaner";

describe("cleanQuote", () => {
  it("removes bracketed parts", () => {
    expect(cleanQuote("Hello [x] world")).toBe("Hello world");
  });
  it("removes braced parts", () => {
    expect(cleanQuote("Hello {x} world")).toBe("Hello world");
  });
  it("removes parenthetical parts", () => {
    expect(cleanQuote("Hello (x) world")).toBe("Hello world");
  });
  it("collapses whitespace and trims", () => {
    expect(cleanQuote("  A   [1]   B  ")).toBe("A B");
  });
});
