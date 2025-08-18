import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "https://scio.ly",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function getApiKeyFromReq(req: NextRequest) {
  const header = req.headers.get("x-api-key") ?? "";
  const urlKey = new URL(req.url).searchParams.get("api_key") ?? "";
  return { header, urlKey };
}
function detectOrigin(req: NextRequest): string | null {
  const originHeader = req.headers.get("origin");
  if (originHeader) return originHeader;

  // Build from proxy headers (safe only if you control/trust the proxy)
  const xfProto = req.headers.get("x-forwarded-proto");
  const xfHost  = req.headers.get("x-forwarded-host");
  const host    = req.headers.get("host");

  const proto = xfProto ?? "http"; // use xfProto when available
  const h = xfHost ?? host;
  if (!h) return null;
  return `${proto}://${h}`;
}


export function middleware(req: NextRequest) {
  const origin = detectOrigin(req); // may be null for same-origin/server requests
  console.log("origin", origin);
  const isOriginAllowed = origin !== null && ALLOWED_ORIGINS.has(origin);

  const { header: headerKey, urlKey } = getApiKeyFromReq(req);
  const expectedKey = process.env.API_KEY ?? "";
  const hasValidKey = (headerKey === expectedKey) || (urlKey === expectedKey);

  // Build a function to attach common CORS headers to a response
  const attachCors = (res: NextResponse, allowOrigin: string | null) => {
    if (allowOrigin) res.headers.set("Access-Control-Allow-Origin", allowOrigin);
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-API-KEY");
    // If you don't use credentials, you can skip Access-Control-Allow-Credentials.
    res.headers.set("Vary", "Origin");
    return res;
  };

  // handle preflight
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    const allowOrigin = isOriginAllowed ? origin : (hasValidKey ? (origin ?? "*") : null);
    return attachCors(res, allowOrigin);
  }
  // Allowed by origin OR valid API key
  if (isOriginAllowed || hasValidKey) {
    const res = NextResponse.next();
    // If origin is allowed use it; otherwise (API key case) allow either the origin (if present)
    // or wildcard. Choosing origin if present is safer for browser CORS.
    const allowOrigin = isOriginAllowed ? origin : (origin ?? "*");
    return attachCors(res, allowOrigin);
  }

  // Deny
  const res = new NextResponse("Forbidden", { status: 403 });
  // don't expose CORS allow header here (browser will block), but set Vary to be explicit
  res.headers.set("Vary", "Origin");
  return res;
}

// Apply middleware only to API routes; adjust matcher if you want it global
export const config = {
  matcher: "/api/:path*",
};
