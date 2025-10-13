import { NextRequest, NextResponse } from 'next/server';
import { dbPg } from '@/lib/db';
import { newTeamGroups, newTeamUnits } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getServerUser } from '@/lib/supabaseServer';
import { getTeamAccessCockroach } from '@/lib/utils/team-auth-v2';

// GET /api/teams/[teamId]/subteams - Get all subteams for a team group
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchSubteams)
// - src/lib/utils/globalApiCache.ts (getSubteams)
// - src/app/hooks/useEnhancedTeamData.ts (fetchSubteams)
// - src/app/hooks/useTeamData.ts (fetchSubteams)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const startTime = Date.now();
  let teamId: string | undefined;
  let user: any;
  
  console.log('🏢 [SUBNTEAMS API] GET request started', { 
    timestamp: new Date().toISOString(),
    url: request.url 
  });

  try {
    user = await getServerUser();
    if (!user?.id) {
      console.log('❌ [SUBNTEAMS API] Unauthorized - no user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId: paramTeamId } = await params;
    teamId = paramTeamId;
    console.log('📋 [SUBNTEAMS API] Request params', { teamId, userId: user.id });

    // Resolve team slug to group ID using Drizzle ORM
    console.log('🔍 [SUBNTEAMS API] Resolving team slug to group ID');
    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId));

    if (groupResult.length === 0) {
      console.log('❌ [SUBNTEAMS API] Team group not found', { teamId });
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult[0].id;
    console.log('✅ [SUBNTEAMS API] Team group resolved', { teamId, groupId });

    // Check if user has access to this team group using new auth system
    console.log('🔐 [SUBNTEAMS API] Checking team access');
    const teamAccess = await getTeamAccessCockroach(user.id, groupId);
    console.log('🔐 [SUBNTEAMS API] Team access result', { 
      userId: user.id, 
      groupId, 
      hasAccess: teamAccess.hasAccess 
    });

    if (!teamAccess.hasAccess) {
      console.log('❌ [SUBNTEAMS API] Access denied', { userId: user.id, groupId });
      return NextResponse.json({ error: 'Not authorized to access this team' }, { status: 403 });
    }

    // Get all subteams for this group using Drizzle ORM
    console.log('🏢 [SUBNTEAMS API] Fetching subteams');
    const subteamsResult = await dbPg
      .select({
        id: newTeamUnits.id,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description,
        createdAt: newTeamUnits.createdAt
      })
      .from(newTeamUnits)
      .where(
        and(
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamUnits.status, 'active')
        )
      )
      .orderBy(newTeamUnits.createdAt);

    const subteams = subteamsResult.map(subteam => ({
      id: subteam.id,
      name: subteam.description || `Team ${subteam.teamId}`, // Use description as name, fallback to Team + letter
      teamId: subteam.teamId,
      description: subteam.description,
      createdAt: subteam.createdAt
    }));

    const duration = Date.now() - startTime;
    console.log('✅ [SUBNTEAMS API] Request completed successfully', {
      duration: `${duration}ms`,
      subteamCount: subteams.length,
      teamId: teamId,
      userId: user.id
    });

    return NextResponse.json({ subteams });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [SUBNTEAMS API] Error fetching subteams:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      teamId: teamId,
      userId: user?.id
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/teams/[teamId]/subteams - Create a new subteam
// Frontend Usage:
// - src/app/teams/components/TeamDashboard.tsx (createSubteam)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const startTime = Date.now();
  let teamId: string | undefined;
  let user: any;
  
  console.log('🏢 [SUBNTEAMS API] POST request started', { 
    timestamp: new Date().toISOString(),
    url: request.url 
  });

  try {
    user = await getServerUser();
    if (!user?.id) {
      console.log('❌ [SUBNTEAMS API] Unauthorized - no user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId: paramTeamId } = await params;
    teamId = paramTeamId;
    const body = await request.json();
    const { name, description } = body;

    console.log('📋 [SUBNTEAMS API] Request params', { 
      teamId, 
      name, 
      description, 
      userId: user.id 
    });

    if (!name) {
      console.log('❌ [SUBNTEAMS API] Missing required fields');
      return NextResponse.json({ 
        error: 'Name is required' 
      }, { status: 400 });
    }

    // Resolve team slug to group ID using Drizzle ORM
    console.log('🔍 [SUBNTEAMS API] Resolving team slug to group ID');
    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId));

    if (groupResult.length === 0) {
      console.log('❌ [SUBNTEAMS API] Team group not found', { teamId });
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult[0].id;
    console.log('✅ [SUBNTEAMS API] Team group resolved', { teamId, groupId });

    // Check if user has leadership access
    console.log('🔐 [SUBNTEAMS API] Checking leadership access');
    const teamAccess = await getTeamAccessCockroach(user.id, groupId);
    const hasLeadership = teamAccess.isCreator || 
      teamAccess.subteamMemberships.some(m => ['captain', 'co_captain'].includes(m.role));

    console.log('🔐 [SUBNTEAMS API] Leadership check result', { 
      userId: user.id, 
      groupId, 
      hasLeadership,
      isCreator: teamAccess.isCreator,
      leadershipRoles: teamAccess.subteamMemberships.filter(m => ['captain', 'co_captain'].includes(m.role))
    });

    if (!hasLeadership) {
      console.log('❌ [SUBNTEAMS API] Leadership access denied', { userId: user.id, groupId });
      return NextResponse.json({ 
        error: 'Only captains and co-captains can create subteams' 
      }, { status: 403 });
    }

    // Create new subteam using Drizzle ORM
    console.log('🏢 [SUBNTEAMS API] Creating new subteam');
    
    // Get existing subteams to determine the next available team ID
    // Check ALL subteams regardless of status since the unique constraint applies to all
    const existingSubteams = await dbPg
      .select({ teamId: newTeamUnits.teamId })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, groupId));
    
    const existingTeamIds = new Set(existingSubteams.map(s => s.teamId));
    
    console.log('🏢 [SUBNTEAMS API] All existing subteams in group', { 
      groupId, 
      allSubteams: existingSubteams,
      existingTeamIds: Array.from(existingTeamIds)
    });
    
    // Generate the next available team ID letter
    let teamIdLetter = 'A';
    while (existingTeamIds.has(teamIdLetter)) {
      teamIdLetter = String.fromCharCode(teamIdLetter.charCodeAt(0) + 1);
    }
    
    // If we've gone past Z, use a numeric suffix
    if (teamIdLetter > 'Z') {
      let counter = 1;
      teamIdLetter = `T${counter}`;
      while (existingTeamIds.has(teamIdLetter)) {
        counter++;
        teamIdLetter = `T${counter}`;
      }
    }
    
    console.log('🏢 [SUBNTEAMS API] Generated team ID', { 
      teamIdLetter, 
      existingTeamIds: Array.from(existingTeamIds),
      requestedName: name 
    });
    
    const [newSubteam] = await dbPg
      .insert(newTeamUnits)
      .values({
        groupId: groupId,
        teamId: teamIdLetter,
        description: description || name, // Use provided description or fallback to name
        captainCode: `CAP${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        userCode: `USR${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        createdBy: user.id
      })
      .returning();

    const duration = Date.now() - startTime;
    console.log('✅ [SUBNTEAMS API] Subteam created successfully', {
      duration: `${duration}ms`,
      subteamId: newSubteam.id,
      teamId: teamId,
      userId: user.id
    });

    return NextResponse.json({ 
      id: newSubteam.id,
      name: newSubteam.description || `Team ${newSubteam.teamId}`, // Use description as name, fallback to Team + letter
      team_id: newSubteam.teamId,
      description: newSubteam.description,
      created_at: newSubteam.createdAt
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [SUBNTEAMS API] Error creating subteam:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      teamId: teamId,
      userId: user?.id
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
