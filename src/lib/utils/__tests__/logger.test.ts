import logger from "@/lib/utils/logger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

describe("Enhanced Logger", () => {
  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(mockConsole.log);
    vi.spyOn(console, "info").mockImplementation(mockConsole.info);
    vi.spyOn(console, "warn").mockImplementation(mockConsole.warn);
    vi.spyOn(console, "error").mockImplementation(mockConsole.error);
    vi.spyOn(console, "debug").mockImplementation(mockConsole.debug);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic logging", () => {
    it("should log info messages in development", () => {
      // Mock NODE_ENV to be development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      logger.info("Test message");

      expect(mockConsole.info).toHaveBeenCalledWith("[INFO]", "Test message");

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it("should not log info messages in production", () => {
      // Mock NODE_ENV to be production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      logger.info("Test message");

      expect(mockConsole.info).not.toHaveBeenCalled();

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Developer mode logging", () => {
    it("should log structured messages in developer mode", () => {
      // Mock NODE_ENV to be development (which enables developer mode)
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      logger.dev.structured("info", "Test structured message", {
        userId: "123",
        operation: "test",
      });

      expect(mockConsole.log).toHaveBeenCalled();
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[0]).toBe("[DEV-INFO]");
      expect(logCall[1]).toContain("Test structured message");

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it("should log request details in developer mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      logger.dev.request(
        "POST",
        "/api/test",
        { data: "test" },
        { "content-type": "application/json" }
      );

      expect(mockConsole.log).toHaveBeenCalled();
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[0]).toBe("[DEV-INFO]");
      expect(logCall[1]).toContain("API Request: POST /api/test");

      process.env.NODE_ENV = originalEnv;
    });

    it("should mask sensitive headers", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      logger.dev.request("POST", "/api/test", undefined, {
        authorization: "Bearer secret-token",
        "content-type": "application/json",
      });

      const logCall = mockConsole.log.mock.calls[0];
      const logData = JSON.parse(logCall[1]);

      expect(logData.context.headers.authorization).toBe("[REDACTED]");
      expect(logData.context.headers["content-type"]).toBe("application/json");

      process.env.NODE_ENV = originalEnv;
    });

    it("should log timing information", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const startTime = Date.now() - 100; // 100ms ago
      logger.dev.timing("Test operation", startTime, { table: "users" });

      expect(mockConsole.log).toHaveBeenCalled();
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[0]).toBe("[DEV-DEBUG]");
      expect(logCall[1]).toContain("Timing: Test operation");

      process.env.NODE_ENV = originalEnv;
    });

    it("should log database operations", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      logger.dev.db("INSERT", "users", "INSERT INTO users (name) VALUES (?)", ["John"]);

      expect(mockConsole.log).toHaveBeenCalled();
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[0]).toBe("[DEV-DEBUG]");
      expect(logCall[1]).toContain("DB INSERT: users");

      process.env.NODE_ENV = originalEnv;
    });

    it("should log AI service operations", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      logger.dev.ai("Gemini", "analyzeQuestion", { question: "test" }, { result: "success" }, 1500);

      expect(mockConsole.log).toHaveBeenCalled();
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[0]).toBe("[DEV-INFO]");
      expect(logCall[1]).toContain("AI Gemini: analyzeQuestion");

      process.env.NODE_ENV = originalEnv;
    });

    it("should log errors with full context", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new Error("Test error");
      logger.dev.error("Operation failed", error, { userId: "123" });

      expect(mockConsole.log).toHaveBeenCalled();
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[0]).toBe("[DEV-ERROR]");
      expect(logCall[1]).toContain("Operation failed");

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Environment detection", () => {
    it("should enable developer mode with DEVELOPER_MODE=true", () => {
      const originalEnv = process.env.NODE_ENV;
      const originalDevMode = process.env.DEVELOPER_MODE;

      process.env.NODE_ENV = "production";
      process.env.DEVELOPER_MODE = "true";

      logger.dev.structured("info", "Test message");

      expect(mockConsole.log).toHaveBeenCalled();

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
      process.env.DEVELOPER_MODE = originalDevMode;
    });

    it("should not log in test environment", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      logger.warn("Test warning");
      logger.error("Test error");

      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
