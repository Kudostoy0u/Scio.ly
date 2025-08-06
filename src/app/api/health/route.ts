
import { NextRequest } from 'next/server';
import { testConnection, ensureQuotesTableExists } from '@/lib/db';
import { 
  handleApiError, 
  createSuccessResponse, 
  logApiRequest,
  logApiResponse
} from '@/lib/api/utils';

export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  logApiRequest('GET', '/api/health', {});
  
  try {
    // Test database connection
    const dbConnected = await testConnection();
    const quotesTableExists = await ensureQuotesTableExists();
    
    const health = {
      status: 'healthy',
      database: {
        connected: dbConnected,
        quotesTableExists: quotesTableExists
      },
      timestamp: new Date().toISOString()
    };
    
    const response = createSuccessResponse(health);
    logApiResponse('GET', '/api/health', 200, Date.now() - startTime);
    return response;
  } catch (error) {
    const response = handleApiError(error);
    logApiResponse('GET', '/api/health', response.status, Date.now() - startTime);
    return response;
  }
}