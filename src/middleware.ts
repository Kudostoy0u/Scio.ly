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


  const xfProto = req.headers.get("x-forwarded-proto");
  const xfHost  = req.headers.get("x-forwarded-host");
  const host    = req.headers.get("host");

  const proto = xfProto ?? "http"; // use xfproto when available
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


  const attachCors = (res: NextResponse, allowOrigin: string | null) => {
    if (allowOrigin) res.headers.set("Access-Control-Allow-Origin", allowOrigin);
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-API-KEY");

    res.headers.set("Vary", "Origin");
    return res;
  };

  // handle preflight
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    const allowOrigin = isOriginAllowed ? origin : (hasValidKey ? (origin ?? "*") : null);
    return attachCors(res, allowOrigin);
  }

  if (isOriginAllowed || hasValidKey) {
    const res = NextResponse.next();

    // or wildcard. choosing origin if present is safer for browser cors.
    const allowOrigin = isOriginAllowed ? origin : (origin ?? "*");
    return attachCors(res, allowOrigin);
  }


  const res = new NextResponse("Forbidden", { status: 403 });
  // don't expose cors allow header here (browser will block), but set vary to be explicit
  res.headers.set("Vary", "Origin");
  return res;
}


export const config = {
  matcher: "/api/:path*",
};
