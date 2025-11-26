import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Regex patterns for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Authentication result for API routes
 */
export interface AuthResult {
  user: User | null;
  error: NextResponse | null;
}

/**
 * Validates authentication for API routes
 * Returns user if authenticated, or error response if not
 */
export async function validateAuth(
  _request: NextRequest
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        success: false,
        error: "Unauthorized - Please sign in",
      };
    }

    return { success: true, user };
  } catch {
    return {
      success: false,
      error: "Authentication failed",
    };
  }
}

/**
 * Validates authentication for API routes
 * Returns user if authenticated, or error response if not
 */
export async function requireAuth(_request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        error: NextResponse.json(
          { success: false, error: "Unauthorized - Please sign in" },
          { status: 401 }
        ),
      };
    }

    return { user, error: null };
  } catch {
    return {
      user: null,
      error: NextResponse.json({ success: false, error: "Authentication failed" }, { status: 500 }),
    };
  }
}

/**
 * Get current user from request
 */
export async function getCurrentUser(_request: NextRequest): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Optional authentication - returns user if present, but doesn't fail if not
 */
export async function optionalAuth(_request: NextRequest): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Validates user has admin role
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const { user, error } = await requireAuth(request);

  if (error || !user) {
    return { user: null, error: null };
  }

  // Check if user has admin role
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  if ((profile as { role?: string } | null)?.role !== "admin") {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: "Forbidden - Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * Rate limit tracking (simple in-memory implementation)
 * For production, use Redis or similar
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiting utility function
 */
export function rateLimit(identifier: string, limit = 100, windowMs = 60000): NextResponse | null {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return null;
  }

  if (userLimit.count >= limit) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many requests - Please try again later",
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((userLimit.resetTime - now) / 1000)),
        },
      }
    );
  }

  userLimit.count++;
  return null;
}

/**
 * Validates request body against expected schema
 */
export function validateRequestBody<T>(
  body: unknown,
  requiredFields: (keyof T)[]
): { valid: boolean; error?: NextResponse } {
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      error: NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }),
    };
  }

  const missingFields = requiredFields.filter(
    (field) => !(field in body) || (body as Record<string, unknown>)[field as string] == null
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      ),
    };
  }

  return { valid: true };
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}
