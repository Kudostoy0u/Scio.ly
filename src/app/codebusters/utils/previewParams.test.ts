import { describe, expect, it } from "vitest";
import { parsePreviewParams } from "./previewParams";

describe("parsePreviewParams", () => {
  it("parses defaults when null", () => {
    const r = parsePreviewParams(null);
    expect(r.isPreview).toBe(false);
    expect(r.previewScope).toBe("all");
    expect(r.previewTeam).toBe("A");
  });

  it("parses explicit params", () => {
    const sp = new URLSearchParams("preview=1&scope=team&team=B");
    const r = parsePreviewParams(sp);
    expect(r.isPreview).toBe(true);
    expect(r.previewScope).toBe("team");
    expect(r.previewTeam).toBe("B");
  });
});
