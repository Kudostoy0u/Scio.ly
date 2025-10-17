import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { geminiService } from '@/lib/services/gemini';

// Mock dependencies
vi.mock('@/lib/services/gemini', () => ({
  geminiService: {
    isAvailable: vi.fn(),
    analyzeQuestion: vi.fn(),
  }
}));

describe('/api/gemini/analyze-question', () => {
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

  const mockRequest = (body: any) => new NextRequest('http://localhost:3000/api/gemini/analyze-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Request Validation', () => {
    it('should return 400 for missing question field', async () => {
      const request = mockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields: question');
    });

    it('should return 500 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/gemini/analyze-question', {
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

  describe('Service Availability', () => {
    it('should return 500 when Gemini service is not available', async () => {
      (geminiService.isAvailable as any).mockReturnValue(false);

      const request = mockRequest({ question: mockQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Gemini AI not available');
    });

    it('should proceed when Gemini service is available', async () => {
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Question is valid'
      });

      const request = mockRequest({ question: mockQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Question Analysis', () => {
    it('should analyze question and return result', async () => {
      const mockAnalysisResult = {
        remove: false,
        reason: 'Question is answerable and correct',
        confidence: 0.95,
        suggestions: ['Consider adding more context']
      };

      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue(mockAnalysisResult);

      const request = mockRequest({ question: mockQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAnalysisResult);
      expect(geminiService.analyzeQuestion).toHaveBeenCalledWith(mockQuestion);
    });

    it('should handle analysis that recommends removal', async () => {
      const mockAnalysisResult = {
        remove: true,
        reason: 'Question contains incorrect information',
        confidence: 0.9,
        issues: ['Factual error in answer']
      };

      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue(mockAnalysisResult);

      const request = mockRequest({ question: mockQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAnalysisResult);
    });

    it('should handle analysis errors', async () => {
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockRejectedValue(new Error('Analysis failed'));

      const request = mockRequest({ question: mockQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to analyze question');
    });
  });

  describe('Question Types', () => {
    it('should handle multiple choice questions', async () => {
      const mcQuestion = {
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        answers: ['Paris'],
        event: 'Geography'
      };

      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Valid multiple choice question'
      });

      const request = mockRequest({ question: mcQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle free response questions', async () => {
      const frQuestion = {
        question: 'Explain the process of photosynthesis.',
        answers: ['Photosynthesis is the process...'],
        event: 'Biology'
      };

      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Valid free response question'
      });

      const request = mockRequest({ question: frQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle questions with images', async () => {
      const imageQuestion = {
        question: 'Identify the mineral shown in the image.',
        imageUrl: 'https://example.com/mineral.jpg',
        answers: ['Quartz'],
        event: 'Geology'
      };

      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Valid image-based question'
      });

      const request = mockRequest({ question: imageQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle questions with missing optional fields', async () => {
      const minimalQuestion = {
        question: 'What is 2+2?',
        answers: ['4']
      };

      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Valid minimal question'
      });

      const request = mockRequest({ question: minimalQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle questions with special characters', async () => {
      const specialQuestion = {
        question: 'What is π (pi) to 2 decimal places?',
        options: ['3.14', '3.141', '3.14159'],
        answers: ['3.14'],
        event: 'Mathematics'
      };

      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Valid question with special characters'
      });

      const request = mockRequest({ question: specialQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle very long questions', async () => {
      const longQuestion = {
        question: 'A'.repeat(10000), // Very long question
        answers: ['Answer'],
        event: 'Test'
      };

      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Valid long question'
      });

      const request = mockRequest({ question: longQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Performance and Timeout', () => {
    it('should handle analysis timeout', async () => {
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const request = mockRequest({ question: mockQuestion });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to analyze question');
    });

    it('should handle concurrent analysis requests', async () => {
      (geminiService.isAvailable as any).mockReturnValue(true);
      (geminiService.analyzeQuestion as any).mockResolvedValue({
        remove: false,
        reason: 'Question is valid'
      });

      const requests = Array(5).fill(null).map(() => 
        mockRequest({ question: mockQuestion })
      );

      const responses = await Promise.all(requests.map(POST));
      const data = await Promise.all(responses.map(r => r.json()));

      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(data.every(d => d.success === true)).toBe(true);
    });
  });
});
