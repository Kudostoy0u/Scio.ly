import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { db } from '@/lib/db';
import { geminiService } from '@/lib/services/gemini';
import { blacklists as blacklistsTable, questions as questionsTable } from '@/lib/db/schema';
// import { and, eq } from 'drizzle-orm';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  }
}));

vi.mock('@/lib/services/gemini', () => ({
  geminiService: {
    isAvailable: vi.fn(),
    analyzeQuestion: vi.fn(),
  }
}));

vi.mock('@/lib/db/schema', () => ({
  blacklists: { tableName: 'blacklists' },
  questions: { tableName: 'questions', id: 'id' }
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
}));

describe('/api/report/remove', () => {
  const mockQuestion = {
    id: 'test-question-id',
    question: 'What is the ideal gas constant?',
    options: ['0.0821 L⋅atm⋅mol⁻¹⋅K⁻¹', '8.314 J⋅mol⁻¹⋅K⁻¹', '1.38 × 10⁻²³ J⋅K⁻¹'],
    answers: ['0.0821 L⋅atm⋅mol⁻¹⋅K⁻¹'],
    difficulty: 'medium',
    tournament: 'Nationals',
    division: 'C',
    subject: 'Chemistry',
    subtopic: 'Gas Laws',
    event: 'Chemistry Lab'
  };

  const mockRequest = (body: any) => new NextRequest('http://localhost:3000/api/report/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock database operations
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    });
    const mockDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined)
    });
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'test-question-id' }])
        })
      })
    });

    (db as any).insert = mockInsert;
    (db as any).delete = mockDelete;
    (db as any).select = mockSelect;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Request Validation', () => {
    it('should return 400 for missing question field', async () => {
      const request = mockRequest({ event: 'test-event' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields: question');
    });

    it('should return 400 for missing event field', async () => {
      const request = mockRequest({ question: mockQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields: event');
    });

    it('should return 500 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/report/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('AI Analysis', () => {
    it('should remove question when AI decides to remove', async () => {
      // Mock AI service
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: true,
        reason: 'Question contains incorrect information'
      });

      const request = mockRequest({
        question: mockQuestion,
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.removed).toBe(true);
      expect(data.data.reason).toBe('Question contains incorrect information');
      expect(geminiService.analyzeQuestion).toHaveBeenCalledWith(mockQuestion);
    });

    it('should keep question when AI decides to keep', async () => {
      // Mock AI service
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Question is answerable and correct'
      });

      const request = mockRequest({
        question: mockQuestion,
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.removed).toBe(false);
      expect(data.data.reason).toBe('Question is answerable and correct');
    });

    it('should handle AI service unavailable', async () => {
      // Mock AI service as unavailable
      (geminiService.isAvailable as any).mockReturnValue(false);

      const request = mockRequest({
        question: mockQuestion,
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.removed).toBe(false);
      expect(data.data.reason).toBe('Question analysis not available');
    });

    it('should handle AI analysis errors', async () => {
      // Mock AI service to throw error
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockRejectedValue(new Error('AI service error'));

      const request = mockRequest({
        question: mockQuestion,
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.removed).toBe(false);
      expect(data.data.reason).toBe('AI analysis failed');
    });
  });

  describe('Database Operations', () => {
    it('should insert into blacklist and delete from questions when AI removes', async () => {
      // Mock AI service to remove
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: true,
        reason: 'Question should be removed'
      });

      const request = mockRequest({
        question: mockQuestion,
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.removed).toBe(true);
      
      // Verify database operations
      expect(db.insert).toHaveBeenCalledWith(blacklistsTable);
      expect(db.delete).toHaveBeenCalledWith(questionsTable);
    });

    it('should handle database errors during removal', async () => {
      // Mock AI service to remove
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: true,
        reason: 'Question should be removed'
      });

      // Mock database error
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Database error'))
      });

      const request = mockRequest({
        question: mockQuestion,
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to remove question');
    });

    it('should handle question deletion by ID', async () => {
      // Mock AI service to remove
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: true,
        reason: 'Question should be removed'
      });

      const request = mockRequest({
        question: { ...mockQuestion, id: 'specific-question-id' },
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.removed).toBe(true);
      
      // Verify ID-based deletion was attempted
      expect(db.delete).toHaveBeenCalledWith(questionsTable);
    });

    it('should handle question deletion by content when ID not found', async () => {
      // Mock AI service to remove
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: true,
        reason: 'Question should be removed'
      });

      // Mock no ID in question
      const questionWithoutId = { ...mockQuestion };
      delete questionWithoutId.id;

      const request = mockRequest({
        question: questionWithoutId,
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.removed).toBe(true);
      
      // Verify content-based deletion was attempted
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle questions with missing optional fields', async () => {
      const minimalQuestion = {
        question: 'What is 2+2?',
        answers: ['4'],
        event: 'test-event'
      };

      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Question is valid'
      });

      const request = mockRequest({
        question: minimalQuestion,
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.removed).toBe(false);
    });

    it('should handle very long question text', async () => {
      const longQuestion = {
        ...mockQuestion,
        question: 'A'.repeat(10000) // Very long question
      };

      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Question is valid despite length'
      });

      const request = mockRequest({
        question: longQuestion,
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.removed).toBe(false);
    });

    it('should handle special characters in question text', async () => {
      const specialQuestion = {
        ...mockQuestion,
        question: 'What is the value of π? (π ≈ 3.14159)',
        answers: ['3.14159', 'π', '3.14']
      };

      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Question with special characters is valid'
      });

      const request = mockRequest({
        question: specialQuestion,
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.removed).toBe(false);
    });
  });

  describe('Performance and Timeout', () => {
    it('should handle AI analysis timeout', async () => {
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const request = mockRequest({
        question: mockQuestion,
        event: 'test-event'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.removed).toBe(false);
      expect(data.data.reason).toBe('AI analysis failed');
    });
  });
});
