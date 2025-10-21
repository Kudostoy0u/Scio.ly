import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { dbPg } from '@/lib/db';
import { 
  newTeamGroups, 
  newTeamMemberships, 
  newTeamUnits, 
  newTeamRosterData, 
  newTeamPosts, 
  newTeamAssignments, 
  newTeamEvents,
  users
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import logger from '@/lib/utils/logger';

// Zod validation schemas
const TeamDataResponseSchema = z.object({
  team: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    school: z.string(),
    division: z.string(),
    description: z.string().nullable(),
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable()
  }),
  subteams: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    teamId: z.string(),
    createdAt: z.string().nullable()
  })),
  members: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    role: z.string(),
    joinedAt: z.string().nullable().optional(),
    subteamId: z.string(),
    subteam: z.any().nullable().optional(),
    events: z.array(z.string()),
    eventCount: z.number(),
    avatar: z.string().nullable().optional(),
    isOnline: z.boolean(),
    hasPendingInvite: z.boolean(),
    hasPendingLinkInvite: z.boolean(),
    isPendingInvitation: z.boolean(),
    invitationCode: z.string().nullable().optional(),
    isUnlinked: z.boolean(),
    conflicts: z.array(z.string()),
    isCreator: z.boolean()
  })),
  roster: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
  stream: z.array(z.object({
    id: z.string(),
    content: z.string(),
    authorId: z.string(),
    authorName: z.string(),
    authorEmail: z.string().nullable().optional(),
    authorUsername: z.string().nullable().optional(),
    authorPhotoUrl: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    postType: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    isPinned: z.boolean().nullable().optional(),
    isPublic: z.boolean().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional()
  })),
  assignments: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    assignmentType: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    points: z.number().nullable().optional(),
    isRequired: z.boolean().nullable().optional(),
    maxAttempts: z.number().nullable().optional(),
    timeLimitMinutes: z.number().nullable().optional(),
    eventName: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    createdBy: z.string()
  })),
  tournaments: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    eventType: z.string().nullable().optional(),
    startTime: z.string().nullable().optional(),
    endTime: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    isAllDay: z.boolean().nullable().optional(),
    isRecurring: z.boolean().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional()
  })),
  timers: z.array(z.any()),
  userTeams: z.array(z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    school: z.string(),
    division: z.string(),
    description: z.string().nullable().optional(),
    role: z.string(),
    joinedAt: z.string().nullable().optional()
  }))
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const subteamId = searchParams.get('subteamId');

  if (!teamId) {
    return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
  }

  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get team group by slug
    const groupResult = await dbPg
      .select({
        id: newTeamGroups.id,
        school: newTeamGroups.school,
        division: newTeamGroups.division,
        slug: newTeamGroups.slug,
        description: newTeamGroups.description,
        createdBy: newTeamGroups.createdBy,
        createdAt: newTeamGroups.createdAt,
        updatedAt: newTeamGroups.updatedAt,
        settings: newTeamGroups.settings,
        status: newTeamGroups.status
      })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (groupResult.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const group = groupResult[0];

    // Get team units (subteams)
    const unitsResult = await dbPg
      .select({
        id: newTeamUnits.id,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description,
        captainCode: newTeamUnits.captainCode,
        userCode: newTeamUnits.userCode,
        createdBy: newTeamUnits.createdBy,
        createdAt: newTeamUnits.createdAt,
        updatedAt: newTeamUnits.updatedAt,
        settings: newTeamUnits.settings,
        status: newTeamUnits.status
      })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, group.id));

    // Get team memberships with user data
    const membershipsResult = await dbPg
      .select({
        id: newTeamMemberships.id,
        userId: newTeamMemberships.userId,
        teamId: newTeamMemberships.teamId,
        role: newTeamMemberships.role,
        joinedAt: newTeamMemberships.joinedAt,
        invitedBy: newTeamMemberships.invitedBy,
        status: newTeamMemberships.status,
        permissions: newTeamMemberships.permissions,
        // User data
        userEmail: users.email,
        userUsername: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userDisplayName: users.displayName,
        userPhotoUrl: users.photoUrl
      })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .innerJoin(users, eq(newTeamMemberships.userId, users.id))
      .where(
        and(
          eq(newTeamUnits.groupId, group.id),
          eq(newTeamMemberships.status, 'active')
        )
      );

    // Get roster data
    const rosterResult = await dbPg
      .select({
        teamUnitId: newTeamRosterData.teamUnitId,
        eventName: newTeamRosterData.eventName,
        studentName: newTeamRosterData.studentName,
        userId: newTeamRosterData.userId,
        createdAt: newTeamRosterData.createdAt,
        updatedAt: newTeamRosterData.updatedAt
      })
      .from(newTeamRosterData)
      .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
      .where(eq(newTeamUnits.groupId, group.id));

    // Get stream posts with author data
    const postsResult = await dbPg
      .select({
        id: newTeamPosts.id,
        teamId: newTeamPosts.teamId,
        content: newTeamPosts.content,
        authorId: newTeamPosts.authorId,
        title: newTeamPosts.title,
        postType: newTeamPosts.postType,
        priority: newTeamPosts.priority,
        isPinned: newTeamPosts.isPinned,
        isPublic: newTeamPosts.isPublic,
        createdAt: newTeamPosts.createdAt,
        updatedAt: newTeamPosts.updatedAt,
        // Author data
        authorEmail: users.email,
        authorUsername: users.username,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorDisplayName: users.displayName,
        authorPhotoUrl: users.photoUrl
      })
      .from(newTeamPosts)
      .innerJoin(newTeamUnits, eq(newTeamPosts.teamId, newTeamUnits.id))
      .innerJoin(users, eq(newTeamPosts.authorId, users.id))
      .where(
        and(
          eq(newTeamUnits.groupId, group.id),
          subteamId ? eq(newTeamPosts.teamId, subteamId) : undefined
        )
      )
      .orderBy(desc(newTeamPosts.createdAt))
      .limit(50);

    // Get assignments
    const assignmentsResult = await dbPg
      .select({
        id: newTeamAssignments.id,
        teamId: newTeamAssignments.teamId,
        title: newTeamAssignments.title,
        description: newTeamAssignments.description,
        assignmentType: newTeamAssignments.assignmentType,
        dueDate: newTeamAssignments.dueDate,
        points: newTeamAssignments.points,
        isRequired: newTeamAssignments.isRequired,
        maxAttempts: newTeamAssignments.maxAttempts,
        timeLimitMinutes: newTeamAssignments.timeLimitMinutes,
        eventName: newTeamAssignments.eventName,
        createdAt: newTeamAssignments.createdAt,
        updatedAt: newTeamAssignments.updatedAt,
        createdBy: newTeamAssignments.createdBy
      })
      .from(newTeamAssignments)
      .innerJoin(newTeamUnits, eq(newTeamAssignments.teamId, newTeamUnits.id))
      .where(eq(newTeamUnits.groupId, group.id))
      .orderBy(desc(newTeamAssignments.createdAt));

    // Get tournaments
    const tournamentsResult = await dbPg
      .select({
        id: newTeamEvents.id,
        teamId: newTeamEvents.teamId,
        title: newTeamEvents.title,
        description: newTeamEvents.description,
        eventType: newTeamEvents.eventType,
        startTime: newTeamEvents.startTime,
        endTime: newTeamEvents.endTime,
        location: newTeamEvents.location,
        isAllDay: newTeamEvents.isAllDay,
        isRecurring: newTeamEvents.isRecurring,
        createdAt: newTeamEvents.createdAt,
        updatedAt: newTeamEvents.updatedAt
      })
      .from(newTeamEvents)
      .innerJoin(newTeamUnits, eq(newTeamEvents.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamUnits.groupId, group.id),
          eq(newTeamEvents.eventType, 'tournament')
        )
      )
      .orderBy(desc(newTeamEvents.startTime));

    // Get user teams for the current user
    const userTeamsResult = await dbPg
      .select({
        id: newTeamGroups.id,
        school: newTeamGroups.school,
        division: newTeamGroups.division,
        slug: newTeamGroups.slug,
        description: newTeamGroups.description,
        role: newTeamMemberships.role,
        joinedAt: newTeamMemberships.joinedAt
      })
      .from(newTeamGroups)
      .innerJoin(newTeamUnits, eq(newTeamGroups.id, newTeamUnits.groupId))
      .innerJoin(newTeamMemberships, eq(newTeamUnits.id, newTeamMemberships.teamId))
      .where(
        and(
          eq(newTeamMemberships.userId, user.id),
          eq(newTeamMemberships.status, 'active')
        )
      );

    // Transform data to match expected format
    const data = {
      team: {
        id: group.id,
        name: group.school,
        slug: group.slug,
        school: group.school,
        division: group.division,
        description: group.description,
        createdAt: group.createdAt?.toISOString(),
        updatedAt: group.updatedAt?.toISOString()
      },
      subteams: unitsResult.map(unit => ({
        id: unit.id,
        name: unit.description || unit.teamId, // Use description as name, fallback to teamId
        description: unit.description,
        teamId: unit.teamId,
        createdAt: unit.createdAt?.toISOString()
      })),
      members: membershipsResult.map(membership => {
        // Generate display name from available user data
        const displayName = membership.userDisplayName || 
          (membership.userFirstName && membership.userLastName 
            ? `${membership.userFirstName} ${membership.userLastName}`.trim()
            : membership.userFirstName || membership.userLastName || membership.userUsername || 'Unknown User');
        
        // Get events for this member from roster data
        const memberEvents = rosterResult
          .filter(roster => roster.userId === membership.userId)
          .map(roster => roster.eventName);
        
        // Get subteam info
        const subteamInfo = unitsResult.find(unit => unit.id === membership.teamId);
        
        return {
          id: membership.userId,
          name: displayName,
          email: membership.userEmail || null,
          username: membership.userUsername || null,
          role: membership.role,
          joinedAt: membership.joinedAt?.toISOString() || null,
          subteamId: membership.teamId,
          subteam: subteamInfo ? {
            id: subteamInfo.id,
            name: subteamInfo.description || subteamInfo.teamId, // Use description as name, fallback to teamId
            description: subteamInfo.description
          } : null,
          events: memberEvents,
          eventCount: memberEvents.length,
          avatar: membership.userPhotoUrl || null,
          isOnline: false,
          hasPendingInvite: false,
          hasPendingLinkInvite: false,
          isPendingInvitation: false,
          invitationCode: null,
          isUnlinked: false,
          conflicts: [],
          isCreator: false
        };
      }),
      roster: rosterResult.reduce((acc, entry) => {
        if (!acc[entry.teamUnitId]) {
          acc[entry.teamUnitId] = {};
        }
        if (!acc[entry.teamUnitId][entry.eventName]) {
          acc[entry.teamUnitId][entry.eventName] = [];
        }
        if (entry.studentName) {
          acc[entry.teamUnitId][entry.eventName].push(entry.studentName);
        }
        return acc;
      }, {} as Record<string, Record<string, string[]>>),
      stream: postsResult.map(post => {
        // Generate author display name
        const authorDisplayName = post.authorDisplayName || 
          (post.authorFirstName && post.authorLastName 
            ? `${post.authorFirstName} ${post.authorLastName}`.trim()
            : post.authorFirstName || post.authorLastName || post.authorUsername || 'Unknown User');
        
        return {
          id: post.id,
          content: post.content,
          authorId: post.authorId,
          authorName: authorDisplayName,
          authorEmail: post.authorEmail || null,
          authorUsername: post.authorUsername || null,
          authorPhotoUrl: post.authorPhotoUrl || null,
          title: post.title || null,
          postType: post.postType || null,
          priority: post.priority || null,
          isPinned: post.isPinned || null,
          isPublic: post.isPublic || null,
          createdAt: post.createdAt?.toISOString() || null,
          updatedAt: post.updatedAt?.toISOString() || null
        };
      }),
      assignments: assignmentsResult.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description || null,
        assignmentType: assignment.assignmentType || null,
        dueDate: assignment.dueDate?.toISOString() || null,
        points: assignment.points || null,
        isRequired: assignment.isRequired || null,
        maxAttempts: assignment.maxAttempts || null,
        timeLimitMinutes: assignment.timeLimitMinutes || null,
        eventName: assignment.eventName || null,
        createdAt: assignment.createdAt?.toISOString() || null,
        updatedAt: assignment.updatedAt?.toISOString() || null,
        createdBy: assignment.createdBy
      })),
      tournaments: tournamentsResult.map(tournament => ({
        id: tournament.id,
        title: tournament.title,
        description: tournament.description || null,
        eventType: tournament.eventType || null,
        startTime: tournament.startTime?.toISOString() || null,
        endTime: tournament.endTime?.toISOString() || null,
        location: tournament.location || null,
        isAllDay: tournament.isAllDay || null,
        isRecurring: tournament.isRecurring || null,
        createdAt: tournament.createdAt?.toISOString() || null,
        updatedAt: tournament.updatedAt?.toISOString() || null
      })),
      timers: [], // Timers would need separate implementation
      userTeams: userTeamsResult.map(userTeam => ({
        id: userTeam.id,
        name: userTeam.school,
        slug: userTeam.slug,
        school: userTeam.school,
        division: userTeam.division,
        description: userTeam.description || null,
        role: userTeam.role,
        joinedAt: userTeam.joinedAt?.toISOString() || null
      }))
    };

    // Validate response data with Zod
    const validationResult = TeamDataResponseSchema.safeParse(data);
    if (!validationResult.success) {
      logger.error('Data validation failed:', validationResult.error);
      return NextResponse.json({ error: 'Data validation failed' }, { status: 500 });
    }

    logger.info('Successfully fetched all team data', { 
      teamId, 
      subteamId,
      subteamsCount: data.subteams.length,
      membersCount: data.members.length,
      postsCount: data.stream.length,
      assignmentsCount: data.assignments.length,
      tournamentsCount: data.tournaments.length
    });

    return NextResponse.json(validationResult.data, { status: 200 });
  } catch (error) {
    logger.error('Error fetching all team data:', error);
    return NextResponse.json({ error: 'Failed to fetch all team data' }, { status: 500 });
  }
}
