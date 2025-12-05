/**
 * Roster Tab - Unified Version
 *
 * Reads from React Query shared cache.
 * Updates invalidate the shared cache for consistency.
 */

"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useInvalidateTeam, useTeamRoster } from "@/lib/hooks/useTeam";
import { trpc } from "@/lib/trpc/client";
import { useEffect, useRef, useState } from "react";
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
	const { invalidateTeam } = useInvalidateTeam();
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

	const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		new Set(),
	);
	const [removedEvents, setRemovedEvents] = useState<Set<string>>(new Set());
	const [conflicts, setConflicts] = useState<Conflict[]>([]);

	const groups = team.division === "B" ? DIVISION_B_GROUPS : DIVISION_C_GROUPS;

	// Update local roster when query data changes
	useEffect(() => {
		if (rosterData?.roster) {
			setRoster(rosterData.roster);
			if (Object.keys(rosterData.roster).length > 0) {
				const detectedConflicts = detectConflicts(rosterData.roster, groups);
				setConflicts(detectedConflicts);
			}
		}
	}, [rosterData, groups]);

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

			await saveRosterMutation.mutateAsync({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
				entries: rosterEntries,
			});

			// Invalidate shared cache
			invalidateTeam(team.slug);

			const detectedConflicts = detectConflicts(rosterRef.current, groups);
			setConflicts(detectedConflicts);
		} catch (_error) {
			toast.error("Failed to save roster changes");
		} finally {
			setIsSaving(false);
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
				const result = await response.json();
				const newRemovedEvents = new Set([...removedEvents, eventName]);
				setRemovedEvents(newRemovedEvents);
				setRoster((prev) => {
					const newRoster = { ...prev };
					delete newRoster[eventName];
					return newRoster;
				});

				const deletedCount = result.deletedRosterEntries || 0;
				if (deletedCount > 0) {
					toast.success(
						`${eventName} removed from ${conflictBlock} (cleared ${deletedCount} roster entries)`,
					);
				} else {
					toast.success(`${eventName} removed from ${conflictBlock}`);
				}

				invalidateTeam(team.slug);
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to remove event");
			}
		} catch (_error) {
			toast.error("Failed to remove event");
		}
	};

	const handleRestoreEvents = async (conflictBlock: string) => {
		if (!activeSubteamId) {
			return;
		}

		try {
			const response = await fetch(`/api/teams/${team.slug}/removed-events`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subteamId: activeSubteamId,
					conflictBlock,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				const newRemovedEvents = new Set(removedEvents);
				const group = groups.find((g) => g.label === conflictBlock);
				if (group) {
					for (const event of group.events) {
						newRemovedEvents.delete(event);
					}
				}
				setRemovedEvents(newRemovedEvents);
				invalidateTeam(team.slug);
				toast.success(
					`${data.restoredCount} events restored in ${conflictBlock}`,
				);
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to restore events");
			}
		} catch (_error) {
			toast.error("Failed to restore events");
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
					{groups.map((group, index) => {
						const isLastGroup = index === groups.length - 1;
						return (
							<ConflictBlock
								key={group.label}
								darkMode={darkMode}
								group={group}
								roster={roster}
								isCaptain={isCaptain}
								removedEvents={removedEvents}
								collapsedGroups={collapsedGroups}
								isLastGroup={isLastGroup}
								onToggleGroupCollapse={toggleGroupCollapse}
								onUpdateRoster={updateEventRoster}
								onCreateAssignment={handleCreateAssignment}
								onRemoveEvent={handleRemoveEvent}
								onRestoreEvents={handleRestoreEvents}
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
		</div>
	);
}
