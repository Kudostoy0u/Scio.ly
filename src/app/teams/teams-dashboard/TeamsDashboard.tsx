'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/app/components/Header';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { Edit, Check, Share2, Trash2, Crown, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { Save as SaveIcon } from 'lucide-react';
import TeamShareModal from '../components/TeamShareModal';
import Link from 'next/link';
import TestConfiguration from '@/app/practice/components/TestConfiguration';
import type { Event as PracticeEvent, Settings as PracticeSettings } from '@/app/practice/types';


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

export default function TeamsDashboard({ initialLinkedSelection, initialSlug, initialGroupSlug, initialIsCaptain }: { initialLinkedSelection?: { school: string; division: 'B'|'C'; team_id: string; member_name?: string } | null, initialSlug?: string | null, initialGroupSlug?: string | null, initialIsCaptain?: boolean | null }) {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [availableSchools, setAvailableSchools] = useState<string[]>([]);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [selection, setSelection] = useState<TeamSelection | null>(null);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; roster: Record<string, string[]> }>>([{ id: 'A', name: 'Team A', roster: {} }]);
  const [teamUnits, setTeamUnits] = useState<Array<{ teamId: string; name: string; slug?: string }>>([]);
  const [activeTeamIdx, setActiveTeamIdx] = useState<number>(0);
  const [editingTeamIdx, setEditingTeamIdx] = useState<number | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(40);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [chosenSchool, setChosenSchool] = useState<string | null>(null);
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
  const [nameInviting, setNameInviting] = useState<string | null>(null);
  const [invitingUsername, setInvitingUsername] = useState<string>('');
  const [members, setMembers] = useState<Array<{ userId: string; username: string | null; displayName: string | null; firstName: string | null; lastName: string | null; role: 'captain'|'user' }>>([]);
  const [topAddOpen, setTopAddOpen] = useState<boolean>(false);
  const [topInviteOpen, setTopInviteOpen] = useState<boolean>(false);
  const [topAddName, setTopAddName] = useState<string>('');
  const [topInviteUsername, setTopInviteUsername] = useState<string>('');
  const [extraUnlinkedNames, setExtraUnlinkedNames] = useState<string[]>([]);
  // Linking UI removed in new architecture
  const [saving, setSaving] = useState<boolean>(false);
  const [existingTeamWarning, setExistingTeamWarning] = useState<{ school: string; division: 'B' | 'C' } | null>(null);
  const [joinError, setJoinError] = useState<string>('');
  const [createError, setCreateError] = useState<string>('');
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const groupSlugRef = useRef<string | null>(initialGroupSlug || null);
  const lastLoadKeyRef = useRef<string | null>(null);
  const inFlightFetchesRef = useRef<Map<string, Promise<any>>>(new Map());
  const [initializedFromSlug, setInitializedFromSlug] = useState<boolean>(false);
  const [addingTeam, setAddingTeam] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; teamId?: string; teamName?: string }>(false as any);
  const [assignModal, setAssignModal] = useState<{ open: boolean; eventName: string; scope: 'all' | string } | null>(null);
  const [assignSettings, setAssignSettings] = useState<PracticeSettings>({ questionCount: 10, timeLimit: 15, difficulties: [], types: 'multiple-choice', division: 'any', tournament: '', subtopics: [], idPercentage: 0 });
  const [assignEvent, setAssignEvent] = useState<PracticeEvent | null>(null);


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

  const desiredTeamIdRef = useRef<string | null>(initialLinkedSelection?.team_id || null);
  const desiredSelectionSetRef = useRef<boolean>(false);
  useEffect(() => {
    try {
      if (initialLinkedSelection && initialLinkedSelection.school && (initialLinkedSelection.division === 'B' || initialLinkedSelection.division === 'C')) {
        setSelection({ school: initialLinkedSelection.school, captain: !!initialIsCaptain, division: initialLinkedSelection.division });
        setTeams([{ id: initialLinkedSelection.team_id || 'A', name: `Team ${initialLinkedSelection.team_id || 'A'}`, roster: {} }]);
        setActiveTeamIdx(0);
        desiredTeamIdRef.current = initialLinkedSelection.team_id || null;
        desiredSelectionSetRef.current = true;
      }
    } catch {}
  }, [initialLinkedSelection, initialIsCaptain]);

  // If a unit slug is given (legacy), load that unit directly once
  useEffect(() => {
    const loadBySlug = async () => {
      if (!initialSlug || initializedFromSlug) return;
      try {
        const res = await fetch(`/api/teams/units/${initialSlug}`);
        if (res.ok) {
          const json = await res.json();
          const unit = json?.data;
          if (unit) {
            setSelection({ school: unit.school, captain: json?.role === 'captain', division: unit.division });
            setTeams([{ id: unit.teamId, name: unit.name, roster: unit.roster || {} }]);
            setActiveTeamIdx(0);
            setCurrentSlug(unit.slug);
            // Remember the teamId so tabs can highlight the correct subteam once loaded
            desiredTeamIdRef.current = unit.teamId;
            setInitializedFromSlug(true);
          }
        }
      } catch {}
    };
    void loadBySlug();
  }, [initialSlug, initializedFromSlug]);

  // If a group slug is given (new model), load group and units
  useEffect(() => {
    const loadByGroupSlug = async () => {
      if (!initialGroupSlug || initializedFromSlug) return;
      try {
        const url = `/api/teams/group/${initialGroupSlug}`;
        let p = inFlightFetchesRef.current.get(url);
        if (!p) {
          p = fetch(url);
          inFlightFetchesRef.current.set(url, p);
        }
        const res = await p;
        if (res.ok) {
          const json = await res.json();
          const group = json?.data?.group;
          const units = json?.data?.units || [];
          if (group && Array.isArray(units) && units.length > 0) {
            setSelection({ school: group.school, captain: json?.role === 'captain', division: group.division });
            setTeamUnits(units.map((u: any) => ({ teamId: u.teamId, name: u.name, slug: u.slug })));
            const desiredId = initialLinkedSelection?.team_id || units[0].teamId;
            const idx = Math.max(0, units.findIndex((u: any) => u.teamId === desiredId));
            const chosen = units[idx] || units[0];
            setTeams([{ id: chosen.teamId, name: chosen.name, roster: chosen.roster || {} }]);
            setActiveTeamIdx(idx);
            setCurrentSlug(chosen.slug || null);
            groupSlugRef.current = group.slug || initialGroupSlug;
            desiredTeamIdRef.current = chosen.teamId;
            // Seed tournaments if provided to avoid extra fetch
            if (Array.isArray(json?.data?.tournaments) && json.data.tournaments.length > 0) {
              setTournaments(json.data.tournaments.map((t: any) => ({ id: String(t.id), name: t.name, dateTime: t.dateTime })));
            }
            setInitializedFromSlug(true);
          }
        }
      } catch {}
    };
    void loadByGroupSlug();
  }, [initialGroupSlug, initializedFromSlug, initialLinkedSelection?.team_id]);

  useEffect(() => {
    if (!selection) return;
    // Load available team units even when initialized by slug; prefer group when available
    const loadFromApi = async () => {
      try {
        const preferredId = desiredTeamIdRef.current || (teams[activeTeamIdx]?.id) || 'A';
        const loadKey = `${selection.school}:${selection.division}:${preferredId}`;
        if (lastLoadKeyRef.current === loadKey) return;
        if (groupSlugRef.current) {
          // If we already have units from group, avoid re-fetching group
          if (teamUnits.length > 0) {
            const mapped = teamUnits;
            const desiredId = desiredTeamIdRef.current
              || (currentSlug ? (mapped.find((u: any) => u.slug === currentSlug)?.teamId || null) : null)
              || (teams[activeTeamIdx]?.id)
              || mapped[0].teamId;
            const idx = Math.max(0, mapped.findIndex((u: any) => u.teamId === desiredId));
            const targetTeamId = mapped[idx >= 0 ? idx : 0].teamId;
            if ((teams[activeTeamIdx]?.id) !== targetTeamId) {
              try {
                const url = `/api/teams/units?school=${encodeURIComponent(selection.school)}&division=${selection.division}&teamId=${targetTeamId}`;
                let p = inFlightFetchesRef.current.get(url);
                if (!p) { p = fetch(url); inFlightFetchesRef.current.set(url, p); }
                const res = await p;
                if (res.ok) {
                  const data = await res.json();
                  if (data?.success && data?.data) {
                    setTeams([{ id: data.data.teamId, name: data.data.name, roster: data.data.roster || {} }]);
                    setCurrentSlug(data.data.slug || null);
                  }
                }
              } catch {}
            }
            setActiveTeamIdx(idx >= 0 ? idx : 0);
            lastLoadKeyRef.current = loadKey;
            desiredTeamIdRef.current = null;
            return;
          } else {
            const url = `/api/teams/group/${groupSlugRef.current}`;
            let p = inFlightFetchesRef.current.get(url);
            if (!p) { p = fetch(url); inFlightFetchesRef.current.set(url, p); }
            const groupRes = await p;
            if (groupRes.ok) {
              const groupJson = await groupRes.json();
              const units = Array.isArray(groupJson?.data?.units) ? groupJson.data.units : [];
              if (units.length > 0) {
                const mapped = units.map((u: any) => ({ teamId: u.teamId, name: u.name, slug: u.slug }));
                setTeamUnits(mapped);
                const desiredId = desiredTeamIdRef.current
                  || (currentSlug ? (units.find((u: any) => u.slug === currentSlug)?.teamId || null) : null)
                  || (teams[activeTeamIdx]?.id)
                  || units[0].teamId;
                const idx = Math.max(0, mapped.findIndex((u: any) => u.teamId === desiredId));
                const targetTeamId = mapped[idx >= 0 ? idx : 0].teamId;
                if ((teams[activeTeamIdx]?.id) !== targetTeamId) {
                  try {
                    const u2 = `/api/teams/units?school=${encodeURIComponent(selection.school)}&division=${selection.division}&teamId=${targetTeamId}`;
                    let p2 = inFlightFetchesRef.current.get(u2);
                    if (!p2) { p2 = fetch(u2); inFlightFetchesRef.current.set(u2, p2); }
                    const res = await p2;
                    if (res.ok) {
                      const data = await res.json();
                      if (data?.success && data?.data) {
                        setTeams([{ id: data.data.teamId, name: data.data.name, roster: data.data.roster || {} }]);
                        setCurrentSlug(data.data.slug || null);
                      }
                    }
                  } catch {}
                }
                setActiveTeamIdx(idx >= 0 ? idx : 0);
                lastLoadKeyRef.current = loadKey;
                desiredTeamIdRef.current = null;
                return;
              }
            }
          }
        } else {
          const unitsRes = await fetch(`/api/teams/units?school=${encodeURIComponent(selection.school)}&division=${selection.division}`);
          if (unitsRes.ok) {
            const unitsJson = await unitsRes.json();
            if (unitsJson?.success && Array.isArray(unitsJson.data) && unitsJson.data.length > 0) {
              const mapped = unitsJson.data.map((u: any) => ({ teamId: u.teamId, name: u.name, slug: u.slug }));
              setTeamUnits(mapped);
              const desiredId = desiredTeamIdRef.current
                || (currentSlug ? (unitsJson.data.find((u: any) => u.slug === currentSlug)?.teamId || null) : null)
                || (teams[activeTeamIdx]?.id)
                || unitsJson.data[0].teamId;
              const idx = Math.max(0, mapped.findIndex((u: any) => u.teamId === desiredId));
              const targetTeamId = mapped[idx >= 0 ? idx : 0].teamId;
              if ((teams[activeTeamIdx]?.id) !== targetTeamId) {
                try {
                  const res = await fetch(`/api/teams/units?school=${encodeURIComponent(selection.school)}&division=${selection.division}&teamId=${targetTeamId}`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data?.success && data?.data) {
                      setTeams([{ id: data.data.teamId, name: data.data.name, roster: data.data.roster || {} }]);
                      setCurrentSlug(data.data.slug || null);
                    }
                  }
                } catch {}
              }
              setActiveTeamIdx(idx >= 0 ? idx : 0);
              lastLoadKeyRef.current = loadKey;
              desiredTeamIdRef.current = null;
              return;
            }
          }
        }
      } catch {}
    };
    loadFromApi();
  }, [selection, initialSlug, initializedFromSlug, currentSlug, teams, activeTeamIdx, teamUnits]);

  // Removed clearing tournaments on selection change to prevent flicker/disappear

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

  // Deprecated: join handled via slug navigation

  // Save team data to database
  const saveTeamDataToDB = useCallback(async () => {
    if (!selection) return;
    try {
      setSaving(true);
      // If normalized units available, save the active team's roster only
      const active = teams[activeTeamIdx] || teams[0];
      if (active?.id && currentSlug) {
        const resp = await fetch(`/api/teams/units/${currentSlug}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'saveRoster', roster: active.roster })
        });
        if (!resp.ok) {
          try {
            const err = await resp.json();
            console.error('Failed to save roster', err);
            // Optionally integrate toast here if available in app
            toast.error(err?.error || 'Failed to save roster');
          } catch { console.error('Failed to save roster'); }
        }
        if (resp.ok) toast.success('Roster saved');
      } else if (active?.id) {
        const resp = await fetch('/api/teams/units', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'saveRoster', school: selection.school, division: selection.division, teamId: active.id, roster: active.roster })
        });
        if (!resp.ok) {
          try {
            const err = await resp.json();
            console.error('Failed to save roster', err);
            toast.error(err?.error || 'Failed to save roster');
          } catch { console.error('Failed to save roster'); }
        }
        if (resp.ok) toast.success('Roster saved');
      }
    } catch (error) {
      console.error('Error saving team data:', error);
    } finally { setSaving(false); }
  }, [selection, teams, activeTeamIdx, currentSlug]);

  // Manual save only (no autosave to reduce DB load)

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

  // clearSelection deprecated; use unlinkFromTeam instead
  const unlinkFromTeam = () => {
    setSelection(null);
    setCurrentSlug(null);
    try { if (typeof document !== 'undefined') document.cookie = `teamsJustUnlinked=1; path=/; max-age=10`; } catch {}
    fetch('/api/teams/unlink', { method: 'POST' })
      .then(() => {
        router.push('/teams');
        setTimeout(() => { try { if (typeof document !== 'undefined') document.cookie = `teamsJustUnlinked=; path=/; max-age=0`; } catch {} }, 500);
      })
      .catch(() => { router.push('/teams'); });
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

  // Load tournaments from API when group slug becomes available
  useEffect(() => {
    const load = async () => {
      if (!groupSlugRef.current) return;
      if (tournaments.length > 0) return;
      try {
        const url = `/api/teams/group/${groupSlugRef.current}`;
        let p = inFlightFetchesRef.current.get(url);
        if (!p) { p = fetch(url, { cache: 'no-store' }); inFlightFetchesRef.current.set(url, p); }
        const res = await p;
        const json = await res.json();
        if (json?.success && json?.data?.tournaments) {
          setTournaments(json.data.tournaments.map((t: any) => ({ id: String(t.id), name: t.name, dateTime: t.dateTime })));
        }
      } catch {}
    };
    load();
  }, [initialGroupSlug, currentSlug, selection, tournaments.length]);

  // Tracker helpers
  const addTournament = () => {
    if (!newTournamentName.trim() || !newTournamentDateTime) return;
    if (!groupSlugRef.current) return;
    const name = newTournamentName.trim();
    const dateTime = newTournamentDateTime;
    (async () => {
      try {
        const res = await fetch(`/api/teams/group/${groupSlugRef.current}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, dateTime })
        });
        const json = await res.json();
        if (json?.success && json?.data) {
          setTournaments((prev) => [...prev, { id: String(json.data.id), name: json.data.name, dateTime: json.data.dateTime }]);
          setNewTournamentName('');
          setNewTournamentDateTime('');
        }
      } catch {}
    })();
  };

  const removeTournament = (id: string) => {
    if (!groupSlugRef.current) return;
    (async () => {
      try {
        const res = await fetch(`/api/teams/group/${groupSlugRef.current}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        const json = await res.json();
        if (json?.success) setTournaments((prev) => prev.filter((t) => t.id !== id));
      } catch {}
    })();
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

  // Merge account-linked members into the roster view (show even if no events)
  const mergedMemberNames = useMemo(() => {
    const names = new Set<string>(Object.keys(nameToEvents));
    for (const m of members) {
      const full = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
      const label = full || m.displayName || m.username || '';
      if (label) names.add(label);
    }
    for (const nm of extraUnlinkedNames) {
      const name = (nm || '').trim();
      if (name) names.add(name);
    }
    return Array.from(names);
  }, [nameToEvents, members, extraUnlinkedNames]);

  // Detect duplicate members in the same event group (block) with detailed info
  const duplicateMembersInfo = useMemo(() => {
    const memberDuplicates: Record<string, { groups: string[], events: string[] }> = {}; // member name -> { groups: [], events: [] }
    const activeTeam = teams[activeTeamIdx] || teams[0];
    if (!activeTeam || !selection) return memberDuplicates;

    const groups = selection.division === 'B' ? DIVISION_B_GROUPS : DIVISION_C_GROUPS;
    
    groups.forEach(group => {
      const nameToEvents: Record<string, string[]> = {}; // name -> events they're in within this group
      
      // Collect all names from all events in this group
      group.events.forEach(eventName => {
        const eventNames = activeTeam.roster[eventName] || [];
        eventNames.forEach(name => {
          const trimmedName = (name || '').trim();
          if (trimmedName) {
            if (!nameToEvents[trimmedName]) {
              nameToEvents[trimmedName] = [];
            }
            nameToEvents[trimmedName].push(eventName);
          }
        });
      });
      
      // Find duplicates within this group
      Object.entries(nameToEvents).forEach(([name, events]) => {
        if (events.length > 1) {
          if (!memberDuplicates[name]) {
            memberDuplicates[name] = { groups: [], events: [] };
          }
          memberDuplicates[name].groups.push(group.label);
          memberDuplicates[name].events.push(...events);
          // Remove duplicates from events array
          memberDuplicates[name].events = [...new Set(memberDuplicates[name].events)];
        }
      });
    });
    
    return memberDuplicates;
  }, [teams, activeTeamIdx, selection]);


  useEffect(() => {
    const loadMembers = async () => {
      if (!selection) return;
      const teamId = teams[activeTeamIdx]?.id || teams[0]?.id || 'A';
      const url = `/api/teams/units?school=${encodeURIComponent(selection.school)}&division=${selection.division}&teamId=${teamId}&members=1`;
      try {
        let p = inFlightFetchesRef.current.get(url);
        if (!p) { p = fetch(url); inFlightFetchesRef.current.set(url, p); }
        const res = await p;
        if (res.ok) {
          const j = await res.json();
          if (j?.success && Array.isArray(j.data)) setMembers(j.data);
        }
      } catch {}
    };
    loadMembers();
  }, [selection, selection?.school, selection?.division, teams, activeTeamIdx]);

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
              <button onClick={unlinkFromTeam} className={`px-2 py-1 border rounded transition-colors ${darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-800'}`}>Unlink</button>
            </div>
          )}
        </div>

        {/* Tournament Tracker */}
        {selection && (
          <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-4 mb-6`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tournament Tracker</h2>
              {isLeader && (
                <button
                  onClick={() => setIsTrackerOpen((o) => !o)}
                  className={`text-sm px-3 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                >
                  {isTrackerOpen ? 'Hide Add' : 'Add Tournament'}
                </button>
              )}
            </div>
            {/* Add Tournament Section - Only for leaders */}
            {isLeader && isTrackerOpen && (
              <div className="mt-4 mb-4">
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
              </div>
            )}
            
            {/* Tournament Timers - Always visible if tournaments exist */}
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
                        {isLeader && (
                          <button
                            onClick={() => removeTournament(t.id)}
                            className={`${darkMode ? 'text-gray-300 hover:text-red-400' : 'text-gray-500 hover:text-red-600'} text-sm`}
                            title="Remove"
                          >
                            ×
                          </button>
                        )}
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

        {!selection && (
          <div className={`rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} p-4 mb-6`}>
            <h2 className="font-semibold mb-3">Create a Team</h2>
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
                <select
                  value={pendingDivision}
                  onChange={(e) => setPendingDivision(e.target.value as 'B' | 'C')}
                  className={`${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded px-2 py-1 text-sm`}
                >
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                </select>
                <button
                  onClick={async () => {
                    if (!chosenSchool) return;
                    if (!user?.id) { setCreateError('You must be signed in to create a team.'); toast.error('You must be signed in to create a team.'); return; }
                    try {
                      setCreateError('');
                      // Always offer creating a new team unit even if others exist
                      const unitsRes = await fetch(`/api/teams/units?school=${encodeURIComponent(chosenSchool)}&division=${pendingDivision}`);
                      if (unitsRes.ok) {
                        const unitsJson = await unitsRes.json();
                        if (unitsJson?.success && Array.isArray(unitsJson.data) && unitsJson.data.length > 0) {
                          setExistingTeamWarning({ school: chosenSchool, division: pendingDivision });
                          return;
                        }
                      }
                    } catch {}
                    // Do not set local selection/teams here; create and navigate to the new slug
                    // Persist immediately to generate permanent codes
                    try {
                      const createRes = await fetch('/api/teams/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', school: chosenSchool, division: pendingDivision }) });
                      if (!createRes.ok) {
                        if (createRes.status === 401) { setCreateError('You must be signed in to create a team.'); toast.error('You must be signed in to create a team.'); }
                        try { const err = await createRes.json(); if (err?.error) toast.error(err.error); } catch {}
                      } else {
                        const created = await createRes.json();
                        if (created?.success && (created?.groupSlug || created?.data?.slug)) {
                          // Replace local team with empty roster and new tab
                          const slug = created.groupSlug || created.data.slug;
                          router.push(`/teams/${slug}`);
                          toast.success('Team created!');
                        }
                      }
                    } catch {
                      setCreateError('You must be signed in to create a team.');
                      toast.error('You must be signed in to create a team.');
                    }
                  }}
                  disabled={!chosenSchool}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${chosenSchool ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                >
                  Create Team
                </button>
              </div>
            </div>
            {!!createError && (
              <div className={`${darkMode ? 'text-red-300' : 'text-red-600'} text-sm mt-2`} role="alert">{createError}</div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <input
                id="team-join-code"
                placeholder="Enter team code..."
                className={`flex-1 rounded-md px-3 py-2 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'}`}
              />
              <button
                onClick={async () => {
                  const el = document.getElementById('team-join-code') as HTMLInputElement | null;
                  const code = (el?.value || '').trim();
                  if (!code) return;
                  if (!user?.id) { setJoinError('You must be signed in to join a team.'); toast.error('You must be signed in to join a team.'); return; }
                  try {
                    setJoinError('');
                    const res = await fetch('/api/teams/join-by-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
                    const json = await res.json();
                    if (json?.success && json?.slug) {
                      router.push(`/teams/${json.slug}`);
                      el!.value = '';
                      toast.success('Joined team');
                    } else {
                      setJoinError(json?.error || 'Unable to join team');
                      toast.error(json?.error || 'Unable to join team');
                    }
                  } catch {
                    setJoinError('You must be signed in to join a team.');
                    toast.error('You must be signed in to join a team.');
                  }
                }}
                className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} px-3 py-2 rounded-md`}
              >
                Join Team
              </button>
            </div>
            {!!joinError && (
              <div className={`${darkMode ? 'text-red-300' : 'text-red-600'} text-sm mt-2`} role="alert">{joinError}</div>
            )}
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
              {(teamUnits.length > 0 ? teamUnits.map((u) => ({ id: u.teamId, name: u.name, slug: u.slug, roster: {} as Record<string, string[]> })) : teams).map((t, idx) => (
                <div key={t.id} className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      // Prevent route changes to avoid flicker; switch client-side
                      desiredTeamIdRef.current = (t as any).id;
                      setActiveTeamIdx(idx);
                      if (teamUnits.length > 0) {
                        // keep internal slug in sync for saving, without changing URL
                        setCurrentSlug((t as any).slug || null);
                      }
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
                          // Update both teams (content) and teamUnits (tabs) for immediate UX response
                          setTeams((prev) => prev.map((tt, i) => i === idx ? { ...tt, name: newName } : tt));
                          setTeamUnits((prev) => prev.map((u) => (u.teamId === (t as any).id ? { ...u, name: newName } : u)));
                          // Persist rename (lightweight, no block)
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
                        <button
                          onClick={() => handleSaveTeam(idx)}
                          className="p-1 rounded hover:bg-green-600 hover:text-white transition-colors"
                          title="Save changes"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ open: true, teamId: t.id, teamName: t.name })}
                          className="p-1 rounded hover:bg-red-600 hover:text-white transition-colors"
                          title="Delete subteam"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
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
                  onClick={async () => {
                    if (!selection || addingTeam) return;
                    setAddingTeam(true);
                    // determine next letter from existing teamUnits or fallback to teams length
                    const existingIds = (teamUnits.length > 0 ? teamUnits.map(u => u.teamId) : teams.map(tt => tt.id)) as string[];
                    const nextLetter = (() => {
                      if (existingIds.length === 0) return 'A';
                      const sorted = existingIds.slice().sort();
                      const last = sorted[sorted.length - 1];
                      const code = last.charCodeAt(0);
                      return String.fromCharCode(code + 1);
                    })();
                    // optimistic UI add
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
                        try { const err = await res.json(); toast.error(err?.error || 'Failed to add subteam'); } catch { toast.error('Failed to add subteam'); }
                        // rollback optimistic
                        setTeamUnits((prev) => prev.filter(u => u.teamId !== nextLetter));
                        return;
                      }
                      const json = await res.json();
                      if (json?.success && json?.data) {
                        setTeamUnits((prev) => prev.map(u => u.teamId === nextLetter ? { teamId: json.data.teamId, name: json.data.name, slug: json.data.slug } : u));
                        setTeams([{ id: json.data.teamId, name: json.data.name, roster: {} }]);
                        setActiveTeamIdx(teamUnits.length); // focus new tab
                        toast.success('Subteam created');
                      }
                    } catch {
                      // rollback optimistic
                      setTeamUnits((prev) => prev.filter(u => u.teamId !== nextLetter));
                      toast.error('Failed to add subteam');
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
              <div className="ml-auto text-sm flex items-center gap-2">
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Division {selection.division}</span>
                {saving && <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Saving…</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-4 lg:col-span-2`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Division {selection.division}</h2>
                {isLeader && (
                  <button
                    onClick={saveTeamDataToDB}
                    disabled={saving}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-900/50' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
                    title="Save roster"
                  >
                    <SaveIcon className="w-4 h-4" />
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>
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
                                    <div className="flex items-center gap-2">
                                      <span>{evt}</span>
                                      {isLeader && false && (
                                        <div className="relative inline-block text-left">
                                          <details className="group">
                                            <summary className={`list-none cursor-pointer inline-flex items-center gap-1 text-xs ${darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}>Assign test ▾</summary>
                                            <div className={`absolute left-0 mt-1 w-64 rounded-md shadow-lg z-10 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                              <button className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: selection?.division ? [selection.division] : ['B','C'] }); setAssignSettings((prev)=> ({ ...prev, division: (selection?.division||'any') as any })); setAssignModal({ open: true, eventName: evt, scope: 'all' });}}>Assign to All</button>
                                              {slots.filter((n)=> (n||'').trim()).map((n, idx) => (
                                                <button key={idx} className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: selection?.division ? [selection.division] : ['B','C'] }); setAssignSettings((prev)=> ({ ...prev, division: (selection?.division||'any') as any })); setAssignModal({ open: true, eventName: evt, scope: (n||'').trim() });}}>Assign to {n}</button>
                                              ))}
                                            </div>
                                          </details>
                                        </div>
                                      )}
                                    </div>
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
                                    <div className="flex items-center gap-2">
                                      <span>{evt}</span>
                                      {isLeader && false && (
                                        <div className="relative inline-block text-left">
                                          <details className="group">
                                            <summary className={`list-none cursor-pointer inline-flex items-center gap-1 text-xs ${darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}>Assign test ▾</summary>
                                            <div className={`absolute left-0 mt-1 w-64 rounded-md shadow-lg z-10 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                              <button className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: selection?.division ? [selection.division] : ['B','C'] }); setAssignSettings((prev)=> ({ ...prev, division: (selection?.division||'any') as any })); setAssignModal({ open: true, eventName: evt, scope: 'all' });}}>Assign to All</button>
                                              {slots.filter((n)=> (n||'').trim()).map((n, idx) => (
                                                <button key={idx} className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: selection?.division ? [selection.division] : ['B','C'] }); setAssignSettings((prev)=> ({ ...prev, division: (selection?.division||'any') as any })); setAssignModal({ open: true, eventName: evt, scope: (n||'').trim() });}}>Assign to {n}</button>
                                              ))}
                                            </div>
                                          </details>
                                        </div>
                                      )}
                                    </div>
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
                                  <div className="flex items-center gap-2">
                                    <span>{evt}</span>
                                    {isLeader && !/engineering cad|experimental design/i.test(evt) && (
                                      <div className="relative inline-block text-left">
                                        <details className="group">
                                          <summary className={`list-none cursor-pointer inline-flex items-center gap-1 text-xs ${darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}>Assign test ▾</summary>
                                          <div className={`absolute left-0 mt-1 w-64 rounded-md shadow-lg z-10 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                            <button className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: selection?.division ? [selection.division] : ['B','C'] }); setAssignSettings((prev)=> ({ ...prev, division: (selection?.division||'any') as any })); setAssignModal({ open: true, eventName: evt, scope: 'all' });}}>Assign to All</button>
                                            {slots.filter((n)=> (n||'').trim()).map((n, idx) => (
                                              <button key={idx} className={`block w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`} onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setAssignEvent({ id: 0, name: evt, subject: '', divisions: selection?.division ? [selection.division] : ['B','C'] }); setAssignSettings((prev)=> ({ ...prev, division: (selection?.division||'any') as any })); setAssignModal({ open: true, eventName: evt, scope: (n||'').trim() });}}>Assign to {n}</button>
                                              ))}
                                          </div>
                                        </details>
                                      </div>
                                    )}
                                  </div>
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
                  {isLeader && (
                    <>
                      {topAddOpen ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={topAddName}
                            onChange={(e) => setTopAddName(e.target.value)}
                            placeholder="Member name"
                            className={`${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'} rounded px-2 h-8 text-sm`}
                          />
                          <button
                            onClick={() => {
                              const nm = (topAddName || '').trim();
                              if (!nm) return;
                              setExtraUnlinkedNames((prev) => Array.from(new Set([...prev, nm])));
                              setTopAddName('');
                              setTopAddOpen(false);
                            }}
                            className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded px-3 h-8 text-sm`}
                          >
                            Add
                          </button>
                          <button
                            onClick={() => { setTopAddOpen(false); setTopAddName(''); }}
                            className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-3 h-8 text-sm`}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setTopAddOpen(true); setTopInviteOpen(false); }}
                          className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-2 h-8 text-xs`}
                        >
                          + Add
                        </button>
                      )}
                      {topInviteOpen ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={topInviteUsername}
                            onChange={(e) => setTopInviteUsername(e.target.value)}
                            placeholder="Username"
                            className={`${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'} rounded px-2 h-8 text-sm`}
                          />
                          <button
                            onClick={async () => {
                              const uname = (topInviteUsername || '').trim();
                              if (!uname || !selection) return;
                              try {
                                const res = await fetch('/api/teams/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: uname, school: selection.school, division: selection.division, teamId: teams[activeTeamIdx]?.id || teams[0]?.id || 'A' }) });
                                if (!res.ok) {
                                  try { const e = await res.json(); toast.error(e?.error || 'Failed to send invite'); } catch { toast.error('Failed to send invite'); }
                                } else {
                                  toast.success('Invite sent. Ask them to join by opening the dropdown from their account button');
                                }
                              } catch { toast.error('Failed to send invite'); }
                              setTopInviteUsername('');
                              setTopInviteOpen(false);
                            }}
                            className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded px-3 h-8 text-sm`}
                          >
                            Invite
                          </button>
                          <button
                            onClick={() => { setTopInviteOpen(false); setTopInviteUsername(''); }}
                            className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-3 h-8 text-sm`}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setTopInviteOpen(true); setTopAddOpen(false); }}
                          className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded px-2 h-8 text-xs`}
                        >
                          + Invite
                        </button>
                      )}
                    </>
                  )}
                  <Link href="/teams/results" className={`${darkMode ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'} px-2 h-8 rounded text-xs flex items-center`}>Results</Link>
                </div>
              </div>

              {mergedMemberNames.length === 0 ? (
                <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Start filling in names above to see a consolidated member list.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mergedMemberNames.sort((a, b) => a.localeCompare(b)).map((name) => {
                    const personEvents = nameToEvents[name] || [];
                    const allEvents = (selection.division === 'B' ? DIVISION_B_GROUPS : DIVISION_C_GROUPS).flatMap((g) => g.events);
                    const availableToAdd = allEvents.filter((e) => !personEvents.includes(e));
                    return (
                      <div key={name} className={`${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50 border border-gray-200'} rounded-lg p-3`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold truncate">{name}</div>
                            {(() => {
                              // Check if this member appears in multiple events within the same group
                              const duplicateInfo = duplicateMembersInfo[name];
                              const isDuplicate = duplicateInfo && duplicateInfo.events.length > 1;
                              return isDuplicate ? (
                                <div className="relative group">
                                  <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 cursor-help" />
                                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm rounded-lg shadow-lg z-50 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${darkMode ? 'bg-gray-800 text-white border border-gray-600' : 'bg-gray-900 text-white border border-gray-700'}`}>
                                    <div className="text-xs font-medium">Conflicting events in same block:</div>
                                    <div className="text-xs mt-1">{duplicateInfo.events.join(', ')}</div>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent" style={{ borderTopColor: darkMode ? '#1f2937' : '#111827' }}></div>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const m = members.find((mm) => {
                                const full = [mm.firstName, mm.lastName].filter(Boolean).join(' ').trim();
                                return (full || mm.displayName || mm.username || '') === name;
                              });
                              const isCaptain = m?.role === 'captain';
                              const isLinked = !!m?.userId;
                              const isSelf = !!(m?.userId && user?.id && m.userId === user.id);
                              const canToggleBase = !!isLeader && !!m?.userId;
                              const canToggle = canToggleBase && (!isSelf || isCaptain); // still show crown; prevent self-demote via server. UI keeps click but server enforces.
                              const showCrown = isLeader || isCaptain;
                              return (
                                <>
                                  {/* Hide controls while inviting/adding to give space */}
                                  {nameInviting === name || nameAddingEvent === name ? null : (
                                  showCrown ? (
                                  <button
                                    onClick={async () => {
                                      if (!canToggle || !selection) return;
                                      const teamId = teams[activeTeamIdx]?.id || teams[0]?.id || 'A';
                                      const newRole = isCaptain ? 'user' : 'captain';
                                      try {
                                        const res = await fetch('/api/teams/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'setRole', school: selection.school, division: selection.division, teamId, userId: m.userId, role: newRole }) });
                                        if (res.ok) setMembers((prev)=> prev.map(x=> x.userId===m.userId? { ...x, role: newRole }: x));
                                      } catch {}
                                    }}
                                    className={`${isCaptain ? 'text-yellow-400' : darkMode ? 'text-gray-400' : 'text-gray-500'} ${canToggle ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                    title={canToggle ? (isCaptain ? (isSelf ? 'Captain' : 'Captain (click to demote)') : 'Make captain') : (isCaptain ? 'Captain' : 'Not linked')}
                                  >
                                    <Crown className="w-4 h-4" />
                                  </button>
                                  ) : null
                                  )}
                                  {nameInviting === name || nameAddingEvent === name ? null : (
                                  <span title={isLinked ? 'Linked' : 'Not linked'} className={`${isLinked ? 'text-green-400' : 'text-red-400'}`}>
                                    <LinkIcon className="w-4 h-4" />
                                  </span>
                                  )}
                                  {isLeader && !(nameInviting === name || nameAddingEvent === name) && (
                                    <button
                                      onClick={async () => {
                                        if (!selection) return;
                                        const teamId = teams[activeTeamIdx]?.id || teams[0]?.id || 'A';
                                        try {
                                          let res;
                                          if (m?.userId) {
                                            res = await fetch('/api/teams/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'removeMember', school: selection.school, division: selection.division, teamId, userId: m.userId, name }) });
                                          } else {
                                            res = await fetch('/api/teams/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'removePerson', school: selection.school, division: selection.division, teamId, name }) });
                                          }
                                          if (res.ok) {
                                            // Remove from linked members (if present)
                                            setMembers((prev)=> prev.filter(x=> (x.firstName||'')+' '+(x.lastName||'') !== name && (x.displayName||x.username||'') !== name && x.userId !== m?.userId));
                                            // Remove from extra unlinked list
                                            setExtraUnlinkedNames((prev) => prev.filter((nm) => nm !== name));
                                            // Remove from local roster across all events
                                            setTeams((prev) => {
                                              const copy = prev.map((t) => ({ ...t, roster: { ...t.roster } }));
                                              const team = copy[activeTeamIdx] || copy[0];
                                              const events = Object.keys(team.roster || {});
                                              for (const evt of events) {
                                                const arr = Array.isArray(team.roster[evt]) ? team.roster[evt].slice() : [];
                                                for (let i = 0; i < arr.length; i++) {
                                                  if (((arr[i] || '') as string).trim() === name) arr[i] = '';
                                                }
                                                team.roster[evt] = arr;
                                              }
                                              return copy;
                                            });
                                          }
                                        } catch {}
                                      }}
                                      className={`${darkMode ? 'text-gray-300 hover:text-red-400' : 'text-gray-500 hover:text-red-600'}`}
                                      title="Remove member"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                            {isLeader && (
                              <>
                                {nameInviting === name ? (
                                  <>
                                    <input
                                      value={invitingUsername}
                                      onChange={(e) => setInvitingUsername(e.target.value)}
                                      placeholder="Username"
                                      className={`${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'} rounded px-2 h-8 text-sm`}
                                    />
                                    <button
                                      onClick={async () => {
                                        const uname = (invitingUsername || '').trim();
                                        if (!uname) return;
                                        try {
                                          const res = await fetch('/api/teams/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: uname, school: selection.school, division: selection.division, teamId: teams[activeTeamIdx]?.id || teams[0]?.id || 'A', memberName: name }) });
                                          if (!res.ok) {
                                            try { const e = await res.json(); toast.error(e?.error || 'Failed to send invite'); } catch { toast.error('Failed to send invite'); }
                                          } else {
                                            toast.success('Invite sent. Ask them to join by opening the dropdown from their account button');
                                          }
                                        } catch { toast.error('Failed to send invite'); }
                                        setNameInviting(null);
                                        setInvitingUsername('');
                                      }}
                                      className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded px-3 h-8 text-sm`}
                                      title="Invite user"
                                    >
                                      Invite
                                    </button>
                                    <button
                                      onClick={() => { setNameInviting(null); setInvitingUsername(''); }}
                                      className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-3 h-8 text-sm`}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  !members.find((mm) => {
                                      const full = [mm.firstName, mm.lastName].filter(Boolean).join(' ').trim();
                                      return (full || mm.displayName || mm.username || '') === name && mm.userId; 
                                    }) ? (
                                    <button
                                      onClick={() => { setNameInviting(name); setInvitingUsername(''); setNameAddingEvent(null); setSelectedEventForName(''); }}
                                      className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-2 h-8 text-xs`}
                                      title="Invite user"
                                    >
                                      + Invite
                                    </button>
                                  ) : null
                                )}

                                {nameInviting === name ? (
                                  null
                                ) : nameAddingEvent === name ? (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={selectedEventForName}
                                      onChange={(e) => setSelectedEventForName(e.target.value)}
                                      className={`${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'} rounded px-2 h-8 text-sm`}
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
                                      className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded px-3 h-8 text-sm`}
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => { setNameAddingEvent(null); setSelectedEventForName(''); }}
                                      className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-3 h-8 text-sm`}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setNameAddingEvent(name); setSelectedEventForName(''); setNameInviting(null); setInvitingUsername(''); }}
                                    className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded px-2 h-8 text-xs`}
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
        />
        {assignModal?.open && assignEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setAssignModal(null)}>
            <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} w-full lg:w-[26rem] rounded-xl shadow-xl p-5`} onClick={(e)=>e.stopPropagation()}>
              <div className="relative mb-4">
                <div className="text-lg font-semibold text-center">Assign {assignModal.scope === 'all' ? 'to All' : `to ${assignModal.scope}`}: {assignEvent.name}</div>
                <button onClick={()=>setAssignModal(null)} className={`absolute top-0 right-0 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>×</button>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-full max-w-md">
                  <TestConfiguration
                    selectedEvent={assignEvent}
                    settings={assignSettings}
                    onSettingsChange={setAssignSettings}
                    forceBothDivision
                    onGenerateTest={async ()=>{
                      try {
                        const normalizeSpecialEvent = (name: string, subtopics: string[]) => {
                          const n = name || '';
                          if (n === 'Dynamic Planet') {
                            return { eventName: 'Dynamic Planet - Oceanography', subtopics };
                          }
                          if (n === 'Water Quality') {
                            return { eventName: 'Water Quality - Freshwater', subtopics };
                          }
                          if (n === 'Materials Science') {
                            return { eventName: 'Materials Science - Nanomaterials', subtopics };
                          }
                          return { eventName: n, subtopics };
                        };
                        const special = normalizeSpecialEvent(assignEvent.name, assignSettings.subtopics || []);
                        const testParams = {
                          eventName: special.eventName,
                          questionCount: assignSettings.questionCount,
                          timeLimit: assignSettings.timeLimit,
                          difficulties: assignSettings.difficulties,
                          types: assignSettings.types as any,
                          division: assignSettings.division as any,
                          tournament: assignSettings.tournament,
                          subtopics: special.subtopics,
                          idPercentage: assignSettings.idPercentage,
                          charLengthMin: assignSettings.charLengthMin,
                          charLengthMax: assignSettings.charLengthMax,
                        };
                        try { localStorage.removeItem('testQuestions'); } catch {}
                        try {
                          localStorage.setItem('testParams', JSON.stringify(testParams));
                          document.cookie = `scio_test_params=${encodeURIComponent(JSON.stringify(testParams))}; Path=/; Max-Age=600; SameSite=Lax`;
                        } catch {}
                        const isCodebusters = assignEvent.name === 'Codebusters';
                        const route = isCodebusters ? '/codebusters' : '/test';
                        const sp = new URLSearchParams();
                        sp.set('preview', '1');
                        sp.set('teamsAssign', '1');
                        sp.set('event', testParams.eventName);
                        sp.set('scope', assignModal.scope);
                        sp.set('team', teams[activeTeamIdx]?.id || teams[0]?.id || 'A');
                        if (selection?.school) sp.set('school', selection.school);
                        if (selection?.division) sp.set('division', selection.division);
                        router.push(`${route}?${sp.toString()}`);
                      } catch {}
                    }}
                    onUnlimited={()=>{}}
                    generateLabel="Preview Test"
                    hideUnlimited
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {existingTeamWarning && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-xl max-w-md w-full p-6`}>
              <div className="text-lg font-semibold mb-2">Team already exists</div>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm`}>
                Someone has already created a team for this school in Division {existingTeamWarning.division}. Do you want to create a new one?
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setExistingTeamWarning(null)}
                  className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'} px-3 py-1.5 rounded`}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const warn = existingTeamWarning;
                    setExistingTeamWarning(null);
                    if (!warn) return;
                    try {
                      const res = await fetch('/api/teams/units', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'createNewGroup', school: warn.school, division: warn.division })
                      });
                      if (!res.ok) {
                        try { const err = await res.json(); toast.error(err?.error || 'Failed to create team'); } catch { toast.error('Failed to create team'); }
                        return;
                      }
                      const json = await res.json();
                      if (json?.success && json?.data?.group?.slug) {
                        toast.success('Team created!');
                        router.push(`/teams/${json.data.group.slug}`);
                      } else {
                        toast.error('Failed to create team');
                      }
                    } catch {
                      toast.error('Failed to create team');
                    }
                  }}
                  className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} px-3 py-1.5 rounded`}
                >
                  Create New Team
                </button>
              </div>
            </div>
          </div>
        )}
      {/* Confirm Delete Modal */}
      {confirmDelete.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} w-full max-w-sm rounded-lg shadow-xl p-5`}>
            <div className="text-lg font-semibold mb-2">Delete subteam</div>
            <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm mb-4`}>Are you sure you want to delete &quot;{confirmDelete.teamName || ''}&quot;? This cannot be undone.</div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmDelete({ open: false })} className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'} px-3 py-1.5 rounded`}>Cancel</button>
              <button
                onClick={async () => {
                  if (!selection || !confirmDelete.teamId) return;
                  try {
                    const res = await fetch('/api/teams/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', school: selection.school, division: selection.division, teamId: confirmDelete.teamId }) });
                    if (!res.ok) { try { const e = await res.json(); toast.error(e?.error || 'Failed to delete'); } catch { toast.error('Failed to delete'); } return; }
                    setTeamUnits((prev) => prev.filter(u => u.teamId !== confirmDelete.teamId));
                    setTeams([{ id: 'A', name: 'Team A', roster: {} }]);
                    setActiveTeamIdx(0);
                    setEditingTeamIdx(null);
                    toast.success('Subteam deleted');
                    setConfirmDelete({ open: false });
                  } catch { toast.error('Failed to delete'); }
                }}
                className={`${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'} px-3 py-1.5 rounded`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
