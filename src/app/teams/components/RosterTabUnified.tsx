/**
 * Roster Tab - Unified Version
 *
 * Reads from React Query shared cache.
 * Updates invalidate the shared cache for consistency.
 */

"use client";

import Modal from "@/app/components/Modal";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useInvalidateTeam, useTeamRoster } from "@/lib/hooks/useTeam";
import type { TeamFullData, TeamMember } from "@/lib/server/teams/shared";
import { trpc } from "@/lib/trpc/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import AssignmentCreator from "./EnhancedAssignmentCreator";
import ConflictBlock from "./roster/ConflictBlock";
import RosterHeader from "./roster/RosterHeader";
import SubteamSelector from "./roster/SubteamSelector";
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
	const saveRosterMutation = trpc.teams.saveRoster.useMutation();

	// Get roster data from shared cache
	const { data: rosterData, isLoading } = useTeamRoster(
		team.slug,
		activeSubteamId || "",
	);

	const [roster, setRoster] = useState<Record<string, string[]>>({});
	const [isSaving, setIsSaving] = useState(false);
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const rosterRef = useRef<Record<string, string[]>>({});
	const saveInFlightRef = useRef(false);
	const saveQueuedRef = useRef(false);

	const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		new Set(),
	);
	const [blockOverrides, setBlockOverrides] = useState<
		Record<string, { added: string[]; removed: string[] }>
	>({});
	const [conflicts, setConflicts] = useState<Conflict[]>([]);
	const [addEventModal, setAddEventModal] = useState<{
		conflictBlock: string;
	} | null>(null);
	const [newEventName, setNewEventName] = useState("");
	const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

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

	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	const saveRoster = async () => {
		if (!activeSubteamId) {
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

			const result = await saveRosterMutation.mutateAsync({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
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
			const response = await fetch(`/api/teams/${team.slug}/removed-events`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subteamId: activeSubteamId,
					eventName,
					conflictBlock,
				}),
			});

			if (response.ok) {
				await response.json().catch(() => undefined);
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
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to remove event");
			}
		} catch {
			toast.error("Failed to remove event");
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
			const response = await fetch(`/api/teams/${team.slug}/removed-events`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subteamId: activeSubteamId,
					conflictBlock,
					mode: "reset",
				}),
			});

			if (response.ok) {
				await response.json().catch(() => undefined);
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
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to reset block");
			}
		} catch {
			toast.error("Failed to reset block");
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
			const response = await fetch(`/api/teams/${team.slug}/removed-events`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subteamId: activeSubteamId,
					eventName: name,
					conflictBlock: addEventModal.conflictBlock,
					mode: "add",
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				toast.error(error.error || "Failed to add event");
				return;
			}

			await response.json().catch(() => undefined);
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

	return (
		<div className="space-y-6">
			<RosterHeader
				darkMode={darkMode}
				conflicts={conflicts}
				isSaving={isSaving}
			/>

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
			/>

			{isLoading ? (
				<div className="flex justify-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{effectiveGroups.map((group, index) => {
						const isLastGroup = index === effectiveGroups.length - 1;
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
								collapsedGroups={collapsedGroups}
								isLastGroup={isLastGroup}
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
