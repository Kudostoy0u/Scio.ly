import { describe, expect, it } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

describe("robots", () => {
  it("returns correct allow/disallow and sitemap", () => {
    const r = robots();
    expect(r.rules).toBeTruthy();
    const rules = r.rules as { allow: string; disallow: string[] };
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toContain("/json");
    expect(r.sitemap).toContain("sitemap.xml");
  });
});

describe("sitemap", () => {
  it("returns list with base URL", () => {
    const entries = sitemap();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.some((e) => e.url === "https://scio.ly")).toBe(true);
  });
});
