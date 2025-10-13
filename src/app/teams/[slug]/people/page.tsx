import TeamPeopleClient from './TeamPeopleClient';
import { getServerUser } from '@/lib/supabaseServer';
import { dbPg } from '@/lib/db';
import { newTeamGroups, newTeamUnits, newTeamMemberships } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export default async function TeamPeoplePage(ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const user = await getServerUser();
  if (!user?.id) redirect('/auth');
  
  try {
    // Get team group by slug using Drizzle ORM
    const groupResult = await dbPg
      .select({
        id: newTeamGroups.id,
        school: newTeamGroups.school,
        division: newTeamGroups.division,
        slug: newTeamGroups.slug
      })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, slug));

    if (groupResult.length === 0) {
      // Team not found - redirect to teams page with error message
      redirect('/teams?error=team_not_found');
    }

    const group = groupResult[0];

    // Get team units for this group using Drizzle ORM
    const unitsResult = await dbPg
      .select({
        id: newTeamUnits.id,
        team_id: newTeamUnits.teamId,
        captain_code: newTeamUnits.captainCode,
        user_code: newTeamUnits.userCode
      })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, group.id));

    if (unitsResult.length === 0) {
      // No team units found - redirect to teams page with error message
      redirect('/teams?error=no_team_units');
    }

    // Get user's team memberships using Drizzle ORM
    const membershipResult = await dbPg
      .select({
        team_id: newTeamMemberships.teamId,
        role: newTeamMemberships.role
      })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, user.id),
          eq(newTeamUnits.groupId, group.id),
          eq(newTeamMemberships.status, 'active')
        )
      );

    const membership = membershipResult[0];
    const isCaptain = membership?.role === 'captain';

    return (
      <TeamPeopleClient
        teamSlug={group.slug}
        school={group.school}
        division={group.division as 'B' | 'C'}
        isCaptain={isCaptain}
      />
    );
  } catch (error) {
    console.error('Error loading team people:', error);
    redirect('/teams?error=server_error');
  }
}
