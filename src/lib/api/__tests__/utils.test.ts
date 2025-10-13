import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { 
  createValidationSchema,
  createSuccessResponse,
  createErrorResponse,
  // handleApiError,
  parseRequestBody,
  parseQueryParams,
  createRateLimiter,
  logApiRequest,
  logApiResponse,
  createCacheKey,
  sanitizeInput
} from '../utils';
import { z } from 'zod';

describe('API Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createValidationSchema', () => {
    it('should create a validation schema', () => {
      const schema = createValidationSchema({
        name: z.string(),
        email: z.string().email(),
        age: z.number().optional()
      });

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };

      const result = schema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should validate required fields', () => {
      const schema = createValidationSchema({
        name: z.string(),
        email: z.string().email()
      });

      const invalidData = {
        name: 'John Doe'
        // Missing email
      };

      expect(() => schema.parse(invalidData)).toThrow();
    });

    it('should handle optional fields', () => {
      const schema = createValidationSchema({
        name: z.string(),
        email: z.string().email(),
        age: z.number().optional()
      });

      const dataWithoutAge = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const result = schema.parse(dataWithoutAge);
      expect(result).toEqual(dataWithoutAge);
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data, 'Success message');

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should create success response without message', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should create success response with null data', () => {
      const response = createSuccessResponse(null, 'Success message');

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should create success response with array data', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response = createSuccessResponse(data, 'Array data');

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with default status', () => {
      const response = createErrorResponse('Test error');

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should create error response with custom status', () => {
      const response = createErrorResponse('Not found', 404);

      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should create error response with code', () => {
      const response = createErrorResponse('Validation failed', 400, 'VALIDATION_ERROR');

      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('parseRequestBody', () => {
    it('should parse valid JSON body', async () => {
      const schema = createValidationSchema({
        name: z.string(),
        email: z.string().email()
      });
      
      const body = { name: 'John', email: 'john@example.com' };
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await parseRequestBody(request, schema);
      expect(result).toEqual(body);
    });

    it('should handle invalid JSON', async () => {
      const schema = createValidationSchema({
        name: z.string(),
        email: z.string().email()
      });
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      await expect(parseRequestBody(request, schema)).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      const schema = createValidationSchema({
        name: z.string(),
        email: z.string().email()
      });
      
      const invalidBody = { name: 'John' }; // Missing email
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidBody)
      });

      await expect(parseRequestBody(request, schema)).rejects.toThrow();
    });
  });

  describe('parseQueryParams', () => {
    it('should parse query parameters', () => {
      const schema = createValidationSchema({
        page: z.string().optional(),
        limit: z.string().optional(),
        search: z.string().optional()
      });
      
      const searchParams = new URLSearchParams('page=1&limit=10&search=test');
      const result = parseQueryParams(searchParams, schema);
      
      expect(result).toEqual({
        page: '1',
        limit: '10',
        search: 'test'
      });
    });

    it('should handle missing parameters', () => {
      const schema = createValidationSchema({
        page: z.string().optional(),
        limit: z.string().optional()
      });
      
      const searchParams = new URLSearchParams('page=1');
      const result = parseQueryParams(searchParams, schema);
      
      expect(result).toEqual({
        page: '1',
        limit: undefined
      });
    });
  });

  describe('createRateLimiter', () => {
    it('should allow requests within limit', () => {
      const rateLimiter = createRateLimiter(5, 1000);
      const identifier = 'test-user';
      
      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter(identifier)).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const rateLimiter = createRateLimiter(3, 1000);
      const identifier = 'test-user';
      
      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        expect(rateLimiter(identifier)).toBe(true);
      }
      
      // 4th request should be blocked
      expect(rateLimiter(identifier)).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should create cache keys', () => {
      const key = createCacheKey('users', { id: '123', type: 'admin' });
      expect(key).toBe('users:id:123|type:admin');
    });

    it('should sanitize input', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
    });

    it('should log API requests', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      logApiRequest('GET', '/api/users', { id: '123' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[API] GET /api/users',
        '- Params: {"id":"123"}'
      );
      
      consoleSpy.mockRestore();
    });

    it('should log API responses', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      logApiResponse('GET', '/api/users', 200, 150);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[API] GET /api/users - 200 (150ms)'
      );
      
      consoleSpy.mockRestore();
    });
  });
});
