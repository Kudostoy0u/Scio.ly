import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getQuotesByLanguage, ensureQuotesTableExists } from '@/lib/db/utils';
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
});

// Types - ValidatedQuoteFilters is inferred from the schema

// Business logic functions
const fetchQuotes = async (language: string, limit: number) => {
  const sanitizedLanguage = sanitizeInput(language);
  
  // Check if quotes table exists
  const tableExists = await ensureQuotesTableExists();
  if (!tableExists) {
    throw new Error('Quotes table does not exist in the database. Please run database migrations.');
  }
  
  const quotes = await getQuotesByLanguage(sanitizedLanguage, limit);
  
  if (!quotes || quotes.length === 0) {
    throw new Error(`No quotes found for language: ${sanitizedLanguage}`);
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
    
    const quotes = await fetchQuotes(filters.language, filters.limit);
    
    const response = createSuccessResponse({ quotes });
    logApiResponse('GET', '/api/quotes', 200, Date.now() - startTime);
    return response;
  } catch (error) {
    const response = handleApiError(error);
    logApiResponse('GET', '/api/quotes', response.status, Date.now() - startTime);
    return response;
  }
} 