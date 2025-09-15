import TeamsDashboard from '@/app/teams/teams-dashboard/TeamsDashboard';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { loadTeamGroupBySlug, listTeamUnitsForGroup, getUserTeamMemberships, loadTeamUnitBySlug, getGroupForUnit } from '@/lib/db/teams';
import { redirect } from 'next/navigation';

export default async function TeamSlugPage(ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const supa = await createSupabaseServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user?.id) redirect('/auth');
  const group = await loadTeamGroupBySlug(slug);
  if (!group) {
    // Fallback: treat as legacy unit slug and resolve to its group
    const unit = await loadTeamUnitBySlug(slug);
    if (!unit) redirect('/teams');
    const resolvedGroup = await getGroupForUnit(unit.school, unit.division, unit.teamId);
    if (!resolvedGroup) redirect('/teams');
    const units = await listTeamUnitsForGroup(resolvedGroup.id);
    if (!units || units.length === 0) redirect('/teams');
    const memberships = await getUserTeamMemberships(user.id);
    const preferred = memberships.find(m => units.some(u => u.id === m.team.id));
    const selected = preferred ? units.find(u => u.id === preferred.team.id)! : units.find(u => u.teamId === unit.teamId) || units[0];
    const initialLinkedSelection = { school: resolvedGroup.school, division: resolvedGroup.division, team_id: selected.teamId } as const;
    const isCaptain = preferred ? preferred.role === 'captain' : false;
    return <TeamsDashboard initialLinkedSelection={initialLinkedSelection} initialGroupSlug={resolvedGroup.slug} initialIsCaptain={isCaptain} />;
  }
  const units = await listTeamUnitsForGroup(group.id);
  if (!units || units.length === 0) redirect('/teams');
  const memberships = await getUserTeamMemberships(user.id);
  const preferred = memberships.find(m => units.some(u => u.id === m.team.id));
  const selected = preferred ? units.find(u => u.id === preferred.team.id)! : units[0];
  const initialLinkedSelection = { school: group.school, division: group.division, team_id: selected.teamId } as const;
  const isCaptain = preferred ? preferred.role === 'captain' : false;
  return <TeamsDashboard initialLinkedSelection={initialLinkedSelection} initialGroupSlug={group.slug} initialIsCaptain={isCaptain} />;
}


