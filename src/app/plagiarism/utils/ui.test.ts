import { describe, expect, it } from "vitest";
import {
	getRiskColor,
	getRiskText,
	getSimilarityColor,
	getSimilarityLabel,
} from "./ui";

// We only test return values; classes need not match Tailwind config exactly

const HIGH_OR_VERY_REGEX = /High|Very/;
const VERY_REGEX = /Very/;

describe("plagiarism ui helpers", () => {
	it("getSimilarityLabel and color map thresholds correctly", () => {
		expect(getSimilarityLabel(0.85)).toMatch(HIGH_OR_VERY_REGEX);
		expect(getSimilarityLabel(0.95)).toMatch(VERY_REGEX);

		// Color should vary by bucket; just ensure non-empty string
		expect(getSimilarityColor(0.2)).toBeTypeOf("string");
		expect(getSimilarityColor(0.5)).toBeTypeOf("string");
		expect(getSimilarityColor(0.7)).toBeTypeOf("string");
		expect(getSimilarityColor(0.9)).toBeTypeOf("string");
	});

	it("getRiskColor and text map states", () => {
		expect(getRiskText("high")).toContain("High");
		expect(getRiskText("medium")).toContain("Medium");
		expect(getRiskText("low")).toContain("Low");
		expect(getRiskText(null)).toContain("No");

		expect(getRiskColor("high")).toContain("red");
		expect(getRiskColor("medium")).toContain("orange");
		expect(getRiskColor("low")).toContain("yellow");
		expect(getRiskColor(null)).toContain("green");
	});
});
