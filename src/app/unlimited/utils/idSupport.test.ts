import { describe, expect, it } from "vitest";
import { buildFrqPrompt, supportsId } from "./idSupport";

describe("supportsId", () => {
	it("returns true for known ID-supported events", () => {
		expect(supportsId("Rocks and Minerals")).toBe(true);
		expect(supportsId("Entomology")).toBe(true);
		expect(supportsId("Designer Genes")).toBe(true);
	});

	it("returns false for unknown events", () => {
		expect(supportsId("Chemistry Lab")).toBe(false);
		expect(supportsId(undefined)).toBe(false);
	});
});

describe("buildFrqPrompt", () => {
	it("returns tailored prompts for specific events", () => {
		expect(buildFrqPrompt("Entomology")).toContain("scientific name");
		expect(buildFrqPrompt("Rocks and Minerals")).toContain("mineral");
		expect(buildFrqPrompt("Anatomy - Nervous")).toContain("anatomical");
		expect(buildFrqPrompt("Dynamic Planet - Oceanography")).toContain(
			"geological",
		);
		expect(buildFrqPrompt("Remote Sensing")).toContain("remote sensing");
	});

	it("falls back to generic prompt", () => {
		expect(buildFrqPrompt("Chemistry Lab")).toContain("Identify the specimen");
		expect(buildFrqPrompt(undefined)).toContain("Identify the specimen");
	});
});
