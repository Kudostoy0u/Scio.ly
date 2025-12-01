/**
 * People Sync Helper
 *
 * This module provides functions to synchronize the new_team_people table
 * with roster data. It ensures that the people tab always reflects the
 * current state of the roster.
 */

import { dbPg } from "@/lib/db";
import { newTeamPeople, newTeamRosterData, newTeamUnits } from "@/lib/db/schema/teams";
import logger from "@/lib/utils/logger";
import { and, eq, inArray, sql } from "drizzle-orm";

interface PersonData {
  name: string;
  userId: string | null;
  teamUnitId: string;
  events: string[];
  isAdmin: boolean;
}

/**
 * Helper function to upsert people entries
 */
async function upsertPeopleEntries(
  peopleToUpsert: PersonData[],
  existingPeopleMap: Map<string, string>
): Promise<void> {
  for (const person of peopleToUpsert) {
    const key = person.userId
      ? `user:${person.userId}:${person.teamUnitId}`
      : `name:${person.name.toLowerCase().trim()}:${person.teamUnitId}`;

    const existingId = existingPeopleMap.get(key);

    if (existingId) {
      // Update existing entry
      await dbPg
        .update(newTeamPeople)
        .set({
          name: person.name,
          userId: person.userId,
          events: JSON.stringify(person.events),
          updatedAt: new Date(),
        })
        .where(eq(newTeamPeople.id, existingId));

      // Remove from map to track what's been processed
      existingPeopleMap.delete(key);
    } else {
      // Insert new entry
      await dbPg.insert(newTeamPeople).values({
        teamUnitId: person.teamUnitId,
        name: person.name,
        userId: person.userId,
        events: JSON.stringify(person.events),
        isAdmin: person.isAdmin ? "true" : "false",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

/**
 * Sync people table from roster data for a specific subteam
 *
 * This function:
 * 1. Fetches all roster entries for the subteam
 * 2. Aggregates entries by person (name + userId + subteam)
 * 3. Upserts into new_team_people table
 * 4. Removes orphaned entries (people no longer in roster)
 */
export async function syncPeopleFromRosterForSubteam(subteamId: string): Promise<void> {
  try {
    // Get all roster entries for this subteam
    const rosterEntries = await dbPg
      .select({
        studentName: newTeamRosterData.studentName,
        userId: newTeamRosterData.userId,
        eventName: newTeamRosterData.eventName,
        teamUnitId: newTeamRosterData.teamUnitId,
      })
      .from(newTeamRosterData)
      .where(eq(newTeamRosterData.teamUnitId, subteamId));

    // Aggregate by person (using name as key for unlinked, userId for linked)
    const peopleMap = new Map<string, PersonData>();

    for (const entry of rosterEntries) {
      if (!(entry.studentName || entry.userId)) {
        continue;
      }

      // Create a unique key: userId if linked, otherwise name
      const key = entry.userId
        ? `user:${entry.userId}:${entry.teamUnitId}`
        : `name:${entry.studentName?.toLowerCase().trim()}:${entry.teamUnitId}`;

      const existing = peopleMap.get(key);
      if (existing) {
        // Add event to existing person
        if (entry.eventName && !existing.events.includes(entry.eventName)) {
          existing.events.push(entry.eventName);
        }
      } else {
        // Create new person entry
        peopleMap.set(key, {
          name: entry.studentName || "Unknown",
          userId: entry.userId,
          teamUnitId: entry.teamUnitId,
          events: entry.eventName ? [entry.eventName] : [],
          isAdmin: false,
        });
      }
    }

    // Get existing people entries for this subteam
    const existingPeople = await dbPg
      .select({
        id: newTeamPeople.id,
        name: newTeamPeople.name,
        userId: newTeamPeople.userId,
        teamUnitId: newTeamPeople.teamUnitId,
      })
      .from(newTeamPeople)
      .where(eq(newTeamPeople.teamUnitId, subteamId));

    // Build lookup for existing people
    const existingPeopleMap = new Map<string, string>(); // key -> id
    for (const person of existingPeople) {
      const key = person.userId
        ? `user:${person.userId}:${person.teamUnitId}`
        : `name:${person.name.toLowerCase().trim()}:${person.teamUnitId}`;
      existingPeopleMap.set(key, person.id);
    }

    // Upsert people from roster
    const peopleToUpsert = Array.from(peopleMap.values());
    await upsertPeopleEntries(peopleToUpsert, existingPeopleMap);

    // Remove orphaned entries (people no longer in roster)
    const orphanedIds = Array.from(existingPeopleMap.values());
    if (orphanedIds.length > 0) {
      await dbPg.delete(newTeamPeople).where(inArray(newTeamPeople.id, orphanedIds));
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
export async function syncPeopleFromRosterForGroup(groupId: string): Promise<void> {
  try {
    // Get all active subteams in the group
    const subteams = await dbPg
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")));

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
    teamUnitId?: string;
  }
): Promise<void> {
  try {
    // Get current person data
    const [person] = await dbPg.select().from(newTeamPeople).where(eq(newTeamPeople.id, personId));

    if (!person) {
      logger.warn("Person not found for roster sync:", { personId });
      return;
    }

    const currentEvents = Array.isArray(person.events)
      ? person.events
      : JSON.parse(String(person.events || "[]"));
    const newEvents = updates.events;
    const teamUnitId = updates.teamUnitId || person.teamUnitId;
    const newName = updates.name || person.name;
    const newUserId = updates.userId !== undefined ? updates.userId : person.userId;

    // If events changed, update roster entries
    if (newEvents) {
      const eventsToAdd = newEvents.filter((e: string) => !currentEvents.includes(e));
      const eventsToRemove = currentEvents.filter((e: string) => !newEvents.includes(e));

      // Add new event entries to roster
      for (const eventName of eventsToAdd) {
        // Find the next available slot for this event
        const existingSlots = await dbPg
          .select({ slotIndex: newTeamRosterData.slotIndex })
          .from(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.teamUnitId, teamUnitId),
              eq(newTeamRosterData.eventName, eventName)
            )
          )
          .orderBy(sql`${newTeamRosterData.slotIndex} DESC`)
          .limit(1);

        const nextSlot = existingSlots.length > 0 ? (existingSlots[0]?.slotIndex || 0) + 1 : 0;

        await dbPg.insert(newTeamRosterData).values({
          teamUnitId,
          eventName,
          slotIndex: nextSlot,
          studentName: newName,
          userId: newUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Remove event entries from roster
      for (const eventName of eventsToRemove) {
        if (person.userId) {
          await dbPg
            .delete(newTeamRosterData)
            .where(
              and(
                eq(newTeamRosterData.teamUnitId, teamUnitId),
                eq(newTeamRosterData.eventName, eventName),
                eq(newTeamRosterData.userId, person.userId)
              )
            );
        } else {
          await dbPg
            .delete(newTeamRosterData)
            .where(
              and(
                eq(newTeamRosterData.teamUnitId, teamUnitId),
                eq(newTeamRosterData.eventName, eventName),
                sql`LOWER(${newTeamRosterData.studentName}) = LOWER(${person.name})`
              )
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
          .select({ id: newTeamRosterData.id })
          .from(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.teamUnitId, teamUnitId),
              eq(newTeamRosterData.userId, oldUserId)
            )
          );
      } else {
        rosterEntries = await dbPg
          .select({ id: newTeamRosterData.id })
          .from(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.teamUnitId, teamUnitId),
              sql`LOWER(${newTeamRosterData.studentName}) = LOWER(${oldName})`
            )
          );
      }

      // Update each roster entry
      for (const entry of rosterEntries) {
        await dbPg
          .update(newTeamRosterData)
          .set({
            studentName: newName,
            userId: newUserId,
            updatedAt: new Date(),
          })
          .where(eq(newTeamRosterData.id, entry.id));
      }
    }

    // Update the people entry itself
    await dbPg
      .update(newTeamPeople)
      .set({
        name: newName,
        userId: newUserId,
        events: JSON.stringify(newEvents || currentEvents),
        updatedAt: new Date(),
      })
      .where(eq(newTeamPeople.id, personId));

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
  teamUnitId: string,
  personName: string,
  personUserId: string | null,
  eventName: string
): Promise<void> {
  try {
    // Normalize event name
    const normalizedEventName = eventName.replace(/&/g, "and");

    // Find the next available slot for this event
    const existingSlots = await dbPg
      .select({ slotIndex: newTeamRosterData.slotIndex })
      .from(newTeamRosterData)
      .where(
        and(
          eq(newTeamRosterData.teamUnitId, teamUnitId),
          eq(newTeamRosterData.eventName, normalizedEventName)
        )
      )
      .orderBy(sql`${newTeamRosterData.slotIndex} DESC`)
      .limit(1);

    const nextSlot = existingSlots.length > 0 ? (existingSlots[0]?.slotIndex || 0) + 1 : 0;

    // Add to roster
    await dbPg.insert(newTeamRosterData).values({
      teamUnitId,
      eventName: normalizedEventName,
      slotIndex: nextSlot,
      studentName: personName,
      userId: personUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Sync people table
    await syncPeopleFromRosterForSubteam(teamUnitId);
  } catch (error) {
    logger.error("Failed to add event to person:", error);
    throw error;
  }
}

/**
 * Remove an event from a person and sync with roster
 */
export async function removeEventFromPerson(
  teamUnitId: string,
  personName: string,
  personUserId: string | null,
  eventName: string
): Promise<void> {
  try {
    // Normalize event name
    const normalizedEventName = eventName.replace(/&/g, "and");

    // Remove from roster
    if (personUserId) {
      await dbPg
        .delete(newTeamRosterData)
        .where(
          and(
            eq(newTeamRosterData.teamUnitId, teamUnitId),
            eq(newTeamRosterData.eventName, normalizedEventName),
            eq(newTeamRosterData.userId, personUserId)
          )
        );
    } else {
      await dbPg
        .delete(newTeamRosterData)
        .where(
          and(
            eq(newTeamRosterData.teamUnitId, teamUnitId),
            eq(newTeamRosterData.eventName, normalizedEventName),
            sql`LOWER(${newTeamRosterData.studentName}) = LOWER(${personName})`
          )
        );
    }

    // Sync people table
    await syncPeopleFromRosterForSubteam(teamUnitId);
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
  eventsToMove: string[]
): Promise<void> {
  try {
    // Move roster entries from old subteam to new subteam
    for (const eventName of eventsToMove) {
      const normalizedEventName = eventName.replace(/&/g, "and");

      // Find existing entries in old subteam
      let entries: Array<{
        id: string;
        teamUnitId: string;
        eventName: string;
        slotIndex: number;
        studentName: string | null;
        userId: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
      }> = [];
      if (personUserId) {
        entries = await dbPg
          .select()
          .from(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.teamUnitId, oldSubteamId),
              eq(newTeamRosterData.eventName, normalizedEventName),
              eq(newTeamRosterData.userId, personUserId)
            )
          );
      } else {
        entries = await dbPg
          .select()
          .from(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.teamUnitId, oldSubteamId),
              eq(newTeamRosterData.eventName, normalizedEventName),
              sql`LOWER(${newTeamRosterData.studentName}) = LOWER(${personName})`
            )
          );
      }

      // Add to new subteam
      for (const entry of entries) {
        // Find next available slot in new subteam
        const existingSlots = await dbPg
          .select({ slotIndex: newTeamRosterData.slotIndex })
          .from(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.teamUnitId, newSubteamId),
              eq(newTeamRosterData.eventName, normalizedEventName)
            )
          )
          .orderBy(sql`${newTeamRosterData.slotIndex} DESC`)
          .limit(1);

        const nextSlot = existingSlots.length > 0 ? (existingSlots[0]?.slotIndex || 0) + 1 : 0;

        await dbPg.insert(newTeamRosterData).values({
          teamUnitId: newSubteamId,
          eventName: normalizedEventName,
          slotIndex: nextSlot,
          studentName: personName,
          userId: personUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Remove from old subteam
        await dbPg.delete(newTeamRosterData).where(eq(newTeamRosterData.id, entry.id));
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
  teamUnitId: string,
  personName: string,
  personUserId: string | null
): Promise<number> {
  try {
    let result: Array<{ id: string }>;

    if (personUserId) {
      result = await dbPg
        .delete(newTeamRosterData)
        .where(
          and(
            eq(newTeamRosterData.teamUnitId, teamUnitId),
            eq(newTeamRosterData.userId, personUserId)
          )
        )
        .returning({ id: newTeamRosterData.id });
    } else {
      result = await dbPg
        .delete(newTeamRosterData)
        .where(
          and(
            eq(newTeamRosterData.teamUnitId, teamUnitId),
            sql`LOWER(${newTeamRosterData.studentName}) = LOWER(${personName})`
          )
        )
        .returning({ id: newTeamRosterData.id });
    }

    // Sync people table
    await syncPeopleFromRosterForSubteam(teamUnitId);

    return result.length;
  } catch (error) {
    logger.error("Failed to remove person from subteam:", error);
    throw error;
  }
}
