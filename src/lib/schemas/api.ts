import { z } from 'zod';

// Common API response schemas
export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional()
});

export const ApiSuccessSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  message: z.string().optional()
});

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  total: z.number().optional(),
  hasMore: z.boolean().optional()
});

export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: PaginationSchema
});

// Cache configuration schemas
export const CacheConfigSchema = z.object({
  duration: z.number().min(0), // in milliseconds
  backgroundRefresh: z.boolean().default(false),
  backgroundRefreshInterval: z.number().min(0).default(0)
});

export const CacheEntrySchema = z.object({
  data: z.any(),
  timestamp: z.number(),
  promise: z.any().optional()
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiSuccess = z.infer<typeof ApiSuccessSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type CacheEntry = z.infer<typeof CacheEntrySchema>;