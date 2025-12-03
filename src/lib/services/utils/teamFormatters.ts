import type { TeamWithDetails } from "../cockroachdb-teams";
import type { FormattedMember } from "./memberFormatters";

interface TeamData {
	id: string;
	teamId: string;
	description?: string | null;
	captainCode: string;
	userCode: string;
	school: string;
	division: string;
	slug: string;
}

interface MembershipData {
	role: string;
}

export function formatTeamWithDetails(
	team: TeamData,
	membership: MembershipData,
	members: FormattedMember[],
): TeamWithDetails {
	return {
		id: team.id,
		name: team.description || `Team ${team.teamId}`,
		slug: team.slug,
		school: team.school,
		division: team.division,
		description: team.description || undefined,
		captain_code: team.captainCode,
		user_code: team.userCode,
		user_role: membership.role,
		members: members.map((m) => ({
			...m,
			joined_at: m.joined_at || "",
		})),
	};
}
