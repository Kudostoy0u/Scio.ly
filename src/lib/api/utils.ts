import { NextResponse } from 'next/server';
import { z } from 'zod';

// Error handling utilities
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: unknown): NextResponse => {
  console.error('API Error:', error);
  
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      },
      { status: 400 }
    );
  }
  
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
    },
    { status: 500 }
  );
};

// Validation utilities
export const createValidationSchema = <T extends z.ZodRawShape>(schema: T) => {
  return z.object(schema);
};

// Response utilities
export const createSuccessResponse = <T>(data: T, message?: string) => {
  return NextResponse.json({
    success: true,
    data,
    ...(message && { message }),
  });
};

export const createErrorResponse = (error: string, statusCode: number = 500, code?: string) => {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(code && { code }),
    },
    { status: statusCode }
  );
};

// Input parsing utilities
export const parseQueryParams = <T extends z.ZodRawShape>(
  searchParams: URLSearchParams,
  schema: z.ZodObject<T>
) => {
  const rawParams: Record<string, string | undefined> = {};
  
  for (const [key, value] of searchParams.entries()) {
    rawParams[key] = value;
  }
  
  return schema.parse(rawParams);
};

export const parseRequestBody = async <T extends z.ZodRawShape>(
  request: Request,
  schema: z.ZodObject<T>
) => {
  const body = await request.json();
  return schema.parse(body);
};

// Database query utilities
export const buildWhereCondition = <T>(conditions: T[]) => {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  
  // This assumes you're using drizzle-orm's 'and' function
  // You'll need to import it in the specific file
  return conditions;
};

// Rate limiting utilities (for future use)
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (identifier: string) => {
    const now = Date.now();
    const userRequests = requests.get(identifier);
    
    if (!userRequests || now > userRequests.resetTime) {
      requests.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (userRequests.count >= maxRequests) {
      return false;
    }
    
    userRequests.count++;
    return true;
  };
};

// Logging utilities
export const logApiRequest = (method: string, path: string, params?: Record<string, unknown>) => {
  console.log(`[API] ${method} ${path}`, params ? `- Params: ${JSON.stringify(params)}` : '');
};

export const logApiResponse = (method: string, path: string, statusCode: number, duration: number) => {
  console.log(`[API] ${method} ${path} - ${statusCode} (${duration}ms)`);
};

// Caching utilities (for future use)
export const createCacheKey = (prefix: string, params: Record<string, unknown>) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${prefix}:${sortedParams}`;
};

// Security utilities
export const sanitizeInput = (input: string): string => {
  // Basic XSS prevention
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Pagination utilities
export const createPaginationParams = (page?: string, limit?: string) => {
  const pageNum = page ? parseInt(page) : 1;
  const limitNum = limit ? parseInt(limit) : 10;
  
  return {
    offset: (pageNum - 1) * limitNum,
    limit: Math.min(limitNum, 100), // Cap at 100 items
    page: pageNum,
  };
};

// Sorting utilities
export const createSortParams = (sortBy?: string, sortOrder?: string) => {
  const validSortOrders = ['asc', 'desc'] as const;
  const order = sortOrder && validSortOrders.includes(sortOrder as 'asc' | 'desc') 
    ? sortOrder as 'asc' | 'desc' 
    : 'desc';
  
  return {
    sortBy: sortBy || 'createdAt',
    sortOrder: order,
  };
}; 