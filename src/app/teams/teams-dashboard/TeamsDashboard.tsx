'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/app/components/Header';
import { useTheme } from '@/app/contexts/ThemeContext';
import { Edit, Check, Share2 } from 'lucide-react';
import TeamShareModal from '../components/TeamShareModal';


type TeamSelection = {
  school: string;
  captain: boolean;
  division: 'B' | 'C';
};





const DIVISION_B_GROUPS: { label: string; events: string[]; colorKey: string }[] = [
  { label: 'Group 1', events: ['Codebusters', 'Disease Detectives', 'Remote Sensing'], colorKey: 'blue' },
  { label: 'Group 2', events: ['Entomology', 'Experimental Design', 'Solar System'], colorKey: 'green' },
  { label: 'Group 3', events: ['Machines', 'Meteorology', 'Metric Mastery'], colorKey: 'yellow' },
  { label: 'Group 4', events: ['Circuit Lab', 'Dynamic Planet', 'Water Quality'], colorKey: 'purple' },
  { label: 'Group 5', events: ['Heredity', 'Potions & Poisons', 'Rocks and Minerals'], colorKey: 'pink' },
  { label: 'Group 6', events: ['Anatomy & Physiology', 'Crime Busters', 'Write It Do It'], colorKey: 'indigo' },
  { label: 'Group 7', events: ['Boomilever', 'Helicopter', 'Hovercraft', 'Mission Possible', 'Scrambler'], colorKey: 'orange' },
];

const DIVISION_C_GROUPS: { label: string; events: string[]; colorKey: string }[] = [
  { label: 'Group 1', events: ['Anatomy & Physiology', 'Engineering CAD', 'Forensics'], colorKey: 'blue' },
  { label: 'Group 2', events: ['Codebusters', 'Disease Detectives', 'Remote Sensing'], colorKey: 'green' },
  { label: 'Group 3', events: ['Astronomy', 'Entomology', 'Experimental Design'], colorKey: 'yellow' },
  { label: 'Group 4', events: ['Chemistry Lab', 'Machines'], colorKey: 'purple' },
  { label: 'Group 5', events: ['Circuit Lab', 'Dynamic Planet', 'Water Quality'], colorKey: 'pink' },
  { label: 'Group 6', events: ['Designer Genes', 'Materials Science', 'Rocks and Minerals'], colorKey: 'indigo' },
  { label: 'Group 7', events: ['Boomilever', 'Bungee Drop', 'Electric Vehicle', 'Helicopter', 'Hovercraft', 'Robot Tour'], colorKey: 'orange' },
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

export default function TeamsDashboard({ initialLinkedSelection }: { initialLinkedSelection?: { school: string; division: 'B'|'C'; team_id: string; member_name?: string } | null }) {
  const { darkMode } = useTheme();
  const [availableSchools, setAvailableSchools] = useState<string[]>([]);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [selection, setSelection] = useState<TeamSelection | null>(null);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; roster: Record<string, string[]> }>>([{ id: 'A', name: 'Team A', roster: {} }]);
  const [activeTeamIdx, setActiveTeamIdx] = useState<number>(0);
  const [editingTeamIdx, setEditingTeamIdx] = useState<number | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(40);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [chosenSchool, setChosenSchool] = useState<string | null>(null);
  const [pendingCaptain, setPendingCaptain] = useState<boolean>(false);
  const [pendingDivision, setPendingDivision] = useState<'B' | 'C'>('C');
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(false);
  const [tournaments, setTournaments] = useState<Array<{ id: string; name: string; dateTime: string }>>([]);
  const [newTournamentName, setNewTournamentName] = useState<string>('');
  const [newTournamentDateTime, setNewTournamentDateTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(6, 0, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  });
  const [tick, setTick] = useState<number>(0);
  const [nameAddingEvent, setNameAddingEvent] = useState<string | null>(null);
  const [selectedEventForName, setSelectedEventForName] = useState<string>('');
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberEvent, setNewMemberEvent] = useState<string>('');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  // Linking UI removed in new architecture
  const [saving, setSaving] = useState<boolean>(false);


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
        return;
      }
      if (initialLinkedSelection && initialLinkedSelection.school && (initialLinkedSelection.division === 'B' || initialLinkedSelection.division === 'C')) {
        setSelection({ school: initialLinkedSelection.school, captain: false, division: initialLinkedSelection.division });
        setTeams([{ id: initialLinkedSelection.team_id || 'A', name: `Team ${initialLinkedSelection.team_id || 'A'}`, roster: {} }]);
        setActiveTeamIdx(0);
      }
    } catch {}
  }, [initialLinkedSelection]);

  useEffect(() => {
    try { if (selection) localStorage.setItem('teamsSelection', JSON.stringify(selection)); } catch {}
    try {
      if (selection && typeof document !== 'undefined') {
        const val = encodeURIComponent(JSON.stringify(selection));
        document.cookie = `teamsSelection=${val}; path=/; max-age=${60 * 60 * 24 * 30}`;
      }
    } catch {}
  }, [selection]);

  const storageKey = (sel: TeamSelection) => `teamsData:${sel.school}:${sel.division}`;
  const trackerKey = (sel: TeamSelection) => `teamsTournaments:${sel.school}:${sel.division}`;

  useEffect(() => {
    if (!selection) return;
    try {
      const saved = localStorage.getItem(storageKey(selection));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setTeams(parsed);
      }
    } catch {}
    // Also attempt to load from API if available
    const loadFromApi = async () => {
      try {
        const res = await fetch(`/api/teams/share?school=${encodeURIComponent(selection.school)}&division=${selection.division}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && data?.data && Array.isArray(data.data.teams) && data.data.teams.length > 0) {
          setTeams(data.data.teams);
        }
      } catch {}
    };
    loadFromApi();
  }, [selection]);

  useEffect(() => {
    if (!selection) return;
    try { localStorage.setItem(storageKey(selection), JSON.stringify(teams)); } catch {}
  }, [teams, selection]);

  // Load/save tournament tracker per school/division
  useEffect(() => {
    if (!selection) return;
    try {
      const saved = localStorage.getItem(trackerKey(selection));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setTournaments(parsed);
      } else {
        setTournaments([]);
      }
    } catch {}
  }, [selection]);

  useEffect(() => {
    if (!selection) return;
    try { localStorage.setItem(trackerKey(selection), JSON.stringify(tournaments)); } catch {}
  }, [tournaments, selection]);

  // Live ticking for countdowns
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(interval);
  }, []);
  // Linking data fetch removed

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
  const getMaxSlots = (eventName: string) => (eventName.toLowerCase().includes('codebusters') || eventName.toLowerCase().includes('experimental design') ? 3 : 2);

  const handleEditTeam = (idx: number) => {
    setEditingTeamIdx(idx);
  };

  const handleSaveTeam = (_idx: number) => {
    setEditingTeamIdx(null);
  };

  const handleJoinTeam = (teamData: any, type: 'captain' | 'user') => {
    // Update selection with new team data
    setSelection({
      school: teamData.school,
      captain: type === 'captain',
      division: teamData.division
    });
    
    // Update teams with the loaded team data
    setTeams(teamData.teams);
    setActiveTeamIdx(0);
  };

  // Save team data to database
  const saveTeamDataToDB = useCallback(async () => {
    if (!selection) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/teams/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          school: selection.school,
          division: selection.division,
          teams: teams
        })
      });
      
      if (!response.ok) {
        console.error('Failed to save team data to database');
      }
    } catch (error) {
      console.error('Error saving team data:', error);
    } finally { setSaving(false); }
  }, [selection, teams]);

  // Debounced save to database whenever teams change
  useEffect(() => {
    if (!selection || teams.length === 0) return;
    const handle = setTimeout(() => {
      saveTeamDataToDB();
    }, 800);
    return () => clearTimeout(handle);
  }, [teams, selection, saveTeamDataToDB]);

  // Reference tick to satisfy linter and trigger countdown re-renders
  useEffect(() => {
    // tick updates every second
  }, [tick]);

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
  const unlinkFromTeam = () => {
    try {
      localStorage.removeItem('teamsSelection');
      document.cookie = `teamsSelection=; path=/; max-age=0`;
    } catch {}
    setSelection(null);
    fetch('/api/teams/unlink', { method: 'POST' }).catch(() => undefined);
  };

  // Helper function to get theme-aware colors
  const getGroupColors = (colorKey: string) => {
    const colorMap = {
      blue: {
        bg: darkMode ? 'bg-blue-950/30' : 'bg-blue-50/80',
        border: darkMode ? 'border-blue-500/60' : 'border-blue-400/80',
        text: darkMode ? 'text-blue-100' : 'text-blue-900'
      },
      green: {
        bg: darkMode ? 'bg-green-950/30' : 'bg-green-50/80',
        border: darkMode ? 'border-green-500/60' : 'border-green-400/80',
        text: darkMode ? 'text-green-100' : 'text-green-900'
      },
      yellow: {
        bg: darkMode ? 'bg-yellow-950/30' : 'bg-yellow-50/80',
        border: darkMode ? 'border-yellow-500/60' : 'border-yellow-400/80',
        text: darkMode ? 'text-yellow-100' : 'text-yellow-900'
      },
      purple: {
        bg: darkMode ? 'bg-purple-950/30' : 'bg-purple-50/80',
        border: darkMode ? 'border-purple-500/60' : 'border-purple-400/80',
        text: darkMode ? 'text-purple-100' : 'text-purple-900'
      },
      pink: {
        bg: darkMode ? 'bg-pink-950/30' : 'bg-pink-50/80',
        border: darkMode ? 'border-pink-500/60' : 'border-pink-400/80',
        text: darkMode ? 'text-pink-100' : 'text-pink-900'
      },
      indigo: {
        bg: darkMode ? 'bg-indigo-950/30' : 'bg-indigo-50/80',
        border: darkMode ? 'border-indigo-500/60' : 'border-indigo-400/80',
        text: darkMode ? 'text-indigo-100' : 'text-indigo-900'
      },
      orange: {
        bg: darkMode ? 'bg-orange-950/30' : 'bg-orange-50/80',
        border: darkMode ? 'border-orange-500/60' : 'border-orange-400/80',
        text: darkMode ? 'text-orange-100' : 'text-orange-900'
      }
    };
    return colorMap[colorKey as keyof typeof colorMap] || colorMap.blue;
  };

  // Tracker helpers
  const addTournament = () => {
    if (!newTournamentName.trim() || !newTournamentDateTime) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTournaments((prev) => [...prev, { id, name: newTournamentName.trim(), dateTime: newTournamentDateTime }]);
    setNewTournamentName('');
    setNewTournamentDateTime('');
  };

  const removeTournament = (id: string) => {
    setTournaments((prev) => prev.filter((t) => t.id !== id));
  };

  function formatDayAndDate(dt: Date): string {
    const day = dt.toLocaleDateString(undefined, { weekday: 'long' });
    const dateStr = dt.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `${day}, ${dateStr}`;
  }

  function getCountdownParts(targetISO: string) {
    const now = new Date();
    const target = new Date(targetISO);
    let diffMs = target.getTime() - now.getTime();
    const past = diffMs <= 0;
    if (past) diffMs = Math.abs(diffMs);
    const totalSeconds = Math.floor(diffMs / 1000);
    const months = Math.floor(totalSeconds / (30 * 24 * 3600));
    let rem = totalSeconds % (30 * 24 * 3600);
    const weeks = Math.floor(rem / (7 * 24 * 3600));
    rem = rem % (7 * 24 * 3600);
    const days = Math.floor(rem / (24 * 3600));
    rem = rem % (24 * 3600);
    const hours = Math.floor(rem / 3600);
    rem = rem % 3600;
    const minutes = Math.floor(rem / 60);
    const seconds = rem % 60;
    return { past, months, weeks, days, hours, minutes, seconds };
  }
  function getTopThreeUnits(parts: { past: boolean; months: number; weeks: number; days: number; hours: number; minutes: number; seconds: number }) {
    const ordered: Array<{ key: 'months'|'weeks'|'days'|'hours'|'minutes'|'seconds'; label: string; value: number }> = [
      { key: 'months', label: 'Months', value: parts.months },
      { key: 'weeks', label: 'Weeks', value: parts.weeks },
      { key: 'days', label: 'Days', value: parts.days },
      { key: 'hours', label: 'Hours', value: parts.hours },
      { key: 'minutes', label: 'Minutes', value: parts.minutes },
      { key: 'seconds', label: 'Seconds', value: parts.seconds },
    ];
    const highestIdx = ordered.findIndex((u) => u.value > 0);
    if (highestIdx === -1) return [ordered[ordered.length - 1]];
    const highestKey = ordered[highestIdx].key;
    if (highestKey === 'months' || highestKey === 'weeks') {
      const next1 = ordered[highestIdx + 1]?.value || 0;
      const next2 = ordered[highestIdx + 2]?.value || 0;
      if (next1 === 0 && next2 === 0) return [ordered[highestIdx]];
      const nonzero = ordered.slice(highestIdx).filter((u) => u.value > 0).slice(0, 3);
      return nonzero.length > 0 ? nonzero : [ordered[highestIdx]];
    }
    if (highestKey === 'days') {
      return [ordered[2], ordered[4], ordered[5]];
    }
    const nonzero = ordered.slice(highestIdx).filter((u) => u.value > 0).slice(0, 3);
    return nonzero.length > 0 ? nonzero : [ordered[highestIdx]];
  }

  // Roster overview helpers
  const activeTeam = teams[activeTeamIdx] || teams[0];
  const nameToEvents = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!activeTeam) return map;
    const entries = Object.entries(activeTeam.roster || {});
    for (const [eventName, names] of entries) {
      (names || []).forEach((nm) => {
        const name = (nm || '').trim();
        if (!name) return;
        if (!map[name]) map[name] = [];
        if (!map[name].includes(eventName)) map[name].push(eventName);
      });
    }
    return map;
  }, [activeTeam]);

  const addPersonToEvent = (personName: string, eventName: string) => {
    if (!selection) return;
    setTeams((prev) => {
      const copy = prev.map((t) => ({ ...t, roster: { ...t.roster } }));
      const team = copy[activeTeamIdx] || copy[0];
      const max = getMaxSlots(eventName);
      const current = Array.isArray(team.roster[eventName]) ? [...team.roster[eventName]] : [];
      if (current.includes(personName)) return copy;
      // Ensure capacity
      while (current.length < max) current.push('');
      const emptyIdx = current.findIndex((v) => !v);
      if (emptyIdx === -1) {
        return copy; // no space; optionally notify
      }
      current[emptyIdx] = personName;
      team.roster[eventName] = current;
      return copy;
    });
  };

  const removePersonFromEvent = (personName: string, eventName: string) => {
    setTeams((prev) => {
      const copy = prev.map((t) => ({ ...t, roster: { ...t.roster } }));
      const team = copy[activeTeamIdx] || copy[0];
      const current = Array.isArray(team.roster[eventName]) ? [...team.roster[eventName]] : [];
      const idx = current.findIndex((v) => (v || '').trim() === personName);
      if (idx >= 0) {
        current[idx] = '';
        team.roster[eventName] = current;
      }
      return copy;
    });
  };
  const addNewMember = () => {
    const name = newMemberName.trim();
    if (!name || !newMemberEvent) return;
    addPersonToEvent(name, newMemberEvent);
    setNewMemberName('');
    setNewMemberEvent('');
  };
  const exportRoster = () => {
    const team = teams[activeTeamIdx] || teams[0];
    const data = JSON.stringify(team?.roster || {}, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selection?.school || 'team'}_${selection?.division || ''}_roster.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const triggerImport = () => {
    importInputRef.current?.click();
  };
  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result || '{}'));
        if (!json || typeof json !== 'object') return;
        setTeams((prev) => {
          const copy = prev.map((t) => ({ ...t, roster: { ...t.roster } }));
          const team = copy[activeTeamIdx] || copy[0];
          team.roster = json as Record<string, string[]>;
          return copy;
        });
      } catch {}
    };
    reader.readAsText(file);
    e.currentTarget.value = '';
  };

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
              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                title="Share team"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button onClick={clearSelection} className={`px-2 py-1 border rounded transition-colors ${darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-800'}`}>Change</button>
            </div>
          )}
        </div>

        {/* Tournament Tracker */}
        {selection && (
          <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-4 mb-6`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tournament Tracker</h2>
              <button
                onClick={() => setIsTrackerOpen((o) => !o)}
                className={`text-sm px-3 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
              >
                {isTrackerOpen ? 'Hide' : 'Show'}
              </button>
            </div>
            {isTrackerOpen && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-stretch">
                  <input
                    value={newTournamentName}
                    onChange={(e) => setNewTournamentName(e.target.value)}
                    placeholder="Tournament name"
                    className={`flex-1 rounded px-3 py-2 ${darkMode ? 'bg-gray-700 text-white border border-gray-600' : 'bg-white text-gray-900 border border-gray-300'}`}
                  />
                  <input
                    type="datetime-local"
                    value={newTournamentDateTime}
                    onChange={(e) => setNewTournamentDateTime(e.target.value)}
                    className={`${darkMode ? 'bg-gray-700 text-white border border-gray-600' : 'bg-white text-gray-900 border border-gray-300'} rounded px-3 py-2`}
                  />
                  <button
                    onClick={addTournament}
                    className={`px-4 py-2 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  >
                    Add
                  </button>
                </div>
                {tournaments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {tournaments.map((t) => {
                      const target = new Date(t.dateTime);
                      const p = getCountdownParts(t.dateTime);
                      return (
                        <div key={t.id} className={`${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50 border border-gray-200'} rounded-lg p-4`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-base font-semibold">{t.name}</div>
                              <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>{formatDayAndDate(target)}</div>
                            </div>
                            <button
                              onClick={() => removeTournament(t.id)}
                              className={`${darkMode ? 'text-gray-300 hover:text-red-400' : 'text-gray-500 hover:text-red-600'} text-sm`}
                              title="Remove"
                            >
                              ×
                            </button>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            {getTopThreeUnits(p).map((u) => (
                              <div key={u.key} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded p-2`}>
                                <div className="text-xl font-bold">{u.value}</div>
                                <div className="text-xs opacity-70">{u.label}</div>
                              </div>
                            ))}
                          </div>
                          <div className={`mt-2 text-sm ${p.past ? 'text-red-500' : darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            {p.past ? 'Started' : 'Upcoming'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
            <div className="mt-4 flex items-center gap-2">
              <input
                id="team-join-code"
                placeholder="Enter team code (school::division::teamId)"
                className={`flex-1 rounded-md px-3 py-2 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'}`}
              />
              <button
                onClick={async () => {
                  const el = document.getElementById('team-join-code') as HTMLInputElement | null;
                  const code = (el?.value || '').trim();
                  if (!code) return;
                  try {
                    const res = await fetch('/api/teams/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
                    const json = await res.json();
                    if (json?.success && json?.data) {
                      setSelection({ school: json.data.school, division: json.data.division, captain: false });
                      setTeams([{ id: json.data.teamId, name: `Team ${json.data.teamId}`, roster: {} }]);
                      setActiveTeamIdx(0);
                    }
                  } catch {}
                }}
                className={`px-3 py-2 rounded-md ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                Join by Code
              </button>
            </div>
            {filteredSchools.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-auto text-sm p-2">
                {filteredSchools.slice(0, visibleCount).map((s) => (
                  <button
                    key={s}
                    onClick={() => setChosenSchool(s)}
                    className={`${chosenSchool === s ? 'ring-2 ring-blue-500' : ''} ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} px-3 py-1.5 rounded-md hover:opacity-90 text-left`}
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
                <div key={t.id} className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTeamIdx(idx)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md min-w-fit ${activeTeamIdx === idx ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                  >
                    {editingTeamIdx === idx ? (
                      <input
                        value={t.name}
                        onChange={(e) => setTeams((prev) => prev.map((tt, i) => i === idx ? { ...tt, name: e.target.value } : tt))}
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
                      <button
                        onClick={() => handleSaveTeam(idx)}
                        className="p-1 rounded hover:bg-green-600 hover:text-white transition-colors"
                        title="Save changes"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditTeam(idx)}
                        className="p-1 rounded hover:bg-blue-600 hover:text-white transition-colors"
                        title="Edit team name"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )
                  )}
                </div>
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
              <div className="ml-auto text-sm flex items-center gap-2">
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Division {selection.division}</span>
                {saving && <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Saving…</span>}
                <button onClick={unlinkFromTeam} className={`px-2 py-1 border rounded transition-colors ${darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-800'}`}>Unlink</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-4 lg:col-span-2`}>
              <h2 className="text-lg font-semibold mb-4">Division {selection.division}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(selection.division === 'B' ? DIVISION_B_GROUPS : DIVISION_C_GROUPS).map((group, index) => {
                  const colors = getGroupColors(group.colorKey);
                  const isLastGroup = index === (selection.division === 'B' ? DIVISION_B_GROUPS : DIVISION_C_GROUPS).length - 1;
                  
                  if (isLastGroup) {
                    // Full-width card for the last group (Group 7)
                    return (
                      <div key={group.label} className={`rounded-lg border-2 p-4 lg:col-span-2 ${colors.bg} ${colors.border}`}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left column */}
                          <div className="space-y-3">
                            {group.events.slice(0, Math.ceil(group.events.length / 2)).map((evt) => {
                              const max = evt.toLowerCase().includes('codebusters') || evt.toLowerCase().includes('experimental design') ? 3 : 2;
                              const team = teams[activeTeamIdx] || teams[0];
                              const base = team?.roster[evt] || [];
                              const slots = [...base, ...new Array(Math.max(0, max - base.length)).fill('')].slice(0, max);
                              return (
                                <div key={evt} className="space-y-2">
                                  <div className={`text-sm font-medium ${colors.text} flex items-center justify-between`}>
                                    <span>{evt} {selection.division}</span>
                                    <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{slots.filter((n) => (n || '').trim()).length}/{max}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {[...Array(max)].map((_, i) => (
                                      <input
                                        key={i}
                                        value={slots[i] || ''}
                                        onChange={(e) => setName(selection.division, evt, i, e.target.value)}
                                        disabled={!isLeader}
                                        placeholder="Name"
                                        className={`w-full rounded px-2 py-1 text-sm ${darkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'}`}
                                      />
                                    ))}
                                  </div>
                                  {isLeader && (
                                    <div className="flex justify-end">
                                      <div className="relative inline-block text-left">
                                        <details className="group">
                                          <summary className={`list-none cursor-pointer inline-flex items-center gap-1 text-xs ${darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}>Assign test ▾</summary>
                                          <div className={`absolute right-0 mt-1 w-64 rounded-md shadow-lg z-10 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                            <button className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}/teams/assign?event=${encodeURIComponent(evt)}&scope=all&team=${encodeURIComponent((teams[activeTeamIdx]?.id)||'A')}`);}}>Copy Link: Assign to All</button>
                                            {slots.filter((n)=> (n||'').trim()).map((n, idx) => (
                                              <button key={idx} className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}/teams/assign?event=${encodeURIComponent(evt)}&scope=${encodeURIComponent((n||'').trim())}&team=${encodeURIComponent((teams[activeTeamIdx]?.id)||'A')}`);}}>Copy Link: Assign to {n}</button>
                                            ))}
                                          </div>
                                        </details>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Right column */}
                          <div className="space-y-3">
                            {group.events.slice(Math.ceil(group.events.length / 2)).map((evt) => {
                              const max = evt.toLowerCase().includes('codebusters') || evt.toLowerCase().includes('experimental design') ? 3 : 2;
                              const team = teams[activeTeamIdx] || teams[0];
                              const base = team?.roster[evt] || [];
                              const slots = [...base, ...new Array(Math.max(0, max - base.length)).fill('')].slice(0, max);
                              return (
                                <div key={evt} className="space-y-2">
                                  <div className={`text-sm font-medium ${colors.text} flex items-center justify-between`}>
                                    <span>{evt} {selection.division}</span>
                                    <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{slots.filter((n) => (n || '').trim()).length}/{max}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {[...Array(max)].map((_, i) => (
                                      <input
                                        key={i}
                                        value={slots[i] || ''}
                                        onChange={(e) => setName(selection.division, evt, i, e.target.value)}
                                        disabled={!isLeader}
                                        placeholder="Name"
                                        className={`w-full rounded px-2 py-1 text-sm ${darkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'}`}
                                      />
                                    ))}
                                  </div>
                                  {isLeader && (
                                    <div className="flex justify-end">
                                      <div className="relative inline-block text-left">
                                        <details className="group">
                                          <summary className={`list-none cursor-pointer inline-flex items-center gap-1 text-xs ${darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}>Assign test ▾</summary>
                                          <div className={`absolute right-0 mt-1 w-64 rounded-md shadow-lg z-10 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                            <button className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}/teams/assign?event=${encodeURIComponent(evt)}&scope=all&team=${encodeURIComponent((teams[activeTeamIdx]?.id)||'A')}`);}}>Copy Link: Assign to All</button>
                                            {slots.filter((n)=> (n||'').trim()).map((n, idx) => (
                                              <button key={idx} className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}/teams/assign?event=${encodeURIComponent(evt)}&scope=${encodeURIComponent((n||'').trim())}&team=${encodeURIComponent((teams[activeTeamIdx]?.id)||'A')}`);}}>Copy Link: Assign to {n}</button>
                                            ))}
                                          </div>
                                        </details>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Regular card for other groups
                    return (
                      <div key={group.label} className={`rounded-lg border-2 p-4 ${colors.bg} ${colors.border}`}>
                        <div className="space-y-3">
                          {group.events.map((evt) => {
                            const max = evt.toLowerCase().includes('codebusters') || evt.toLowerCase().includes('experimental design') ? 3 : 2;
                            const team = teams[activeTeamIdx] || teams[0];
                            const base = team?.roster[evt] || [];
                            const slots = [...base, ...new Array(Math.max(0, max - base.length)).fill('')].slice(0, max);
                            return (
                              <div key={evt} className="space-y-2">
                                <div className={`text-sm font-medium ${colors.text} flex items-center justify-between`}>
                                  <span>{evt} {selection.division}</span>
                                  <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{slots.filter((n) => (n || '').trim()).length}/{max}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {[...Array(max)].map((_, i) => (
                                    <input
                                      key={i}
                                      value={slots[i] || ''}
                                      onChange={(e) => setName(selection.division, evt, i, e.target.value)}
                                      disabled={!isLeader}
                                      placeholder="Name"
                                      className={`w-full rounded px-2 py-1 text-sm ${darkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'}`}
                                    />
                                  ))}
                                </div>
                                {isLeader && (
                                  <div className="flex justify-end">
                                    <div className="relative inline-block text-left">
                                      <details className="group">
                                        <summary className={`list-none cursor-pointer inline-flex items-center gap-1 text-xs ${darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}>Assign test ▾</summary>
                                        <div className={`absolute right-0 mt-1 w-64 rounded-md shadow-lg z-10 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                          <button className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}/teams/assign?event=${encodeURIComponent(evt)}&scope=all&team=${encodeURIComponent((teams[activeTeamIdx]?.id)||'A')}`);}}>Copy Link: Assign to All</button>
                                          {slots.filter((n)=> (n||'').trim()).map((n, idx) => (
                                            <button key={idx} className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}/teams/assign?event=${encodeURIComponent(evt)}&scope=${encodeURIComponent((n||'').trim())}&team=${encodeURIComponent((teams[activeTeamIdx]?.id)||'A')}`);}}>Copy Link: Assign to {n}</button>
                                          ))}
                                        </div>
                                      </details>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
            {/* Roster Overview: Members with event badges */}
            <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-4 lg:col-span-2`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Members</h2>
                <div className="flex items-center gap-2 text-sm">
                  <button onClick={exportRoster} className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'} px-2 py-1 rounded`}>Export</button>
                  <button onClick={triggerImport} className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'} px-2 py-1 rounded`}>Import</button>
                  <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />
                  <a href="/teams/results" className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'} px-2 py-1 rounded`}>Results</a>
                </div>
              </div>

              {isLeader && (
                <div className="mb-4 flex flex-col md:flex-row gap-2 items-stretch">
                  <input
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="New member name"
                    className={`${darkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'} rounded px-3 py-2 flex-1`}
                  />
                  <select
                    value={newMemberEvent}
                    onChange={(e) => setNewMemberEvent(e.target.value)}
                    className={`${darkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'} rounded px-3 py-2`}
                  >
                    <option value="">Select event</option>
                    {(selection.division === 'B' ? DIVISION_B_GROUPS : DIVISION_C_GROUPS).flatMap((g) => g.events).map((evt) => (
                      <option key={evt} value={evt}>{evt}</option>
                    ))}
                  </select>
                  <button onClick={addNewMember} className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded px-3 py-2`}>Add</button>
                </div>
              )}
              {Object.keys(nameToEvents).length === 0 ? (
                <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Start filling in names above to see a consolidated member list.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.keys(nameToEvents).sort((a, b) => a.localeCompare(b)).map((name) => {
                    const personEvents = nameToEvents[name];
                    const allEvents = (selection.division === 'B' ? DIVISION_B_GROUPS : DIVISION_C_GROUPS).flatMap((g) => g.events);
                    const availableToAdd = allEvents.filter((e) => !personEvents.includes(e));
                    return (
                      <div key={name} className={`${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50 border border-gray-200'} rounded-lg p-3`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold truncate" title={name}>{name}</div>
                          <div className="flex items-center gap-2">
                            {isLeader && (
                              <>
                                {nameAddingEvent === name ? (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={selectedEventForName}
                                      onChange={(e) => setSelectedEventForName(e.target.value)}
                                      className={`${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'} rounded px-2 py-1 text-sm`}
                                    >
                                      <option value="">Select event</option>
                                      {availableToAdd.map((evt) => (
                                        <option key={evt} value={evt}>{evt}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => {
                                        if (!selectedEventForName) return;
                                        addPersonToEvent(name, selectedEventForName);
                                        setSelectedEventForName('');
                                        setNameAddingEvent(null);
                                      }}
                                      className={`px-2 py-1 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} text-sm`}
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => { setNameAddingEvent(null); setSelectedEventForName(''); }}
                                      className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} text-sm`}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setNameAddingEvent(name); setSelectedEventForName(''); }}
                                    className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} text-xs`}
                                    title="Add to event"
                                  >
                                    + Add
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {personEvents.map((evt) => (
                            <span key={evt} className={`${darkMode ? 'bg-blue-900/30 text-blue-200 border border-blue-800/60' : 'bg-blue-100 text-blue-800 border border-blue-200'} inline-flex items-center px-2 py-0.5 rounded-full text-xs`}> 
                              {evt}
                              {isLeader && (
                                <button
                                  onClick={() => removePersonFromEvent(name, evt)}
                                  className={`ml-2 ${darkMode ? 'text-blue-300 hover:text-blue-100' : 'text-blue-700 hover:text-blue-900'}`}
                                  title="Remove from event"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </>
        )}

        {/* Team Share Modal */}
        <TeamShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          school={selection?.school || ''}
          division={selection?.division || 'C'}
          isCaptain={isLeader}
          onJoinTeam={handleJoinTeam}
        />
      </div>
    </div>
  );
}
