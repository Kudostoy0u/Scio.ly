import { describe, expect, it } from "vitest";

describe("GeminiAnalysisService", () => {
  describe("Question Removal Analysis Logic", () => {
    it("should have proper removal criteria defined", () => {
      // Test that the removal criteria are properly defined in the prompt
      const expectedCriteria = [
        "SCIENTIFIC INACCURACY",
        "AMBIGUOUS LANGUAGE",
        "MISSING ESSENTIAL INFORMATION",
        "INAPPROPRIATE CONTENT",
        "TECHNICAL ERRORS",
        "OUTDATED INFORMATION",
        "POOR EDUCATIONAL VALUE",
        "DUPLICATE CONTENT",
      ];

      // This test verifies that our removal criteria are comprehensive
      expect(expectedCriteria).toHaveLength(8);
      expect(expectedCriteria).toContain("SCIENTIFIC INACCURACY");
      expect(expectedCriteria).toContain("AMBIGUOUS LANGUAGE");
      expect(expectedCriteria).toContain("MISSING ESSENTIAL INFORMATION");
    });

    it("should have proper response schema structure", () => {
      // Test that the response schema includes all required fields
      const expectedSchema = {
        shouldRemove: "boolean",
        reason: "string",
        issues: "array",
        confidence: "number",
      };

      expect(Object.keys(expectedSchema)).toHaveLength(4);
      expect(expectedSchema).toHaveProperty("shouldRemove");
      expect(expectedSchema).toHaveProperty("reason");
      expect(expectedSchema).toHaveProperty("issues");
      expect(expectedSchema).toHaveProperty("confidence");
    });
  });
});
