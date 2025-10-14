import { NextRequest, NextResponse } from 'next/server';
import { cockroachDBTeamsService } from '@/lib/services/cockroachdb-teams';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { upsertUserProfile } from '@/lib/db/teams/utils';
import logger from '@/lib/utils/logger';

// POST /api/teams/create - Create a new team
// Frontend Usage:
// - src/app/teams/components/TeamsPageClient.tsx (createTeam)

// Type for user profile data
interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}

// Helper function to get real user data from Supabase
async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, first_name, last_name, username')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      console.warn(`Failed to fetch user profile for ${userId}:`, error);
      return null;
    }
    
    return data as UserProfile;
  } catch (error) {
    console.warn(`Error fetching user profile for ${userId}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if CockroachDB is properly configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is missing'
      }, { status: 500 });
    }

    // Get user from Supabase auth
    const { getServerUser } = await import('@/lib/supabaseServer');
    const user = await getServerUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user.id;
    console.log(`Team creation request from user: ${userId}`);

    const body = await request.json();
    const { school, division } = body;

    if (!school || !division) {
      return NextResponse.json({ error: 'School and division are required' }, { status: 400 });
    }

    if (!['B', 'C'].includes(division)) {
      return NextResponse.json({ error: 'Division must be B or C' }, { status: 400 });
    }

    // Generate unique slug with timestamp to prevent collisions
    const baseSlug = `${school.toLowerCase().replace(/\s+/g, '-')}-${division.toLowerCase()}`;
    const timestamp = Date.now().toString(36);
    const slug = `${baseSlug}-${timestamp}`;

    // Before team creation, ensure the creator has a meaningful display_name
    try {
      const supabase = await createSupabaseServerClient();
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id, email, display_name, first_name, last_name, username')
        .eq('id', userId)
        .maybeSingle();

      const email: string | undefined = (existingProfile as any)?.email || user.email || undefined;
      const currentDisplay = (existingProfile as any)?.display_name as string | null | undefined;
      const firstName = (existingProfile as any)?.first_name as string | null | undefined;
      const lastName = (existingProfile as any)?.last_name as string | null | undefined;
      const username = (existingProfile as any)?.username as string | null | undefined;

      const emailLocal = email && email.includes('@') ? email.split('@')[0] : undefined;
      const derivedDisplayName = (() => {
        if (currentDisplay && currentDisplay.trim()) return undefined; // nothing to do
        if (firstName && lastName) return `${firstName.trim()} ${lastName.trim()}`;
        if (firstName && firstName.trim()) return firstName.trim();
        if (lastName && lastName.trim()) return lastName.trim();
        if (username && username.trim()) return username.trim();
        if (emailLocal && emailLocal.trim()) return emailLocal.trim();
        return undefined;
      })();

      if (derivedDisplayName && email) {
        logger.dev.structured('info', 'Auto-filling display_name before team creation', {
          userId,
          derivedDisplayName,
        });
        // Update Supabase users
        await supabase.from('users').upsert({
          id: userId,
          email,
          display_name: derivedDisplayName,
        } as any, { onConflict: 'id' });
        // Sync to Cockroach for team views
        await upsertUserProfile({
          id: userId,
          email,
          displayName: derivedDisplayName,
          username: username || emailLocal || undefined,
        });
      }
    } catch (e) {
      logger.warn('Failed to auto-fill display_name before team creation', e);
    }

    // Create team group using CockroachDB
    const group = await cockroachDBTeamsService.createTeamGroup({
      school,
      division,
      slug,
      createdBy: userId
    });

    // Create default team unit using CockroachDB
    const team = await cockroachDBTeamsService.createTeamUnit({
      groupId: group.id,
      teamId: 'A',
      captainCode: `CAP${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      userCode: `USR${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      description: 'Team A',
      createdBy: userId
    });

    console.log('Created team unit:', team);

    // Add creator as captain using CockroachDB
    await cockroachDBTeamsService.createTeamMembership({
      userId,
      teamId: team.id,
      role: 'captain',
      status: 'active'
    });

    // Get team members for response
    const members = await cockroachDBTeamsService.getTeamMembers(team.id);

    const response = {
      id: team.id,
      name: team.name,
      slug: group.slug,
      school: group.school,
      division: group.division,
      description: team.description,
      captain_code: team.captain_code,
      user_code: team.user_code,
      members: await Promise.all(members.map(async (m) => {
        const userProfile = await getUserProfile(m.user_id);
        return {
          id: m.user_id,
          name: userProfile?.display_name || 
                (userProfile?.first_name && userProfile?.last_name 
                  ? `${userProfile.first_name} ${userProfile.last_name}` 
                  : `User ${m.user_id.substring(0, 8)}`),
          email: userProfile?.email || `user-${m.user_id.substring(0, 8)}@example.com`,
          role: m.role
        };
      })),
      // Add flag to indicate if team was reactivated (for cache clearing)
      wasReactivated: team.created_at !== team.updated_at
    };

    console.log('Team creation response:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in create team API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
