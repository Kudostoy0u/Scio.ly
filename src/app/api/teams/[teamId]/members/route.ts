import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamRosterData,
  newTeamUnits,
  rosterLinkInvitations,
} from "@/lib/db/schema/teams";
import { UUIDSchema } from "@/lib/schemas/teams-validation";
// import logger from "@/lib/utils/logger";
import { getServerUser } from "@/lib/supabaseServer";
import { generateDisplayName } from "@/lib/utils/displayNameUtils";
import {
  // handleError,
  handleForbiddenError,
  handleNotFoundError,
  handleUnauthorizedError,
  handleValidationError,
  validateEnvironment,
} from "@/lib/utils/error-handler";
import { getTeamAccess, getUserDisplayInfo } from "@/lib/utils/team-auth-v2";
import { and, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface TeamMember {
  id: string | null;
  name: string;
  email: string | null;
  username?: string | null;
  role: string;
  subteam: {
    id: string | null;
    name: string;
    description: string | null;
  } | null;
  joinedAt: Date | string | null;
  events: string[];
  isCreator?: boolean;
  subteams?: Array<{
    id: string;
    name: string;
    description: string | null;
    role: string;
    events?: string[];
  }>;
  hasPendingLinkInvite?: boolean;
  isUnlinked?: boolean;
}

// GET /api/teams/[teamId]/members - Get team members with clean Drizzle ORM implementation
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchMembers)
// - src/app/teams/components/assignment/assignmentUtils.ts (getTeamMembersAndRoster)
// - src/app/hooks/useEnhancedTeamData.ts (fetchMembers)
// - src/app/hooks/useTeamData.ts (fetchMembers)
// - src/app/teams/components/PeopleTab.tsx (loadMembers)
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex member retrieval logic with multiple data sources
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  let teamId: string | undefined;
  let user: Awaited<ReturnType<typeof getServerUser>>;

  try {
    const envError = validateEnvironment();
    if (envError) {
      return envError;
    }

    user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

    const { teamId: paramTeamId } = await params;
    teamId = paramTeamId;
    const { searchParams } = new URL(request.url);
    const subteamIdParam = searchParams.get("subteamId");

    // Validate subteamId format if provided using Zod
    let subteamId: string | null = null;
    if (subteamIdParam) {
      try {
        UUIDSchema.parse(subteamIdParam);
        subteamId = subteamIdParam;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return handleValidationError(error);
        }
        return handleValidationError(
          new z.ZodError([
            {
              code: z.ZodIssueCode.custom,
              message: "Invalid subteam ID format. Must be a valid UUID.",
              path: ["subteamId"],
            },
          ])
        );
      }
    }

    const groupResult = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (groupResult.length === 0 || !groupResult[0]?.id) {
      return handleNotFoundError("Team group");
    }

    const groupId = groupResult[0].id;
    const teamAccess = await getTeamAccess(user.id, groupId);

    if (!teamAccess.hasAccess) {
      return handleForbiddenError("Not authorized to access this team");
    }
    const allMembers = new Map<string, TeamMember>();

    // 1. Add team creator if they're not already a member
    if (teamAccess.isCreator) {
      const creatorInfo = await getUserDisplayInfo(user.id);
      allMembers.set(user.id, {
        id: user.id,
        name: creatorInfo.name,
        email: creatorInfo.email,
        username: creatorInfo.username,
        role: "creator",
        subteam: null, // Creator is not tied to a specific subteam
        joinedAt: null,
        events: [],
        isCreator: true,
      });
    }

    // Build the where conditions
    const whereConditions = [
      eq(newTeamUnits.groupId, groupId),
      eq(newTeamMemberships.status, "active"),
      eq(newTeamUnits.status, "active"),
    ];

    // Add subteam filter if specified
    if (subteamId) {
      whereConditions.push(eq(newTeamUnits.id, subteamId));
    }

    const members = await dbPg
      .select({
        userId: newTeamMemberships.userId,
        role: newTeamMemberships.role,
        joinedAt: newTeamMemberships.joinedAt,
        teamUnitId: newTeamUnits.id,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description,
      })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(and(...whereConditions));

    // Get user profiles for all members using Drizzle ORM
    const userIds = [...new Set(members.map((m) => m.userId))];

    // Only query user profiles if there are members (inArray with empty array can cause issues)
    const userProfiles =
      userIds.length > 0
        ? await dbPg
            .select({
              id: users.id,
              email: users.email,
              displayName: users.displayName,
              firstName: users.firstName,
              lastName: users.lastName,
              username: users.username,
            })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];

    const userProfileMap = new Map(userProfiles.map((profile) => [profile.id, profile]));

    // Add subteam members to the map
    for (const member of members) {
      const userProfile = userProfileMap.get(member.userId);

      // Use centralized display name generation utility
      const { name } = generateDisplayName(userProfile || null, member.userId);

      const email = userProfile?.email || `user-${member.userId.substring(0, 8)}@example.com`;

      // If user is already in map (as creator), add subteam info and update role
      if (allMembers.has(member.userId)) {
        const existingMember = allMembers.get(member.userId);
        if (existingMember) {
          // Update the main role to reflect their subteam role (captain/co_captain takes precedence over creator)
          if (["captain", "co_captain"].includes(member.role)) {
            existingMember.role = member.role;
          }

          if (!existingMember.subteams) {
            existingMember.subteams = [];
          }
          existingMember.subteams.push({
            id: member.teamUnitId,
            name: member.description || `Team ${member.teamId}`,
            description: member.description || null,
            role: member.role,
          });
        }
      } else {
        // Add as new member
        allMembers.set(member.userId, {
          id: member.userId,
          name,
          email,
          username: userProfile?.username,
          role: member.role,
          subteam: {
            id: member.teamUnitId,
            name: member.description || `Team ${member.teamId}`,
            description: member.description,
          },
          joinedAt: member.joinedAt,
          events: [],
          isCreator: false,
        });
      }
    }

    // Build the where conditions for linked roster
    const linkedRosterConditions = [
      eq(newTeamUnits.groupId, groupId),
      isNotNull(newTeamRosterData.userId),
    ];

    // Add subteam filter if specified
    if (subteamId) {
      linkedRosterConditions.push(eq(newTeamRosterData.teamUnitId, subteamId));
    }

    const linkedRosterResult = await dbPg
      .select({
        userId: newTeamRosterData.userId,
        teamUnitId: newTeamRosterData.teamUnitId,
        eventName: newTeamRosterData.eventName,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description,
      })
      .from(newTeamRosterData)
      .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
      .where(and(...linkedRosterConditions));

    // Group roster data by user and subteam
    const rosterDataByUser = new Map<string, Map<string, string[]>>();
    for (const rosterData of linkedRosterResult) {
      if (!rosterData.userId) {
        continue;
      }

      if (!rosterDataByUser.has(rosterData.userId)) {
        rosterDataByUser.set(rosterData.userId, new Map());
      }

      const userRosterData = rosterDataByUser.get(rosterData.userId);
      if (!userRosterData) {
        continue;
      }
      if (!userRosterData.has(rosterData.teamUnitId)) {
        userRosterData.set(rosterData.teamUnitId, []);
      }

      if (rosterData.eventName) {
        const eventArray = userRosterData.get(rosterData.teamUnitId);
        if (eventArray) {
          eventArray.push(rosterData.eventName);
        }
      }
    }

    // Update existing members with roster data
    rosterDataByUser.forEach((userRosterData, userId) => {
      const existingMember = allMembers.get(userId);
      if (existingMember) {
        // Initialize subteams array if it doesn't exist
        if (!existingMember.subteams) {
          existingMember.subteams = [];
        }

        // Update or add subteam information with events
        userRosterData.forEach((events, teamUnitId) => {
          const subteamInfo = {
            id: teamUnitId,
            name:
              linkedRosterResult.find((r) => r.teamUnitId === teamUnitId)?.description ||
              `Team ${linkedRosterResult.find((r) => r.teamUnitId === teamUnitId)?.teamId}`,
            description: linkedRosterResult.find((r) => r.teamUnitId === teamUnitId)?.description,
            events: [...new Set(events)], // Remove duplicates
          };

          // Check if this subteam is already in the array
          const existingSubteamIndex = existingMember.subteams?.findIndex(
            (s: { id: string }) => s.id === teamUnitId
          );
          if (
            existingSubteamIndex !== undefined &&
            existingSubteamIndex >= 0 &&
            existingMember.subteams
          ) {
            // Update existing subteam with events
            const subteam = existingMember.subteams[existingSubteamIndex] as {
              id: string;
              name: string;
              description: string | null;
              role: string;
              events?: string[];
            };
            subteam.events = subteamInfo.events;
          } else {
            // Add new subteam
            existingMember.subteams?.push({
              id: subteamInfo.id,
              name: subteamInfo.name,
              description: subteamInfo.description || null,
              role: "member",
              events: subteamInfo.events,
            });
          }

          // For backward compatibility, set the primary subteam (first one or most recent)
          if (!existingMember.subteam || existingMember.subteams?.length === 1) {
            existingMember.subteam = {
              id: subteamInfo.id,
              name: subteamInfo.name,
              description: subteamInfo.description || null,
            };
          }
        });

        // Combine all events from all subteams
        const allEvents = existingMember.subteams?.flatMap(
          (s: { events?: string[] }) => s.events || []
        );
        existingMember.events = [...new Set(allEvents)]; // Remove duplicates
      }
    });

    // Build the where conditions for unlinked roster
    const unlinkedRosterConditions = [
      eq(newTeamUnits.groupId, groupId),
      isNotNull(newTeamRosterData.studentName),
      ne(newTeamRosterData.studentName, ""),
      isNull(newTeamRosterData.userId),
    ];

    // Add subteam filter if specified
    if (subteamId) {
      unlinkedRosterConditions.push(eq(newTeamRosterData.teamUnitId, subteamId));
    }

    const unlinkedRosterResult = await dbPg
      .select({
        studentName: newTeamRosterData.studentName,
        teamUnitId: newTeamRosterData.teamUnitId,
        eventName: newTeamRosterData.eventName,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description,
      })
      .from(newTeamRosterData)
      .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
      .where(and(...unlinkedRosterConditions));

    // Group unlinked roster data by student name and subteam
    const unlinkedRosterByStudent = new Map<string, Map<string, string[]>>();
    for (const rosterMember of unlinkedRosterResult) {
      if (!rosterMember.studentName) {
        continue;
      }

      if (!unlinkedRosterByStudent.has(rosterMember.studentName)) {
        unlinkedRosterByStudent.set(rosterMember.studentName, new Map());
      }

      const studentRosterData = unlinkedRosterByStudent.get(rosterMember.studentName);
      if (!studentRosterData) {
        continue;
      }
      if (!studentRosterData.has(rosterMember.teamUnitId)) {
        studentRosterData.set(rosterMember.teamUnitId, []);
      }

      if (rosterMember.eventName) {
        studentRosterData.get(rosterMember.teamUnitId)?.push(rosterMember.eventName);
      }
    }

    // Add unlinked roster members to the map with their events
    unlinkedRosterByStudent.forEach((studentRosterData, studentName) => {
      studentRosterData.forEach((events, teamUnitId) => {
        const memberKey = `roster-${studentName}-${teamUnitId}`;

        // Get the subteam info from the first roster entry for this student/subteam
        const firstEntry = unlinkedRosterResult.find(
          (r) => r.studentName === studentName && r.teamUnitId === teamUnitId
        );

        if (firstEntry) {
          allMembers.set(memberKey, {
            id: null, // No user ID for unlinked members
            name: studentName,
            email: null, // No email for unlinked members
            username: "unknown", // Special username for unlinked members
            role: "unlinked", // Special role for unlinked members
            isUnlinked: true,
            subteam: {
              id: teamUnitId,
              name: firstEntry.description || `Team ${firstEntry.teamId}`,
              description: firstEntry.description,
            },
            joinedAt: null,
            events: [...new Set(events)], // Remove duplicates
            isCreator: false,
            hasPendingLinkInvite: false, // Will be updated below if there's a pending invitation
          });
        }
      });
    });

    const pendingInviteConditions = [eq(rosterLinkInvitations.status, "pending")];

    // Add subteam filter if specified
    if (subteamId) {
      pendingInviteConditions.push(eq(rosterLinkInvitations.teamId, subteamId));
    }

    const pendingInvites = await dbPg
      .select({
        studentName: rosterLinkInvitations.studentName,
        teamId: rosterLinkInvitations.teamId,
        invitedBy: rosterLinkInvitations.invitedBy,
        createdAt: rosterLinkInvitations.createdAt,
      })
      .from(rosterLinkInvitations)
      .where(and(...pendingInviteConditions));

    // console.log('✅ [MEMBERS API] Fetched pending roster link invitations', {
    //   count: pendingInvites.length,
    //   invites: pendingInvites.map(i => ({ studentName: i.studentName, teamId: i.teamId }))
    // });

    // Update members with pending link invite status
    for (const invite of pendingInvites) {
      const memberKey = `roster-${invite.studentName}-${invite.teamId}`;
      const member = allMembers.get(memberKey);
      if (member) {
        member.hasPendingLinkInvite = true;
      }
    }
    const membersWithRosterData = new Set(rosterDataByUser.keys());

    allMembers.forEach((member, _memberId) => {
      // Skip unlinked roster members
      if (member.isUnlinked) {
        return;
      }

      // If member has no roster data, set their subteam to "Unknown team"
      // This applies to both regular members and creators who are also members
      if (member.id && !membersWithRosterData.has(member.id)) {
        member.subteam = {
          id: null,
          name: "Unknown team",
          description: "Not assigned to any roster",
        };

        // Clear subteams array and events since they're not on roster
        member.subteams = [];
        member.events = [];
      }
    });

    // Convert map to array
    const formattedMembers = Array.from(allMembers.values());

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    // Log error for debugging in development
    // Development logging can be added here if needed
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
