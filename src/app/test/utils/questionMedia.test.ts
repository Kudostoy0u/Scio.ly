import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAbsoluteUrl, normalizeQuestionMedia } from "./questionMedia";

describe("questionMedia utils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("buildAbsoluteUrl returns https URLs unchanged", () => {
    const url = "https://example.com/image.png";
    expect(buildAbsoluteUrl(url, "https://host")).toBe(url);
  });

  it("buildAbsoluteUrl prefixes origin for root-relative paths when origin provided", () => {
    const url = "/image.png";
    expect(buildAbsoluteUrl(url, "https://site.local")).toBe("https://site.local/image.png");
  });

  it("buildAbsoluteUrl returns as-is for other strings", () => {
    const url = "images/img.png";
    expect(buildAbsoluteUrl(url, "https://site.local")).toBe("images/img.png");
  });

  it("normalizeQuestionMedia selects image from images array and normalizes fields", () => {
    // Force Math.random to pick index 0 consistently
    vi.spyOn(Math, "random").mockReturnValue(0);
    const input = [
      {
        id: "1",
        question: "q",
        options: [],
        answers: [],
        images: ["https://cdn/img1.png", "https://cdn/img2.png"],
      },
    ] as any;
    const out = normalizeQuestionMedia(input);
    expect(out[0].imageData).toBe("https://cdn/img1.png");
    expect(out[0].imageUrl).toBe("https://cdn/img1.png");
  });
});
