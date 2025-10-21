import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Only apply caching to the main page
  if (request.nextUrl.pathname === '/') {
    // Set aggressive caching headers for the main page
    response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    response.headers.set('CDN-Cache-Control', 'max-age=86400');
    response.headers.set('Vercel-CDN-Cache-Control', 'max-age=86400');
    
    // Add ETag for better caching
    const etag = `"main-page-${Date.now()}"`;
    response.headers.set('ETag', etag);
    
    // Add Vary header to ensure proper caching
    response.headers.set('Vary', 'Accept-Encoding');
    
    // Add Last-Modified header
    response.headers.set('Last-Modified', new Date().toUTCString());
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
