"use client";

import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import EventInput from "./EventInput";
import type { ConflictBlock as ConflictBlockType } from "./rosterUtils";
import { getGroupColors } from "./rosterUtils";

interface ConflictBlockProps {
  darkMode: boolean;
  group: ConflictBlockType;
  roster: Record<string, string[]>;
  isCaptain: boolean;
  removedEvents: Set<string>;
  collapsedGroups: Set<string>;
  isLastGroup: boolean;
  onToggleGroupCollapse: (groupLabel: string) => void;
  onUpdateRoster: (eventName: string, index: number, value: string) => void;
  onCreateAssignment: (eventName: string) => void;
  onRemoveEvent: (eventName: string, conflictBlock: string) => void;
  onRestoreEvents: (conflictBlock: string) => void;
}

export default function ConflictBlock({
  darkMode,
  group,
  roster,
  isCaptain,
  removedEvents,
  collapsedGroups,
  isLastGroup,
  onToggleGroupCollapse,
  onUpdateRoster,
  onCreateAssignment,
  onRemoveEvent,
  onRestoreEvents,
}: ConflictBlockProps) {
  // Removed verbose logging - not needed for business logic

  const colors = getGroupColors(darkMode, group.colorKey);
  const isCollapsed = collapsedGroups.has(group.label);

  const handleGroupClick = () => {
    // Only make collapsible on mobile
    if (window.innerWidth < 768) {
      onToggleGroupCollapse(group.label);
    }
  };

  if (isLastGroup) {
    return (
      <div className={`rounded-lg border-2 p-4 lg:col-span-2 ${colors.bg} ${colors.border}`}>
        <div
          className={"flex items-center justify-between mb-4 cursor-pointer md:cursor-default"}
          onClick={handleGroupClick}
        >
          <h3 className={`text-lg font-semibold ${colors.text}`}>{group.label}</h3>
          <div className="flex items-center gap-2">
            {isCaptain && group.events.some((evt) => removedEvents.has(evt)) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestoreEvents(group.label);
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                title="Restore removed events"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
            <div className="md:hidden">
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${isCollapsed ? "hidden md:grid" : ""}`}>
          <div className="space-y-3">
            {group.events.slice(0, Math.ceil(group.events.length / 2)).map((evt) => (
              <EventInput
                key={evt}
                darkMode={darkMode}
                eventName={evt}
                roster={roster}
                isCaptain={isCaptain}
                isRemoved={removedEvents.has(evt)}
                colorKey={group.colorKey}
                colors={colors}
                onUpdateRoster={onUpdateRoster}
                onCreateAssignment={onCreateAssignment}
                onRemoveEvent={onRemoveEvent}
                conflictBlock={group.label}
              />
            ))}
          </div>
          <div className="space-y-3">
            {group.events.slice(Math.ceil(group.events.length / 2)).map((evt) => (
              <EventInput
                key={evt}
                darkMode={darkMode}
                eventName={evt}
                roster={roster}
                isCaptain={isCaptain}
                isRemoved={removedEvents.has(evt)}
                colorKey={group.colorKey}
                colors={colors}
                onUpdateRoster={onUpdateRoster}
                onCreateAssignment={onCreateAssignment}
                onRemoveEvent={onRemoveEvent}
                conflictBlock={group.label}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border-2 p-4 ${colors.bg} ${colors.border}`}>
      <div
        className={"flex items-center justify-between mb-4 cursor-pointer md:cursor-default"}
        onClick={handleGroupClick}
      >
        <h3 className={`text-lg font-semibold ${colors.text}`}>{group.label}</h3>
        <div className="flex items-center gap-2">
          {isCaptain && group.events.some((evt) => removedEvents.has(evt)) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestoreEvents(group.label);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
              title="Restore removed events"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
          <div className="md:hidden">
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>
      <div className={`space-y-3 ${isCollapsed ? "hidden md:block" : ""}`}>
        {group.events.map((evt) => (
          <EventInput
            key={evt}
            darkMode={darkMode}
            eventName={evt}
            roster={roster}
            isCaptain={isCaptain}
            isRemoved={removedEvents.has(evt)}
            colorKey={group.colorKey}
            colors={colors}
            onUpdateRoster={onUpdateRoster}
            onCreateAssignment={onCreateAssignment}
            onRemoveEvent={onRemoveEvent}
            conflictBlock={group.label}
          />
        ))}
      </div>
    </div>
  );
}
