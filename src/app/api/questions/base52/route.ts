import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse, logApiRequest, logApiResponse } from '@/lib/api/utils';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = ALPHABET.length; // 52
const CODE_LENGTH = 5;

function encodeBase52(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('Index must be a non-negative integer');
  }
  let n = index;
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out = ALPHABET[n % BASE] + out;
    n = Math.floor(n / BASE);
  }
  if (n > 0) {
    throw new Error(`Index too large for ${CODE_LENGTH}-char base52`);
  }
  return out;
}

// GET /api/questions/base52?index=N -> { code }
export async function GET(request: NextRequest) {
  const start = Date.now();
  logApiRequest('GET', '/api/questions/base52', Object.fromEntries(request.nextUrl.searchParams));
  try {
    const indexParam = request.nextUrl.searchParams.get('index');
    if (indexParam === null) {
      return createErrorResponse('Missing query parameter: index', 400, 'MISSING_INDEX');
    }
    const index = Number(indexParam);
    if (!Number.isFinite(index) || !Number.isInteger(index) || index < 0) {
      return createErrorResponse('Invalid index', 400, 'INVALID_INDEX');
    }

    const code = encodeBase52(index);
    const res = createSuccessResponse({ index, code });
    logApiResponse('GET', '/api/questions/base52', 200, Date.now() - start);
    return res;
  } catch {
    const res = createErrorResponse('Failed to generate base52 code', 500, 'ENCODE_ERROR');
    logApiResponse('GET', '/api/questions/base52', 500, Date.now() - start);
    return res;
  }
}


