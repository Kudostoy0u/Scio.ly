import logger from "@/lib/utils/logging/logger";
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
			vi.stubEnv("NODE_ENV", "development");

			logger.info("Test message");

			expect(mockConsole.info).toHaveBeenCalledWith("[INFO]", "Test message");

			// Restore original environment
			vi.unstubAllEnvs();
		});

		it("should not log info messages in production", () => {
			// Mock NODE_ENV to be production
			vi.stubEnv("NODE_ENV", "production");

			logger.info("Test message");

			expect(mockConsole.info).not.toHaveBeenCalled();

			// Restore original environment
			vi.unstubAllEnvs();
		});
	});

	describe("Developer mode logging", () => {
		it("should log structured messages in developer mode", () => {
			// Mock NODE_ENV to be development (which enables developer mode)
			vi.stubEnv("NODE_ENV", "development");

			logger.dev.structured("info", "Test structured message", {
				userId: "123",
				operation: "test",
			});

			expect(mockConsole.log).toHaveBeenCalled();
			const logCall = mockConsole.log.mock.calls[0];
			expect(logCall?.[0]).toBe("[DEV-INFO]");
			expect(logCall?.[1]).toContain("Test structured message");

			// Restore original environment
			vi.unstubAllEnvs();
		});

		it("should log request details in developer mode", () => {
			vi.stubEnv("NODE_ENV", "development");

			logger.dev.request(
				"POST",
				"/api/test",
				{ data: "test" },
				{ "content-type": "application/json" },
			);

			expect(mockConsole.log).toHaveBeenCalled();
			const logCall = mockConsole.log.mock.calls[0];
			expect(logCall?.[0]).toBe("[DEV-INFO]");
			expect(logCall?.[1]).toContain("API Request: POST /api/test");

			vi.unstubAllEnvs();
		});

		it("should mask sensitive headers", () => {
			vi.stubEnv("NODE_ENV", "development");

			logger.dev.request("POST", "/api/test", undefined, {
				authorization: "Bearer secret-token",
				"content-type": "application/json",
			});

			const logCall = mockConsole.log.mock.calls[0];
			const logData = JSON.parse(logCall?.[1] || "{}");

			expect(logData.context.headers.authorization).toBe("[REDACTED]");
			expect(logData.context.headers["content-type"]).toBe("application/json");

			vi.unstubAllEnvs();
		});

		it("should log timing information", () => {
			vi.stubEnv("NODE_ENV", "development");

			const startTime = Date.now() - 100; // 100ms ago
			logger.dev.timing("Test operation", startTime, { table: "users" });

			expect(mockConsole.log).toHaveBeenCalled();
			const logCall = mockConsole.log.mock.calls[0];
			expect(logCall?.[0]).toBe("[DEV-DEBUG]");
			expect(logCall?.[1]).toContain("Timing: Test operation");

			vi.unstubAllEnvs();
		});

		it("should log database operations", () => {
			vi.stubEnv("NODE_ENV", "development");

			logger.dev.db("INSERT", "users", "INSERT INTO users (name) VALUES (?)", [
				"John",
			]);

			expect(mockConsole.log).toHaveBeenCalled();
			const logCall = mockConsole.log.mock.calls[0];
			expect(logCall?.[0]).toBe("[DEV-DEBUG]");
			expect(logCall?.[1]).toContain("DB INSERT: users");

			vi.unstubAllEnvs();
		});

		it("should log AI service operations", () => {
			vi.stubEnv("NODE_ENV", "development");

			logger.dev.ai(
				"Gemini",
				"analyzeQuestion",
				{ question: "test" },
				{ result: "success" },
				1500,
			);

			expect(mockConsole.log).toHaveBeenCalled();
			const logCall = mockConsole.log.mock.calls[0];
			expect(logCall?.[0]).toBe("[DEV-INFO]");
			expect(logCall?.[1]).toContain("AI Gemini: analyzeQuestion");

			vi.unstubAllEnvs();
		});

		it("should log errors with full context", () => {
			vi.stubEnv("NODE_ENV", "development");

			const error = new Error("Test error");
			logger.dev.error("Operation failed", error, { userId: "123" });

			expect(mockConsole.log).toHaveBeenCalled();
			const logCall = mockConsole.log.mock.calls[0];
			expect(logCall?.[0]).toBe("[DEV-ERROR]");
			expect(logCall?.[1]).toContain("Operation failed");

			vi.unstubAllEnvs();
		});
	});

	describe("Environment detection", () => {
		it("should enable developer mode with DEVELOPER_MODE=true", () => {
			vi.stubEnv("NODE_ENV", "production");
			process.env.DEVELOPER_MODE = "true";

			logger.dev.structured("info", "Test message");

			expect(mockConsole.log).toHaveBeenCalled();

			// Restore original environment
			vi.unstubAllEnvs();
		});

		it("should not log in test environment", () => {
			vi.stubEnv("NODE_ENV", "test");

			logger.warn("Test warning");
			logger.error("Test error");

			expect(mockConsole.warn).not.toHaveBeenCalled();
			expect(mockConsole.error).not.toHaveBeenCalled();

			vi.unstubAllEnvs();
		});
	});
});
