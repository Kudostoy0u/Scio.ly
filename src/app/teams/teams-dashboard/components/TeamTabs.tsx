import React from 'react';
import { Edit, Check, Trash2 } from 'lucide-react';

type Team = { id: string; name: string; roster: Record<string, string[]> };
type TeamUnit = { teamId: string; name: string; slug?: string };

export default function TeamTabs({
  darkMode,
  selection,
  teams,
  teamUnits,
  activeTeamIdx,
  isLeader,
  addingTeam,
  editingTeamIdx,
  setEditingTeamIdx: _setEditingTeamIdx,
  setActiveTeamIdx,
  setTeams,
  setTeamUnits,
  setCurrentSlug,
  desiredTeamIdRef,
  groupSlugRef,
  setAddingTeam,
  handleEditTeam,
  handleSaveTeam,
  setConfirmDelete,
}: {
  darkMode: boolean;
  selection: { school: string; division: 'B' | 'C' } | null;
  teams: Team[];
  teamUnits: TeamUnit[];
  activeTeamIdx: number;
  isLeader: boolean;
  addingTeam: boolean;
  editingTeamIdx: number | null;
  setEditingTeamIdx: (v: number | null) => void;
  setActiveTeamIdx: (i: number) => void;
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  setTeamUnits: React.Dispatch<React.SetStateAction<TeamUnit[]>>;
  setCurrentSlug: (slug: string | null) => void;
  desiredTeamIdRef: React.MutableRefObject<string | null>;
  groupSlugRef: React.MutableRefObject<string | null>;
  setAddingTeam: (v: boolean) => void;
  handleEditTeam: (idx: number) => void;
  handleSaveTeam: (idx: number) => void;
  setConfirmDelete: (v: { open: boolean; teamId?: string; teamName?: string }) => void;
}) {
  return (
    <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-3 mb-4`}>
      <div className="flex items-center gap-2 flex-wrap">
        {(teamUnits.length > 0 ? teamUnits.map((u) => ({ id: u.teamId, name: u.name, slug: u.slug, roster: {} as Record<string, string[]> })) : teams).map((t, idx) => (
          <div key={t.id} className="flex items-center gap-2">
            <button
              onClick={async () => {
                desiredTeamIdRef.current = (t as any).id;
                setActiveTeamIdx(idx);
                if (teamUnits.length > 0) setCurrentSlug((t as any).slug || null);
                if (teamUnits.length > 0 && selection) {
                  try {
                    const res = await fetch(`/api/teams/units?school=${encodeURIComponent(selection.school)}&division=${selection.division}&teamId=${t.id}`);
                    if (res.ok) {
                      const data = await res.json();
                      if (data?.success && data?.data) {
                        setTeams([{ id: data.data.teamId, name: data.data.name, roster: data.data.roster || {} }]);
                        setCurrentSlug(data.data.slug || (t as any).slug || null);
                      }
                    }
                  } catch {}
                }
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md min-w-fit ${activeTeamIdx === idx ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
            >
              {editingTeamIdx === idx ? (
                <input
                  value={t.name}
                  onChange={async (e) => {
                    const newName = e.target.value;
                    setTeams((prev) => prev.map((tt, i) => i === idx ? { ...tt, name: newName } : tt));
                    setTeamUnits((prev) => prev.map((u) => (u.teamId === (t as any).id ? { ...u, name: newName } : u)));
                    if (selection) {
                      try {
                        await fetch('/api/teams/units', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'rename', school: selection.school, division: selection.division, teamId: (t as any).id, name: newName })
                        });
                      } catch {}
                    }
                  }}
                  className={`bg-transparent outline-none min-w-0 ${activeTeamIdx === idx ? 'font-semibold' : ''}`}
                  style={{ width: `${Math.max(t.name.length, 4)}ch` }}
                  autoFocus
                />
              ) : (
                <span className="min-w-0">{t.name}</span>
              )}
            </button>
            {isLeader && (
              editingTeamIdx === idx ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleSaveTeam(idx)} className="p-1 rounded hover:bg-green-600 hover:text-white transition-colors" title="Save changes">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={() => setConfirmDelete({ open: true, teamId: t.id, teamName: t.name })} className="p-1 rounded hover:bg-red-600 hover:text-white transition-colors" title="Delete subteam">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => handleEditTeam(idx)} className="p-1 rounded hover:bg-blue-600 hover:text-white transition-colors" title="Edit team name">
                  <Edit className="w-3 h-3" />
                </button>
              )
            )}
          </div>
        ))}
        {isLeader && (
          <button
            onClick={async () => {
              if (!selection || addingTeam) return;
              setAddingTeam(true);
              const existingIds = (teamUnits.length > 0 ? teamUnits.map(u => u.teamId) : teams.map(tt => tt.id)) as string[];
              const nextLetter = (() => {
                if (existingIds.length === 0) return 'A';
                const sorted = existingIds.slice().sort();
                const last = sorted[sorted.length - 1];
                const code = last.charCodeAt(0);
                return String.fromCharCode(code + 1);
              })();
              const optimistic = { teamId: nextLetter, name: `Team ${nextLetter}`, slug: undefined as unknown as string };
              setTeamUnits((prev) => [...prev, optimistic]);
              setActiveTeamIdx((teamUnits.length));
              setTeams([{ id: nextLetter, name: `Team ${nextLetter}`, roster: {} }]);
              try {
                const res = await fetch('/api/teams/units', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'create', school: selection.school, division: selection.division, groupSlug: groupSlugRef.current || undefined })
                });
                if (!res.ok) {
                  try { const err = await res.json(); console.error(err?.error || 'Failed to add subteam'); } catch {}
                  setTeamUnits((prev) => prev.filter(u => u.teamId !== nextLetter));
                  return;
                }
                const json = await res.json();
                if (json?.success && json?.data) {
                  setTeamUnits((prev) => prev.map(u => u.teamId === nextLetter ? { teamId: json.data.teamId, name: json.data.name, slug: json.data.slug } : u));
                  setTeams([{ id: json.data.teamId, name: json.data.name, roster: {} }]);
                  setActiveTeamIdx(teamUnits.length);
                }
              } catch {
                setTeamUnits((prev) => prev.filter(u => u.teamId !== nextLetter));
              } finally {
                setAddingTeam(false);
              }
            }}
            disabled={addingTeam}
            className={`px-3 py-1.5 rounded-md border ${addingTeam ? 'border-gray-400 text-gray-400 cursor-not-allowed' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}`}
          >
            {addingTeam ? 'Adding…' : 'Add Team'}
          </button>
        )}
      </div>
    </div>
  );
}


