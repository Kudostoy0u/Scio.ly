import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { streamlinedTeamsService } from '@/lib/services/streamlined-teams';
import { GetTeamDataRequestSchema } from '@/lib/schemas/team';
import { TeamDataQuerySchema } from '@/lib/schemas/validation';

/**
 * Streamlined Teams Data API
 * 
 * Single endpoint for all team data with:
 * - Intelligent caching
 * - Request batching
 * - Optimized database queries
 * - Background refresh
 * - Request deduplication
 */

// GET /api/teams/data - Get comprehensive team data
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  
  console.log('🚀 [STREAMLINED TEAMS API] GET request started', { 
    timestamp: new Date().toISOString(),
    url: request.url 
  });

  try {
    // Get authenticated user
    const user = await getServerUser();
    if (!user?.id) {
      console.log('❌ [STREAMLINED TEAMS API] Unauthorized - no user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const teamSlug = searchParams.get('teamSlug');
    
    if (!teamSlug) {
      console.log('❌ [STREAMLINED TEAMS API] Missing teamSlug parameter');
      return NextResponse.json({ error: 'teamSlug parameter is required' }, { status: 400 });
    }

    // Parse and validate query parameters
    const queryParams = {
      includeSubteams: searchParams.get('includeSubteams') || 'true',
      includeMembers: searchParams.get('includeMembers') || 'true',
      includeRoster: searchParams.get('includeRoster') || 'false',
      includeStream: searchParams.get('includeStream') || 'false',
      includeAssignments: searchParams.get('includeAssignments') || 'false',
      subteamId: searchParams.get('subteamId') || undefined
    };

    const validatedQuery = TeamDataQuerySchema.parse(queryParams);

    // Build request object
    const teamDataRequest = {
      teamSlug,
      includeSubteams: validatedQuery.includeSubteams,
      includeMembers: validatedQuery.includeMembers,
      includeRoster: validatedQuery.includeRoster,
      includeStream: validatedQuery.includeStream,
      includeAssignments: validatedQuery.includeAssignments,
      subteamId: validatedQuery.subteamId
    };

    console.log('📋 [STREAMLINED TEAMS API] Request params', { 
      teamSlug,
      userId,
      ...teamDataRequest
    });

    // Get team data using streamlined service
    const teamData = await streamlinedTeamsService.getTeamData(userId, teamDataRequest);

    const duration = Date.now() - startTime;
    console.log('✅ [STREAMLINED TEAMS API] Request completed successfully', {
      duration: `${duration}ms`,
      teamSlug,
      userId,
      includeSubteams: teamDataRequest.includeSubteams,
      includeMembers: teamDataRequest.includeMembers,
      includeRoster: teamDataRequest.includeRoster
    });

    return NextResponse.json(teamData);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [STREAMLINED TEAMS API] Error fetching team data:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      userId: userId
    });

    if (error instanceof Error && error.message === 'Team not found') {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'Not authorized to access this team') {
      return NextResponse.json({ error: 'Not authorized to access this team' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/teams/data - Batch multiple team data requests
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  
  console.log('🚀 [STREAMLINED TEAMS API] POST batch request started', { 
    timestamp: new Date().toISOString(),
    url: request.url 
  });

  try {
    // Get authenticated user
    const user = await getServerUser();
    if (!user?.id) {
      console.log('❌ [STREAMLINED TEAMS API] Unauthorized - no user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = user.id;

    // Parse batch request
    const body = await request.json();
    const { requests } = body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json({ error: 'Invalid batch request format' }, { status: 400 });
    }

    if (requests.length > 10) {
      return NextResponse.json({ error: 'Too many requests in batch (max 10)' }, { status: 400 });
    }

    console.log('📋 [STREAMLINED TEAMS API] Batch request params', { 
      requestCount: requests.length,
      userId
    });

    // Process all requests in parallel
    const results = await Promise.allSettled(
      requests.map(async (req: any) => {
        const validatedRequest = GetTeamDataRequestSchema.parse(req);
        return await streamlinedTeamsService.getTeamData(userId!, validatedRequest);
      })
    );

    // Format results
    const batchResults = results.map((result, index) => ({
      index,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));

    const duration = Date.now() - startTime;
    console.log('✅ [STREAMLINED TEAMS API] Batch request completed', {
      duration: `${duration}ms`,
      requestCount: requests.length,
      successCount: batchResults.filter(r => r.success).length,
      errorCount: batchResults.filter(r => !r.success).length,
      userId
    });

    return NextResponse.json({ results: batchResults });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [STREAMLINED TEAMS API] Error processing batch request:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      userId: userId
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
