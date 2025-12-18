import type { TeamMember } from "@/lib/stores/teams/types";
import {
	generateDisplayName,
	needsNamePrompt,
} from "@/lib/utils/content/displayNameUtils";
import type { Member } from "../../types";
import { getDisplayName } from "../../utils/displayNameUtils";
import { detectMemberConflicts } from "./conflictDetection";

export function processMembers(
	membersData: TeamMember[] | undefined,
	pendingLinkInvites: Record<string, boolean>,
	division?: "B" | "C",
): Member[] {
	if (!membersData || membersData.length === 0) {
		return [];
	}

	const processedMembers = membersData.map((person) => ({
		id: person.id || "",
		name: person.name,
		email: person.email || null,
		username: person.username || null,
		role: person.role,
		joinedAt: person.joinedAt || null,
		subteam: person.subteamId
			? {
					id: person.subteamId,
					name: person.subteam?.name || "Unknown",
					description: person.subteam?.description || "",
				}
			: undefined,
		subteams: [],
		subteamId: person.subteamId || undefined,
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
	const conflicts = division
		? detectMemberConflicts(processedMembers, division)
		: {};

	const filtered = processedMembers.map((member) => {
		let name = member.name;
		// Handle null/undefined names safely
		if (!name || typeof name !== "string") {
			name = null;
		}
		// If the name is weak ('@unknown'), derive a better display using same logic as NamePromptModal
		if (needsNamePrompt(name)) {
			const emailLocal =
				member.email &&
				typeof member.email === "string" &&
				(member.email as string).includes("@")
					? (member.email as string).split("@")[0]
					: "";
			const { name: robust } = generateDisplayName(
				{
					displayName: null,
					firstName: null,
					lastName: null,
					username:
						member.username &&
						typeof member.username === "string" &&
						(member.username as string).trim()
							? (member.username as string).trim()
							: emailLocal && emailLocal.length > 2
								? emailLocal
								: null,
					email: member.email,
				},
				member.id || "",
			);
			if (robust?.trim()) {
				name = robust.trim();
			}
		}

		// If server hasn't reflected link-pending yet, honor our optimistic state
		const hasPendingLinkInvite =
			member.hasPendingLinkInvite ||
			pendingLinkInvites[getDisplayName(member)] === true;

		return {
			...member,
			name,
			hasPendingLinkInvite,
			conflicts: conflicts[getDisplayName(member)] || [],
		};
	});

	// Sort: captains first, then alphabetical
	filtered.sort((a, b) => {
		if (a.role === "captain" && b.role !== "captain") {
			return -1;
		}
		if (b.role === "captain" && a.role !== "captain") {
			return 1;
		}
		return getDisplayName(a).localeCompare(getDisplayName(b));
	});

	return filtered;
}
