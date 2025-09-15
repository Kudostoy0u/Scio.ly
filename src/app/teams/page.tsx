import { Metadata } from "next";
import TeamsDashboard from "./teams-dashboard/TeamsDashboard";
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
    // Prefer group slug for redirect
    const { getPrimaryGroupForUser } = await import('@/lib/db/teams');
    const primary = await getPrimaryGroupForUser(user.id);
    if (primary && primary.group) {
      // Use preferred team id if available
      const group = primary.group;
      return { school: group.school, division: group.division, team_id: primary.preferredTeamId || 'A', slug: group.slug } as any;
    }
    return null;
  } catch { return null; }
}

export default async function TeamsPage() {
  const cookieStore = await cookies();
  const justUnlinked = cookieStore.get('teamsJustUnlinked');
  const auto = await getAutoLinkSelection();
  if (!justUnlinked && auto?.slug) {
    redirect(`/teams/${auto.slug}`);
  }
  return <TeamsDashboard initialLinkedSelection={auto} initialGroupSlug={auto?.slug} />;
}
