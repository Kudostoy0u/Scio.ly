"use client";
import { getEventMaxSlots, shouldShowAssignOption } from "./rosterUtils";

interface EventInputProps {
  darkMode: boolean;
  eventName: string;
  roster: Record<string, string[]>;
  isCaptain: boolean;
  isRemoved: boolean;
  colorKey: string;
  colors: {
    bg: string;
    border: string;
    text: string;
  };
  onUpdateRoster: (eventName: string, index: number, value: string) => void;
  onCreateAssignment: (eventName: string) => void;
  onRemoveEvent: (eventName: string, conflictBlock: string) => void;
  conflictBlock: string;
}

export default function EventInput({
  darkMode,
  eventName,
  roster,
  isCaptain,
  isRemoved,
  colorKey,
  colors,
  onUpdateRoster,
  onCreateAssignment,
  onRemoveEvent,
  conflictBlock,
}: EventInputProps) {
  const max = getEventMaxSlots(eventName);
  const base = roster[eventName] || [];
  const slots = [...base, ...new Array(Math.max(0, max - base.length)).fill("")].slice(0, max);

  // Removed verbose logging - not needed for business logic

  const shouldShowAssign = shouldShowAssignOption(isCaptain, colorKey, eventName, isRemoved);

  return (
    <div className="space-y-2">
      <div className={`text-sm font-medium ${colors.text} flex items-center gap-2`}>
        <span className={isRemoved ? "line-through opacity-50" : ""}>{eventName}</span>
        {shouldShowAssign && (
          <span
            onClick={() => onCreateAssignment(eventName)}
            className="text-blue-400 hover:text-blue-500 text-xs cursor-pointer"
          >
            Assign?
          </span>
        )}
        {isCaptain && !isRemoved && (
          <span
            onClick={() => onRemoveEvent(eventName, conflictBlock)}
            className="text-red-400 hover:text-red-500 text-xs cursor-pointer"
          >
            Remove?
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[...new Array(max)].map((_, i) => (
          <input
            key={i}
            value={isRemoved ? "" : slots[i] || ""}
            onChange={(e) => {
              if (isRemoved) {
                return;
              }
              onUpdateRoster(eventName, i, e.target.value);
            }}
            disabled={!isCaptain || isRemoved}
            placeholder="Name"
            className={`w-full rounded px-2 py-1 text-sm ${
              isRemoved
                ? darkMode
                  ? "bg-gray-800 text-gray-500 border border-gray-600 cursor-not-allowed opacity-50"
                  : "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed opacity-50"
                : isCaptain
                  ? (
                      darkMode
                        ? "bg-gray-900 text-white border border-gray-700"
                        : "bg-white text-gray-900 border border-gray-300"
                    )
                  : (
                      darkMode
                        ? "bg-gray-800 text-gray-500 border border-gray-600 cursor-not-allowed"
                        : "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
                    )
            }`}
          />
        ))}
      </div>
    </div>
  );
}
