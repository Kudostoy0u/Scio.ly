import { router, protectedProcedure } from '../server';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { dbPg } from '@/lib/db';
import { cockroachDBTeamsService } from '@/lib/services/cockroachdb-teams';
import { newTeamGroups, newTeamUnits, newTeamMemberships, users} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getTeamAccess, getUserDisplayInfo } from '@/lib/utils/team-auth-v2';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { checkTeamGroupAccessCockroach } from '@/lib/utils/team-auth';

// Batch procedure for loading all team data at once
export const teamsRouter = router({
  // Get user teams
  getUserTeams: protectedProcedure.query(async ({ ctx }) => {
    const teams = await cockroachDBTeamsService.getUserTeams(ctx.user.id);
    return { teams };
  }),

  // Get subteams for a team
  getSubteams: protectedProcedure
    .input(z.object({ teamSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const groupResult = await dbPg
        .select({ id: newTeamGroups.id })
        .from(newTeamGroups)
        .where(eq(newTeamGroups.slug, input.teamSlug));

      if (groupResult.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team group not found' });
      }

      const groupId = groupResult[0].id;
      const teamAccess = await getTeamAccess(ctx.user.id, groupId);

      if (!teamAccess.hasAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this team' });
      }

      const subteamsResult = await dbPg
        .select({
          id: newTeamUnits.id,
          teamId: newTeamUnits.teamId,
          description: newTeamUnits.description,
          createdAt: newTeamUnits.createdAt
        })
        .from(newTeamUnits)
        .where(
          and(
            eq(newTeamUnits.groupId, groupId),
            eq(newTeamUnits.status, 'active')
          )
        )
        .orderBy(newTeamUnits.createdAt);

      const subteams = subteamsResult.map(subteam => ({
        id: subteam.id,
        name: subteam.description || `Team ${subteam.teamId}`,
        teamId: subteam.teamId,
        description: subteam.description,
        createdAt: subteam.createdAt
      }));

      return { subteams };
    }),

  // Get people/members for a subteam (alias for getMembers)
  getPeople: protectedProcedure
    .input(z.object({ 
      teamSlug: z.string(), 
      subteamId: z.string().optional() 
    }))
    .query(async ({ ctx, input }) => {
      const groupResult = await dbPg
        .select({ id: newTeamGroups.id })
        .from(newTeamGroups)
        .where(eq(newTeamGroups.slug, input.teamSlug));

      if (groupResult.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team group not found' });
      }

      const groupId = groupResult[0].id;
      const teamAccess = await getTeamAccess(ctx.user.id, groupId);

      if (!teamAccess.hasAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this team' });
      }

      // Build query based on subteamId filter
      const whereConditions: any[] = [
        eq(newTeamUnits.groupId, groupId),
        eq(newTeamUnits.status, 'active')
      ];

      if (input.subteamId && input.subteamId !== 'all') {
        whereConditions.push(eq(newTeamMemberships.teamId, input.subteamId));
      }

      const results = await dbPg
        .select({
          userId: newTeamMemberships.userId,
          role: newTeamMemberships.role,
          joinedAt: newTeamMemberships.joinedAt,
          subteamId: newTeamMemberships.teamId,
          email: users.email,
        })
        .from(newTeamMemberships)
        .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
        .leftJoin(users, eq(newTeamMemberships.userId, users.id))
        .where(and(...whereConditions));

      const members = await Promise.all(
        results.map(async (result) => {
          const displayInfo = await getUserDisplayInfo(result.userId);
          return {
            userId: result.userId,
            role: result.role,
            joinedAt: result.joinedAt,
            subteamId: result.subteamId,
            email: result.email || null,
            displayFirstName: displayInfo.name,
            displayLastName: '',
            hasRosterEntry: false,
            hasPendingInvite: false,
          };
        })
      );

      return { members };
    }),

  // Get members for a subteam
  getMembers: protectedProcedure
    .input(z.object({ 
      teamSlug: z.string(), 
      subteamId: z.string().optional() 
    }))
    .query(async ({ ctx, input }) => {
      const groupResult = await dbPg
        .select({ id: newTeamGroups.id })
        .from(newTeamGroups)
        .where(eq(newTeamGroups.slug, input.teamSlug));

      if (groupResult.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team group not found' });
      }

      const groupId = groupResult[0].id;
      const teamAccess = await getTeamAccess(ctx.user.id, groupId);

      if (!teamAccess.hasAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this team' });
      }

      // Build query based on subteamId filter
      const whereConditions: any[] = [
        eq(newTeamUnits.groupId, groupId),
        eq(newTeamUnits.status, 'active')
      ];

      if (input.subteamId && input.subteamId !== 'all') {
        whereConditions.push(eq(newTeamMemberships.teamId, input.subteamId));
      }

      const results = await dbPg
        .select({
          userId: newTeamMemberships.userId,
          role: newTeamMemberships.role,
          joinedAt: newTeamMemberships.joinedAt,
          subteamId: newTeamMemberships.teamId,
          email: users.email,
        })
        .from(newTeamMemberships)
        .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
        .leftJoin(users, eq(newTeamMemberships.userId, users.id))
        .where(and(...whereConditions));

      const members = await Promise.all(
        results.map(async (result) => {
          const displayInfo = await getUserDisplayInfo(result.userId);
          return {
            userId: result.userId,
            role: result.role,
            joinedAt: result.joinedAt,
            subteamId: result.subteamId,
            email: result.email || null,
            displayFirstName: displayInfo.name,
            displayLastName: '',
            hasRosterEntry: false,
            hasPendingInvite: false,
          };
        })
      );

      return { members };
    }),

  // Get roster for a subteam
  getRoster: protectedProcedure
    .input(z.object({ 
      teamSlug: z.string(), 
      subteamId: z.string() 
    }))
    .query(async ({ ctx, input }) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(input.subteamId)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid subteam ID format' });
      }

      const groupResult = await queryCockroachDB<{ id: string }>(
        `SELECT id FROM new_team_groups WHERE slug = $1`,
        [input.teamSlug]
      );

      if (groupResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team group not found' });
      }

      const groupId = groupResult.rows[0].id;
      const authResult = await checkTeamGroupAccessCockroach(ctx.user.id, groupId);
      
      if (!authResult.isAuthorized) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to access this team' });
      }

      const rosterResult = await queryCockroachDB<{
        event_name: string;
        slot_index: number;
        student_name: string;
        user_id: string;
      }>(
        `SELECT event_name, slot_index, student_name, user_id 
         FROM new_team_roster_data 
         WHERE team_unit_id = $1 
         ORDER BY event_name, slot_index`,
        [input.subteamId]
      );

      const removedEventsResult = await queryCockroachDB<{
        event_name: string;
        conflict_block: string;
        removed_at: string;
      }>(
        `SELECT event_name, conflict_block, removed_at 
         FROM new_team_removed_events 
         WHERE team_unit_id = $1 
         ORDER BY removed_at DESC`,
        [input.subteamId]
      );

      const roster: Record<string, string[]> = {};
      rosterResult.rows.forEach(row => {
        if (!roster[row.event_name]) {
          roster[row.event_name] = [];
        }
        roster[row.event_name][row.slot_index] = row.student_name || '';
      });

      const removedEvents = removedEventsResult.rows.map(row => row.event_name);

      return { roster, removedEvents };
    }),

  // Batch load all team data for hydration
  batchLoadTeamData: protectedProcedure
    .input(z.object({ 
      teamSlug: z.string(),
      subteamId: z.string().optional(),
      includeRoster: z.boolean().optional()
    }))
    .query(async ({ ctx, input }) => {
      // This is the key procedure that batches multiple data fetches
      const [subteamsRes, membersRes, rosterRes] = await Promise.allSettled([
        // Fetch subteams
        (async () => {
          const groupResult = await dbPg
            .select({ id: newTeamGroups.id })
            .from(newTeamGroups)
            .where(eq(newTeamGroups.slug, input.teamSlug));

          if (groupResult.length === 0) return null;

          const groupId = groupResult[0].id;
          const teamAccess = await getTeamAccess(ctx.user.id, groupId);

          if (!teamAccess.hasAccess) return null;

          const subteamsResult = await dbPg
            .select({
              id: newTeamUnits.id,
              teamId: newTeamUnits.teamId,
              description: newTeamUnits.description,
              createdAt: newTeamUnits.createdAt
            })
            .from(newTeamUnits)
            .where(
              and(
                eq(newTeamUnits.groupId, groupId),
                eq(newTeamUnits.status, 'active')
              )
            )
            .orderBy(newTeamUnits.createdAt);

          return subteamsResult.map(subteam => ({
            id: subteam.id,
            name: subteam.description || `Team ${subteam.teamId}`,
            teamId: subteam.teamId,
            description: subteam.description,
            createdAt: subteam.createdAt
          }));
        })(),

        // Fetch members
        input.subteamId ? (async () => {
          const groupResult = await dbPg
            .select({ id: newTeamGroups.id })
            .from(newTeamGroups)
            .where(eq(newTeamGroups.slug, input.teamSlug));

          if (groupResult.length === 0) return null;

          const groupId = groupResult[0].id;
          const teamAccess = await getTeamAccess(ctx.user.id, groupId);

          if (!teamAccess.hasAccess) return null;

          const memberWhereConditions = input.subteamId !== 'all'
            ? and(
                eq(newTeamUnits.groupId, groupId),
                eq(newTeamUnits.status, 'active'),
                sql`${newTeamMemberships.teamId} = ${input.subteamId}`
              )
            : and(
                eq(newTeamUnits.groupId, groupId),
                eq(newTeamUnits.status, 'active')
              );

          const results = await dbPg
            .select({
              userId: newTeamMemberships.userId,
              role: newTeamMemberships.role,
              joinedAt: newTeamMemberships.joinedAt,
              subteamId: newTeamMemberships.teamId,
              email: users.email,
            })
            .from(newTeamMemberships)
            .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
            .leftJoin(users, eq(newTeamMemberships.userId, users.id))
            .where(memberWhereConditions);

          return await Promise.all(
            results.map(async (result) => {
              const displayInfo = await getUserDisplayInfo(result.userId);
              return {
                userId: result.userId,
                role: result.role,
                joinedAt: result.joinedAt,
                subteamId: result.subteamId,
                email: result.email || null,
                displayFirstName: displayInfo.name,
                displayLastName: '',
              };
            })
          );
        })() : Promise.resolve(null),

        // Fetch roster if requested
        (input.includeRoster && input.subteamId && input.subteamId !== 'all') ? (async () => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(input.subteamId!)) return null;

          const groupResult = await queryCockroachDB<{ id: string }>(
            `SELECT id FROM new_team_groups WHERE slug = $1`,
            [input.teamSlug]
          );

          if (groupResult.rows.length === 0) return null;

          const groupId = groupResult.rows[0].id;
          const authResult = await checkTeamGroupAccessCockroach(ctx.user.id, groupId);
          
          if (!authResult.isAuthorized) return null;

          const rosterResult = await queryCockroachDB<{
            event_name: string;
            slot_index: number;
            student_name: string;
            user_id: string;
          }>(
            `SELECT event_name, slot_index, student_name, user_id 
             FROM new_team_roster_data 
             WHERE team_unit_id = $1 
             ORDER BY event_name, slot_index`,
            [input.subteamId!]
          );

          const removedEventsResult = await queryCockroachDB<{
            event_name: string;
            conflict_block: string;
            removed_at: string;
          }>(
            `SELECT event_name, conflict_block, removed_at 
             FROM new_team_removed_events 
             WHERE team_unit_id = $1 
             ORDER BY removed_at DESC`,
            [input.subteamId!]
          );

          const roster: Record<string, string[]> = {};
          rosterResult.rows.forEach(row => {
            if (!roster[row.event_name]) {
              roster[row.event_name] = [];
            }
            roster[row.event_name][row.slot_index] = row.student_name || '';
          });

          const removedEvents = removedEventsResult.rows.map(row => row.event_name);

          return { roster, removedEvents };
        })() : Promise.resolve(null)
      ]);

      return {
        subteams: subteamsRes.status === 'fulfilled' ? subteamsRes.value : null,
        members: membersRes.status === 'fulfilled' ? membersRes.value : null,
        roster: rosterRes.status === 'fulfilled' ? rosterRes.value : null,
      };
    }),
});

