import { NextRequest, NextResponse } from 'next/server';

// Best-practice CORS & API auth middleware for /api routes
// - Allows same-origin requests automatically (browser requests from your site)
// - Allows common dev hosts (localhost) during development
// - Supports an internal bypass key for server-side internal fetches (set INTERNAL_API_KEY)
// - Uses API_KEYS env var (comma-separated) for external API key auth
// - Restricts Access-Control-Allow-Origin to the request origin when allowed (safer than '*')

const DEFAULT_ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://scio.ly').split(',').map(s => s.trim()).filter(Boolean);
const DEV_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

// CORS header names we'll set per-response. Access-Control-Allow-Origin will be set dynamically.
const baseCorsHeaders: Record<string, string> = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Internal-API-Key',
  'Access-Control-Max-Age': '86400',
};

function normalizeHost(host: string) {
  // strip leading scheme if present, and 'www.' prefix
  if (!host) return host;
  return host.replace(/^www\./i, '').toLowerCase();
}

function isDevOrigin(originHost: string) {
  if (!originHost) return false;
  return originHost.startsWith('localhost') || originHost.startsWith('127.0.0.1');
}

function buildCorsHeadersForOrigin(origin: string | null) {
  const headers: Record<string, string> = { ...baseCorsHeaders };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    // fallback - safer to not expose to all origins in production
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return headers;
}

// Validate whether the request should be allowed without API key
function shouldBypassAuth(request: NextRequest): { allowed: boolean; allowedOrigin: string | null } {
  const pathname = request.nextUrl.pathname;

  // Public endpoints (always allow)
  const publicEndpoints = [
    '/api/docs',
    '/api/meta/events',
    '/api/meta/tournaments',
    '/api/meta/subtopics',
    '/api/meta/stats',
  ];
  if (publicEndpoints.includes(pathname)) return { allowed: true, allowedOrigin: request.headers.get('origin') };

  // Determine host and origin (with fallbacks)
  const forwardedHost = request.headers.get('x-forwarded-host') || '';
  const hostHeader = request.headers.get('host') || forwardedHost || '';
  const host = normalizeHost(hostHeader);

  const originHeader = request.headers.get('origin') || '';
  const refererHeader = request.headers.get('referer') || '';
  let originHost = '';
  let origin: string | null = null;
  if (originHeader) {
    try { originHost = normalizeHost(new URL(originHeader).host); origin = originHeader; } catch {}
  } else if (refererHeader) {
    try { originHost = normalizeHost(new URL(refererHeader).host); origin = refererHeader; } catch {}
  }

  // sec-fetch-site is a reliable hint from browsers
  const secFetchSite = request.headers.get('sec-fetch-site') || '';
  if (secFetchSite === 'same-origin' || secFetchSite === 'same-site') {
    // Use Origin header if present as allowed origin
    const allowedOrigin = originHeader || (host ? `${request.nextUrl.protocol || 'https'}://${host}` : null);
    return { allowed: true, allowedOrigin };
  }

  // Same-origin: origin host equals host header
  if (originHost && host && originHost === host) {
    // allowed; return the canonical origin
    const canonicalOrigin = originHeader ? originHeader : (host ? `https://${host}` : null);
    return { allowed: true, allowedOrigin: canonicalOrigin };
  }

  // Allow known dev origins (useful when running frontend on a different dev port)
  if (originHeader && DEV_ALLOWED_ORIGINS.includes(originHeader)) {
    return { allowed: true, allowedOrigin: originHeader };
  }

  // Allow if origin host matches configured allowed origins
  if (originHeader) {
    const allowed = DEFAULT_ALLOWED_ORIGINS.some(a => a === originHeader || normalizeHost(a) === originHost);
    if (allowed) return { allowed: true, allowedOrigin: originHeader };
  }

  // Allow internal bypass for server-side internal calls if they provide the internal key
  const internalKey = process.env.INTERNAL_API_KEY || '';
  const internalHeader = request.headers.get('x-internal-api-key') || request.headers.get('x-internal-api');
  if (internalKey && internalHeader && internalHeader === internalKey) {
    // Bypass (no CORS origin to set) - trusted internal consumer
    return { allowed: true, allowedOrigin: null };
  }

  return { allowed: false, allowedOrigin: originHeader || null };
}

function extractApiKey(request: NextRequest) {
  return (
    request.headers.get('X-API-Key') ||
    request.headers.get('x-api-key') ||
    request.headers.get('Authorization')?.replace('Bearer ', '') ||
    request.nextUrl.searchParams.get('api_key') ||
    null
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to /api routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Handle CORS preflight requests specially: determine origin and return appropriate headers
  if (request.method === 'OPTIONS') {
    const originHeader = request.headers.get('origin');
    const { allowed, allowedOrigin } = shouldBypassAuth(request);
    const corsHeaders = buildCorsHeadersForOrigin(allowedOrigin || originHeader || null);
    return new NextResponse(null, { status: 200, headers: corsHeaders });
  }

  // Determine if bypass allowed
  const { allowed, allowedOrigin } = shouldBypassAuth(request);
  if (allowed) {
    // If bypassed, still set CORS headers (allow the origin when present)
    const cors = buildCorsHeadersForOrigin(allowedOrigin || request.headers.get('origin'));
    const res = NextResponse.next();
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  // Not bypassed -> require API key
  const apiKey = extractApiKey(request);
  const validApiKeys = process.env.API_KEYS?.split(',').map(k => k.trim()).filter(Boolean) || [];
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    const originHeader = request.headers.get('origin') || null;
    const cors = buildCorsHeadersForOrigin(originHeader);
    return new NextResponse(JSON.stringify({ success: false, error: 'API_KEY_REQUIRED', message: 'Valid API key required. Contact us to request an API key.' }), {
      status: 401,
      headers: Object.assign({ 'Content-Type': 'application/json' }, cors),
    });
  }

  // Valid API key: attach CORS headers for the request origin if present
  const originHeader = request.headers.get('origin') || null;
  const cors = buildCorsHeadersForOrigin(originHeader);
  const res = NextResponse.next();
  Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
