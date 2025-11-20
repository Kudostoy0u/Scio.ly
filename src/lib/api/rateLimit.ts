/**
 * Centralized rate limiting utility for API routes
 */

import { type NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limit storage
 * For production, consider using Redis
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Cleanup old entries periodically (every 10 minutes)
 */
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  10 * 60 * 1000
);

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Custom identifier (defaults to IP) */
  identifier?: string;
}

/**
 * Default rate limit configurations for different route types
 */
export const RateLimitPresets = {
  /** Strict rate limit for sensitive operations (5 req/min) */
  strict: { max: 5, windowMs: 60_000 },
  /** Standard rate limit for most POST requests (10 req/min) */
  standard: { max: 10, windowMs: 60_000 },
  /** Moderate rate limit for GET requests (50 req/min) */
  moderate: { max: 50, windowMs: 60_000 },
  /** Relaxed rate limit for public endpoints (100 req/min) */
  relaxed: { max: 100, windowMs: 60_000 },
} as const;

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: NextRequest): string {
  return request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Check if request is rate limited
 */
export function isRateLimited(
  request: NextRequest,
  config: RateLimitConfig = RateLimitPresets.standard
): boolean {
  const identifier = config.identifier || getClientIdentifier(request);
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Create new entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return false;
  }

  // Increment count
  entry.count++;

  return entry.count > config.max;
}

/**
 * Get rate limit response with Retry-After header
 */
export function rateLimitResponse(request: NextRequest, config?: RateLimitConfig): NextResponse {
  const identifier = config?.identifier || getClientIdentifier(request);
  const entry = rateLimitStore.get(identifier);

  if (entry) {
    const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        success: false,
        error: "Too many requests - Please try again later",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
}

/**
 * Utility function to apply rate limiting
 * Returns null if not rate limited, otherwise returns error response
 */
export function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RateLimitPresets.standard
): NextResponse | null {
  if (isRateLimited(request, config)) {
    return rateLimitResponse(request, config);
  }
  return null;
}
