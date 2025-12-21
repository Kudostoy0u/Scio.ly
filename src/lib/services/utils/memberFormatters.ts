import type { TeamMembership } from "../teams";
import type { UserProfile } from "./userProfileUtils";

export interface FormattedMember {
	id: string;
	name: string;
	email: string;
	role: string;
	joined_at?: string;
}

export function formatMember(
	membership: TeamMembership,
	userProfile: UserProfile | null,
): FormattedMember {
	const name =
		userProfile?.display_name || `User ${membership.user_id.substring(0, 8)}`;
	const email =
		userProfile?.email ||
		`user-${membership.user_id.substring(0, 8)}@example.com`;

	return {
		id: membership.user_id,
		name,
		email,
		role: membership.role,
		joined_at: membership.joined_at,
	};
}
