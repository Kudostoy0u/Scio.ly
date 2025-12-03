/**
 * Optimistic Update Actions for Team Store
 */

import type { TeamStoreActions, TeamStoreState } from "../types";

type StoreSlice = TeamStoreState & TeamStoreActions;

export const createOptimisticActions = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
): Partial<TeamStoreActions> => {
	const getCacheKey = (type: string, ...params: string[]) =>
		`${type}-${params.join("-")}`;

	const addRosterEntry = (
		teamSlug: string,
		subteamId: string,
		eventName: string,
		slotIndex: number,
		studentName: string,
	) => {
		const key = getCacheKey("roster", teamSlug, subteamId);
		const currentRoster = get().roster[key];

		if (currentRoster) {
			const updatedRoster = { ...currentRoster };
			if (!updatedRoster.roster[eventName]) {
				updatedRoster.roster[eventName] = [];
			}
			updatedRoster.roster[eventName][slotIndex] = studentName;

			set((state) => ({
				roster: { ...state.roster, [key]: updatedRoster },
			}));
		}
	};

	const removeRosterEntry = (
		teamSlug: string,
		subteamId: string,
		eventName: string,
		slotIndex: number,
	) => {
		const key = getCacheKey("roster", teamSlug, subteamId);
		const currentRoster = get().roster[key];

		if (currentRoster?.roster[eventName]) {
			const updatedRoster = { ...currentRoster };
			const eventArray = updatedRoster.roster[eventName];
			if (eventArray) {
				const updatedEvent = [...eventArray];
				updatedEvent[slotIndex] = "";
				updatedRoster.roster[eventName] = updatedEvent;
			}

			set((state) => ({
				roster: { ...state.roster, [key]: updatedRoster },
			}));
		}
	};

	const addMemberEvent = (
		teamSlug: string,
		subteamId: string,
		memberId: string | null,
		memberName: string,
		eventName: string,
	) => {
		const key = getCacheKey("members", teamSlug, subteamId || "all");
		const currentMembers = get().members[key];

		if (currentMembers) {
			const updatedMembers = currentMembers.map((member) => {
				const isMatch = memberId
					? member.id === memberId
					: member.name === memberName;

				if (isMatch) {
					return {
						...member,
						events: [...(member.events || []), eventName],
					};
				}
				return member;
			});

			set((state) => ({
				members: { ...state.members, [key]: updatedMembers },
			}));
		}
	};

	const removeMemberEvent = (
		teamSlug: string,
		subteamId: string,
		memberId: string | null,
		memberName: string,
		eventName: string,
	) => {
		const key = getCacheKey("members", teamSlug, subteamId || "all");
		const currentMembers = get().members[key];

		if (currentMembers) {
			const updatedMembers = currentMembers.map((member) => {
				const isMatch = memberId
					? member.id === memberId
					: member.name === memberName;

				if (isMatch) {
					return {
						...member,
						events: (member.events || []).filter(
							(event) => event !== eventName,
						),
					};
				}
				return member;
			});

			set((state) => ({
				members: { ...state.members, [key]: updatedMembers },
			}));
		}
	};

	return {
		addRosterEntry,
		removeRosterEntry,
		addMemberEvent,
		removeMemberEvent,
	};
};
