import { db } from "@/lib/db";
import { edits as editsTable, questions as questionsTable } from "@/lib/db/schema";
import { geminiService } from "@/lib/services/gemini";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/report/edit/route";

// Mock the modules
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("@/lib/services/gemini", () => ({
  geminiService: {
    isAvailable: vi.fn(),
    validateReportEdit: vi.fn(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  edits: { tableName: "edits", id: "id" },
  questions: { tableName: "questions", id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
}));

describe("/api/report/edit", () => {
  const mockOriginalQuestion = {
    id: "test-question-id",
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    answers: ["Paris"],
    difficulty: "easy",
    tournament: "Nationals",
    division: "C",
    subject: "Geography",
    subtopic: "European Capitals",
    event: "Geography",
  };

  const mockEditedQuestion = {
    id: "test-question-id",
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    answers: ["Paris"],
    difficulty: "easy",
    tournament: "Nationals",
    division: "C",
    subject: "Geography",
    subtopic: "European Capitals",
    event: "Geography",
  };

  const mockRequest = (body: any) =>
    new NextRequest("http://localhost:3000/api/report/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock database operations
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    vi.mocked(db.select).mockImplementation(mockSelect);
    vi.mocked(db.insert).mockImplementation(mockInsert);
    vi.mocked(db.update).mockImplementation(mockUpdate);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Request Validation", () => {
    it("should return 400 for missing originalQuestion field", async () => {
      const request = mockRequest({
        editedQuestion: mockEditedQuestion,
        event: "test-event",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields: originalQuestion");
    });

    it("should return 400 for missing editedQuestion field", async () => {
      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        event: "test-event",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields: editedQuestion");
    });

    it("should return 400 for missing event field", async () => {
      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields: event");
    });

    it("should return 400 for invalid JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/report/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("Bypass Logic", () => {
    it("should accept edit when bypass flag is true", async () => {
      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
        bypass: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reason).toBe("Edit accepted!");
    });

    it("should accept edit when AI suggestion matches exactly", async () => {
      const aiSuggestion = {
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        answers: ["Paris"],
      };

      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
        aiSuggestion,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reason).toBe("Edit accepted!");
    });

    it("should reject edit when AI suggestion does not match", async () => {
      const aiSuggestion = {
        question: "What is the capital of Germany?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        answers: ["Berlin"],
      };

      vi.mocked(geminiService.isAvailable).mockReturnValue(true);
      vi.mocked(geminiService.validateReportEdit).mockResolvedValue({
        isValid: false,
        reason: "Edit does not match AI suggestion",
      });

      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
        aiSuggestion,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reason).toBe("Edit does not match AI suggestion");
    });
  });

  describe("AI Validation", () => {
    it("should accept edit when AI validates it", async () => {
      vi.mocked(geminiService.isAvailable).mockReturnValue(true);
      vi.mocked(geminiService.validateReportEdit).mockResolvedValue({
        isValid: true,
        reason: "Edit improves question quality",
      });

      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reason).toBe("Edit improves question quality");
      expect(geminiService.validateReportEdit).toHaveBeenCalledWith(
        mockOriginalQuestion,
        mockEditedQuestion,
        "test-event",
        ""
      );
    });

    it("should reject edit when AI invalidates it", async () => {
      vi.mocked(geminiService.isAvailable).mockReturnValue(true);
      vi.mocked(geminiService.validateReportEdit).mockResolvedValue({
        isValid: false,
        reason: "Edit makes question worse",
      });

      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reason).toBe("Edit makes question worse");
    });

    it("should handle AI service unavailable", async () => {
      (geminiService.isAvailable as any).mockReturnValue(false);

      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reason).toBe("AI validation not available");
    });

    it("should handle AI validation errors", async () => {
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.validateReportEdit as any).mockRejectedValue(new Error("AI service error"));

      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reason).toBe("AI evaluation failed");
    });
  });

  describe("Database Operations", () => {
    it("should create new edit when none exists", async () => {
      vi.mocked(geminiService.isAvailable).mockReturnValue(true);
      vi.mocked(geminiService.validateReportEdit).mockResolvedValue({
        isValid: true,
        reason: "Edit accepted",
      });

      // Mock no existing edit
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.insert).toHaveBeenCalledWith(editsTable);
    });

    it("should update existing edit when one exists", async () => {
      vi.mocked(geminiService.isAvailable).mockReturnValue(true);
      vi.mocked(geminiService.validateReportEdit).mockResolvedValue({
        isValid: true,
        reason: "Edit accepted",
      });

      // Mock existing edit
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "existing-edit-id" }]),
          }),
        }),
      });

      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.update).toHaveBeenCalledWith(editsTable);
    });

    it("should handle database errors during edit creation", async () => {
      vi.mocked(geminiService.isAvailable).mockReturnValue(true);
      vi.mocked(geminiService.validateReportEdit).mockResolvedValue({
        isValid: true,
        reason: "Edit accepted",
      });

      // Mock database error
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error("Database error")),
      });

      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to save edit");
    });
  });

  describe("Question Update Logic", () => {
    it("should update question by ID when available", async () => {
      vi.mocked(geminiService.isAvailable).mockReturnValue(true);
      vi.mocked(geminiService.validateReportEdit).mockResolvedValue({
        isValid: true,
        reason: "Edit accepted",
      });

      const request = mockRequest({
        originalQuestion: { ...mockOriginalQuestion, id: "specific-question-id" },
        editedQuestion: mockEditedQuestion,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.update).toHaveBeenCalledWith(questionsTable);
    });

    it("should find question by content when ID not available", async () => {
      vi.mocked(geminiService.isAvailable).mockReturnValue(true);
      vi.mocked(geminiService.validateReportEdit).mockResolvedValue({
        isValid: true,
        reason: "Edit accepted",
      });

      // Mock finding question by content
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "found-question-id" }]),
          }),
        }),
      });

      const questionWithoutId = { ...mockOriginalQuestion };
      questionWithoutId.id = undefined;

      const request = mockRequest({
        originalQuestion: questionWithoutId,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle questions with missing optional fields", async () => {
      const minimalOriginal = {
        question: "What is 2+2?",
        answers: ["4"],
        event: "test-event",
      };

      const minimalEdited = {
        question: "What is 2+2?",
        answers: ["4"],
        event: "test-event",
      };

      vi.mocked(geminiService.isAvailable).mockReturnValue(true);
      vi.mocked(geminiService.validateReportEdit).mockResolvedValue({
        isValid: true,
        reason: "Edit accepted",
      });

      const request = mockRequest({
        originalQuestion: minimalOriginal,
        editedQuestion: minimalEdited,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle questions with special characters", async () => {
      const specialOriginal = {
        question: "What is π (pi) to 2 decimal places?",
        options: ["3.14", "3.141", "3.14159"],
        answers: ["3.14"],
        event: "test-event",
      };

      const specialEdited = {
        question: "What is π (pi) to 2 decimal places?",
        options: ["3.14", "3.141", "3.14159"],
        answers: ["3.14"],
        event: "test-event",
      };

      vi.mocked(geminiService.isAvailable).mockReturnValue(true);
      vi.mocked(geminiService.validateReportEdit).mockResolvedValue({
        isValid: true,
        reason: "Edit accepted",
      });

      const request = mockRequest({
        originalQuestion: specialOriginal,
        editedQuestion: specialEdited,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle array comparison edge cases", async () => {
      const originalWithArrays = {
        question: "Test question",
        options: ["A", "B", "C"],
        answers: [0, 1], // Numeric indices
        event: "test-event",
      };

      const editedWithArrays = {
        question: "Test question",
        options: ["A", "B", "C"],
        answers: ["A", "B"], // Text answers
        event: "test-event",
      };

      vi.mocked(geminiService.isAvailable).mockReturnValue(true);
      vi.mocked(geminiService.validateReportEdit).mockResolvedValue({
        isValid: true,
        reason: "Edit accepted",
      });

      const request = mockRequest({
        originalQuestion: originalWithArrays,
        editedQuestion: editedWithArrays,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Performance and Timeout", () => {
    it("should handle AI validation timeout", async () => {
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.validateReportEdit as any).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 100))
      );

      const request = mockRequest({
        originalQuestion: mockOriginalQuestion,
        editedQuestion: mockEditedQuestion,
        event: "test-event",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reason).toBe("AI evaluation failed");
    });
  });
});
