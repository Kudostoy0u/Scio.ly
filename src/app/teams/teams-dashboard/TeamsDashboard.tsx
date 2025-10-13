'use client';
import logger from '@/lib/utils/logger';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/app/components/Header';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import TeamShareModal from '../components/TeamShareModal';
import type { Event as PracticeEvent, Settings as PracticeSettings } from '@/app/practice/types';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import TournamentTracker from './components/TournamentTracker';
import TeamTabs from './components/TeamTabs';
import DivisionGroupsGrid from './components/DivisionGroupsGrid';
import RosterOverview from './components/RosterOverview';
import AssignModal from './components/AssignModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import CreateTeamCard from './components/CreateTeamCard';
import DivisionHeader from './components/DivisionHeader';
import ExistingTeamWarning from './components/ExistingTeamWarning';
import PageHeader from './components/PageHeader';
import MigrationWarningModal from './components/MigrationWarningModal';
import { checkExistingUnits, createTeam, joinByCode } from './utils/createJoin';


type TeamSelection = {
  school: string;
  captain: boolean;
  division: 'B' | 'C';
};




import { DIVISION_B_GROUPS, DIVISION_C_GROUPS, getGroupColors } from './utils/groups';


import { getJsonOnce } from '@/lib/utils/network';

async function loadPublicJson(path: string) {
  return await getJsonOnce(path);
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
  const [extraUnlinkedNames] = useState<string[]>([]);
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
  const [showMigrationWarning, setShowMigrationWarning] = useState<boolean>(true);


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
        if (!p) { p = fetch(url); inFlightFetchesRef.current.set(url, p); }
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

  useInfiniteScroll(loadMoreRef.current, () => {
          setVisibleCount((c) => Math.min(c + 40, filteredSchools.length));
  });

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
            logger.error('Failed to save roster', err);
            // Optionally integrate toast here if available in app
            toast.error(err?.error || 'Failed to save roster');
          } catch { logger.error('Failed to save roster'); }
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
            logger.error('Failed to save roster', err);
            toast.error(err?.error || 'Failed to save roster');
          } catch { logger.error('Failed to save roster'); }
        }
        if (resp.ok) toast.success('Roster saved');
      }
    } catch (error) {
      logger.error('Error saving team data:', error);
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
  const getGroupColorsLocal = (colorKey: string) => getGroupColors(!!darkMode, colorKey);

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

  // Moved tracker helpers to utils/tracker.ts and UI to components/TournamentTracker.tsx

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

  // Duplicate member detection moved out; to re-enable show warnings, compute in a selector in a future iteration.


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
        <PageHeader darkMode={!!darkMode} selection={selection && { school: selection.school, captain: selection.captain }} onShare={()=>setIsShareModalOpen(true)} onUnlink={unlinkFromTeam} />

        {/* Tournament Tracker */}
        {selection && (
          <TournamentTracker
            darkMode={!!darkMode}
            isLeader={isLeader}
            tournaments={tournaments}
            newTournamentName={newTournamentName}
            newTournamentDateTime={newTournamentDateTime}
            isTrackerOpen={isTrackerOpen}
            setIsTrackerOpen={setIsTrackerOpen}
            setNewTournamentName={setNewTournamentName}
            setNewTournamentDateTime={setNewTournamentDateTime}
            addTournament={addTournament}
            removeTournament={removeTournament}
          />
        )}

        {!selection && (
          <CreateTeamCard
            darkMode={!!darkMode}
            schoolQuery={schoolQuery}
            setSchoolQuery={setSchoolQuery}
            pendingDivision={pendingDivision}
            setPendingDivision={setPendingDivision}
            chosenSchool={chosenSchool}
            setChosenSchool={setChosenSchool}
            onCreateTeam={async ()=>{
                    if (!chosenSchool) return;
                    if (!user?.id) { setCreateError('You must be signed in to create a team.'); toast.error('You must be signed in to create a team.'); return; }
                    setCreateError('');
                    const exists = await checkExistingUnits(chosenSchool, pendingDivision);
                    if (exists) { setExistingTeamWarning({ school: chosenSchool, division: pendingDivision }); return; }
                    const slug = await createTeam(chosenSchool, pendingDivision);
                    if (slug) { router.push(`/teams/${slug}`); toast.success('Team created!'); }
                  }}
            onJoinTeam={async (code: string)=>{
                  if (!code) return;
                  if (!user?.id) { setJoinError('You must be signed in to join a team.'); toast.error('You must be signed in to join a team.'); return; }
                  setJoinError('');
                  const { slug, error } = await joinByCode(code);
                  if (slug) {
                    router.push(`/teams/${slug}`);
                    try { const el = document.getElementById('team-join-code') as HTMLInputElement | null; if (el) el.value = ''; } catch {}
                    toast.success('Joined team');
                  } else if (error) {
                    setJoinError(error);
                    toast.error(error);
                  }
                }}
            createError={createError}
            joinError={joinError}
            filteredSchools={filteredSchools}
            visibleCount={visibleCount}
            loadMoreRef={loadMoreRef}
          />
        )}

        {selection && (
          <>
          {/* Team tabs */}
          <TeamTabs
            darkMode={!!darkMode}
            selection={selection}
            teams={teams}
            teamUnits={teamUnits}
            activeTeamIdx={activeTeamIdx}
            isLeader={isLeader}
            addingTeam={addingTeam}
            editingTeamIdx={editingTeamIdx}
            setEditingTeamIdx={setEditingTeamIdx}
            setActiveTeamIdx={setActiveTeamIdx}
            setTeams={setTeams}
            setTeamUnits={setTeamUnits}
            setCurrentSlug={setCurrentSlug}
            desiredTeamIdRef={desiredTeamIdRef}
            groupSlugRef={groupSlugRef}
            setAddingTeam={setAddingTeam}
            handleEditTeam={handleEditTeam}
            handleSaveTeam={handleSaveTeam}
            setConfirmDelete={setConfirmDelete as any}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-4 lg:col-span-2`}>
              <DivisionHeader darkMode={!!darkMode} division={selection.division} isLeader={isLeader} saving={saving} onSave={saveTeamDataToDB} />
              <DivisionGroupsGrid
                darkMode={!!darkMode}
                division={selection.division}
                teams={teams}
                activeTeamIdx={activeTeamIdx}
                isLeader={isLeader}
                setName={setName}
                getGroupColors={getGroupColorsLocal}
                groups={selection.division === 'B' ? DIVISION_B_GROUPS : DIVISION_C_GROUPS}
                setAssignEvent={setAssignEvent as any}
                setAssignSettings={setAssignSettings as any}
                setAssignModal={setAssignModal as any}
              />
            </div>
            {/* Roster Overview: Members with event badges */}
            <RosterOverview
              darkMode={!!darkMode}
              isLeader={isLeader}
              mergedMemberNames={mergedMemberNames}
              nameToEvents={nameToEvents}
              selection={selection}
              teams={teams}
              activeTeamIdx={activeTeamIdx}
              extraUnlinkedNames={extraUnlinkedNames}
              topAddOpen={topAddOpen}
              setTopAddOpen={setTopAddOpen}
              topAddName={topAddName}
              setTopAddName={setTopAddName}
              topInviteOpen={topInviteOpen}
              setTopInviteOpen={setTopInviteOpen}
              topInviteUsername={topInviteUsername}
              setTopInviteUsername={setTopInviteUsername}
              nameAddingEvent={nameAddingEvent}
              setNameAddingEvent={setNameAddingEvent}
              selectedEventForName={selectedEventForName}
              setSelectedEventForName={setSelectedEventForName}
              nameInviting={nameInviting}
              setNameInviting={setNameInviting}
              invitingUsername={invitingUsername}
              setInvitingUsername={setInvitingUsername}
              removePersonFromEvent={removePersonFromEvent}
              addPersonToEvent={addPersonToEvent}
            />
                        </div>
          </>
        )}

        {/* Migration Warning Modal */}
        <MigrationWarningModal
          darkMode={!!darkMode}
          isOpen={showMigrationWarning}
          onClose={() => setShowMigrationWarning(false)}
        />

        {/* Team Share Modal */}
        <TeamShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          school={selection?.school || ''}
          division={selection?.division || 'C'}
          isCaptain={isLeader}
        />
        <AssignModal
          darkMode={!!darkMode}
          open={!!assignModal?.open && !!assignEvent}
          scope={assignModal?.scope || ''}
          eventName={assignEvent?.name || ''}
                    settings={assignSettings}
                    onSettingsChange={setAssignSettings}
          onGenerate={async ()=>{
                      try {
                        const normalizeSpecialEvent = (name: string, subtopics: string[]) => {
                          const n = name || '';
                if (n === 'Dynamic Planet') { return { eventName: 'Dynamic Planet - Oceanography', subtopics }; }
                if (n === 'Water Quality') { return { eventName: 'Water Quality - Freshwater', subtopics }; }
                if (n === 'Materials Science') { return { eventName: 'Materials Science - Nanomaterials', subtopics }; }
                          return { eventName: n, subtopics };
                        };
              const special = normalizeSpecialEvent(assignEvent?.name || '', assignSettings.subtopics || []);
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
              const isCodebusters = (assignEvent?.name || '') === 'Codebusters';
                        const route = isCodebusters ? '/codebusters' : '/test';
                        const sp = new URLSearchParams();
                        sp.set('preview', '1');
                        sp.set('teamsAssign', '1');
                        sp.set('event', testParams.eventName);
              sp.set('scope', assignModal?.scope || '');
                        sp.set('team', teams[activeTeamIdx]?.id || teams[0]?.id || 'A');
                        if (selection?.school) sp.set('school', selection.school);
                        if (selection?.division) sp.set('division', selection.division);
                        router.push(`${route}?${sp.toString()}`);
                      } catch {}
                    }}
          onClose={()=>setAssignModal(null)}
                  />
        <ExistingTeamWarning
          darkMode={!!darkMode}
          open={!!existingTeamWarning}
          division={(existingTeamWarning?.division || 'C') as 'B' | 'C'}
          onCancel={() => setExistingTeamWarning(null)}
          onConfirm={async ()=>{
                    const warn = existingTeamWarning;
                    setExistingTeamWarning(null);
                    if (!warn) return;
                    try {
              const res = await fetch('/api/teams/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'createNewGroup', school: warn.school, division: warn.division }) });
              if (!res.ok) { try { const err = await res.json(); toast.error(err?.error || 'Failed to create team'); } catch { toast.error('Failed to create team'); } return; }
                      const json = await res.json();
              if (json?.success && json?.data?.group?.slug) { toast.success('Team created!'); router.push(`/teams/${json.data.group.slug}`); } else { toast.error('Failed to create team'); }
            } catch { toast.error('Failed to create team'); }
          }}
        />
      <ConfirmDeleteModal
        darkMode={!!darkMode}
        open={!!confirmDelete.open}
        teamName={confirmDelete.teamName}
        onCancel={()=>setConfirmDelete({ open: false })}
        onConfirm={async ()=>{
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
      />
      </div>
    </div>
  );
}
