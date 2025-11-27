import { dbPg } from "@/lib/db";
import { newTeamAssignments } from "@/lib/db/schema/assignments";
import { users } from "@/lib/db/schema/core";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamRosterData,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

export async function resolveTeamSlugToGroupId(teamSlug: string) {
  const groupResult = await dbPg
    .select({ id: newTeamGroups.id })
    .from(newTeamGroups)
    .where(eq(newTeamGroups.slug, teamSlug));

  if (groupResult.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
  }

  const groupId = groupResult[0]?.id;
  if (!groupId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
  }

  return groupId;
}

export async function getGroupBySlug(teamSlug: string) {
  const groupResult = await dbPg
    .select({
      id: newTeamGroups.id,
      school: newTeamGroups.school,
      division: newTeamGroups.division,
      slug: newTeamGroups.slug,
    })
    .from(newTeamGroups)
    .where(eq(newTeamGroups.slug, teamSlug));

  if (groupResult.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
  }

  const group = groupResult[0];
  if (!group) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
  }

  return group;
}

export async function getActiveTeamUnitIds(groupId: string) {
  const teamUnits = await dbPg
    .select({ id: newTeamUnits.id })
    .from(newTeamUnits)
    .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")));

  return teamUnits.map((unit) => unit.id);
}

export async function getUsersWithRosterEntries(groupId: string) {
  const usersWithRosterEntries = await dbPg
    .select({
      userId: newTeamRosterData.userId,
    })
    .from(newTeamRosterData)
    .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
    .where(
      and(
        eq(newTeamUnits.groupId, groupId),
        eq(newTeamUnits.status, "active"),
        isNotNull(newTeamRosterData.userId)
      )
    )
    .groupBy(newTeamRosterData.userId);

  return new Set(
    usersWithRosterEntries.map((r) => r.userId).filter((id): id is string => id !== null)
  );
}

export async function getMembersWithSubteamMemberships(whereCondition: ReturnType<typeof and>) {
  return await dbPg
    .select({
      userId: newTeamMemberships.userId,
      role: newTeamMemberships.role,
      joinedAt: newTeamMemberships.joinedAt,
      subteamId: newTeamMemberships.teamId,
      subteamName: newTeamUnits.teamId,
      email: users.email,
      displayName: users.displayName,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
    })
    .from(newTeamMemberships)
    .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
    .leftJoin(users, eq(newTeamMemberships.userId, users.id))
    .where(whereCondition)
    .orderBy(newTeamMemberships.joinedAt);
}

export async function getUsersWithoutSubteam(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  return await dbPg
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
    })
    .from(users)
    .where(inArray(users.id, userIds));
}

export async function getTeamMembersForGroup(groupId: string) {
  return await dbPg
    .select({
      userId: users.id,
      displayName: users.displayName,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .innerJoin(newTeamMemberships, eq(users.id, newTeamMemberships.userId))
    .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
    .where(
      and(
        eq(newTeamUnits.groupId, groupId),
        eq(newTeamMemberships.status, "active"),
        eq(newTeamUnits.status, "active")
      )
    );
}

export async function getAllTeamMembersForDashboard(groupId: string) {
  return await dbPg
    .select({
      userId: users.id,
      displayName: users.displayName,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: newTeamMemberships.role,
      joinedAt: newTeamMemberships.joinedAt,
      subteamId: newTeamUnits.id,
      subteamName: newTeamUnits.teamId,
    })
    .from(users)
    .innerJoin(newTeamMemberships, eq(users.id, newTeamMemberships.userId))
    .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
    .where(
      and(
        eq(newTeamUnits.groupId, groupId),
        eq(newTeamMemberships.status, "active"),
        eq(newTeamUnits.status, "active")
      )
    );
}

export async function getRosterDataForSubteam(subteamId: string | undefined) {
  if (!subteamId) {
    return [];
  }

  return await dbPg
    .select({
      eventName: newTeamRosterData.eventName,
      studentName: newTeamRosterData.studentName,
      slotIndex: newTeamRosterData.slotIndex,
      userId: newTeamRosterData.userId,
    })
    .from(newTeamRosterData)
    .where(eq(newTeamRosterData.teamUnitId, subteamId))
    .orderBy(newTeamRosterData.eventName, newTeamRosterData.slotIndex);
}

export async function getActiveSubteams(groupId: string) {
  return await dbPg
    .select({
      id: newTeamUnits.id,
      teamId: newTeamUnits.teamId,
      description: newTeamUnits.description,
      createdAt: newTeamUnits.createdAt,
    })
    .from(newTeamUnits)
    .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")));
}

export async function getAssignmentsForSubteams(subteamIds: string[]) {
  if (subteamIds.length === 0) {
    return [];
  }

  return await dbPg
    .select({
      id: newTeamAssignments.id,
      title: newTeamAssignments.title,
      description: newTeamAssignments.description,
      assignmentType: newTeamAssignments.assignmentType,
      dueDate: newTeamAssignments.dueDate,
      points: newTeamAssignments.points,
      isRequired: newTeamAssignments.isRequired,
      maxAttempts: newTeamAssignments.maxAttempts,
      timeLimitMinutes: newTeamAssignments.timeLimitMinutes,
      createdAt: newTeamAssignments.createdAt,
      updatedAt: newTeamAssignments.updatedAt,
      createdBy: newTeamAssignments.createdBy,
      teamId: newTeamAssignments.teamId,
    })
    .from(newTeamAssignments)
    .where(inArray(newTeamAssignments.teamId, subteamIds))
    .orderBy(
      sql`${newTeamAssignments.dueDate} ASC NULLS LAST`,
      sql`${newTeamAssignments.createdAt} DESC`
    );
}
