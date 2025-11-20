import { describe, expect, it } from "vitest";
import { isValidEmail, isValidUUID, sanitizeInput, validateRequestBody } from "./auth";

describe("API Auth Utilities", () => {
  describe("sanitizeInput", () => {
    it("escapes HTML characters", () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;"
      );
    });

    it("escapes quotes and apostrophes", () => {
      expect(sanitizeInput(`It's "great"`)).toBe("It&#x27;s &quot;great&quot;");
    });

    it("trims whitespace", () => {
      expect(sanitizeInput("  hello  ")).toBe("hello");
    });

    it("handles normal text", () => {
      expect(sanitizeInput("Hello World")).toBe("Hello World");
    });
  });

  describe("isValidEmail", () => {
    it("validates correct email addresses", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name+tag@domain.co.uk")).toBe(true);
    });

    it("rejects invalid email addresses", () => {
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("invalid@")).toBe(false);
      expect(isValidEmail("@invalid.com")).toBe(false);
      expect(isValidEmail("invalid @example.com")).toBe(false);
    });
  });

  describe("isValidUUID", () => {
    it("validates correct UUIDs", () => {
      expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
      expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("rejects invalid UUIDs", () => {
      expect(isValidUUID("not-a-uuid")).toBe(false);
      expect(isValidUUID("123456789")).toBe(false);
      expect(isValidUUID("550e8400-e29b-41d4-a716-44665544000")).toBe(false); // too short
      expect(isValidUUID("550e8400-e29b-41d4-a716-4466554400000")).toBe(false); // too long
    });
  });

  describe("validateRequestBody", () => {
    it("accepts valid body with all required fields", () => {
      const body = { name: "John", email: "john@example.com", age: 25 };
      const result = validateRequestBody(body, ["name", "email"]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("rejects body with missing required fields", () => {
      const body = { name: "John" };
      const result = validateRequestBody(body, ["name", "email"]);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("rejects null or undefined body", () => {
      const result1 = validateRequestBody(null, ["name"]);
      const result2 = validateRequestBody(undefined, ["name"]);
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });

    it("rejects body with null values for required fields", () => {
      const body = { name: "John", email: null };
      const result = validateRequestBody(body, ["name", "email"]);
      expect(result.valid).toBe(false);
    });
  });
});
