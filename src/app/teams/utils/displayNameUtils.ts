import type { Member } from "../types";

/**
 * Safely get display name from a member object
 * Falls back to email local part, username, or "Unknown User"
 */
export function getDisplayName(member: Member): string {
  if (member.name && typeof member.name === "string" && member.name.trim().length > 0) {
    return member.name;
  }
  if (member.email && typeof member.email === "string") {
    const emailLocal = member.email.split("@")[0];
    return emailLocal || "Unknown";
  }
  if (member.username && typeof member.username === "string") {
    return member.username;
  }
  return "Unknown User";
}
