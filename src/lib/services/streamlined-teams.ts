import { dbPg } from '@/lib/db';
import { 
  newTeamGroups, 
  newTeamUnits, 
  newTeamMemberships, 
  newTeamRosterData,
  users,
  rosterLinkInvitations
} from '@/lib/db/schema';
import { eq, and, isNotNull, isNull, ne, inArray } from 'drizzle-orm';
import { getTeamAccess, getUserDisplayInfo } from '@/lib/utils/team-auth-v2';
import { generateDisplayName } from '@/lib/utils/displayNameUtils';
import { 
  TeamGroup, 
  TeamUnit, 
  TeamMembership, 
  GetTeamDataRequest, 
  TeamDataResponse 
} from '@/lib/schemas/team';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { checkTeamGroupAccessCockroach } from '@/lib/utils/team-auth';

/**
 * Streamlined Teams Service
 * 
 * This service provides optimized, batched data fetching for teams with:
 * - Single API endpoint for all team data
 * - Intelligent caching with Redis/memory
 * - Optimized database queries with joins
 * - Background refresh capabilities
 * - Request deduplication
 */

export class StreamlinedTeamsService {
  private static instance: StreamlinedTeamsService;
  private cache = new Map<string, { data: any; timestamp: number; promise?: Promise<any> }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly BACKGROUND_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

  static getInstance(): StreamlinedTeamsService {
    if (!StreamlinedTeamsService.instance) {
      StreamlinedTeamsService.instance = new StreamlinedTeamsService();
    }
    return StreamlinedTeamsService.instance;
  }

  /**
   * Get comprehensive team data in a single optimized query
   */
  async getTeamData(userId: string, request: GetTeamDataRequest): Promise<TeamDataResponse> {
    const cacheKey = `team-data-${request.teamSlug}-${userId}-${JSON.stringify(request)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    // Return existing promise if already fetching
    if (cached?.promise) {
      return cached.promise;
    }

    // Create new fetch promise
    const promise = this.fetchTeamData(userId, request);
    
    // Store promise to prevent duplicate requests
    this.cache.set(cacheKey, { 
      data: cached?.data, 
      timestamp: cached?.timestamp || 0, 
      promise 
    });

    try {
      const result = await promise;
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      this.cache.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Fetch team data with optimized database queries
   */
  private async fetchTeamData(userId: string, request: GetTeamDataRequest): Promise<TeamDataResponse> {
    const startTime = Date.now();

    try {
      // 1. Get team group info
      const teamGroup = await dbPg
        .select()
        .from(newTeamGroups)
        .where(eq(newTeamGroups.slug, request.teamSlug))
        .limit(1);

      if (teamGroup.length === 0) {
        throw new Error('Team not found');
      }

      const group = teamGroup[0];

      // 2. Check user access
      const teamAccess = await getTeamAccess(userId, group.id);
      if (!teamAccess.hasAccess) {
        throw new Error('Not authorized to access this team');
      }

      // 3. Build response object
      const response: TeamDataResponse = {
        team: group as TeamGroup
      };

      // 4. Fetch subteams if requested
      if (request.includeSubteams) {
        const subteams = await dbPg
          .select()
          .from(newTeamUnits)
          .where(
            and(
              eq(newTeamUnits.groupId, group.id),
              eq(newTeamUnits.status, 'active')
            )
          )
          .orderBy(newTeamUnits.createdAt);

        response.subteams = subteams as TeamUnit[];
      }

      // 5. Fetch members if requested
      if (request.includeMembers) {
        const members = await this.getTeamMembers(group.id, request.subteamId);
        response.members = members;
      }

      // 6. Fetch roster if requested
      if (request.includeRoster && request.subteamId) {
        const rosterData = await this.getTeamRoster(request.subteamId);
        response.roster = rosterData.roster;
        response.removedEvents = rosterData.removedEvents;
      }

      // 7. Fetch stream if requested
      if (request.includeStream && request.subteamId) {
        // TODO: Implement stream data fetching
        response.stream = [];
      }

      // 8. Fetch assignments if requested
      if (request.includeAssignments) {
        // TODO: Implement assignments data fetching
        response.assignments = [];
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [STREAMLINED TEAMS] Fetched team data in ${duration}ms`, {
        teamSlug: request.teamSlug,
        userId,
        includeSubteams: request.includeSubteams,
        includeMembers: request.includeMembers,
        includeRoster: request.includeRoster
      });

      return response;

    } catch (error) {
      console.error('❌ [STREAMLINED TEAMS] Error fetching team data:', error);
      throw error;
    }
  }

  /**
   * Get team members with optimized query
   */
  private async getTeamMembers(groupId: string, subteamId?: string) {
    const allMembers = new Map<string, any>();

    // Get subteam memberships with user info in a single query
    const whereConditions = [
      eq(newTeamUnits.groupId, groupId),
      eq(newTeamMemberships.status, 'active'),
      eq(newTeamUnits.status, 'active')
    ];

    if (subteamId) {
      whereConditions.push(eq(newTeamUnits.id, subteamId));
    }

    const memberships = await dbPg
      .select({
        userId: newTeamMemberships.userId,
        role: newTeamMemberships.role,
        joinedAt: newTeamMemberships.joinedAt,
        teamUnitId: newTeamUnits.id,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description,
        email: users.email,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username
      })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .leftJoin(users, eq(newTeamMemberships.userId, users.id))
      .where(and(...whereConditions));

    // Process memberships
    for (const membership of memberships) {
      const { name } = generateDisplayName({
        displayName: membership.displayName,
        firstName: membership.firstName,
        lastName: membership.lastName,
        email: membership.email
      }, membership.userId);

      const member = {
        id: membership.userId,
        name,
        email: membership.email,
        username: membership.username,
        role: membership.role,
        subteam: {
          id: membership.teamUnitId,
          name: membership.description || `Team ${membership.teamId}`,
          teamId: membership.teamId
        },
        joinedAt: membership.joinedAt,
        events: [],
        isCreator: false,
        isUnlinked: false
      };

      allMembers.set(membership.userId, member);
    }

    // Add unlinked roster members
    const unlinkedRoster = await this.getUnlinkedRosterMembers(groupId, subteamId);
    for (const rosterMember of unlinkedRoster) {
      allMembers.set(`roster-${rosterMember.studentName}-${rosterMember.teamUnitId}`, {
        id: null,
        name: rosterMember.studentName,
        email: null,
        username: 'unknown',
        role: 'unlinked',
        subteam: {
          id: rosterMember.teamUnitId,
          name: rosterMember.description || `Team ${rosterMember.teamId}`,
          teamId: rosterMember.teamId
        },
        joinedAt: null,
        events: [],
        isCreator: false,
        isUnlinked: true
      });
    }

    return Array.from(allMembers.values());
  }

  /**
   * Get unlinked roster members
   */
  private async getUnlinkedRosterMembers(groupId: string, subteamId?: string) {
    const whereConditions = [
      eq(newTeamUnits.groupId, groupId),
      isNotNull(newTeamRosterData.studentName),
      ne(newTeamRosterData.studentName, ''),
      isNull(newTeamRosterData.userId)
    ];

    if (subteamId) {
      whereConditions.push(eq(newTeamRosterData.teamUnitId, subteamId));
    }

    return await dbPg
      .select({
        studentName: newTeamRosterData.studentName,
        teamUnitId: newTeamRosterData.teamUnitId,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description
      })
      .from(newTeamRosterData)
      .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
      .where(and(...whereConditions));
  }

  /**
   * Get team roster data
   */
  private async getTeamRoster(subteamId: string) {
    // Get roster data from CockroachDB
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
      [subteamId]
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
      [subteamId]
    );

    // Process roster data
    const roster: Record<string, string[]> = {};
    rosterResult.rows.forEach(row => {
      if (!roster[row.event_name]) {
        roster[row.event_name] = [];
      }
      roster[row.event_name][row.slot_index] = row.student_name || '';
    });

    const removedEvents = removedEventsResult.rows.map(row => row.event_name);

    return { roster, removedEvents };
  }

  /**
   * Get user teams with caching
   */
  async getUserTeams(userId: string) {
    const cacheKey = `user-teams-${userId}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    if (cached?.promise) {
      return cached.promise;
    }

    const promise = this.fetchUserTeams(userId);
    this.cache.set(cacheKey, { 
      data: cached?.data, 
      timestamp: cached?.timestamp || 0, 
      promise 
    });

    try {
      const result = await promise;
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      this.cache.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Fetch user teams from database
   */
  private async fetchUserTeams(userId: string) {
    // This would use the existing cockroachDBTeamsService
    // but with caching and optimization
    const { cockroachDBTeamsService } = await import('@/lib/services/cockroachdb-teams');
    return await cockroachDBTeamsService.getUserTeams(userId);
  }

  /**
   * Invalidate cache for a specific key or all cache
   */
  invalidateCache(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Start background refresh for a cache key
   */
  startBackgroundRefresh(key: string, fetcher: () => Promise<any>) {
    const interval = setInterval(async () => {
      try {
        const data = await fetcher();
        this.cache.set(key, { data, timestamp: Date.now() });
      } catch (error) {
        console.error('Background refresh failed:', error);
      }
    }, this.BACKGROUND_REFRESH_INTERVAL);

    // Store interval ID for cleanup
    return () => clearInterval(interval);
  }
}

// Export singleton instance
export const streamlinedTeamsService = StreamlinedTeamsService.getInstance();
