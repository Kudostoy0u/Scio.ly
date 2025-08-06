
import { testConnection } from '@/lib/neon';
import { geminiService } from '@/lib/services/gemini';
import { 
  createSuccessResponse, 
  createErrorResponse,
  logApiRequest,
  logApiResponse
} from '@/lib/api/utils';

// Types
interface HealthData {
  status: 'healthy' | 'unhealthy' | 'error';
  timestamp: string;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      provider: string;
    };
    ai: {
      status: 'available' | 'unavailable';
      provider: string;
    };
  };
  version: string;
  environment: string;
}

// Business logic functions
const performHealthCheck = async (): Promise<HealthData> => {
  console.log('💚 [HEALTH] Health check requested');

  // Test database connection
  const dbHealthy = await testConnection();
  
  // Check Gemini AI availability
  const aiHealthy = geminiService.isAvailable();

  const healthData: HealthData = {
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbHealthy ? 'connected' : 'disconnected',
        provider: 'Neon PostgreSQL',
      },
      ai: {
        status: aiHealthy ? 'available' : 'unavailable',
        provider: 'Gemini 2.5 Flash Lite',
      },
    },
    version: '2.0.0-typescript',
    environment: process.env.NODE_ENV || 'development',
  };

  const overallHealthy = dbHealthy && aiHealthy;
  healthData.status = overallHealthy ? 'healthy' : 'unhealthy';

  console.log(`💚 [HEALTH] Health check completed - Status: ${healthData.status}`);
  console.log(`💚 [HEALTH] Database: ${healthData.services.database.status}, AI: ${healthData.services.ai.status}`);

  return healthData;
};

// API Handlers
export async function GET() {
  const startTime = Date.now();
  logApiRequest('GET', '/api/health');
  
  try {
    const healthData = await performHealthCheck();
    
    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    const response = createSuccessResponse(healthData);
    
    logApiResponse('GET', '/api/health', statusCode, Date.now() - startTime);
    return response;
  } catch (error) {
    console.error('❌ [HEALTH] Health check failed:', error);
    
    // Log error data for debugging
    console.error('Health check error data:', {
      status: 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'disconnected', provider: 'Neon PostgreSQL' },
        ai: { status: 'unavailable', provider: 'Gemini 2.5 Flash Lite' },
      },
      version: '2.0.0-typescript',
      environment: process.env.NODE_ENV || 'development',
    });
    
    const response = createErrorResponse('Health check failed', 500);
    logApiResponse('GET', '/api/health', 500, Date.now() - startTime);
    return response;
  }
}