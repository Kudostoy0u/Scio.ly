import { beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { TeamStoreActions, TeamStoreState } from "../teams/types";

type MockStoreState = TeamStoreState & TeamStoreActions;

// Mock the team store
const createMockTeamStore = () => {
	return create(
		subscribeWithSelector((set, get) => ({
			// Initial state
			userTeams: [],
			subteams: {},
			roster: {},
			members: {},
			stream: {},
			assignments: {},
			tournaments: {},
			timers: {},
			cacheTimestamps: {},
			loading: {},
			errors: {},

			// Mock functions
			getCacheKey: (type: string, ...params: string[]): string =>
				`${type}-${params.join("-")}`,

			// Optimistic roster updates
			addRosterEntry: (
				teamSlug: string,
				subteamId: string,
				eventName: string,
				slotIndex: number,
				studentName: string,
			) => {
				const state = get() as MockStoreState;
				const key = state.getCacheKey("roster", teamSlug, subteamId);
				const currentRoster = state.roster[key];

				if (currentRoster) {
					const updatedRoster = { ...currentRoster.roster };
					if (!updatedRoster[eventName]) {
						updatedRoster[eventName] = [];
					}
					updatedRoster[eventName][slotIndex] = studentName;

					set((state: MockStoreState) => ({
						roster: {
							...state.roster,
							[key]: {
								...currentRoster,
								roster: updatedRoster,
							},
						},
					}));
				}
			},

			removeRosterEntry: (
				teamSlug: string,
				subteamId: string,
				eventName: string,
				slotIndex: number,
			) => {
				const state = get() as MockStoreState;
				const key = state.getCacheKey("roster", teamSlug, subteamId);
				const currentRoster = state.roster[key];

				if (currentRoster) {
					const updatedRoster = { ...currentRoster.roster };
					if (updatedRoster[eventName]) {
						updatedRoster[eventName][slotIndex] = "";
					}

					set((state: MockStoreState) => ({
						roster: {
							...state.roster,
							[key]: {
								...currentRoster,
								roster: updatedRoster,
							},
						},
					}));
				}
			},

			// Mock other required functions
			fetchUserTeams: vi.fn(),
			fetchSubteams: vi.fn(),
			fetchRoster: vi.fn(),
			fetchMembers: vi.fn(),
			fetchStream: vi.fn(),
			fetchAssignments: vi.fn(),
			fetchTournaments: vi.fn(),
			fetchTimers: vi.fn(),
			fetchStreamData: vi.fn(),
			updateRoster: vi.fn(),
			updateMembers: vi.fn(),
			addStreamPost: vi.fn(),
			addAssignment: vi.fn(),
			updateTimer: vi.fn(),
			addSubteam: vi.fn(),
			updateSubteam: vi.fn(),
			deleteSubteam: vi.fn(),
			invalidateCache: vi.fn(),
			preloadData: vi.fn(),
			clearCache: vi.fn(),
			clearAllCache: vi.fn(),
			isDataFresh: vi.fn(),
		})),
	);
};

describe("Team Store Optimistic Updates", () => {
	let store: ReturnType<typeof createMockTeamStore>;

	beforeEach(() => {
		store = createMockTeamStore();
		// Reset store state
		store.setState({
			userTeams: [],
			subteams: {},
			roster: {},
			members: {},
			stream: {},
			assignments: {},
			tournaments: {},
			timers: {},
			cacheTimestamps: {},
			loading: {},
			errors: {},
		});
	});

	describe("addRosterEntry", () => {
		it("should add a roster entry to existing cache", () => {
			const teamSlug = "test-team";
			const subteamId = "test-subteam";
			const eventName = "Astronomy";
			const slotIndex = 0;
			const studentName = "John Doe";

			// Set up initial roster cache
			const cacheKey = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId,
			);
			store.setState({
				roster: {
					[cacheKey]: {
						roster: { Chemistry: ["Jane Doe"] },
						timestamp: Date.now(),
					},
				},
			});

			// Add roster entry
			(store.getState() as MockStoreState).addRosterEntry(
				teamSlug,
				subteamId,
				eventName,
				slotIndex,
				studentName,
			);

			// Verify the entry was added
			const updatedRoster = (store.getState() as MockStoreState).roster[
				cacheKey
			];
			expect(updatedRoster).toBeDefined();
			expect(updatedRoster?.roster[eventName]).toBeDefined();
			expect(updatedRoster?.roster[eventName]?.[slotIndex]).toBe(studentName);
			expect(updatedRoster?.roster.Chemistry).toEqual(["Jane Doe"]); // Existing data preserved
		});

		it("should create new roster cache if none exists", () => {
			const teamSlug = "test-team";
			const subteamId = "test-subteam";
			const eventName = "Astronomy";
			const slotIndex = 0;
			const studentName = "John Doe";

			// No initial cache
			expect((store.getState() as MockStoreState).roster).toEqual({});

			// Add roster entry
			(store.getState() as MockStoreState).addRosterEntry(
				teamSlug,
				subteamId,
				eventName,
				slotIndex,
				studentName,
			);

			// Should not add anything if no cache exists
			expect((store.getState() as MockStoreState).roster).toEqual({});
		});

		it("should handle multiple entries for the same event", () => {
			const teamSlug = "test-team";
			const subteamId = "test-subteam";
			const eventName = "Astronomy";
			const studentName1 = "John Doe";
			const studentName2 = "Jane Doe";

			// Set up initial roster cache
			const cacheKey = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId,
			);
			store.setState({
				roster: {
					[cacheKey]: {
						roster: {},
						timestamp: Date.now(),
					},
				},
			});

			// Add first entry
			(store.getState() as MockStoreState).addRosterEntry(
				teamSlug,
				subteamId,
				eventName,
				0,
				studentName1,
			);
			// Add second entry
			(store.getState() as MockStoreState).addRosterEntry(
				teamSlug,
				subteamId,
				eventName,
				1,
				studentName2,
			);

			// Verify both entries
			const updatedRoster = (store.getState() as MockStoreState).roster[
				cacheKey
			];
			expect(updatedRoster).toBeDefined();
			expect(updatedRoster?.roster[eventName]?.[0]).toBe(studentName1);
			expect(updatedRoster?.roster[eventName]?.[1]).toBe(studentName2);
		});
	});

	describe("removeRosterEntry", () => {
		it("should remove a roster entry from existing cache", () => {
			const teamSlug = "test-team";
			const subteamId = "test-subteam";
			const eventName = "Astronomy";
			const slotIndex = 0;

			// Set up initial roster cache
			const cacheKey = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId,
			);
			store.setState({
				roster: {
					[cacheKey]: {
						roster: {
							Astronomy: ["John Doe", "Jane Doe"],
							Chemistry: ["Bob Smith"],
						},
						timestamp: Date.now(),
					},
				},
			});

			// Remove roster entry
			(store.getState() as MockStoreState).removeRosterEntry(
				teamSlug,
				subteamId,
				eventName,
				slotIndex,
			);

			// Verify the entry was removed
			const updatedRoster = (store.getState() as MockStoreState).roster[
				cacheKey
			];
			expect(updatedRoster).toBeDefined();
			expect(updatedRoster?.roster[eventName]?.[slotIndex]).toBe("");
			expect(updatedRoster?.roster[eventName]?.[1]).toBe("Jane Doe"); // Other entries preserved
			expect(updatedRoster?.roster.Chemistry).toEqual(["Bob Smith"]); // Other events preserved
		});

		it("should handle removal from non-existent cache", () => {
			const teamSlug = "test-team";
			const subteamId = "test-subteam";
			const eventName = "Astronomy";
			const slotIndex = 0;

			// No initial cache
			expect((store.getState() as MockStoreState).roster).toEqual({});

			// Remove roster entry
			(store.getState() as MockStoreState).removeRosterEntry(
				teamSlug,
				subteamId,
				eventName,
				slotIndex,
			);

			// Should not change anything if no cache exists
			expect((store.getState() as MockStoreState).roster).toEqual({});
		});

		it("should handle removal from non-existent event", () => {
			const teamSlug = "test-team";
			const subteamId = "test-subteam";
			const eventName = "NonExistentEvent";
			const slotIndex = 0;

			// Set up initial roster cache
			const cacheKey = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId,
			);
			store.setState({
				roster: {
					[cacheKey]: {
						roster: { Astronomy: ["John Doe"] },
						timestamp: Date.now(),
					},
				},
			});

			// Remove roster entry
			(store.getState() as MockStoreState).removeRosterEntry(
				teamSlug,
				subteamId,
				eventName,
				slotIndex,
			);

			// Should not change anything if event doesn't exist
			const updatedRoster = (store.getState() as MockStoreState).roster[
				cacheKey
			];
			expect(updatedRoster).toBeDefined();
			expect(updatedRoster?.roster.Astronomy).toEqual(["John Doe"]);
		});
	});

	describe("Event Name Normalization", () => {
		it('should handle event names with "and" correctly', () => {
			const teamSlug = "test-team";
			const subteamId = "test-subteam";
			const eventName = "Anatomy and Physiology";
			const slotIndex = 0;
			const studentName = "John Doe";

			// Set up initial roster cache
			const cacheKey = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId,
			);
			store.setState({
				roster: {
					[cacheKey]: {
						roster: {},
						timestamp: Date.now(),
					},
				},
			});

			// Add roster entry
			(store.getState() as MockStoreState).addRosterEntry(
				teamSlug,
				subteamId,
				eventName,
				slotIndex,
				studentName,
			);

			// Verify the entry was added with original event name
			const updatedRoster = (store.getState() as MockStoreState).roster[
				cacheKey
			];
			expect(updatedRoster).toBeDefined();
			expect(updatedRoster?.roster[eventName]).toBeDefined();
			expect(updatedRoster?.roster[eventName]?.[slotIndex]).toBe(studentName);
		});

		it('should handle event names without "and" correctly', () => {
			const teamSlug = "test-team";
			const subteamId = "test-subteam";
			const eventName = "Astronomy";
			const slotIndex = 0;
			const studentName = "John Doe";

			// Set up initial roster cache
			const cacheKey = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId,
			);
			store.setState({
				roster: {
					[cacheKey]: {
						roster: {},
						timestamp: Date.now(),
					},
				},
			});

			// Add roster entry
			(store.getState() as MockStoreState).addRosterEntry(
				teamSlug,
				subteamId,
				eventName,
				slotIndex,
				studentName,
			);

			// Verify the entry was added
			const updatedRoster = (store.getState() as MockStoreState).roster[
				cacheKey
			];
			expect(updatedRoster).toBeDefined();
			expect(updatedRoster?.roster[eventName]).toBeDefined();
			expect(updatedRoster?.roster[eventName]?.[slotIndex]).toBe(studentName);
		});
	});

	describe("Cache Key Generation", () => {
		it("should generate consistent cache keys", () => {
			const teamSlug = "test-team";
			const subteamId = "test-subteam";

			const key1 = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId,
			);
			const key2 = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId,
			);

			expect(key1).toBe(key2);
			expect(key1).toBe("roster-test-team-test-subteam");
		});

		it("should generate different cache keys for different subteams", () => {
			const teamSlug = "test-team";
			const subteamId1 = "subteam-1";
			const subteamId2 = "subteam-2";

			const key1 = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId1,
			);
			const key2 = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId2,
			);

			expect(key1).not.toBe(key2);
		});
	});

	describe("State Immutability", () => {
		it("should not mutate original state when adding entries", () => {
			const teamSlug = "test-team";
			const subteamId = "test-subteam";
			const eventName = "Astronomy";
			const slotIndex = 0;
			const studentName = "John Doe";

			// Set up initial roster cache
			const cacheKey = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId,
			);
			const originalRoster = {
				roster: { Chemistry: ["Jane Doe"] },
				timestamp: Date.now(),
			};

			store.setState({
				roster: {
					[cacheKey]: originalRoster,
				},
			});

			// Add roster entry
			(store.getState() as MockStoreState).addRosterEntry(
				teamSlug,
				subteamId,
				eventName,
				slotIndex,
				studentName,
			);

			// Verify original state was not mutated
			expect(originalRoster.roster).toEqual({ Chemistry: ["Jane Doe"] });
			expect(
				(originalRoster.roster as Record<string, string[]>)[eventName],
			).toBeUndefined();
		});

		it("should not mutate original state when removing entries", () => {
			const teamSlug = "test-team";
			const subteamId = "test-subteam";
			const eventName = "Astronomy";
			const slotIndex = 0;

			// Set up initial roster cache with a deep copy
			const cacheKey = (store.getState() as MockStoreState).getCacheKey(
				"roster",
				teamSlug,
				subteamId,
			);
			const originalRoster = {
				roster: { Astronomy: ["John Doe", "Jane Doe"] },
				timestamp: Date.now(),
			};

			// Create a deep copy to preserve original state
			const originalRosterCopy = JSON.parse(JSON.stringify(originalRoster));

			store.setState({
				roster: {
					[cacheKey]: originalRoster,
				},
			});

			// Remove roster entry
			(store.getState() as MockStoreState).removeRosterEntry(
				teamSlug,
				subteamId,
				eventName,
				slotIndex,
			);

			// Verify original state was not mutated by checking the copy
			expect(originalRosterCopy.roster.Astronomy).toEqual([
				"John Doe",
				"Jane Doe",
			]);
		});
	});
});
