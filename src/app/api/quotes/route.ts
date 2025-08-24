import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getQuotesByLanguage } from '@/lib/db/utils';
import { 
  handleApiError, 
  createSuccessResponse, 
  parseQueryParams,
  logApiRequest,
  logApiResponse,
  sanitizeInput
} from '@/lib/api/utils';

// Validation schemas
const QuoteFiltersSchema = z.object({
  language: z.string().min(1, 'Language is required').default('en'),
  limit: z.coerce.number().int().positive().max(200).optional().default(50),
  charLengthMin: z.coerce.number().int().positive().optional(),
  charLengthMax: z.coerce.number().int().positive().optional(),
});

// Types - ValidatedQuoteFilters is inferred from the schema

// Business logic functions
const fetchQuotes = async (language: string, limit: number, charLengthRange?: { min: number; max: number }) => {
  const sanitizedLanguage = sanitizeInput(language);
  const quotes = await getQuotesByLanguage(sanitizedLanguage, limit, charLengthRange);
  
  if (!quotes || quotes.length === 0) {
    throw new Error(`No quotes found for language: ${sanitizedLanguage}${charLengthRange ? ` with character length range ${charLengthRange.min}-${charLengthRange.max}` : ''}`);
  }
  
  return quotes.map(quote => ({
    id: quote.id,
    author: quote.author,
    quote: quote.quote
  }));
};

// API Handlers
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logApiRequest('GET', '/api/quotes', Object.fromEntries(request.nextUrl.searchParams));
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = parseQueryParams(searchParams, QuoteFiltersSchema);
    
    // Build character length range if both min and max are provided
    let charLengthRange: { min: number; max: number } | undefined;
    if (filters.charLengthMin && filters.charLengthMax) {
      charLengthRange = {
        min: Math.min(filters.charLengthMin, filters.charLengthMax),
        max: Math.max(filters.charLengthMin, filters.charLengthMax)
      };
    }
    
    const quotes = await fetchQuotes(filters.language, filters.limit, charLengthRange);
    
    const response = createSuccessResponse({ quotes });
    logApiResponse('GET', '/api/quotes', 200, Date.now() - startTime);
    return response;
  } catch (error) {
    const response = handleApiError(error);
    logApiResponse('GET', '/api/quotes', response.status, Date.now() - startTime);
    return response;
  }
} 