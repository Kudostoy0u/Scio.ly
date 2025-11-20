import { testConnection } from "@/lib/db";
import { geminiService } from "@/lib/services/gemini";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  testConnection: vi.fn(),
}));

vi.mock("@/lib/services/gemini", () => ({
  geminiService: {
    isAvailable: vi.fn(),
  },
}));

describe("/api/health", () => {
  const mockRequest = () => new NextRequest("http://localhost:3000/api/health");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Health Check", () => {
    it("should return 200 with basic health status", async () => {
      (testConnection as any).mockResolvedValue(true);
      (geminiService.isAvailable as any).mockReturnValue(true);

      const request = mockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe("healthy");
      expect(data.data.timestamp).toBeDefined();
    });

    it("should include service information", async () => {
      (testConnection as any).mockResolvedValue(true);
      (geminiService.isAvailable as any).mockReturnValue(true);

      const request = mockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.services).toBeDefined();
      expect(data.data.services.database).toBeDefined();
      expect(data.data.services.ai).toBeDefined();
      expect(data.data.version).toBeDefined();
      expect(data.data.environment).toBeDefined();
    });
  });

  describe("Database Health Check", () => {
    it("should return healthy when database is accessible", async () => {
      (testConnection as any).mockResolvedValue(true);
      (geminiService.isAvailable as any).mockReturnValue(true);

      const request = mockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.services.database.status).toBe("connected");
      expect(data.data.status).toBe("healthy");
    });

    it("should return unhealthy when database is inaccessible", async () => {
      (testConnection as any).mockResolvedValue(false);
      (geminiService.isAvailable as any).mockReturnValue(true);

      const request = mockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.services.database.status).toBe("disconnected");
      expect(data.data.status).toBe("unhealthy");
    });

    it("should handle database connection errors", async () => {
      (testConnection as any).mockRejectedValue(new Error("Database connection failed"));
      (geminiService.isAvailable as any).mockReturnValue(true);

      const request = mockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe("AI Service Health Check", () => {
    it("should return healthy when AI service is available", async () => {
      (testConnection as any).mockResolvedValue(true);
      (geminiService.isAvailable as any).mockReturnValue(true);

      const request = mockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.services.ai.status).toBe("available");
      expect(data.data.status).toBe("healthy");
    });

    it("should return unhealthy when AI service is unavailable", async () => {
      (testConnection as any).mockResolvedValue(true);
      (geminiService.isAvailable as any).mockReturnValue(false);

      const request = mockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.services.ai.status).toBe("unavailable");
      expect(data.data.status).toBe("unhealthy");
    });
  });

  describe("Overall Health Status", () => {
    it("should return overall healthy when all services are healthy", async () => {
      (testConnection as any).mockResolvedValue(true);
      (geminiService.isAvailable as any).mockReturnValue(true);

      const request = mockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe("healthy");
      expect(data.data.services.database.status).toBe("connected");
      expect(data.data.services.ai.status).toBe("available");
    });

    it("should return overall unhealthy when any service is unhealthy", async () => {
      (testConnection as any).mockResolvedValue(false);
      (geminiService.isAvailable as any).mockReturnValue(true);

      const request = mockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe("unhealthy");
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors gracefully", async () => {
      (testConnection as any).mockRejectedValue(new Error("Unexpected error"));

      const request = mockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Health check failed");
    });
  });
});
