import { generateDisplayName, needsNamePrompt } from "@/lib/utils/displayNameUtils";
import { DIVISION_B_GROUPS, DIVISION_C_GROUPS } from "../../constants/divisionGroups";
import type { Member } from "../../types";
import { getDisplayName } from "../../utils/displayNameUtils";

/**
 * Raw member data from API response
 */
interface RawMemberData {
  id: string | null;
  name: string | null;
  email?: string | null;
  username?: string | null;
  role: string;
  joinedAt?: string | null;
  subteamId?: string | null;
  subteam?: {
    id?: string;
    name?: string;
    description?: string;
  };
  events?: string[];
  isPendingInvitation?: boolean;
  isUnlinked?: boolean;
}

/**
 * Processed member data with enrichments
 */
export interface ProcessedMember extends Member {
  hasPendingLinkInvite: boolean;
  conflicts: Array<{
    events: string[];
    conflictBlock: string;
    conflictBlockNumber: number;
  }>;
}

/**
 * Detects event conflicts for team members based on division conflict blocks
 *
 * @param members - Array of team members to check for conflicts
 * @param division - Team division ("B" or "C")
 * @returns Record of member names to their conflict data
 */
function detectMemberConflicts(
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

/**
 * Processes raw member data from the API and enriches it with:
 * - Generated display names for weak/missing names
 * - Conflict detection based on division conflict blocks
 * - Pending link invite status
 * - Sorting by role (captains first) then alphabetically
 *
 * @param members - Raw member data from API
 * @param currentUserId - The logged-in user's ID
 * @param division - Team division ("B" or "C")
 * @param selectedSubteam - Currently selected subteam filter (not used for filtering in this function)
 * @param pendingLinkInvites - Record of member names that have pending link invites
 * @returns Processed and sorted member data
 */
export function processMembersData(
  members: RawMemberData[] | null | undefined,
  _currentUserId: string | null | undefined,
  division: "B" | "C",
  _selectedSubteam: string,
  pendingLinkInvites: Record<string, boolean>
): ProcessedMember[] {
  if (!members) {
    return [];
  }

  if (members.length === 0) {
    return [];
  }

  // Transform raw API data to Member objects
  const processedMembers: Member[] = members.map((person) => ({
    id: person.id,
    name: person.name,
    email: person.email || null,
    username: person.username || null,
    role: person.role,
    joinedAt: person.joinedAt || null,
    subteam: {
      id: person.subteamId || "",
      name: person.subteam?.name || "Unknown",
      description: person.subteam?.description || "",
    },
    subteams: [],
    subteamId: person.subteamId || "",
    events: person.events || [],
    eventCount: person.events?.length || 0,
    avatar: undefined,
    isOnline: false,
    hasPendingInvite: person.isPendingInvitation,
    hasPendingLinkInvite: false,
    isPendingInvitation: person.isPendingInvitation,
    invitationCode: undefined,
    isUnlinked: person.isUnlinked,
    conflicts: [],
  }));

  // Detect conflicts based on member events
  const conflicts = detectMemberConflicts(processedMembers, division);

  // Enrich members with name generation, conflict data, and pending link invite status
  const enrichedMembers: ProcessedMember[] = processedMembers.map((member) => {
    let name = member.name;

    // Handle null/undefined names safely
    if (!name || typeof name !== "string") {
      name = null;
    }

    // If the name is weak ('@unknown'), derive a better display using same logic as NamePromptModal
    if (needsNamePrompt(name)) {
      const emailLocal =
        member.email && typeof member.email === "string" && member.email.includes("@")
          ? member.email.split("@")[0]
          : "";
      const { name: robust } = generateDisplayName({
        displayName: null,
        firstName: null,
        lastName: null,
        username:
          member.username && typeof member.username === "string" && member.username.trim()
            ? member.username.trim()
            : emailLocal && emailLocal.length > 2
              ? emailLocal
              : null,
        email: member.email,
      });
      if (robust?.trim()) {
        name = robust.trim();
      }
    }

    // If server hasn't reflected link-pending yet, honor our optimistic state
    const hasPendingLinkInvite =
      member.hasPendingLinkInvite || pendingLinkInvites[getDisplayName(member)] === true;

    return {
      ...member,
      name,
      hasPendingLinkInvite,
      conflicts: conflicts[getDisplayName(member)] || [],
    };
  });

  // Sort: captains first, then alphabetical
  enrichedMembers.sort((a, b) => {
    if (a.role === "captain" && b.role !== "captain") {
      return -1;
    }
    if (b.role === "captain" && a.role !== "captain") {
      return 1;
    }
    return getDisplayName(a).localeCompare(getDisplayName(b));
  });

  return enrichedMembers;
}
