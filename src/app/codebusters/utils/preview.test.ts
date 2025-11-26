import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { describe, expect, it } from "vitest";
import { clearPreviewLocalStorage } from "./preview";

describe("clearPreviewLocalStorage", () => {
  it("removes preview-related keys and sets force refresh", () => {
    const keys = [
      "codebustersQuotes",
      "codebustersQuoteIndices",
      "codebustersQuoteUUIDs",
      "codebustersShareData",
      "codebustersIsTestSubmitted",
      "codebustersTestScore",
      "codebustersTimeLeft",
      "codebustersRevealedLetters",
      "codebustersHintedLetters",
      "codebustersHintCounts",
      "codebustersQuotesLoadedFromStorage",
    ];

    for (const k of keys) {
      SyncLocalStorage.setItem(k, "x");
    }
    clearPreviewLocalStorage();
    for (const k of keys) {
      expect(SyncLocalStorage.getItem(k)).toBeNull();
    }
    expect(SyncLocalStorage.getItem("codebustersForceRefresh")).toBe("true");
  });
});
