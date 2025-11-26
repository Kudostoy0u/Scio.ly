import type {
  getAllTeamMembersForDashboard,
  getRosterDataForSubteam,
  getTeamMembersForGroup,
  getUsersWithoutSubteam,
} from "./data-access";

export function mapUsersToMembers(
  usersWithoutSubteam: Awaited<ReturnType<typeof getUsersWithoutSubteam>>
) {
  return usersWithoutSubteam.map((user) => {
    const displayName =
      user.displayName ||
      (user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.lastName || user.username || `User ${user.id.substring(0, 8)}`);

    return {
      userId: user.id,
      role: "member",
      joinedAt: null,
      subteamId: null,
      subteamName: null,
      email: user.email || null,
      displayName: displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    };
  });
}

export function processRosterData(
  rosterData: Awaited<ReturnType<typeof getRosterDataForSubteam>>
): Record<string, string[]> {
  const processedRoster: Record<string, string[]> = {};
  for (const entry of rosterData) {
    if (!entry.eventName || entry.slotIndex === undefined) {
      continue;
    }
    const eventName = entry.eventName;
    if (!processedRoster[eventName]) {
      processedRoster[eventName] = [];
    }
    const rosterArray = processedRoster[eventName];
    if (rosterArray) {
      while (rosterArray.length <= entry.slotIndex) {
        rosterArray.push("");
      }
      rosterArray[entry.slotIndex] = entry.studentName || "";
    }
  }
  return processedRoster;
}

export function processRosterDataForDisplay(
  rosterData: Awaited<ReturnType<typeof getRosterDataForSubteam>>
): Record<string, string[]> {
  const processedRoster: Record<string, string[]> = {};
  for (const entry of rosterData) {
    if (!entry.eventName || entry.slotIndex === undefined) {
      continue;
    }
    const displayEventName = entry.eventName.replace(/and/g, "&");
    if (!processedRoster[displayEventName]) {
      processedRoster[displayEventName] = [];
    }
    while (processedRoster[displayEventName].length <= entry.slotIndex) {
      processedRoster[displayEventName].push("");
    }
    processedRoster[displayEventName][entry.slotIndex] = entry.studentName || "";
  }
  return processedRoster;
}

export function processMembersData(
  allMembers: Awaited<ReturnType<typeof getAllTeamMembersForDashboard>>
) {
  return allMembers.map((member) => ({
    userId: member.userId,
    displayFirstName:
      member.displayName || `${member.firstName || ""} ${member.lastName || ""}`.trim(),
    role: member.role,
    subteamId: member.subteamId,
    isLinked: true,
  }));
}

export function processMembersDataWithSubteam(
  allMembers: Awaited<ReturnType<typeof getAllTeamMembersForDashboard>>
) {
  return allMembers.map((member) => ({
    userId: member.userId,
    displayFirstName:
      member.displayName || `${member.firstName || ""} ${member.lastName || ""}`.trim(),
    email: member.email,
    role: member.role,
    subteamId: member.subteamId,
    subteamName: member.subteamName,
    joinedAt: member.joinedAt,
    isLinked: true,
  }));
}

export function buildMemberEventsLookup(
  rosterData: Array<{
    userId: string | null;
    eventName: string | null;
  }>
): Record<string, string[]> {
  const memberEvents: Record<string, string[]> = {};
  for (const rd of rosterData) {
    if (rd.userId && rd.eventName) {
      const userId = rd.userId;
      const eventName = rd.eventName;
      if (!memberEvents[userId]) {
        memberEvents[userId] = [];
      }
      if (!memberEvents[userId]?.includes(eventName)) {
        memberEvents[userId]?.push(eventName);
      }
    }
  }
  return memberEvents;
}

export function findMatchingTeamMember(
  teamMembers: Awaited<ReturnType<typeof getTeamMembersForGroup>>,
  studentName: string
): string | null {
  const studentNameLower = studentName.toLowerCase().trim();
  for (const member of teamMembers) {
    const displayName =
      member.displayName ||
      (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : "");

    if (displayName) {
      const memberNameLower = displayName.toLowerCase().trim();
      if (memberNameLower === studentNameLower) {
        return member.userId;
      }
    }
  }
  return null;
}

export function normalizeEventName(eventName: string): string {
  return eventName.replace(/&/g, "and");
}
