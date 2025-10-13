
import { testConnection } from '@/lib/db';
import { geminiService } from '@/lib/services/gemini';
import { 
  createSuccessResponse, 
  createErrorResponse,
  logApiRequest,
  logApiResponse
} from '@/lib/api/utils';

/**
 * Health check API endpoint for Scio.ly platform
 * Provides comprehensive system health monitoring including database and AI service status
 */

/**
 * Health data interface for system status reporting
 */
interface HealthData {
  /** Overall system health status */
  status: 'healthy' | 'unhealthy' | 'error';
  /** Timestamp of health check */
  timestamp: string;
  /** Service status information */
  services: {
    /** Database service status */
    database: {
      /** Database connection status */
      status: 'connected' | 'disconnected';
      /** Database provider name */
      provider: string;
    };
    /** AI service status */
    ai: {
      /** AI service availability status */
      status: 'available' | 'unavailable';
      /** AI service provider name */
      provider: string;
    };
  };
  /** Application version */
  version: string;
  /** Environment name */
  environment: string;
}


/**
 * Performs comprehensive health check of all system services
 * Tests database connectivity and AI service availability
 * 
 * @returns {Promise<HealthData>} Health status data for all services
 * @throws {Error} When health check fails
 * @example
 * ```typescript
 * const healthData = await performHealthCheck();
 * console.log(healthData.status); // 'healthy' | 'unhealthy' | 'error'
 * ```
 */
const performHealthCheck = async (): Promise<HealthData> => {
  console.log('💚 [HEALTH] Health check requested');

  // Test database connectivity
  const dbHealthy = await testConnection();
  
  // Check AI service availability
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


/**
 * GET /api/health - Health check endpoint
 * Returns comprehensive system health status including database and AI service availability
 * 
 * @returns {Promise<Response>} Health status response with 200 (healthy) or 503 (unhealthy)
 * @throws {Error} When health check fails completely
 * @example
 * ```typescript
 * const response = await fetch('/api/health');
 * const healthData = await response.json();
 * console.log(healthData.status); // System health status
 * ```
 */
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