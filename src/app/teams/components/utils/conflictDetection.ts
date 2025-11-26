import { DIVISION_B_GROUPS, DIVISION_C_GROUPS } from "../../constants/divisionGroups";
import type { Member } from "../../types";
import { getDisplayName } from "../../utils/displayNameUtils";

/**
 * Detects event conflicts for team members based on division conflict blocks.
 * A conflict occurs when a member is assigned to multiple events within the same conflict block.
 *
 * @param members - Array of team members to check for conflicts
 * @param division - The division ("B" or "C") to determine which conflict blocks to use
 * @returns Record mapping member names to their conflicts, with each conflict containing
 *          the conflicting events, conflict block label, and a unique conflict block number
 */
export function detectMemberConflicts(
  members: Member[],
  division: "B" | "C"
): Record<
  string,
  Array<{
    events: string[];
    conflictBlock: string;
    conflictBlockNumber: number;
  }>
> {
  const conflicts: Record<
    string,
    Array<{
      events: string[];
      conflictBlock: string;
      conflictBlockNumber: number;
    }>
  > = {};

  const groups = division === "B" ? DIVISION_B_GROUPS : DIVISION_C_GROUPS;
  const conflictBlocks: Record<string, number> = {};
  let nextConflictBlock = 1;

  // Check each member for conflicts
  for (const member of members) {
    if (!member.events || member.events.length === 0) {
      continue;
    }

    // Check each conflict block for conflicts
    for (const group of groups) {
      const groupEvents = group.events;
      const memberEventsInBlock = member.events.filter((event) => groupEvents.includes(event));

      // If member has multiple events in the same conflict block, it's a conflict
      if (memberEventsInBlock.length > 1) {
        const memberName = getDisplayName(member);
        const conflictKey = `${memberName}-${group.label}`;
        if (!conflictBlocks[conflictKey]) {
          conflictBlocks[conflictKey] = nextConflictBlock++;
        }

        if (!conflicts[memberName]) {
          conflicts[memberName] = [];
        }

        conflicts[memberName].push({
          events: memberEventsInBlock,
          conflictBlock: group.label,
          conflictBlockNumber: conflictBlocks[conflictKey],
        });
      }
    }
  }

  return conflicts;
}
