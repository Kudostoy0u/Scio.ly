import { Metadata } from "next";
import TeamsDashboard from "./teams-dashboard/TeamsDashboard";
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: "Scio.ly | Team Analysis",
  description: "Analyze Science Olympiad team performance with Elo ratings, leaderboards, and comparisons"
};

async function getAutoLinkSelection() {
  try {
    const cookieStore = await cookies();
    const saved = cookieStore.get('teamsSelection');
    if (saved?.value) return null; // user already has selection
    // legacy origin unused
    // First check persistent team_code on user profile
    const supa = await (await import('@/lib/supabaseServer')).createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (user?.id) {
      const { data: profile } = await supa.from('users').select('team_code, division, school').eq('id', user.id).maybeSingle();
      const teamCode = (profile as any)?.team_code as string | undefined;
      if (teamCode) {
        const [school, division, team_id] = teamCode.split('::');
        if (school && (division === 'B' || division === 'C') && team_id) {
          return { school, division, team_id } as any;
        }
      }
    }
    return null;
  } catch { return null; }
}

export default async function TeamsPage() {
  const auto = await getAutoLinkSelection();
  return <TeamsDashboard initialLinkedSelection={auto} />;
}
