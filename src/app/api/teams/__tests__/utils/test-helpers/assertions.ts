import { mockDb } from "./mockDb";

export function assertUserIsMember(
	userId: string,
	teamId: string,
	expectedRole?: "captain" | "member",
): void {
	const membership = mockDb.memberships.get(`${userId}:${teamId}`);
	if (!membership || membership.status !== "active") {
		throw new Error(`User ${userId} is not a member of team ${teamId}`);
	}

	if (expectedRole && membership.role !== expectedRole) {
		throw new Error(
			`User ${userId} has role ${membership.role}, expected ${expectedRole}`,
		);
	}
}

export function assertUserIsNotMember(userId: string, teamId: string): void {
	const membership = mockDb.memberships.get(`${userId}:${teamId}`);
	if (membership) {
		throw new Error(
			`User ${userId} is unexpectedly a member of team ${teamId}`,
		);
	}
}
