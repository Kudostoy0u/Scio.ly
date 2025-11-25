/**
 * Team data structure for division groups
 * Represents a team with its basic information and roster
 */
type Team = {
  /** Unique team identifier */
  id: string;
  /** Team display name */
  name: string;
  /** Team roster organized by events */
  roster: Record<string, string[]>;
};

/**
 * Group definition structure
 * Defines a group with its events and color scheme
 */
type GroupDef = {
  /** Display label for the group */
  label: string;
  /** Array of Science Olympiad events in this group */
  events: string[];
  /** Color key for theming */
  colorKey: string;
};

/**
 * Division B event groups configuration
 * Defines the grouping of Science Olympiad events for Division B
 */
export const DIVISION_B_GROUPS: { label: string; events: string[]; colorKey: string }[] = [
  {
    label: "Conflict Block 1",
    events: ["Codebusters", "Disease Detectives", "Remote Sensing"],
    colorKey: "blue",
  },
  {
    label: "Conflict Block 2",
    events: ["Entomology", "Experimental Design", "Solar System"],
    colorKey: "green",
  },
  {
    label: "Conflict Block 3",
    events: ["Machines", "Meteorology", "Metric Mastery"],
    colorKey: "yellow",
  },
  {
    label: "Conflict Block 4",
    events: ["Circuit Lab", "Dynamic Planet", "Water Quality"],
    colorKey: "purple",
  },
  {
    label: "Conflict Block 5",
    events: ["Heredity", "Potions & Poisons", "Rocks and Minerals"],
    colorKey: "pink",
  },
  {
    label: "Conflict Block 6",
    events: ["Anatomy & Physiology", "Crime Busters", "Write It Do It"],
    colorKey: "indigo",
  },
  {
    label: "Conflict Block 7",
    events: ["Boomilever", "Helicopter", "Hovercraft", "Mission Possible", "Scrambler"],
    colorKey: "orange",
  },
];

/**
 * Division C event groups configuration
 * Defines the grouping of Science Olympiad events for Division C
 */
export const DIVISION_C_GROUPS: { label: string; events: string[]; colorKey: string }[] = [
  {
    label: "Conflict Block 1",
    events: ["Anatomy & Physiology", "Engineering CAD", "Forensics"],
    colorKey: "blue",
  },
  {
    label: "Conflict Block 2",
    events: ["Codebusters", "Disease Detectives", "Remote Sensing"],
    colorKey: "green",
  },
  {
    label: "Conflict Block 3",
    events: ["Astronomy", "Entomology", "Experimental Design"],
    colorKey: "yellow",
  },
  { label: "Conflict Block 4", events: ["Chemistry Lab", "Machines"], colorKey: "purple" },
  {
    label: "Conflict Block 5",
    events: ["Circuit Lab", "Dynamic Planet", "Water Quality"],
    colorKey: "pink",
  },
  {
    label: "Conflict Block 6",
    events: ["Designer Genes", "Materials Science", "Rocks and Minerals"],
    colorKey: "indigo",
  },
  {
    label: "Conflict Block 7",
    events: [
      "Boomilever",
      "Bungee Drop",
      "Electric Vehicle",
      "Helicopter",
      "Hovercraft",
      "Robot Tour",
    ],
    colorKey: "orange",
  },
];

/**
 * Get color classes for a group based on color key and theme
 * Returns Tailwind CSS classes for background, border, and text colors
 *
 * @param {boolean} darkMode - Whether dark mode is enabled
 * @param {string} colorKey - Color key identifier (blue, green, yellow, etc.)
 * @returns {Object} Object containing CSS class names for styling
 * @returns {string} bg - Background color class
 * @returns {string} border - Border color class
 * @returns {string} text - Text color class
 * @example
 * ```typescript
 * const colors = getGroupColors(true, 'blue');
 * console.log(colors.bg); // 'bg-blue-950/30'
 * ```
 */
export function getGroupColors(darkMode: boolean, colorKey: string) {
  const colorMap = {
    blue: {
      bg: darkMode ? "bg-blue-950/30" : "bg-blue-50/80",
      border: darkMode ? "border-blue-500/60" : "border-blue-400/80",
      text: darkMode ? "text-blue-100" : "text-blue-900",
    },
    green: {
      bg: darkMode ? "bg-green-950/30" : "bg-green-50/80",
      border: darkMode ? "border-green-500/60" : "border-green-400/80",
      text: darkMode ? "text-green-100" : "text-green-900",
    },
    yellow: {
      bg: darkMode ? "bg-yellow-950/30" : "bg-yellow-50/80",
      border: darkMode ? "border-yellow-500/60" : "border-yellow-400/80",
      text: darkMode ? "text-yellow-100" : "text-yellow-900",
    },
    purple: {
      bg: darkMode ? "bg-purple-950/30" : "bg-purple-50/80",
      border: darkMode ? "border-purple-500/60" : "border-purple-400/80",
      text: darkMode ? "text-purple-100" : "text-purple-900",
    },
    pink: {
      bg: darkMode ? "bg-pink-950/30" : "bg-pink-50/80",
      border: darkMode ? "border-pink-500/60" : "border-pink-400/80",
      text: darkMode ? "text-pink-100" : "text-pink-900",
    },
    indigo: {
      bg: darkMode ? "bg-indigo-950/30" : "bg-indigo-50/80",
      border: darkMode ? "border-indigo-500/60" : "border-indigo-400/80",
      text: darkMode ? "text-indigo-100" : "text-indigo-900",
    },
    orange: {
      bg: darkMode ? "bg-orange-950/30" : "bg-orange-50/80",
      border: darkMode ? "border-orange-500/60" : "border-orange-400/80",
      text: darkMode ? "text-orange-100" : "text-orange-900",
    },
  } as const;
  return colorMap[colorKey as keyof typeof colorMap] || colorMap.blue;
}

export default function DivisionGroupsGrid({
  darkMode,
  division,
  teams,
  activeTeamIdx,
  isLeader,
  setName,
  getGroupColors,
  groups,
}: {
  darkMode: boolean;
  division: "B" | "C";
  teams: Team[];
  activeTeamIdx: number;
  isLeader: boolean;
  setName: (division: "B" | "C", eventName: string, idx: number, value: string) => void;
  getGroupColors: (colorKey: string) => { bg: string; border: string; text: string };
  groups: GroupDef[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {groups.map((group, index) => {
        const colors = getGroupColors(group.colorKey);
        const isLastGroup = index === groups.length - 1;
        if (isLastGroup) {
          return (
            <div
              key={group.label}
              className={`rounded-lg border-2 p-4 lg:col-span-2 ${colors.bg} ${colors.border}`}
            >
              <h3 className={`text-lg font-semibold mb-4 ${colors.text}`}>{group.label}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {group.events.slice(0, Math.ceil(group.events.length / 2)).map((evt) => {
                    const max =
                      evt.toLowerCase().includes("codebusters") ||
                      evt.toLowerCase().includes("experimental design")
                        ? 3
                        : 2;
                    const team = teams[activeTeamIdx] || teams[0];
                    const base = team?.roster[evt] || [];
                    const slots = [
                      ...base,
                      ...new Array(Math.max(0, max - base.length)).fill(""),
                    ].slice(0, max);
                    return (
                      <div key={evt} className="space-y-2">
                        <div
                          className={`text-sm font-medium ${colors.text} flex items-center justify-between`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{evt}</span>
                          </div>
                          <span
                            className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                          >
                            {slots.filter((n) => (n || "").trim()).length}/{max}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[...new Array(max)].map((_, i) => (
                            <input
                              // biome-ignore lint/suspicious/noArrayIndexKey: Array is dynamically created, index is appropriate for key
                              key={`slot-${division}-${evt}-${i}`}
                              value={slots[i] || ""}
                              onChange={(e) => setName(division, evt, i, e.target.value)}
                              disabled={!isLeader}
                              placeholder="Name"
                              className={`w-full rounded px-2 py-1 text-sm ${
                                isLeader
                                  ? darkMode
                                    ? "bg-gray-900 text-white border border-gray-700"
                                    : "bg-white text-gray-900 border border-gray-300"
                                  : darkMode
                                    ? "bg-gray-800 text-gray-500 border border-gray-600 cursor-not-allowed"
                                    : "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  {group.events.slice(Math.ceil(group.events.length / 2)).map((evt) => {
                    const max =
                      evt.toLowerCase().includes("codebusters") ||
                      evt.toLowerCase().includes("experimental design")
                        ? 3
                        : 2;
                    const team = teams[activeTeamIdx] || teams[0];
                    const base = team?.roster[evt] || [];
                    const slots = [
                      ...base,
                      ...new Array(Math.max(0, max - base.length)).fill(""),
                    ].slice(0, max);
                    return (
                      <div key={evt} className="space-y-2">
                        <div
                          className={`text-sm font-medium ${colors.text} flex items-center justify-between`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{evt}</span>
                          </div>
                          <span
                            className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                          >
                            {slots.filter((n) => (n || "").trim()).length}/{max}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[...new Array(max)].map((_, i) => (
                            <input
                              // biome-ignore lint/suspicious/noArrayIndexKey: Array is dynamically created, index is appropriate for key
                              key={`slot-${division}-${evt}-${i}`}
                              value={slots[i] || ""}
                              onChange={(e) => setName(division, evt, i, e.target.value)}
                              disabled={!isLeader}
                              placeholder="Name"
                              className={`w-full rounded px-2 py-1 text-sm ${
                                isLeader
                                  ? darkMode
                                    ? "bg-gray-900 text-white border border-gray-700"
                                    : "bg-white text-gray-900 border border-gray-300"
                                  : darkMode
                                    ? "bg-gray-800 text-gray-500 border border-gray-600 cursor-not-allowed"
                                    : "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
                              }`}
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
        }
        return (
          <div
            key={group.label}
            className={`rounded-lg border-2 p-4 ${colors.bg} ${colors.border}`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${colors.text}`}>{group.label}</h3>
            <div className="space-y-3">
              {group.events.map((evt) => {
                const max =
                  evt.toLowerCase().includes("codebusters") ||
                  evt.toLowerCase().includes("experimental design")
                    ? 3
                    : 2;
                const team = teams[activeTeamIdx] || teams[0];
                const base = team?.roster[evt] || [];
                const slots = [
                  ...base,
                  ...new Array(Math.max(0, max - base.length)).fill(""),
                ].slice(0, max);
                return (
                  <div key={evt} className="space-y-2">
                    <div
                      className={`text-sm font-medium ${colors.text} flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{evt}</span>
                      </div>
                      <span className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        {slots.filter((n) => (n || "").trim()).length}/{max}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[...new Array(max)].map((_, i) => (
                        <input
                          // biome-ignore lint/suspicious/noArrayIndexKey: Array is dynamically created, index is appropriate for key
                          key={`slot-${division}-${evt}-${i}`}
                          value={slots[i] || ""}
                          onChange={(e) => setName(division, evt, i, e.target.value)}
                          disabled={!isLeader}
                          placeholder="Name"
                          className={`w-full rounded px-2 py-1 text-sm ${darkMode ? "bg-gray-900 text-white border border-gray-700" : "bg-white text-gray-900 border border-gray-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
