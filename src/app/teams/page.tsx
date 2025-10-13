import { Metadata } from "next";
import TeamsPageClient from "./components/TeamsPageClient";
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: "Scio.ly | Teams",
  description: "Join and coordinate with your Science Olympiad team."
};

async function getAutoLinkSelection() {
  try {
    const supa = await (await import('@/lib/supabaseServer')).createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user?.id) return null;
    
    // Get user's primary team group using Drizzle ORM
    const { dbPg } = await import('@/lib/db');
    const { newTeamGroups, newTeamMemberships, newTeamUnits } = await import('@/lib/db/schema');
    const { eq, and, desc } = await import('drizzle-orm');
    
    const primaryMembership = await dbPg
      .select({
        groupId: newTeamGroups.id,
        school: newTeamGroups.school,
        division: newTeamGroups.division,
        slug: newTeamGroups.slug,
        teamId: newTeamUnits.teamId
      })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
      .where(
        and(
          eq(newTeamMemberships.userId, user.id),
          eq(newTeamMemberships.status, 'active')
        )
      )
      .orderBy(desc(newTeamMemberships.joinedAt))
      .limit(1);
    
    if (primaryMembership.length > 0) {
      const membership = primaryMembership[0];
      return { 
        school: membership.school, 
        division: membership.division, 
        team_id: membership.teamId, 
        slug: membership.slug 
      } as any;
    }
    return null;
  } catch { return null; }
}

export default async function TeamsPage(ctx: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const cookieStore = await cookies();
  const justUnlinked = cookieStore.get('teamsJustUnlinked');
  const auto = await getAutoLinkSelection();
  const searchParams = await ctx.searchParams;
  const viewAll = searchParams.view === 'all';
  
  // Only redirect if we have a valid team slug, user hasn't just unlinked, and user doesn't explicitly want to view all teams
  if (!justUnlinked && !viewAll && auto?.slug) {
    // Double-check that the team actually exists in the new system
    try {
      const { dbPg } = await import('@/lib/db');
      const { newTeamGroups } = await import('@/lib/db/schema');
      const { eq } = await import('drizzle-orm');
      
      const groupResult = await dbPg
        .select({ id: newTeamGroups.id })
        .from(newTeamGroups)
        .where(eq(newTeamGroups.slug, auto.slug));
      
      if (groupResult.length > 0) {
        redirect(`/teams/${auto.slug}`);
      }
    } catch (error) {
      // Check if this is a Next.js redirect error (which is expected behavior)
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // This is a normal redirect, re-throw it so Next.js can handle it
        throw error;
      }
      console.error('Error checking team existence:', error);
      // If there's a real error, don't redirect and let the user see the teams page
    }
  }
  
  return <TeamsPageClient initialLinkedSelection={auto} initialGroupSlug={auto?.slug} />;
}
