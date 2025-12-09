import type {
	TeamFullData,
	TeamMember as V2TeamMember,
} from "@/lib/server/teams-v2";
import type { TeamMember, TeamStoreActions, TeamStoreState } from "../../types";
import { CACHE_DURATIONS } from "../../types";
import { fetchWithDeduplication, handleApiError } from "../../utils";
import { getCacheKey, isDataFresh, loadFullTeam } from "./utils";

type StoreSlice = TeamStoreState & TeamStoreActions;

export const createFetchMembersAction = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
) => {
	return async (teamSlug: string, subteamId = "all"): Promise<TeamMember[]> => {
		const key = getCacheKey("members", teamSlug, subteamId);

		if (
			isDataFresh(get().cacheTimestamps[key], CACHE_DURATIONS.members) &&
			get().members[key]
		) {
			return get().members[key] || [];
		}

		set((state) => ({
			loading: {
				...state.loading,
				members: { ...state.loading.members, [key]: true },
			},
			errors: {
				...state.errors,
				members: { ...state.errors.members, [key]: null },
			},
		}));

		try {
			const members = (await fetchWithDeduplication(key, async () => {
				const full = (await loadFullTeam(teamSlug)) as TeamFullData;
				const filtered =
					subteamId && subteamId !== "all"
						? full.members.filter((m) => m.subteamId === subteamId)
						: full.members;
				return filtered.map(
					(member: V2TeamMember): TeamMember => ({
						id: member.id,
						name: member.name,
						email: member.email,
						role: member.role,
						events: member.events,
						isPendingInvitation: member.isPendingInvitation,
						subteamId: member.subteamId ?? undefined,
						isUnlinked: member.isUnlinked,
						username: member.username,
						subteam: member.subteam
							? {
									id: member.subteam.id,
									name: member.subteam.name || "",
									description: member.subteam.description || "",
								}
							: undefined,
						joinedAt: member.joinedAt,
						isCreator: member.role === "captain",
					}),
				);
			})) as TeamMember[];

			set((state) => ({
				members: { ...state.members, [key]: members },
				loading: {
					...state.loading,
					members: { ...state.loading.members, [key]: false },
				},
				cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
			}));

			return members;
		} catch (error) {
			const errorMessage = handleApiError(error, "fetchMembers");
			set((state) => ({
				loading: {
					...state.loading,
					members: { ...state.loading.members, [key]: false },
				},
				errors: {
					...state.errors,
					members: { ...state.errors.members, [key]: errorMessage },
				},
			}));
			throw error;
		}
	};
};
