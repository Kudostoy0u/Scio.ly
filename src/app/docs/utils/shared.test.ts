import { describe, expect, it } from "vitest";
import { eventSlug, wikiUrl } from "./shared";

describe("docs shared helpers", () => {
  it("eventSlug slugifies names", () => {
    expect(eventSlug("Anatomy & Physiology")).toBe("anatomy-physiology");
    expect(eventSlug("Write It Do It")).toBe("write-it-do-it");
  });

  it("wikiUrl maps special cases and general names", () => {
    expect(wikiUrl("Write It Do It")).toContain("Write_It,_Do_It");
    expect(wikiUrl("Dynamic Planet")).toContain("Dynamic_Planet");
  });
});
