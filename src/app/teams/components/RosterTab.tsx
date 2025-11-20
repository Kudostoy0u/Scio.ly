"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useTeamStore } from "@/app/hooks/useTeamStore";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import { trpc } from "@/lib/trpc/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import AssignmentCreator from "./EnhancedAssignmentCreator";

import ConflictBlock from "./roster/ConflictBlock";
// Import roster components
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
  onInvitePerson: () => void;
  activeSubteamId?: string | null;
  subteams?: Subteam[];
  onSubteamChange?: (subteamId: string) => void;
  onCreateSubteam?: (name: string) => void;
  onEditSubteam?: (subteamId: string, newName: string) => void;
  onDeleteSubteam?: (subteamId: string, subteamName: string) => void;
}

export default function RosterTab({
  team,
  isCaptain,
  onInvitePerson: _onInvitePerson,
  activeSubteamId,
  subteams = [],
  onSubteamChange,
  onCreateSubteam,
  onEditSubteam,
  onDeleteSubteam,
}: RosterTabProps) {
  const { darkMode } = useTheme();
  const { invalidateCache } = useTeamStore();

  // tRPC queries and mutations
  const { data: rosterData } = trpc.teams.getRoster.useQuery(
    { teamSlug: team.slug, subteamId: activeSubteamId || "" },
    { enabled: !!activeSubteamId && !!team.slug }
  );
  const updateRosterBulkMutation = trpc.teams.updateRosterBulk.useMutation();
  const [roster, setRoster] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rosterRef = useRef<Record<string, string[]>>({});

  // Assignment creator state
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  // Mobile collapsible groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Removed events state
  const [removedEvents, setRemovedEvents] = useState<Set<string>>(new Set());

  // Conflict detection state
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const groups = team.division === "B" ? DIVISION_B_GROUPS : DIVISION_C_GROUPS;

  // Removed duplicate useEffect - the second one handles roster loading

  // localStorage utilities for removed events
  const getRemovedEventsCacheKey = useCallback(
    (teamSlug: string, subteamId: string) => `removed_events_${teamSlug}_${subteamId}`,
    []
  );

  const loadRemovedEventsFromCache = useCallback(
    (teamSlug: string, subteamId: string): Set<string> => {
      try {
        const cached = SyncLocalStorage.getItem(getRemovedEventsCacheKey(teamSlug, subteamId));
        return cached ? new Set<string>(JSON.parse(cached)) : new Set<string>();
      } catch (_error) {
        return new Set<string>();
      }
    },
    [getRemovedEventsCacheKey]
  );

  const saveRemovedEventsToCache = useCallback(
    (teamSlug: string, subteamId: string, events: Set<string>) => {
      try {
        SyncLocalStorage.setItem(
          getRemovedEventsCacheKey(teamSlug, subteamId),
          JSON.stringify(Array.from(events))
        );
      } catch (_error) {}
    },
    [getRemovedEventsCacheKey]
  );

  // Toggle group collapse
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

  // Load removed events from cache (roster data now includes removed events)
  const loadRemovedEvents = useCallback(() => {
    if (!activeSubteamId) {
      return;
    }

    // Load from cache for immediate UI update
    const cachedRemovedEvents = loadRemovedEventsFromCache(team.slug, activeSubteamId);
    setRemovedEvents(cachedRemovedEvents);
  }, [activeSubteamId, team.slug, loadRemovedEventsFromCache]);

  // Load removed events from cache
  useEffect(() => {
    if (activeSubteamId) {
      loadRemovedEvents();
    }
  }, [activeSubteamId, loadRemovedEvents]);

  // Update local roster when tRPC data changes
  useEffect(() => {
    if (rosterData) {
      if (process.env.NODE_ENV === "development") {
      }

      setRoster(rosterData.roster);

      // Check for conflicts when roster is loaded
      if (Object.keys(rosterData.roster).length > 0) {
        const detectedConflicts = detectConflicts(rosterData.roster, groups);
        setConflicts(detectedConflicts);
      }
    }
  }, [rosterData, groups]);

  // Update removed events when tRPC data changes
  useEffect(() => {
    if (rosterData && rosterData.removedEvents.length > 0) {
      setRemovedEvents(new Set(rosterData.removedEvents));
      saveRemovedEventsToCache(team.slug, activeSubteamId || "", new Set(rosterData.removedEvents));
    }
  }, [rosterData, team.slug, activeSubteamId, saveRemovedEventsToCache]);

  // Update rosterRef when roster changes
  useEffect(() => {
    rosterRef.current = roster;
  }, [roster]);

  // Cleanup timeout on unmount or subteam change
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activeSubteamId]);

  // Save roster data - OPTIMIZED BULK VERSION
  const saveRoster = async () => {
    if (!activeSubteamId) {
      return;
    }

    try {
      // Prepare all roster entries for bulk update
      const rosterEntries: Array<{
        eventName: string;
        slotIndex: number;
        studentName: string;
      }> = [];

      // Collect all roster entries from the current ref value
      for (const [eventName, students] of Object.entries(rosterRef.current)) {
        for (let slotIndex = 0; slotIndex < students.length; slotIndex++) {
          const studentName = students[slotIndex] || "";
          if (studentName.trim()) {
            // Only include non-empty entries
            rosterEntries.push({
              eventName,
              slotIndex,
              studentName,
            });
          }
        }
      }

      // Single bulk API call instead of multiple individual calls
      if (rosterEntries.length > 0) {
        await updateRosterBulkMutation.mutateAsync({
          teamSlug: team.slug,
          subteamId: activeSubteamId,
          rosterEntries,
        });
      }

      // Invalidate members cache so PeopleTab shows new unlinked members
      // Only log in development
      if (process.env.NODE_ENV === "development") {
      }
      invalidateCache(`members-${team.slug}-all`);
      invalidateCache(`members-${team.slug}-${activeSubteamId}`);

      // Also invalidate roster cache to ensure consistency
      invalidateCache(`roster-${team.slug}-${activeSubteamId}`);

      // Check for conflicts after save is completed
      const detectedConflicts = detectConflicts(rosterRef.current, groups);
      setConflicts(detectedConflicts);
    } catch (_error) {
    } finally {
      setIsSaving(false);
    }
  };

  // Update roster for a specific event
  const updateEventRoster = (eventName: string, index: number, value: string) => {
    const newRoster = { ...roster };
    if (!newRoster[eventName]) {
      newRoster[eventName] = [];
    }

    // Ensure array is long enough
    while (newRoster[eventName].length <= index) {
      newRoster[eventName].push("");
    }

    newRoster[eventName][index] = value;
    setRoster(newRoster);
    rosterRef.current = newRoster; // Update the ref with the latest state
    setIsSaving(true);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after 500ms of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      saveRoster();
    }, 500);
  };

  // Assignment creator handlers
  const handleCreateAssignment = (eventName: string) => {
    setSelectedEvent(eventName);
    setShowAssignmentCreator(true);
  };

  const handleAssignmentCreated = (_assignment: any) => {
    setShowAssignmentCreator(false);
    setSelectedEvent(null);
  };

  const handleCancelAssignment = () => {
    setShowAssignmentCreator(false);
    setSelectedEvent(null);
  };

  // Remove an event
  const handleRemoveEvent = async (eventName: string, conflictBlock: string) => {
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
        // Update cache
        saveRemovedEventsToCache(team.slug, activeSubteamId, newRemovedEvents);
        // Clear roster data for the removed event
        setRoster((prev) => {
          const newRoster = { ...prev };
          delete newRoster[eventName];
          return newRoster;
        });

        const deletedCount = result.deletedRosterEntries || 0;
        if (deletedCount > 0) {
          toast.success(
            `${eventName} removed from ${conflictBlock} (cleared ${deletedCount} roster entries)`
          );
        } else {
          toast.success(`${eventName} removed from ${conflictBlock}`);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove event");
      }
    } catch (_error) {
      toast.error("Failed to remove event");
    }
  };

  // Restore events in a conflict block
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
        // Remove restored events from the removed set
        const newRemovedEvents = new Set(removedEvents);
        // We need to get the events for this conflict block to remove them from the set
        const group = groups.find((g) => g.label === conflictBlock);
        if (group) {
          group.events.forEach((event) => newRemovedEvents.delete(event));
        }
        setRemovedEvents(newRemovedEvents);
        // Update cache
        saveRemovedEventsToCache(team.slug, activeSubteamId, newRemovedEvents);
        // Invalidate roster cache to force refresh on next render
        if (activeSubteamId) {
          invalidateCache(`roster-${team.slug}-${activeSubteamId}`);
        }
        toast.success(`${data.restoredCount} events restored in ${conflictBlock}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to restore events");
      }
    } catch (_error) {
      toast.error("Failed to restore events");
    }
  };

  if (!activeSubteamId) {
    // If there are no subteams at all, show a different message
    if (subteams.length === 0) {
      return (
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              No subteams found. Please create a subteam to view the roster.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Please select a subteam to view the roster
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <RosterHeader darkMode={darkMode} conflicts={conflicts} isSaving={isSaving} />

      <SubteamSelector
        darkMode={darkMode}
        subteams={subteams}
        activeSubteamId={activeSubteamId}
        isCaptain={isCaptain}
        onSubteamChange={onSubteamChange}
        onCreateSubteam={onCreateSubteam}
        onEditSubteam={onEditSubteam}
        onDeleteSubteam={onDeleteSubteam}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map((group, index) => {
          const isLastGroup = index === groups.length - 1;

          // Removed debug logging

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

      {/* Assignment Creator Modal */}
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
