import { NextResponse } from 'next/server';
import { z } from 'zod';


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


export const createValidationSchema = <T extends z.ZodRawShape>(schema: T) => {
  return z.object(schema);
};


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


export const buildWhereCondition = <T>(conditions: T[]) => {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  


  return conditions;
};


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


export const logApiRequest = (method: string, path: string, params?: Record<string, unknown>) => {
  console.log(`[API] ${method} ${path}`, params ? `- Params: ${JSON.stringify(params)}` : '');
};

export const logApiResponse = (method: string, path: string, statusCode: number, duration: number) => {
  console.log(`[API] ${method} ${path} - ${statusCode} (${duration}ms)`);
};


export const createCacheKey = (prefix: string, params: Record<string, unknown>) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${prefix}:${sortedParams}`;
};


export const sanitizeInput = (input: string): string => {

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


export const createPaginationParams = (page?: string, limit?: string) => {
  const pageNum = page ? parseInt(page) : 1;
  const limitNum = limit ? parseInt(limit) : 10;
  
  return {
    offset: (pageNum - 1) * limitNum,
    limit: Math.min(limitNum, 100),
    page: pageNum,
  };
};


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

/**
 * Create a successful API response (alias for consistency)
 */
export const successResponse = createSuccessResponse;

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: () => createErrorResponse('Unauthorized', 401),
  forbidden: () => createErrorResponse('Forbidden', 403),
  notFound: (resource?: string) =>
    createErrorResponse(resource ? `${resource} not found` : 'Not found', 404),
  badRequest: (message: string = 'Bad request') => createErrorResponse(message, 400),
  missingFields: (fields: string[]) =>
    createErrorResponse(`Missing required fields: ${fields.join(', ')}`, 400),
  serverError: (message: string = 'Internal server error') => createErrorResponse(message, 500),
  tooManyRequests: () => createErrorResponse('Too many requests - Please try again later', 429),
} as const;

/**
 * Validate required fields in request body
 */
export function validateFields<T extends Record<string, unknown>>(
  body: unknown,
  requiredFields: (keyof T)[]
): { valid: true; data: T } | { valid: false; error: NextResponse } {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: ApiErrors.badRequest('Invalid request body'),
    };
  }

  const missingFields = requiredFields.filter(
    (field) => !(field in body) || (body as Record<string, unknown>)[field as string] == null
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: ApiErrors.missingFields(missingFields as string[]),
    };
  }

  return { valid: true, data: body as T };
} 