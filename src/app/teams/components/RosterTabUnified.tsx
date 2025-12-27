/**
 * Roster Tab - Unified Version
 *
 * Reads from React Query shared cache.
 * Updates invalidate the shared cache for consistency.
 */

"use client";

import Modal from "@/app/components/Modal";
import { useTheme } from "@/app/contexts/ThemeContext";
import { db } from "@/app/utils/db";
import { useInvalidateTeam, useTeamRosterCacheOnly } from "@/lib/hooks/useTeam";
import type { TeamFullData, TeamMember } from "@/lib/server/teams/shared";
import { trpc } from "@/lib/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import AssignmentCreator from "./EnhancedAssignmentCreator";
import ConflictBlock from "./roster/ConflictBlock";
import RosterHeader from "./roster/RosterHeader";
import SubteamSelector from "./roster/SubteamSelector";
import TournamentRosterSelector, {
	type TournamentRoster,
} from "./roster/TournamentRosterSelector";
import {
	type Conflict,
	DIVISION_B_GROUPS,
	DIVISION_C_GROUPS,
	type Subteam,
	type Team,
	detectConflicts,
} from "./roster/rosterUtils";

interface RosterTabProps {
	team: Team;
	isCaptain: boolean;
	onInvitePerson?: () => void;
	activeSubteamId?: string | null;
	subteams?: Subteam[];
	onSubteamChange?: (subteamId: string) => void;
	onCreateSubteam?: (name?: string) => void;
	onEditSubteam?: (subteamId: string, newName: string) => void;
	onDeleteSubteam?: (subteamId: string, subteamName: string) => void;
	onReorderSubteams?: (subteamIds: string[]) => void;
}

export default function RosterTabUnified({
	team,
	isCaptain,
	onInvitePerson: _onInvitePerson,
	activeSubteamId,
	subteams = [],
	onSubteamChange,
	onCreateSubteam,
	onEditSubteam,
	onDeleteSubteam,
	onReorderSubteams,
}: RosterTabProps) {
	const { darkMode } = useTheme();
	const { invalidateTeam, updateTeamData } = useInvalidateTeam();
	const utils = trpc.useUtils();
	const queryClient = useQueryClient();
	const saveRosterMutation = trpc.teams.saveRoster.useMutation();
	const tournamentRostersQuery = trpc.teams.listTournamentRosters.useQuery(
		{ teamSlug: team.slug },
		{ enabled: isCaptain },
	);
	const publicTournamentRostersQuery =
		trpc.teams.listPublicTournamentRosters.useQuery(
			{ teamSlug: team.slug },
			{ enabled: !isCaptain },
		);
	const createRosterMutation = trpc.teams.createTournamentRoster.useMutation();
	const renameRosterMutation = trpc.teams.renameTournamentRoster.useMutation();
	const promoteRosterMutation =
		trpc.teams.promoteTournamentRoster.useMutation();
	const archiveRosterMutation =
		trpc.teams.archiveTournamentRoster.useMutation();
	const restoreRosterMutation =
		trpc.teams.restoreTournamentRoster.useMutation();
	const deleteRosterMutation = trpc.teams.deleteTournamentRoster.useMutation();
	const setRosterVisibilityMutation =
		trpc.teams.setTournamentRosterVisibility.useMutation();
	const updateRemovedEventsMutation =
		trpc.teams.updateRemovedEvents.useMutation();
	const restoreRemovedEventsMutation =
		trpc.teams.restoreRemovedEvents.useMutation();
	const updateRosterNotesMutation = trpc.teams.updateRosterNotes.useMutation();
	const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);

	const rosterSource = isCaptain
		? tournamentRostersQuery.data
		: publicTournamentRostersQuery.data;
	const activeRosterId = rosterSource?.activeRosterId ?? null;
	const rosterList: TournamentRoster[] = rosterSource?.rosters ?? [];
	const archivedRosters: TournamentRoster[] =
		rosterSource?.archivedRosters ?? [];

	// Get roster data from shared cache (members) or server (captains)
	const cachedRoster = useTeamRosterCacheOnly(team.slug, activeSubteamId || "");
	const rosterQuery = trpc.teams.getRoster.useQuery(
		{
			teamSlug: team.slug,
			subteamId: activeSubteamId || undefined,
			rosterId: selectedRosterId || undefined,
		},
		{
			enabled:
				!!activeSubteamId &&
				(isCaptain ||
					(!!selectedRosterId && selectedRosterId !== activeRosterId)),
			staleTime: 5 * 60 * 1000,
			gcTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
		},
	);

	const shouldUseCachedRoster =
		!isCaptain && !!selectedRosterId && selectedRosterId === activeRosterId;
	const rosterData =
		isCaptain || !shouldUseCachedRoster ? rosterQuery.data : cachedRoster.data;
	const isLoading =
		isCaptain || !shouldUseCachedRoster
			? rosterQuery.isLoading
			: cachedRoster.isLoading;

	const [roster, setRoster] = useState<Record<string, string[]>>({});
	const [isSaving, setIsSaving] = useState(false);
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const rosterRef = useRef<Record<string, string[]>>({});
	const saveInFlightRef = useRef(false);
	const saveQueuedRef = useRef(false);
	const keepRosterSelectionRef = useRef<string | null>(null);
	const preferredRosterIdRef = useRef<string | null>(null);
	const preferredSubteamIdRef = useRef<string | null>(null);

	const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		new Set(),
	);
	const [tournamentRostersCollapsed, setTournamentRostersCollapsed] =
		useState(false);
	const [subteamsCollapsed, setSubteamsCollapsed] = useState(false);
	const [prefsLoaded, setPrefsLoaded] = useState(false);
	const [blockOverrides, setBlockOverrides] = useState<
		Record<string, { added: string[]; removed: string[] }>
	>({});
	const [conflicts, setConflicts] = useState<Conflict[]>([]);
	const [addEventModal, setAddEventModal] = useState<{
		conflictBlock: string;
	} | null>(null);
	const [newEventName, setNewEventName] = useState("");
	const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
	const [rosterNotes, setRosterNotes] = useState("");
	const [isSavingNotes, setIsSavingNotes] = useState(false);
	const notesSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const rosterIds = useMemo(
		() => [...rosterList, ...archivedRosters].map((roster) => roster.id),
		[archivedRosters, rosterList],
	);
	const subteamIds = useMemo(
		() => subteams.map((subteam) => subteam.id),
		[subteams],
	);
	const selectedRoster = useMemo(
		() =>
			rosterList.find((roster) => roster.id === selectedRosterId) ??
			archivedRosters.find((roster) => roster.id === selectedRosterId) ??
			null,
		[archivedRosters, rosterList, selectedRosterId],
	);
	const isRosterArchived = selectedRoster?.status === "archived";
	const isRosterEditable = !isRosterArchived;

	// Edit/view mode state with localStorage persistence
	// Non-captains always see view mode
	const [isEditMode, setIsEditMode] = useState(() => {
		if (typeof window === "undefined" || !isCaptain) {
			return false; // Default to view mode for non-captains
		}
		const saved = localStorage.getItem(`roster-edit-mode-${team.slug}`);
		return saved === "true";
	});

	const canEditRoster = isCaptain && isRosterEditable;
	// Ensure non-captains always see view mode
	const effectiveEditMode = canEditRoster ? isEditMode : false;

	const toggleEditMode = () => {
		if (!canEditRoster) {
			return;
		}
		const newMode = !isEditMode;
		setIsEditMode(newMode);
		if (isCaptain && typeof window !== "undefined") {
			localStorage.setItem(`roster-edit-mode-${team.slug}`, String(newMode));
		}
	};

	const groups = team.division === "B" ? DIVISION_B_GROUPS : DIVISION_C_GROUPS;

	const effectiveGroups = useMemo(() => {
		return groups.map((group) => {
			const overrides = blockOverrides[group.label] ?? {
				added: [],
				removed: [],
			};
			const removedSet = new Set(overrides.removed.map((e) => e.toLowerCase()));
			const events = Array.from(
				new Set([...group.events, ...overrides.added]),
			).filter((evt) => !removedSet.has(evt.toLowerCase()));
			return { ...group, events };
		});
	}, [groups, blockOverrides]);

	const collapsedGroupList = useMemo(
		() => Array.from(collapsedGroups),
		[collapsedGroups],
	);

	useEffect(() => {
		let isActive = true;
		const loadPrefs = async () => {
			try {
				const prefs = await db.teamRosterPrefs.get(team.slug);
				if (!isActive || !prefs) {
					return;
				}
				setTournamentRostersCollapsed(!!prefs.tournamentRostersCollapsed);
				setSubteamsCollapsed(!!prefs.subteamsCollapsed);
				setCollapsedGroups(new Set(prefs.collapsedConflictGroups ?? []));
				preferredRosterIdRef.current = prefs.selectedRosterId ?? null;
				preferredSubteamIdRef.current = prefs.selectedSubteamId ?? null;
			} finally {
				if (isActive) {
					setPrefsLoaded(true);
				}
			}
		};
		void loadPrefs();
		return () => {
			isActive = false;
		};
	}, [team.slug]);

	useEffect(() => {
		if (!prefsLoaded) {
			return;
		}
		if (preferredRosterIdRef.current || preferredSubteamIdRef.current) {
			return;
		}
		const hasRosterSelection = !!selectedRosterId || rosterList.length === 0;
		const hasSubteamSelection = !!activeSubteamId || subteams.length === 0;
		if (!hasRosterSelection || !hasSubteamSelection) {
			return;
		}
		void db.teamRosterPrefs.put({
			teamSlug: team.slug,
			tournamentRostersCollapsed,
			subteamsCollapsed,
			collapsedConflictGroups: collapsedGroupList,
			selectedRosterId: selectedRosterId ?? null,
			selectedSubteamId: activeSubteamId ?? null,
			updatedAt: Date.now(),
		});
	}, [
		collapsedGroupList,
		activeSubteamId,
		prefsLoaded,
		rosterList.length,
		selectedRosterId,
		subteamsCollapsed,
		subteams.length,
		team.slug,
		tournamentRostersCollapsed,
	]);

	const orderedGroups = useMemo(() => {
		const withIndex = effectiveGroups.map((group, index) => ({
			group,
			index,
			collapsed: collapsedGroups.has(group.label),
		}));
		withIndex.sort((a, b) => {
			if (a.collapsed === b.collapsed) {
				return a.index - b.index;
			}
			return a.collapsed ? 1 : -1;
		});
		return withIndex.map((item) => item.group);
	}, [collapsedGroups, effectiveGroups]);

	const { expandedGroups, collapsedOnlyGroups } = useMemo(() => {
		const expanded: typeof effectiveGroups = [];
		const collapsedOnly: typeof effectiveGroups = [];
		for (const group of effectiveGroups) {
			const isCollapsed = collapsedGroups.has(group.label);
			if (isCollapsed) {
				collapsedOnly.push(group);
			} else {
				expanded.push(group);
			}
		}
		return { expandedGroups: expanded, collapsedOnlyGroups: collapsedOnly };
	}, [collapsedGroups, effectiveGroups]);

	const groupIndexByLabel = useMemo(() => {
		const next = new Map<string, number>();
		effectiveGroups.forEach((group, index) => {
			next.set(group.label, index);
		});
		return next;
	}, [effectiveGroups]);

	useEffect(() => {
		if (!activeSubteamId) return;
		const raw =
			subteams.find((s) => s.id === activeSubteamId)?.description ?? "";
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (
				parsed &&
				typeof parsed === "object" &&
				!Array.isArray(parsed) &&
				(parsed as { v?: unknown }).v === 1
			) {
				const blocks = (parsed as { blocks?: unknown }).blocks;
				if (blocks && typeof blocks === "object" && !Array.isArray(blocks)) {
					const next: Record<string, { added: string[]; removed: string[] }> =
						{};
					for (const [label, value] of Object.entries(
						blocks as Record<string, unknown>,
					)) {
						if (!value || typeof value !== "object" || Array.isArray(value)) {
							continue;
						}
						const v = value as { added?: unknown; removed?: unknown };
						const added = Array.isArray(v.added)
							? v.added.filter((x): x is string => typeof x === "string")
							: [];
						const removed = Array.isArray(v.removed)
							? v.removed.filter((x): x is string => typeof x === "string")
							: [];
						if (added.length || removed.length) {
							next[label] = { added, removed };
						}
					}
					setBlockOverrides(next);
					return;
				}
			}
		} catch {
			// ignore
		}
		setBlockOverrides({});
	}, [activeSubteamId, subteams]);

	useEffect(() => {
		if (rosterIds.length === 0 || subteamIds.length === 0) {
			return;
		}

		const prefetches: Promise<unknown>[] = [];
		for (const rosterId of rosterIds) {
			for (const subteamId of subteamIds) {
				const queryKey = getQueryKey(
					trpc.teams.getRoster,
					{ teamSlug: team.slug, subteamId, rosterId },
					"query",
				);
				const hasCache = !!queryClient.getQueryState(queryKey)?.data;
				if (!hasCache) {
					prefetches.push(
						utils.teams.getRoster.prefetch({
							teamSlug: team.slug,
							subteamId,
							rosterId,
						}),
					);
				}
			}
		}

		if (prefetches.length > 0) {
			void Promise.all(prefetches);
		}
	}, [queryClient, rosterIds, subteamIds, team.slug, utils]);

	useEffect(() => {
		if (!activeRosterId) {
			return;
		}
		const hasSelected =
			rosterList.some((roster) => roster.id === selectedRosterId) ||
			archivedRosters.some((roster) => roster.id === selectedRosterId);
		const keepSelectionId = keepRosterSelectionRef.current;
		if (keepSelectionId) {
			const keepExists =
				rosterList.some((roster) => roster.id === keepSelectionId) ||
				archivedRosters.some((roster) => roster.id === keepSelectionId);
			if (keepExists) {
				setSelectedRosterId(keepSelectionId);
				keepRosterSelectionRef.current = null;
			}
			return;
		}
		if (!selectedRosterId || !hasSelected) {
			setSelectedRosterId(activeRosterId);
		}
	}, [activeRosterId, archivedRosters, rosterList, selectedRosterId]);

	useEffect(() => {
		if (!prefsLoaded) {
			return;
		}
		const preferredRosterId = preferredRosterIdRef.current;
		if (!preferredRosterId) {
			return;
		}
		const preferredExists =
			rosterList.some((roster) => roster.id === preferredRosterId) ||
			archivedRosters.some((roster) => roster.id === preferredRosterId);
		if (
			preferredExists &&
			(!selectedRosterId || selectedRosterId === activeRosterId)
		) {
			setSelectedRosterId(preferredRosterId);
		}
		preferredRosterIdRef.current = null;
	}, [
		activeRosterId,
		archivedRosters,
		prefsLoaded,
		rosterList,
		selectedRosterId,
	]);

	useEffect(() => {
		if (!prefsLoaded || !onSubteamChange) {
			return;
		}
		const preferredSubteamId = preferredSubteamIdRef.current;
		if (!preferredSubteamId) {
			return;
		}
		if (activeSubteamId === preferredSubteamId) {
			preferredSubteamIdRef.current = null;
			return;
		}
		const exists = subteams.some(
			(subteam) => subteam.id === preferredSubteamId,
		);
		if (!exists) {
			preferredSubteamIdRef.current = null;
			return;
		}
		preferredSubteamIdRef.current = null;
		onSubteamChange(preferredSubteamId);
	}, [activeSubteamId, onSubteamChange, prefsLoaded, subteams]);

	useEffect(() => {
		if (isRosterArchived && isEditMode) {
			setIsEditMode(false);
		}
	}, [isEditMode, isRosterArchived]);

	// Update local roster when query data changes
	useEffect(() => {
		if (rosterData?.roster) {
			const sanitized: Record<string, string[]> = {};
			for (const [eventName, students] of Object.entries(rosterData.roster)) {
				sanitized[eventName] = (students || []).map((s) =>
					typeof s === "string" ? s : "",
				);
			}
			setRoster(sanitized);
			if (Object.keys(sanitized).length > 0) {
				const detectedConflicts = detectConflicts(sanitized, effectiveGroups);
				setConflicts(detectedConflicts);
			}
		}
	}, [rosterData, effectiveGroups]);

	useEffect(() => {
		rosterRef.current = roster;
	}, [roster]);

	// Get roster notes from shared cache
	const { data: rosterNotesData } = trpc.teams.getRosterNotes.useQuery(
		{
			teamSlug: team.slug,
			subteamId: activeSubteamId || "",
		},
		{
			enabled: !!activeSubteamId,
			staleTime: 5 * 60 * 1000,
			gcTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
		},
	);

	// Sync roster notes from query to local state
	useEffect(() => {
		if (rosterNotesData) {
			setRosterNotes(rosterNotesData.rosterNotes || "");
		} else if (!activeSubteamId) {
			setRosterNotes("");
		}
	}, [rosterNotesData, activeSubteamId]);

	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
			if (notesSaveTimeoutRef.current) {
				clearTimeout(notesSaveTimeoutRef.current);
			}
		};
	}, []);

	const saveRoster = async () => {
		if (!activeSubteamId) {
			return;
		}
		if (isCaptain && isRosterArchived) {
			toast.error("Archived rosters are read-only.");
			return;
		}

		if (saveInFlightRef.current) {
			saveQueuedRef.current = true;
			return;
		}

		saveInFlightRef.current = true;

		try {
			const rosterEntries: Array<{
				eventName: string;
				slotIndex: number;
				displayName: string;
			}> = [];

			for (const [eventName, students] of Object.entries(rosterRef.current)) {
				for (let slotIndex = 0; slotIndex < students.length; slotIndex++) {
					const displayName = students[slotIndex] || "";
					if (displayName.trim()) {
						rosterEntries.push({ eventName, slotIndex, displayName });
					}
				}
			}

			const resolvedRosterId = isCaptain
				? selectedRosterId || activeRosterId
				: null;
			const result = await saveRosterMutation.mutateAsync({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
				rosterId: resolvedRosterId ?? undefined,
				entries: rosterEntries,
			});

			const insertedEntries =
				(result as { rosterEntries?: unknown }).rosterEntries ?? [];

			const normalizedRoster: Record<string, string[]> = {};
			if (Array.isArray(insertedEntries)) {
				for (const entry of insertedEntries as Array<{
					eventName: string;
					slotIndex: number;
					displayName: string;
					subteamId: string;
				}>) {
					if (entry.subteamId !== activeSubteamId) {
						continue;
					}
					if (!normalizedRoster[entry.eventName]) {
						normalizedRoster[entry.eventName] = [];
					}
					const slots = normalizedRoster[entry.eventName] ?? [];
					normalizedRoster[entry.eventName] = slots;
					slots[entry.slotIndex] = entry.displayName;
				}
			}

			setRoster(normalizedRoster);
			rosterRef.current = normalizedRoster;

			if (resolvedRosterId) {
				utils.teams.getRoster.setData(
					{
						teamSlug: team.slug,
						subteamId: activeSubteamId,
						rosterId: resolvedRosterId,
					},
					(prev) => ({
						roster: normalizedRoster,
						removedEvents: prev?.removedEvents ?? [],
					}),
				);
			}

			const isActiveRosterSelected =
				!isCaptain || (!!activeRosterId && selectedRosterId === activeRosterId);
			if (!isActiveRosterSelected) {
				return;
			}

			updateTeamData(team.slug, (prev) => {
				if (!prev) return prev;
				const existingRosterEntries = prev.rosterEntries ?? [];
				const insertedRosterEntries = Array.isArray(insertedEntries)
					? (insertedEntries as typeof existingRosterEntries)
					: [];

				const rosterEntries = [
					...existingRosterEntries.filter(
						(e: TeamFullData["rosterEntries"][0]) =>
							e.subteamId !== activeSubteamId,
					),
					...insertedRosterEntries,
				];

				const subteamNameMap = new Map<string, string>(
					(prev.subteams ?? []).map(
						(s: TeamFullData["subteams"][0]) =>
							[s.id, s.name] as [string, string],
					),
				);

				const userEventsMap = new Map<string, Set<string>>();
				const userSubteamMap = new Map<string, string>();

				for (const row of rosterEntries) {
					if (!row.userId) continue;
					if (!userEventsMap.has(row.userId)) {
						userEventsMap.set(row.userId, new Set());
					}
					userEventsMap.get(row.userId)?.add(row.eventName);
					if (row.subteamId) {
						userSubteamMap.set(row.userId, row.subteamId);
					}
				}

				const prevUnlinkedInviteMap = new Map<string, boolean>();
				for (const member of prev.members ?? []) {
					if (!member.isUnlinked) continue;
					const key = `${member.name.toLowerCase()}:${member.subteamId ?? "none"}`;
					prevUnlinkedInviteMap.set(key, member.hasPendingLinkInvite);
				}

				const linkedMembers = (prev.members ?? [])
					.filter((m: TeamMember) => !m.isUnlinked)
					.map((m: TeamMember) => {
						const subteamId = userSubteamMap.get(m.id) || null;
						const subteamName = subteamId
							? subteamNameMap.get(subteamId) || null
							: null;
						const events = Array.from(userEventsMap.get(m.id) ?? []);

						return {
							...m,
							events,
							subteamId,
							subteamName,
							subteam: subteamId
								? {
										id: subteamId,
										name: subteamName,
										description: "",
									}
								: null,
						};
					});

				const unlinkedMap = new Map<
					string,
					{
						name: string;
						subteamId: string | null;
						subteamName: string | null;
						events: Set<string>;
					}
				>();

				for (const row of rosterEntries) {
					if (row.userId) continue;
					const key = `${row.displayName.toLowerCase()}:${row.subteamId ?? "none"}`;
					const existing = unlinkedMap.get(key);
					if (existing) {
						existing.events.add(row.eventName);
						continue;
					}
					const subteamName = row.subteamId
						? subteamNameMap.get(row.subteamId) || null
						: null;
					unlinkedMap.set(key, {
						name: row.displayName,
						subteamId: row.subteamId,
						subteamName,
						events: new Set([row.eventName]),
					});
				}

				const unlinkedMembers = Array.from(unlinkedMap.values()).map((u) => {
					const inviteKey = `${u.name.toLowerCase()}:${u.subteamId ?? "none"}`;
					return {
						id: `unlinked-${u.name}-${u.subteamId ?? "none"}`,
						name: u.name,
						email: null,
						role: "member" as const,
						status: "active" as const,
						events: Array.from(u.events),
						subteamId: u.subteamId,
						subteamName: u.subteamName,
						subteam: u.subteamId
							? {
									id: u.subteamId,
									name: u.subteamName,
									description: "",
								}
							: null,
						isUnlinked: true,
						username: null,
						joinedAt: null,
						isPendingInvitation: false,
						hasPendingLinkInvite: prevUnlinkedInviteMap.get(inviteKey) ?? false,
					};
				});

				return {
					...prev,
					rosterEntries,
					members: [...linkedMembers, ...unlinkedMembers],
				};
			});

			if (result?.conflicts?.length) {
				toast.error(
					`${result.conflicts.join(", ")} cannot be on multiple subteams; removed from this subteam.`,
				);
			}

			const detectedConflicts = detectConflicts(
				normalizedRoster,
				effectiveGroups,
			);
			setConflicts(detectedConflicts);
		} catch (error) {
			// Client-side error after a successful mutation can still happen (e.g., cache update).
			console.error("[RosterTabUnified] saveRoster failed:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to save roster changes",
			);
		} finally {
			setIsSaving(false);
			saveInFlightRef.current = false;
			if (saveQueuedRef.current) {
				saveQueuedRef.current = false;
				void saveRoster();
			}
		}
	};

	const refreshTournamentRosters = async () => {
		await utils.teams.listTournamentRosters.invalidate({ teamSlug: team.slug });
	};

	const handleCreateRoster = async () => {
		try {
			const created = await createRosterMutation.mutateAsync({
				teamSlug: team.slug,
			});
			await refreshTournamentRosters();
			if (created?.id) {
				setSelectedRosterId(created.id);
			}
			toast.success("Tournament roster created.");
		} catch (error) {
			console.error("[RosterTabUnified] createRoster failed:", error);
			toast.error("Failed to create tournament roster.");
		}
	};

	const handleRenameRoster = async (rosterId: string, name: string) => {
		const existing = [...rosterList, ...archivedRosters].find(
			(roster) => roster.id === rosterId,
		);
		if (existing && existing.name === name) {
			return;
		}
		try {
			await renameRosterMutation.mutateAsync({
				teamSlug: team.slug,
				rosterId,
				name,
			});
			await refreshTournamentRosters();
			toast.success("Roster renamed.");
		} catch (error) {
			console.error("[RosterTabUnified] renameRoster failed:", error);
			toast.error("Failed to rename roster.");
		}
	};

	const handlePromoteRoster = async (rosterId: string) => {
		try {
			await promoteRosterMutation.mutateAsync({
				teamSlug: team.slug,
				rosterId,
			});
			await refreshTournamentRosters();
			await invalidateTeam(team.slug);
			setSelectedRosterId(rosterId);
			toast.success("Roster is now active.");
		} catch (error) {
			console.error("[RosterTabUnified] promoteRoster failed:", error);
			toast.error("Failed to promote roster.");
		}
	};

	const handleArchiveRoster = async (rosterId: string) => {
		try {
			keepRosterSelectionRef.current = selectedRosterId;
			await archiveRosterMutation.mutateAsync({
				teamSlug: team.slug,
				rosterId,
			});
			await refreshTournamentRosters();
			toast.success("Roster archived.");
		} catch (error) {
			console.error("[RosterTabUnified] archiveRoster failed:", error);
			toast.error("Failed to archive roster.");
		}
	};

	const handleRestoreRoster = async (rosterId: string) => {
		try {
			await restoreRosterMutation.mutateAsync({
				teamSlug: team.slug,
				rosterId,
			});
			await refreshTournamentRosters();
			setSelectedRosterId(rosterId);
			toast.success("Roster restored.");
		} catch (error) {
			console.error("[RosterTabUnified] restoreRoster failed:", error);
			toast.error("Failed to restore roster.");
		}
	};

	const handleDeleteRoster = async (rosterId: string) => {
		try {
			await deleteRosterMutation.mutateAsync({
				teamSlug: team.slug,
				rosterId,
			});
			await refreshTournamentRosters();
			toast.success("Roster deleted.");
		} catch (error) {
			console.error("[RosterTabUnified] deleteRoster failed:", error);
			toast.error("Failed to delete roster.");
		}
	};

	const handleSetRosterPublic = async (rosterId: string, isPublic: boolean) => {
		try {
			const result = await setRosterVisibilityMutation.mutateAsync({
				teamSlug: team.slug,
				rosterId,
				isPublic,
			});
			if ((result as { updated?: boolean }).updated === false) {
				return;
			}
			await refreshTournamentRosters();
			toast.success(
				isPublic ? "Roster is now public." : "Roster is now hidden.",
			);
		} catch (error) {
			console.error("[RosterTabUnified] setRosterPublic failed:", error);
			toast.error("Failed to update roster visibility.");
		}
	};

	const updateEventRoster = (
		eventName: string,
		index: number,
		value: string,
	) => {
		const newRoster = { ...roster };
		if (!newRoster[eventName]) {
			newRoster[eventName] = [];
		}

		while (newRoster[eventName].length <= index) {
			newRoster[eventName].push("");
		}

		newRoster[eventName][index] = value;
		setRoster(newRoster);
		rosterRef.current = newRoster;
		setIsSaving(true);

		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		saveTimeoutRef.current = setTimeout(() => {
			saveRoster();
		}, 500);
	};

	const handleCreateAssignment = (eventName: string) => {
		setSelectedEvent(eventName);
		setShowAssignmentCreator(true);
	};

	const handleAssignmentCreated = (_assignment: {
		id: string;
		title: string;
	}) => {
		setShowAssignmentCreator(false);
		setSelectedEvent(null);
		utils.teams.assignments.invalidate({ teamSlug: team.slug });
		utils.teams.assignments.prefetch({ teamSlug: team.slug });
		utils.teams.full.invalidate({ teamSlug: team.slug });
	};

	const handleCancelAssignment = () => {
		setShowAssignmentCreator(false);
		setSelectedEvent(null);
	};

	const handleRemoveEvent = async (
		eventName: string,
		conflictBlock: string,
	) => {
		if (!activeSubteamId) {
			return;
		}

		try {
			await updateRemovedEventsMutation.mutateAsync({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
				eventName,
				conflictBlock,
				mode: "remove",
			});
			setBlockOverrides((prev) => {
				const current = prev[conflictBlock] ?? { added: [], removed: [] };
				return {
					...prev,
					[conflictBlock]: {
						added: current.added.filter((e) => e !== eventName),
						removed: Array.from(new Set([...current.removed, eventName])),
					},
				};
			});
			setRoster((prev) => {
				const newRoster = { ...prev };
				delete newRoster[eventName];
				return newRoster;
			});
			toast.success(`${eventName} removed from ${conflictBlock}`);
			invalidateTeam(team.slug);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to remove event",
			);
		}
	};

	const handleResetBlock = async (conflictBlock: string) => {
		if (!activeSubteamId) {
			return;
		}

		const eventsToRemoveFromRoster = (
			blockOverrides[conflictBlock]?.added ?? []
		).slice();

		try {
			await restoreRemovedEventsMutation.mutateAsync({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
				conflictBlock,
				mode: "reset",
			});
			setBlockOverrides((prev) => {
				const next = { ...prev };
				delete next[conflictBlock];
				return next;
			});
			if (eventsToRemoveFromRoster.length > 0) {
				setRoster((prev) => {
					const next = { ...prev };
					for (const eventName of eventsToRemoveFromRoster) {
						delete next[eventName];
					}
					return next;
				});
			}
			invalidateTeam(team.slug);
			toast.success(`${conflictBlock} reset`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to reset block",
			);
		}
	};

	const openAddEventModal = (conflictBlock: string) => {
		setNewEventName("");
		setAddEventModal({ conflictBlock });
	};

	const submitAddEvent = async () => {
		if (!activeSubteamId || !addEventModal) return;
		const name = newEventName.trim();
		if (!name) return;

		setIsSubmittingEvent(true);
		try {
			await updateRemovedEventsMutation.mutateAsync({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
				eventName: name,
				conflictBlock: addEventModal.conflictBlock,
				mode: "add",
			});
			setBlockOverrides((prev) => {
				const current = prev[addEventModal.conflictBlock] ?? {
					added: [],
					removed: [],
				};
				return {
					...prev,
					[addEventModal.conflictBlock]: {
						added: Array.from(new Set([...current.added, name])),
						removed: current.removed.filter((e) => e !== name),
					},
				};
			});
			invalidateTeam(team.slug);
			setAddEventModal(null);
			toast.success(`Added ${name}`);
		} catch {
			toast.error("Failed to add event");
		} finally {
			setIsSubmittingEvent(false);
		}
	};

	const toggleGroupCollapse = (groupLabel: string) => {
		setCollapsedGroups((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(groupLabel)) {
				newSet.delete(groupLabel);
			} else {
				newSet.add(groupLabel);
			}
			return newSet;
		});
	};

	const toggleTournamentRostersCollapsed = () => {
		setTournamentRostersCollapsed((prev) => !prev);
	};

	const toggleSubteamsCollapsed = () => {
		setSubteamsCollapsed((prev) => !prev);
	};

	const saveRosterNotes = async (notes: string) => {
		if (!activeSubteamId) {
			return;
		}

		setIsSavingNotes(true);
		const snapshot = utils.teams.full.getData({ teamSlug: team.slug });
		updateTeamData(team.slug, (prev) => {
			if (!prev) return prev;
			return {
				...prev,
				subteams: prev.subteams.map((subteam) =>
					subteam.id === activeSubteamId
						? { ...subteam, rosterNotes: notes }
						: subteam,
				),
			};
		});
		try {
			await updateRosterNotesMutation.mutateAsync({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
				notes,
			});
		} catch (error) {
			updateTeamData(team.slug, () => snapshot);
			console.error("Failed to save roster notes:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to save notes",
			);
		} finally {
			setIsSavingNotes(false);
		}
	};

	const handleNotesChange = (value: string) => {
		setRosterNotes(value);

		if (notesSaveTimeoutRef.current) {
			clearTimeout(notesSaveTimeoutRef.current);
		}

		notesSaveTimeoutRef.current = setTimeout(() => {
			if (isCaptain) {
				void saveRosterNotes(value);
			}
		}, 1000);
	};

	if (!activeSubteamId) {
		if (subteams.length === 0) {
			return (
				<div className="p-6">
					<div className="flex items-center justify-center h-64">
						<div
							className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							No subteams found. Please create a subteam to view the roster.
						</div>
					</div>
				</div>
			);
		}

		return (
			<div className="p-6">
				<div className="flex items-center justify-center h-64">
					<div
						className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						Please select a subteam to view the roster
					</div>
				</div>
			</div>
		);
	}

	const tournamentRosterCard = (
		<TournamentRosterSelector
			darkMode={darkMode}
			rosters={rosterList}
			archivedRosters={archivedRosters}
			selectedRosterId={selectedRosterId}
			onSelectRoster={setSelectedRosterId}
			onCreateRoster={isCaptain ? handleCreateRoster : undefined}
			onRenameRoster={isCaptain ? handleRenameRoster : undefined}
			onPromoteRoster={isCaptain ? handlePromoteRoster : undefined}
			onArchiveRoster={isCaptain ? handleArchiveRoster : undefined}
			onRestoreRoster={isCaptain ? handleRestoreRoster : undefined}
			onDeleteRoster={isCaptain ? handleDeleteRoster : undefined}
			onSetRosterPublic={isCaptain ? handleSetRosterPublic : undefined}
			readOnly={!isCaptain}
			showHelperText={isCaptain}
			showCreate={isCaptain}
			defaultShowArchived={!isCaptain}
			showPublicBadge={!isCaptain}
			collapsed={tournamentRostersCollapsed}
			onToggleCollapsed={toggleTournamentRostersCollapsed}
		/>
	);

	const subteamCard = (
		<SubteamSelector
			darkMode={darkMode}
			subteams={subteams}
			activeSubteamId={activeSubteamId}
			isCaptain={isCaptain}
			onSubteamChange={onSubteamChange}
			onCreateSubteam={onCreateSubteam ? () => onCreateSubteam() : undefined}
			onEditSubteam={onEditSubteam}
			onDeleteSubteam={onDeleteSubteam}
			onReorderSubteams={onReorderSubteams}
			collapsed={subteamsCollapsed}
			onToggleCollapsed={toggleSubteamsCollapsed}
		/>
	);

	return (
		<div className="space-y-6">
			<RosterHeader
				darkMode={darkMode}
				conflicts={conflicts}
				isSaving={isSaving}
				isCaptain={isCaptain}
				isEditMode={effectiveEditMode}
				onToggleMode={toggleEditMode}
			/>

			{!tournamentRostersCollapsed && tournamentRosterCard}
			{isCaptain && isRosterArchived && (
				<div
					className={`rounded-lg border px-4 py-3 text-sm ${
						darkMode
							? "border-yellow-600/40 bg-yellow-900/20 text-yellow-200"
							: "border-yellow-300 bg-yellow-50 text-yellow-800"
					}`}
				>
					Archived rosters are read-only. Restore to inactive to edit.
				</div>
			)}

			{!subteamsCollapsed && subteamCard}

			{(() => {
				const collapsedCount = collapsedGroups.size;
				const anyCollapsed = collapsedCount > 0;
				const evenCollapsed = anyCollapsed && collapsedCount % 2 === 0;
				const isBlockSevenCollapsed = collapsedGroups.has("Conflict Block 7");
				const collapsedIndices = Array.from(collapsedGroups)
					.map((label) => groupIndexByLabel.get(label))
					.filter((index): index is number => typeof index === "number");
				const minCollapsedIndex =
					collapsedIndices.length > 0 ? Math.min(...collapsedIndices) : null;
				const inlineRow =
					minCollapsedIndex === null
						? null
						: Math.floor(minCollapsedIndex / 2) + 1;
				const inlineCol =
					minCollapsedIndex === null ? null : (minCollapsedIndex % 2) + 1;
				const inlinePlacementKey =
					inlineRow && inlineCol ? `${inlineRow}-${inlineCol}` : null;
				const inlinePlacementClasses: Record<string, string> = {
					"1-1": "lg:col-start-1 lg:row-start-1",
					"1-2": "lg:col-start-2 lg:row-start-1",
					"2-1": "lg:col-start-1 lg:row-start-2",
					"2-2": "lg:col-start-2 lg:row-start-2",
					"3-1": "lg:col-start-1 lg:row-start-3",
					"3-2": "lg:col-start-2 lg:row-start-3",
					"4-1": "lg:col-start-1 lg:row-start-4",
					"4-2": "lg:col-start-2 lg:row-start-4",
				};
				const groupsToRender = evenCollapsed ? expandedGroups : orderedGroups;
				const blockSevenHalfWidth =
					anyCollapsed && (!evenCollapsed || isBlockSevenCollapsed);
				const showInlineCollapsed =
					evenCollapsed &&
					isBlockSevenCollapsed &&
					collapsedOnlyGroups.length > 0 &&
					inlinePlacementKey !== null;
				const inlinePlacementClass = inlinePlacementKey
					? (inlinePlacementClasses[inlinePlacementKey] ?? "")
					: "";
				const inlineCollapsedGroups = showInlineCollapsed
					? collapsedOnlyGroups.slice(0, 2)
					: [];
				const remainingCollapsedGroups = showInlineCollapsed
					? collapsedOnlyGroups.slice(2)
					: collapsedOnlyGroups;

				return isLoading ? (
					<div className="flex justify-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{showInlineCollapsed && (
								<div className={`space-y-6 ${inlinePlacementClass}`}>
									{inlineCollapsedGroups.map((group) => {
										const isBlockSeven = group.label === "Conflict Block 7";
										const overrides = blockOverrides[group.label] ?? {
											added: [],
											removed: [],
										};
										const showReset =
											overrides.added.length > 0 ||
											overrides.removed.length > 0;
										return (
											<ConflictBlock
												key={group.label}
												darkMode={darkMode}
												group={group}
												roster={roster}
												isCaptain={isCaptain}
												isEditMode={effectiveEditMode}
												collapsedGroups={collapsedGroups}
												isBlockSeven={isBlockSeven}
												blockSevenHalfWidth={blockSevenHalfWidth}
												onToggleGroupCollapse={toggleGroupCollapse}
												onUpdateRoster={updateEventRoster}
												onCreateAssignment={handleCreateAssignment}
												onRemoveEvent={handleRemoveEvent}
												onResetBlock={handleResetBlock}
												onAddEvent={openAddEventModal}
												showReset={showReset}
											/>
										);
									})}
								</div>
							)}
							{groupsToRender.map((group) => {
								const isBlockSeven = group.label === "Conflict Block 7";
								const overrides = blockOverrides[group.label] ?? {
									added: [],
									removed: [],
								};
								const showReset =
									overrides.added.length > 0 || overrides.removed.length > 0;
								return (
									<ConflictBlock
										key={group.label}
										darkMode={darkMode}
										group={group}
										roster={roster}
										isCaptain={isCaptain}
										isEditMode={effectiveEditMode}
										collapsedGroups={collapsedGroups}
										isBlockSeven={isBlockSeven}
										blockSevenHalfWidth={blockSevenHalfWidth}
										onToggleGroupCollapse={toggleGroupCollapse}
										onUpdateRoster={updateEventRoster}
										onCreateAssignment={handleCreateAssignment}
										onRemoveEvent={handleRemoveEvent}
										onResetBlock={handleResetBlock}
										onAddEvent={openAddEventModal}
										showReset={showReset}
									/>
								);
							})}
						</div>
						{(() => {
							if (!evenCollapsed || remainingCollapsedGroups.length === 0) {
								return null;
							}
							return (
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
									{remainingCollapsedGroups.map((group) => {
										const isBlockSeven = group.label === "Conflict Block 7";
										const overrides = blockOverrides[group.label] ?? {
											added: [],
											removed: [],
										};
										const showReset =
											overrides.added.length > 0 ||
											overrides.removed.length > 0;
										return (
											<ConflictBlock
												key={group.label}
												darkMode={darkMode}
												group={group}
												roster={roster}
												isCaptain={isCaptain}
												isEditMode={effectiveEditMode}
												collapsedGroups={collapsedGroups}
												isBlockSeven={isBlockSeven}
												blockSevenHalfWidth={blockSevenHalfWidth}
												onToggleGroupCollapse={toggleGroupCollapse}
												onUpdateRoster={updateEventRoster}
												onCreateAssignment={handleCreateAssignment}
												onRemoveEvent={handleRemoveEvent}
												onResetBlock={handleResetBlock}
												onAddEvent={openAddEventModal}
												showReset={showReset}
											/>
										);
									})}
								</div>
							);
						})()}
					</>
				);
			})()}

			{/* Additional stuff section */}
			{!isLoading && (
				<div
					className={`rounded-lg border-2 p-4 ${
						darkMode
							? "bg-gray-800 border-gray-700"
							: "bg-white border-gray-300"
					}`}
				>
					<h3
						className={`text-lg font-semibold mb-3 ${
							darkMode ? "text-gray-200" : "text-gray-800"
						}`}
					>
						Additional Stuff
					</h3>
					<textarea
						value={rosterNotes}
						onChange={(e) => handleNotesChange(e.target.value)}
						disabled={!isCaptain}
						placeholder={
							isCaptain
								? "Team notes that cannot be reflected anywhere else..."
								: "Only captains and admins can edit this section."
						}
						className={`w-full rounded-lg px-3 py-2 text-sm border min-h-[120px] resize-y ${
							darkMode
								? isCaptain
									? "bg-gray-900 text-white border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
									: "bg-gray-900/50 text-gray-400 border-gray-700 cursor-not-allowed"
								: isCaptain
									? "bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
									: "bg-gray-50 text-gray-500 border-gray-300 cursor-not-allowed"
						}`}
					/>
					{isSavingNotes && (
						<div
							className={`text-xs mt-2 ${
								darkMode ? "text-gray-400" : "text-gray-500"
							}`}
						>
							Saving...
						</div>
					)}
				</div>
			)}

			{(tournamentRostersCollapsed || subteamsCollapsed) && (
				<div className="space-y-6">
					{tournamentRostersCollapsed && tournamentRosterCard}
					{subteamsCollapsed && subteamCard}
				</div>
			)}

			{showAssignmentCreator && (
				<AssignmentCreator
					teamId={team.slug}
					subteamId={activeSubteamId || undefined}
					onAssignmentCreated={handleAssignmentCreated}
					onCancel={handleCancelAssignment}
					darkMode={darkMode}
					prefillEventName={selectedEvent || ""}
				/>
			)}

			<Modal
				isOpen={addEventModal !== null}
				onClose={() => {
					if (!isSubmittingEvent) {
						setAddEventModal(null);
					}
				}}
				title="Add event"
				maxWidth="sm"
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<label
							htmlFor="new-event-name"
							className={`text-sm font-medium ${darkMode ? "text-gray-200" : "text-gray-800"}`}
						>
							Event name
						</label>
						<input
							id="new-event-name"
							value={newEventName}
							onChange={(e) => setNewEventName(e.target.value)}
							placeholder="e.g., Robot Tour"
							className={`w-full rounded-lg px-3 py-2 text-sm border ${
								darkMode
									? "bg-gray-900 text-white border-gray-700"
									: "bg-white text-gray-900 border-gray-300"
							}`}
						/>
					</div>
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setAddEventModal(null)}
							disabled={isSubmittingEvent}
							className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
								darkMode
									? "bg-gray-700 text-white hover:bg-gray-600"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={submitAddEvent}
							disabled={isSubmittingEvent || !newEventName.trim()}
							className="rounded-lg px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isSubmittingEvent ? "Adding..." : "Add"}
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
