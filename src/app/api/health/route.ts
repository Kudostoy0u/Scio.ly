import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/neon';
import { geminiService } from '@/lib/services/gemini';

// GET /api/health - Health check endpoint
export async function GET() {
  try {
    console.log('💚 [HEALTH] Health check requested');

    // Test database connection
    const dbHealthy = await testConnection();
    
    // Check Gemini AI availability
    const aiHealthy = geminiService.isAvailable();

    const healthData = {
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

    console.log(`💚 [HEALTH] Health check completed - Status: ${overallHealthy ? 'healthy' : 'unhealthy'}`);
    console.log(`💚 [HEALTH] Database: ${dbHealthy ? 'connected' : 'disconnected'}, AI: ${aiHealthy ? 'available' : 'unavailable'}`);

    return NextResponse.json(healthData, { 
      status: overallHealthy ? 200 : 503 
    });
  } catch (error) {
    console.error('❌ [HEALTH] Health check failed:', error);
    
    const errorData = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      version: '2.0.0-typescript',
      environment: process.env.NODE_ENV || 'development',
    };

    return NextResponse.json(errorData, { status: 500 });
  }
}