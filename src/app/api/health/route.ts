
import { testConnection } from '@/lib/db';
import { geminiService } from '@/lib/services/gemini';
import { 
  createSuccessResponse, 
  createErrorResponse,
  logApiRequest,
  logApiResponse
} from '@/lib/api/utils';


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


const performHealthCheck = async (): Promise<HealthData> => {
  console.log('💚 [HEALTH] Health check requested');


  const dbHealthy = await testConnection();
  

  const aiHealthy = geminiService.isAvailable();

  const healthData: HealthData = {
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbHealthy ? 'connected' : 'disconnected',
        provider: 'PostgreSQL',
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
    

    console.error('Health check error data:', {
      status: 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'disconnected', provider: 'PostgreSQL' },
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