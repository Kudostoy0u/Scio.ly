'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/app/components/Header';
import { useTheme } from '@/app/contexts/ThemeContext';


type TeamSelection = {
  school: string;
  captain: boolean;
  division: 'B' | 'C';
};


type RosterByDivision = {
  B: Record<string, string[]>;
  C: Record<string, string[]>;
};


const DIVISION_B_GROUPS: { label: string; events: string[] }[] = [
  { label: 'Group 1', events: ['Codebusters', 'Disease Detectives', 'Remote Sensing'] },
  { label: 'Group 2', events: ['Entomology', 'Experimental Design', 'Solar System'] },
  { label: 'Group 3', events: ['Machines', 'Meteorology', 'Metric Mastery'] },
  { label: 'Group 4', events: ['Circuit Lab', 'Dynamic Planet', 'Water Quality'] },
  { label: 'Group 5', events: ['Heredity', 'Potions & Poisons', 'Rocks and Minerals'] },
  { label: 'Group 6', events: ['Anatomy & Physiology', 'Crime Busters', 'Write It Do It'] },
  { label: 'Group 7', events: ['Boomilever', 'Helicopter', 'Hovercraft', 'Mission Possible', 'Scrambler'] },
];

const DIVISION_C_GROUPS: { label: string; events: string[] }[] = [
  { label: 'Group 1', events: ['Anatomy & Physiology', 'Engineering CAD', 'Forensics'] },
  { label: 'Group 2', events: ['Codebusters', 'Disease Detectives', 'Remote Sensing'] },
  { label: 'Group 3', events: ['Astronomy', 'Entomology', 'Experimental Design'] },
  { label: 'Group 4', events: ['Chemistry Lab', 'Machines'] },
  { label: 'Group 5', events: ['Circuit Lab', 'Dynamic Planet', 'Water Quality'] },
  { label: 'Group 6', events: ['Designer Genes', 'Materials Science', 'Rocks and Minerals'] },
  { label: 'Group 7', events: ['Boomilever', 'Bungee Drop', 'Electric Vehicle', 'Helicopter', 'Hovercraft', 'Robot Tour'] },
];


async function loadPublicJson(path: string) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function extractUniqueSchools(meta: any): string[] {
  if (!meta || !meta.teams) return [];
  const names = Object.values(meta.teams as Record<string, string>) as string[];
  return Array.from(new Set(names.map(n => n.replace(/\s+(Varsity|JV)$/i, '').trim()))).sort((a, b) => a.localeCompare(b));
}

export default function TeamsDashboard() {
  const { darkMode } = useTheme();
  const [availableSchools, setAvailableSchools] = useState<string[]>([]);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [selection, setSelection] = useState<TeamSelection | null>(null);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; roster: Record<string, string[]> }>>([{ id: 'A', name: 'Team A', roster: {} }]);
  const [activeTeamIdx, setActiveTeamIdx] = useState<number>(0);
  const [visibleCount, setVisibleCount] = useState<number>(40);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [chosenSchool, setChosenSchool] = useState<string | null>(null);
  const [pendingCaptain, setPendingCaptain] = useState<boolean>(false);
  const [pendingDivision, setPendingDivision] = useState<'B' | 'C'>('C');


  useEffect(() => {
    const load = async () => {
      const [metaB, metaC] = await Promise.all([
        loadPublicJson('/statesB/meta.json'),
        loadPublicJson('/statesC/meta.json')
      ]);
      const schools = Array.from(new Set([
        ...extractUniqueSchools(metaB),
        ...extractUniqueSchools(metaC)
      ])).sort((a, b) => a.localeCompare(b));
      setAvailableSchools(schools);
    };
    load();
  }, []);

  useEffect(() => {
    try {
      const savedSelStr = localStorage.getItem('teamsSelection');
      if (savedSelStr) {
        const raw = JSON.parse(savedSelStr);
        const normalized: TeamSelection = {
          school: raw.school,
          captain: !!raw.captain,
          division: (raw.division || raw.preferredDivision || 'C') as 'B' | 'C',
        };
        setSelection(normalized);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { if (selection) localStorage.setItem('teamsSelection', JSON.stringify(selection)); } catch {}
  }, [selection]);

  const storageKey = (sel: TeamSelection) => `teamsData:${sel.school}:${sel.division}`;

  useEffect(() => {
    if (!selection) return;
    try {
      const saved = localStorage.getItem(storageKey(selection));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setTeams(parsed);
      }
    } catch {}
  }, [selection?.school, selection?.division]);

  useEffect(() => {
    if (!selection) return;
    try { localStorage.setItem(storageKey(selection), JSON.stringify(teams)); } catch {}
  }, [teams, selection?.school, selection?.division]);

  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase();
    if (!q) return availableSchools;
    return availableSchools.filter((s) => s.toLowerCase().includes(q));
  }, [schoolQuery, availableSchools]);

  useEffect(() => {
    setVisibleCount(40);
  }, [schoolQuery, availableSchools.length]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(c + 40, filteredSchools.length));
        }
      });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [filteredSchools.length]);

  const isLeader = !!selection?.captain;
  const getMaxSlots = (eventName: string) => (eventName.toLowerCase().includes('codebusters') ? 3 : 2);

  const setName = (division: 'B' | 'C', eventName: string, idx: number, value: string) => {
    if (!isLeader) return;
    if (!selection) return;
    setTeams((prev) => {
      const copy = prev.map((t) => ({ ...t, roster: { ...t.roster } }));
      const team = copy[activeTeamIdx] || copy[0];
      const desired = getMaxSlots(eventName);
      const base = Array.isArray(team.roster[eventName]) ? team.roster[eventName] : [];
      const padded = [...base, ...new Array(Math.max(0, desired - base.length)).fill('')].slice(0, desired);
      const arr = padded.slice();
      arr[idx] = value;
      team.roster[eventName] = arr;
      return copy;
    });
  };

  const clearSelection = () => setSelection(null);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Teams</h1>
          {selection && (
            <div className="flex items-center gap-3 text-sm">
              <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{selection.school}</span>
              <span className={`px-2 py-0.5 rounded ${selection.captain ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>{selection.captain ? 'Captain' : 'Member'}</span>
              <span className={`px-2 py-0.5 rounded ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>Division {selection.division}</span>
              <button onClick={clearSelection} className="px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">Change</button>
            </div>
          )}
        </div>

        {!selection && (
          <div className={`rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} p-4 mb-6`}>
            <h2 className="font-semibold mb-3">Join your school</h2>
            <div className="flex flex-col md:flex-row items-stretch gap-3">
              <div className="flex-1">
                <input
                  placeholder="Search schools"
                  value={schoolQuery}
                  onChange={(e) => setSchoolQuery(e.target.value)}
                  className={`w-full rounded-md px-3 py-2 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'}`}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pendingCaptain} onChange={(e) => setPendingCaptain(e.target.checked)} />
                  I am a team captain
                </label>
                <select
                  value={pendingDivision}
                  onChange={(e) => setPendingDivision(e.target.value as 'B' | 'C')}
                  className={`${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded px-2 py-1 text-sm`}
                >
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                </select>
                <button
                  onClick={() => {
                    if (!chosenSchool) return;
                    setSelection({ school: chosenSchool, captain: pendingCaptain, division: pendingDivision });
                    setTeams([{ id: 'A', name: 'Team A', roster: {} }]);
                    setActiveTeamIdx(0);
                  }}
                  disabled={!chosenSchool}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${chosenSchool ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                >
                  Continue
                </button>
              </div>
            </div>
            {filteredSchools.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-auto text-sm">
                {filteredSchools.slice(0, visibleCount).map((s) => (
                  <button
                    key={s}
                    onClick={() => setChosenSchool(s)}
                    className={`${chosenSchool === s ? 'ring-2 ring-blue-500' : ''} ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} px-2 py-1 rounded hover:opacity-90 text-left`}
                  >
                    {s}
                  </button>
                ))}
                <div ref={loadMoreRef} className="col-span-full h-1" />
              </div>
            )}
          </div>
        )}

        {selection && (
          <>
          {/* Team tabs */}
          <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-3 mb-4`}>
            <div className="flex items-center gap-2 flex-wrap">
              {teams.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTeamIdx(idx)}
                  className={`px-3 py-1.5 rounded-md ${activeTeamIdx === idx ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                >
                  {isLeader && activeTeamIdx === idx ? (
                    <input
                      value={t.name}
                      onChange={(e) => setTeams((prev) => prev.map((tt, i) => i === idx ? { ...tt, name: e.target.value } : tt))}
                      className={`bg-transparent outline-none ${activeTeamIdx === idx ? 'font-semibold' : ''}`}
                    />
                  ) : (
                    t.name
                  )}
                </button>
              ))}
              {isLeader && (
                <button
                  onClick={() => {
                    const nextLetter = String.fromCharCode(65 + teams.length);
                    setTeams((prev) => [...prev, { id: nextLetter, name: `Team ${nextLetter}`, roster: {} }]);
                    setActiveTeamIdx(teams.length);
                  }}
                  className="px-3 py-1.5 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Add Team
                </button>
              )}
              <div className="ml-auto text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}">Division {selection.division}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-4 lg:col-span-2`}>
              <h2 className="text-lg font-semibold mb-2">Division {selection.division}</h2>
              {(selection.division === 'B' ? DIVISION_B_GROUPS : DIVISION_C_GROUPS).map((group) => (
                <div key={group.label} className="mb-4">
                  <div className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{group.label}</div>
                  <div className="space-y-2">
                    {group.events.map((evt) => {
                      const max = evt.toLowerCase().includes('codebusters') ? 3 : 2;
                      const team = teams[activeTeamIdx] || teams[0];
                      const base = team?.roster[evt] || [];
                      const slots = [...base, ...new Array(Math.max(0, max - base.length)).fill('')].slice(0, max);
                      return (
                        <div key={evt} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                          <div className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{evt} {selection.division}</div>
                          {[...Array(max)].map((_, i) => (
                            <input
                              key={i}
                              value={slots[i] || ''}
                              onChange={(e) => setName(selection.division, evt, i, e.target.value)}
                              disabled={!isLeader || (max === 2 && i === 2)}
                              placeholder={i === 2 && max === 3 && !isLeader ? 'Captain only' : i === 2 && max === 3 ? '3rd (Codebusters)' : 'Name'}
                              className={`w-full rounded px-2 py-1 ${darkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'}`}
                            />
                          ))}
                          {max === 2 && (<div className="hidden sm:block" />)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
