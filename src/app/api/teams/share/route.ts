import { NextRequest, NextResponse } from 'next/server';
import { createShareCode, loadTeamDataByCode, saveTeamData, loadTeamData, generateRandomCode, addMemberToTeam, listTeamUnits, createTeamUnit } from '@/lib/db/teams';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { action, school, division, type, code, teams } = await request.json();
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (action === 'create') {
      // Create a new share code
      const shareCode = await createShareCode(school, division, type, 24);
      return NextResponse.json({ success: true, code: shareCode });
    } else if (action === 'join') {
      // Join a team using a code
      const result = await loadTeamDataByCode(code);
      if (!result) {
        return NextResponse.json({ success: false, error: 'Invalid or expired code' }, { status: 400 });
      }
      // Persist membership using normalized unit id if resolvable
      const units = await listTeamUnits(result.teamData.school, result.teamData.division);
      const target = units.find((u) => (result.type === 'captain' ? u.captainCode === code : u.userCode === code));
      if (target) {
        await addMemberToTeam(target.id, user.id, result.type);
      }
      return NextResponse.json({ success: true, teamData: result.teamData, type: result.type });
    } else if (action === 'save') {
      // Save team data to database
      const existing = await loadTeamData(school, division);
      const teamData = {
        school,
        division,
        teams,
        captainCode: existing?.captainCode || generateRandomCode(12),
        userCode: existing?.userCode || generateRandomCode(12)
      };
      
      const savedData = await saveTeamData(teamData);
      // Ensure a corresponding team_units row exists for each team entry
      try {
        const existingUnits = await listTeamUnits(school, division);
        for (const t of (teams || [])) {
          if (!existingUnits.find((u) => u.teamId === t.id)) {
            await createTeamUnit(school, division);
          }
        }
      } catch {}
      return NextResponse.json({ success: true, data: savedData });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in team share API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school = searchParams.get('school');
    const divisionParam = searchParams.get('division');
    if (!school || !divisionParam || !['B', 'C'].includes(divisionParam)) {
      return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
    }
    const division = divisionParam as 'B' | 'C';
    const data = await loadTeamData(school, division);
    if (!data) {
      return NextResponse.json({ success: true, data: null });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in team share GET API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
