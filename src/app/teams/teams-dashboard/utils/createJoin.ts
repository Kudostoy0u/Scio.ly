import { toast } from 'react-toastify';

export async function checkExistingUnits(chosenSchool: string, pendingDivision: 'B'|'C'): Promise<boolean> {
  try {
    const unitsRes = await fetch(`/api/teams/units?school=${encodeURIComponent(chosenSchool)}&division=${pendingDivision}`);
    if (unitsRes.ok) {
      const unitsJson = await unitsRes.json();
      if (unitsJson?.success && Array.isArray(unitsJson.data) && unitsJson.data.length > 0) {
        return true;
      }
    }
  } catch {}
  return false;
}

export async function createTeam(chosenSchool: string, pendingDivision: 'B'|'C'): Promise<string | null> {
  try {
    const createRes = await fetch('/api/teams/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', school: chosenSchool, division: pendingDivision }) });
    if (!createRes.ok) {
      if (createRes.status === 401) { toast.error('You must be signed in to create a team.'); }
      try { const err = await createRes.json(); if (err?.error) toast.error(err.error); } catch {}
      return null;
    } else {
      const created = await createRes.json();
      if (created?.success && (created?.groupSlug || created?.data?.slug)) {
        return created.groupSlug || created.data.slug;
      }
    }
  } catch {
    toast.error('You must be signed in to create a team.');
  }
  return null;
}

export async function joinByCode(code: string): Promise<{ slug?: string; error?: string }> {
  try {
    const res = await fetch('/api/teams/join-by-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const json = await res.json();
    if (json?.success && json?.slug) {
      return { slug: json.slug };
    } else {
      return { error: json?.error || 'Unable to join team' };
    }
  } catch {
    return { error: 'You must be signed in to join a team.' };
  }
}


