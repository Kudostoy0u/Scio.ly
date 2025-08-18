import { NextRequest, NextResponse } from 'next/server';

// GET /api/docs - Redirect to React-based API documentation
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  
  return NextResponse.redirect(`${baseUrl}/docs/api`);
} 