import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTeamAccessCockroach, hasLeadershipAccessCockroach } from '../team-auth-v2';
import { queryCockroachDB } from '@/lib/cockroachdb';

// Mock the CockroachDB query function
vi.mock('@/lib/cockroachdb', () => ({
  queryCockroachDB: vi.fn()
}));

const mockQueryCockroachDB = vi.mocked(queryCockroachDB);

describe('Team Authentication v2', () => {
  const mockUserId = 'user-123';
  const mockGroupId = 'group-456';
  const mockSubteamId = 'subteam-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getTeamAccessCockroach', () => {
    it('should grant access to team creator', async () => {
      // Mock team creator check
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [{ created_by: mockUserId }]
        })
        .mockResolvedValueOnce({ rows: [] }) // No subteam memberships
        .mockResolvedValueOnce({ rows: [] }); // No roster entries

      const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

      expect(result).toEqual({
        hasAccess: true,
        isCreator: true,
        hasSubteamMembership: false,
        hasRosterEntries: false,
        subteamRole: undefined,
        subteamMemberships: [],
        rosterSubteams: []
      });
    });

    it('should grant access to subteam member', async () => {
      // Mock not team creator
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            role: 'captain',
            team_id: mockSubteamId,
            subteam_id: mockSubteamId
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // No roster entries

      const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

      expect(result).toEqual({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamRole: 'captain',
        subteamMemberships: [{
          subteamId: mockSubteamId,
          teamId: mockSubteamId,
          role: 'captain'
        }],
        rosterSubteams: []
      });
    });

    it('should grant access to user with roster entries', async () => {
      // Mock not team creator, no subteam membership
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            subteam_id: mockSubteamId,
            team_id: mockSubteamId,
            student_name: 'John Doe'
          }]
        });

      const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

      expect(result).toEqual({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: false,
        hasRosterEntries: true,
        subteamRole: undefined,
        subteamMemberships: [],
        rosterSubteams: [{
          subteamId: mockSubteamId,
          teamId: mockSubteamId,
          studentName: 'John Doe'
        }]
      });
    });

    it('should deny access when user has no team relationship', async () => {
      // Mock no team creator, no subteam membership, no roster entries
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

      expect(result).toEqual({
        hasAccess: false,
        isCreator: false,
        hasSubteamMembership: false,
        hasRosterEntries: false,
        subteamRole: undefined,
        subteamMemberships: [],
        rosterSubteams: []
      });
    });

    it('should handle multiple subteam memberships', async () => {
      const subteamId2 = 'subteam-999';
      
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { role: 'captain', team_id: mockSubteamId, subteam_id: mockSubteamId },
            { role: 'member', team_id: subteamId2, subteam_id: subteamId2 }
          ]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

      expect(result.subteamMemberships).toHaveLength(2);
      expect(result.subteamMemberships[0]).toEqual({
        subteamId: mockSubteamId,
        teamId: mockSubteamId,
        role: 'captain'
      });
      expect(result.subteamMemberships[1]).toEqual({
        subteamId: subteamId2,
        teamId: subteamId2,
        role: 'member'
      });
    });
  });

  describe('hasLeadershipAccessCockroach', () => {
    it('should grant leadership to team creator', async () => {
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [{ created_by: mockUserId }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await hasLeadershipAccessCockroach(mockUserId, mockGroupId);

      expect(result).toBe(true);
    });

    it('should grant leadership to captain', async () => {
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ role: 'captain', team_id: mockSubteamId }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await hasLeadershipAccessCockroach(mockUserId, mockGroupId);

      expect(result).toBe(true);
    });

    it('should grant leadership to co-captain', async () => {
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ role: 'co_captain', team_id: mockSubteamId }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await hasLeadershipAccessCockroach(mockUserId, mockGroupId);

      expect(result).toBe(true);
    });

    it('should deny leadership to regular member', async () => {
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ role: 'member', team_id: mockSubteamId }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await hasLeadershipAccessCockroach(mockUserId, mockGroupId);

      expect(result).toBe(false);
    });

    it('should deny leadership when user has no team relationship', async () => {
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await hasLeadershipAccessCockroach(mockUserId, mockGroupId);

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQueryCockroachDB.mockRejectedValueOnce(new Error('Database connection failed'));

      // The function should handle errors and return a default result
      const result = await getTeamAccessCockroach(mockUserId, mockGroupId);
      
      expect(result).toEqual({
        hasAccess: false,
        isCreator: false,
        hasSubteamMembership: false,
        hasRosterEntries: false,
        subteamRole: undefined,
        subteamMemberships: [],
        rosterSubteams: []
      });
    });

    it('should handle empty results gracefully', async () => {
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

      expect(result.hasAccess).toBe(false);
    });
  });
});
