import { describe, expect, it } from "vitest";
import { computeCipherDifficulty } from "./difficulty";

describe("computeCipherDifficulty", () => {
  it("returns higher difficulty for longer quotes within bounds", () => {
    const short = computeCipherDifficulty({ cipherType: "Caesar", quote: "A".repeat(50) });
    const long = computeCipherDifficulty({ cipherType: "Caesar", quote: "A".repeat(220) });
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThanOrEqual(0.98);
    expect(short).toBeGreaterThanOrEqual(0.1);
  });

  it("handles Baconian binary type adjustments", () => {
    const base = computeCipherDifficulty({ cipherType: "Baconian", quote: "HELLO WORLD" });
    const easy = computeCipherDifficulty({
      cipherType: "Baconian",
      quote: "HELLO WORLD",
      baconianBinaryType: "A/B",
    });
    const harder = computeCipherDifficulty({
      cipherType: "Baconian",
      quote: "HELLO WORLD",
      baconianBinaryType: "Odd/Even",
    });
    expect(easy).toBeLessThan(base);
    expect(harder).toBeGreaterThan(base);
  });

  it("caps difficulty between 0.1 and 0.98", () => {
    const veryShort = computeCipherDifficulty({ cipherType: "Cryptarithm", quote: "" });
    const veryLong = computeCipherDifficulty({
      cipherType: "Random Xenocrypt",
      quote: "X".repeat(1000),
    });
    expect(veryShort).toBeGreaterThanOrEqual(0.1);
    expect(veryLong).toBeLessThanOrEqual(0.98);
  });
});
