/**
 * People Sync Helper
 *
 * This module provides functions to synchronize the team_people table
 * with roster data. It ensures that the people tab always reflects the
 * current state of the roster.
 */

import { dbPg } from "@/lib/db";
import { teamPeople, teamRoster, teamSubteams } from "@/lib/db/schema";
import logger from "@/lib/utils/logging/logger";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

interface PersonData {
	name: string;
	userId: string | null;
	subteamId: string;
	events: string[];
	isAdmin: boolean;
}

/**
 * Helper function to upsert people entries
 */
async function upsertPeopleEntries(
	peopleToUpsert: PersonData[],
	existingPeopleMap: Map<string, string>,
): Promise<void> {
	for (const person of peopleToUpsert) {
		const key = person.userId
			? `user:${person.userId}:${person.subteamId}`
			: `name:${person.name.toLowerCase().trim()}:${person.subteamId}`;

		const existingId = existingPeopleMap.get(key);

		if (existingId) {
			// Update existing entry
			await dbPg
				.update(teamPeople)
				.set({
					name: person.name,
					userId: person.userId,
					events: person.events,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(teamPeople.id, existingId));

			// Remove from map to track what's been processed
			existingPeopleMap.delete(key);
		} else {
			// Insert new entry
			// Get group team ID first
			const [subteamInfo] = await dbPg
				.select({ teamId: teamSubteams.teamId })
				.from(teamSubteams)
				.where(eq(teamSubteams.id, person.subteamId))
				.limit(1);

			if (subteamInfo) {
				await dbPg.insert(teamPeople).values({
					subteamId: person.subteamId,
					teamId: subteamInfo.teamId,
					name: person.name,
					userId: person.userId,
					events: person.events,
					isAdmin: person.isAdmin,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				});
			}
		}
	}
}

/**
 * Sync people table from roster data for a specific subteam
 *
 * This function:
 * 1. Fetches all roster entries for the subteam
 * 2. Aggregates entries by person (name + userId + subteam)
 * 3. Upserts into team_people table
 * 4. Removes orphaned entries (people no longer in roster)
 */
export async function syncPeopleFromRosterForSubteam(
	subteamId: string,
): Promise<void> {
	try {
		// Get all roster entries for this subteam
		const rosterEntries = await dbPg
			.select({
				studentName: teamRoster.studentName,
				displayName: teamRoster.displayName,
				userId: teamRoster.userId,
				eventName: teamRoster.eventName,
				subteamId: teamRoster.subteamId,
			})
			.from(teamRoster)
			.where(eq(teamRoster.subteamId, subteamId));

		// Aggregate by person (using name as key for unlinked, userId for linked)
		const peopleMap = new Map<string, PersonData>();

		for (const entry of rosterEntries) {
			const personName = entry.studentName || entry.displayName;
			if (!(personName || entry.userId)) {
				continue;
			}

			if (!entry.subteamId) continue;

			// Create a unique key: userId if linked, otherwise name
			const key = entry.userId
				? `user:${entry.userId}:${entry.subteamId}`
				: `name:${personName?.toLowerCase().trim()}:${entry.subteamId}`;

			const existing = peopleMap.get(key);
			if (existing) {
				// Add event to existing person
				if (entry.eventName && !existing.events.includes(entry.eventName)) {
					existing.events.push(entry.eventName);
				}
			} else {
				// Create new person entry
				peopleMap.set(key, {
					name: personName || "Unknown",
					userId: entry.userId,
					subteamId: entry.subteamId,
					events: entry.eventName ? [entry.eventName] : [],
					isAdmin: false,
				});
			}
		}

		// Get existing people entries for this subteam
		const existingPeople = await dbPg
			.select({
				id: teamPeople.id,
				name: teamPeople.name,
				userId: teamPeople.userId,
				subteamId: teamPeople.subteamId,
			})
			.from(teamPeople)
			.where(eq(teamPeople.subteamId, subteamId));

		// Build lookup for existing people
		const existingPeopleMap = new Map<string, string>(); // key -> id
		for (const person of existingPeople) {
			if (!person.subteamId) continue;
			const key = person.userId
				? `user:${person.userId}:${person.subteamId}`
				: `name:${person.name.toLowerCase().trim()}:${person.subteamId}`;
			existingPeopleMap.set(key, person.id);
		}

		// Upsert people from roster
		const peopleToUpsert = Array.from(peopleMap.values());
		await upsertPeopleEntries(peopleToUpsert, existingPeopleMap);

		// Remove orphaned entries (people no longer in roster)
		const orphanedIds = Array.from(existingPeopleMap.values());
		if (orphanedIds.length > 0) {
			await dbPg.delete(teamPeople).where(inArray(teamPeople.id, orphanedIds));
			logger.dev.structured("info", "Removed orphaned people entries", {
				subteamId,
				removedCount: orphanedIds.length,
			});
		}

		logger.dev.structured("info", "Synced people from roster", {
			subteamId,
			totalPeople: peopleToUpsert.length,
			removedOrphans: orphanedIds.length,
		});
	} catch (error) {
		logger.error("Failed to sync people from roster:", error);
		throw error;
	}
}

/**
 * Sync people table from roster data for all subteams in a group
 */
export async function syncPeopleFromRosterForGroup(
	groupId: string,
): Promise<void> {
	try {
		// Get all active subteams in the group
		const subteams = await dbPg
			.select({ id: teamSubteams.id })
			.from(teamSubteams)
			.where(
				and(
					eq(teamSubteams.teamId, groupId),
					eq(teamSubteams.status, "active"),
				),
			);

		// Sync each subteam
		for (const subteam of subteams) {
			await syncPeopleFromRosterForSubteam(subteam.id);
		}

		logger.dev.structured("info", "Synced people from roster for group", {
			groupId,
			subteamCount: subteams.length,
		});
	} catch (error) {
		logger.error("Failed to sync people from roster for group:", error);
		throw error;
	}
}

/**
 * Update roster entries when a person's info changes in the people table
 *
 * This ensures roster entries are updated when:
 * - A person's name changes
 * - A person is linked/unlinked to a user
 * - Events are added/removed from a person
 */
export async function syncRosterFromPeopleEntry(
	personId: string,
	updates: {
		name?: string;
		userId?: string | null;
		events?: string[];
		subteamId?: string;
	},
): Promise<void> {
	try {
		// Get current person data
		const [person] = await dbPg
			.select()
			.from(teamPeople)
			.where(eq(teamPeople.id, personId));

		if (!person) {
			logger.warn("Person not found for roster sync:", { personId });
			return;
		}

		const currentEvents = Array.isArray(person.events)
			? (person.events as string[])
			: JSON.parse(String(person.events || "[]"));
		const newEvents = updates.events;
		const subteamId = updates.subteamId || person.subteamId;
		const newName = updates.name || person.name;
		const newUserId =
			updates.userId !== undefined ? updates.userId : person.userId;

		if (!subteamId) return;

		// If events changed, update roster entries
		if (newEvents) {
			const eventsToAdd = newEvents.filter(
				(e: string) => !currentEvents.includes(e),
			);
			const eventsToRemove = currentEvents.filter(
				(e: string) => !newEvents.includes(e),
			);

			// Add new event entries to roster
			for (const eventName of eventsToAdd) {
				// Find the next available slot for this event
				const existingSlots = await dbPg
					.select({ slotIndex: teamRoster.slotIndex })
					.from(teamRoster)
					.where(
						and(
							eq(teamRoster.subteamId, subteamId),
							eq(teamRoster.eventName, eventName),
						),
					)
					.orderBy(desc(teamRoster.slotIndex))
					.limit(1);

				const nextSlot =
					existingSlots.length > 0 ? (existingSlots[0]?.slotIndex || 0) + 1 : 0;

				await dbPg.insert(teamRoster).values({
					subteamId,
					teamId: subteamId, // Placeholder
					eventName,
					slotIndex: nextSlot,
					studentName: newName,
					displayName: newName,
					userId: newUserId,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				});
			}

			// Remove event entries from roster
			for (const eventName of eventsToRemove) {
				if (person.userId) {
					await dbPg
						.delete(teamRoster)
						.where(
							and(
								eq(teamRoster.subteamId, subteamId),
								eq(teamRoster.eventName, eventName),
								eq(teamRoster.userId, person.userId),
							),
						);
				} else {
					await dbPg
						.delete(teamRoster)
						.where(
							and(
								eq(teamRoster.subteamId, subteamId),
								eq(teamRoster.eventName, eventName),
								sql`LOWER(${teamRoster.displayName}) = LOWER(${person.name})`,
							),
						);
				}
			}
		}

		// If name or userId changed, update all roster entries for this person
		if (updates.name !== undefined || updates.userId !== undefined) {
			const oldUserId = person.userId;
			const oldName = person.name;

			// Find all roster entries for this person
			let rosterEntries: Array<{ id: string }>;
			if (oldUserId) {
				rosterEntries = await dbPg
					.select({ id: teamRoster.id })
					.from(teamRoster)
					.where(
						and(
							eq(teamRoster.subteamId, subteamId),
							eq(teamRoster.userId, oldUserId),
						),
					);
			} else {
				rosterEntries = await dbPg
					.select({ id: teamRoster.id })
					.from(teamRoster)
					.where(
						and(
							eq(teamRoster.subteamId, subteamId),
							sql`LOWER(${teamRoster.displayName}) = LOWER(${oldName})`,
						),
					);
			}

			// Update each roster entry
			for (const entry of rosterEntries) {
				await dbPg
					.update(teamRoster)
					.set({
						studentName: newName,
						displayName: newName,
						userId: newUserId,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(teamRoster.id, entry.id));
			}
		}

		// Update the people entry itself
		await dbPg
			.update(teamPeople)
			.set({
				name: newName,
				userId: newUserId,
				events: newEvents || currentEvents,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(teamPeople.id, personId));

		logger.dev.structured("info", "Synced roster from people entry", {
			personId,
			updates,
		});
	} catch (error) {
		logger.error("Failed to sync roster from people entry:", error);
		throw error;
	}
}

/**
 * Add an event to a person and sync with roster
 */
export async function addEventToPerson(
	subteamId: string,
	personName: string,
	personUserId: string | null,
	eventName: string,
): Promise<void> {
	try {
		// Normalize event name
		const normalizedEventName = eventName.replace(/&/g, "and");

		// Find the next available slot for this event
		const existingSlots = await dbPg
			.select({ slotIndex: teamRoster.slotIndex })
			.from(teamRoster)
			.where(
				and(
					eq(teamRoster.subteamId, subteamId),
					eq(teamRoster.eventName, normalizedEventName),
				),
			)
			.orderBy(desc(teamRoster.slotIndex))
			.limit(1);

		const nextSlot =
			existingSlots.length > 0 ? (existingSlots[0]?.slotIndex || 0) + 1 : 0;

		// Add to roster
		await dbPg.insert(teamRoster).values({
			subteamId,
			teamId: subteamId, // Placeholder
			eventName: normalizedEventName,
			slotIndex: nextSlot,
			studentName: personName,
			displayName: personName,
			userId: personUserId,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		// Sync people table
		await syncPeopleFromRosterForSubteam(subteamId);
	} catch (error) {
		logger.error("Failed to add event to person:", error);
		throw error;
	}
}

/**
 * Remove an event from a person and sync with roster
 */
export async function removeEventFromPerson(
	subteamId: string,
	personName: string,
	personUserId: string | null,
	eventName: string,
): Promise<void> {
	try {
		// Normalize event name
		const normalizedEventName = eventName.replace(/&/g, "and");

		// Remove from roster
		if (personUserId) {
			await dbPg
				.delete(teamRoster)
				.where(
					and(
						eq(teamRoster.subteamId, subteamId),
						eq(teamRoster.eventName, normalizedEventName),
						eq(teamRoster.userId, personUserId),
					),
				);
		} else {
			await dbPg
				.delete(teamRoster)
				.where(
					and(
						eq(teamRoster.subteamId, subteamId),
						eq(teamRoster.eventName, normalizedEventName),
						sql`LOWER(${teamRoster.displayName}) = LOWER(${personName})`,
					),
				);
		}

		// Sync people table
		await syncPeopleFromRosterForSubteam(subteamId);
	} catch (error) {
		logger.error("Failed to remove event from person:", error);
		throw error;
	}
}

/**
 * Change a person's subteam and sync with roster
 */
export async function changePersonSubteam(
	personName: string,
	personUserId: string | null,
	oldSubteamId: string,
	newSubteamId: string,
	eventsToMove: string[],
): Promise<void> {
	try {
		// Move roster entries from old subteam to new subteam
		for (const eventName of eventsToMove) {
			const normalizedEventName = eventName.replace(/&/g, "and");

			// Find existing entries in old subteam
			let entries: Array<{
				id: string;
				subteamId: string | null;
				eventName: string;
				slotIndex: number;
				studentName: string | null;
				userId: string | null;
				createdAt: string;
				updatedAt: string;
			}> = [];
			if (personUserId) {
				entries = await dbPg
					.select()
					.from(teamRoster)
					.where(
						and(
							eq(teamRoster.subteamId, oldSubteamId),
							eq(teamRoster.eventName, normalizedEventName),
							eq(teamRoster.userId, personUserId),
						),
					);
			} else {
				entries = await dbPg
					.select()
					.from(teamRoster)
					.where(
						and(
							eq(teamRoster.subteamId, oldSubteamId),
							eq(teamRoster.eventName, normalizedEventName),
							sql`LOWER(${teamRoster.displayName}) = LOWER(${personName})`,
						),
					);
			}

			// Add to new subteam
			for (const entry of entries) {
				// Find next available slot in new subteam
				const existingSlots = await dbPg
					.select({ slotIndex: teamRoster.slotIndex })
					.from(teamRoster)
					.where(
						and(
							eq(teamRoster.subteamId, newSubteamId),
							eq(teamRoster.eventName, normalizedEventName),
						),
					)
					.orderBy(desc(teamRoster.slotIndex))
					.limit(1);

				const nextSlot =
					existingSlots.length > 0 ? (existingSlots[0]?.slotIndex || 0) + 1 : 0;

				await dbPg.insert(teamRoster).values({
					subteamId: newSubteamId,
					teamId: newSubteamId, // Placeholder
					eventName: normalizedEventName,
					slotIndex: nextSlot,
					studentName: personName,
					displayName: personName,
					userId: personUserId,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				});

				// Remove from old subteam
				await dbPg.delete(teamRoster).where(eq(teamRoster.id, entry.id));
			}
		}

		// Sync both subteams' people tables
		await syncPeopleFromRosterForSubteam(oldSubteamId);
		await syncPeopleFromRosterForSubteam(newSubteamId);
	} catch (error) {
		logger.error("Failed to change person subteam:", error);
		throw error;
	}
}

/**
 * Remove a person completely from a subteam (removes all their roster entries)
 */
export async function removePersonFromSubteam(
	subteamId: string,
	personName: string,
	personUserId: string | null,
): Promise<number> {
	try {
		let result: Array<{ id: string }>;

		if (personUserId) {
			result = await dbPg
				.delete(teamRoster)
				.where(
					and(
						eq(teamRoster.subteamId, subteamId),
						eq(teamRoster.userId, personUserId),
					),
				)
				.returning({ id: teamRoster.id });
		} else {
			result = await dbPg
				.delete(teamRoster)
				.where(
					and(
						eq(teamRoster.subteamId, subteamId),
						sql`LOWER(${teamRoster.displayName}) = LOWER(${personName})`,
					),
				)
				.returning({ id: teamRoster.id });
		}

		// Sync people table
		await syncPeopleFromRosterForSubteam(subteamId);

		return result.length;
	} catch (error) {
		logger.error("Failed to remove person from subteam:", error);
		throw error;
	}
}
