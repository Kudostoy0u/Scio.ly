import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkTeamGroupAccess, checkTeamGroupLeadership } from '../team-auth';
import { dbPg } from '@/lib/db';

// Mock the database
vi.mock('@/lib/db', () => ({
  dbPg: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    innerJoin: vi.fn(),
  },
}));

// Mock console.log to reduce noise in tests
vi.mock('console', () => ({
  log: vi.fn(),
  error: vi.fn(),
}));

describe('team-auth', () => {
  const mockUserId = 'user-123';
  const mockGroupId = 'group-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkTeamGroupAccess', () => {
    it('should return authorized when user has active team membership', async () => {
      // Mock the query chain to return membership data
      const mockQueryChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
      };

      (dbPg.select as any).mockReturnValue(mockQueryChain);
      
      // Mock the final execution to return membership result
      mockQueryChain.where.mockResolvedValueOnce([{ role: 'captain' }]); // membership
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // roster
      mockQueryChain.where.mockResolvedValueOnce([{ displayName: 'John Doe', firstName: 'John', lastName: 'Doe' }]); // user
      mockQueryChain.where.mockResolvedValueOnce([{ id: 'team-1', teamId: 'A', description: 'Team A' }]); // subteams
      mockQueryChain.where.mockResolvedValueOnce([{ createdBy: 'other-user' }]); // team group

      const result = await checkTeamGroupAccess(mockUserId, mockGroupId);

      expect(result.isAuthorized).toBe(true);
      expect(result.hasMembership).toBe(true);
      expect(result.hasRosterEntry).toBe(false);
      expect(result.role).toBe('captain');
    });

    it('should return authorized when user has roster entry', async () => {
      const mockQueryChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
      };

      (dbPg.select as any).mockReturnValue(mockQueryChain);
      
      // Mock no membership but has roster entry
      mockQueryChain.where.mockResolvedValueOnce([]); // no membership
      mockQueryChain.where.mockResolvedValueOnce([{ count: 1 }]); // has roster
      mockQueryChain.where.mockResolvedValueOnce([{ displayName: 'John Doe', firstName: 'John', lastName: 'Doe' }]); // user
      mockQueryChain.where.mockResolvedValueOnce([{ id: 'team-1', teamId: 'A', description: 'Team A' }]); // subteams
      mockQueryChain.where.mockResolvedValueOnce([{ createdBy: 'other-user' }]); // team group

      const result = await checkTeamGroupAccess(mockUserId, mockGroupId);

      expect(result.isAuthorized).toBe(true);
      expect(result.hasMembership).toBe(false);
      expect(result.hasRosterEntry).toBe(true);
    });

    it('should return authorized when user is team creator', async () => {
      const mockQueryChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
      };

      (dbPg.select as any).mockReturnValue(mockQueryChain);
      
      // Mock no membership, no roster, but is creator
      mockQueryChain.where.mockResolvedValueOnce([]); // no membership
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // no roster
      mockQueryChain.where.mockResolvedValueOnce([{ displayName: 'John Doe', firstName: 'John', lastName: 'Doe' }]); // user
      mockQueryChain.where.mockResolvedValueOnce([{ id: 'team-1', teamId: 'A', description: 'Team A' }]); // subteams
      // Mock roster by name checks (multiple names are checked)
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // John Doe
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // John
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // Doe
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // John Doe
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // Doe, John
      mockQueryChain.where.mockResolvedValueOnce([{ createdBy: mockUserId }]); // is creator

      const result = await checkTeamGroupAccess(mockUserId, mockGroupId);

      expect(result.isAuthorized).toBe(true);
      expect(result.hasMembership).toBe(false);
      expect(result.hasRosterEntry).toBe(false);
    });

    it('should return unauthorized when user has no access', async () => {
      const mockQueryChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
      };

      (dbPg.select as any).mockReturnValue(mockQueryChain);
      
      // Mock no access
      mockQueryChain.where.mockResolvedValueOnce([]); // no membership
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // no roster
      mockQueryChain.where.mockResolvedValueOnce([{ displayName: 'John Doe', firstName: 'John', lastName: 'Doe' }]); // user
      mockQueryChain.where.mockResolvedValueOnce([{ id: 'team-1', teamId: 'A', description: 'Team A' }]); // subteams
      // Mock roster by name checks (multiple names are checked)
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // John Doe
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // John
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // Doe
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // John Doe
      mockQueryChain.where.mockResolvedValueOnce([{ count: 0 }]); // Doe, John
      mockQueryChain.where.mockResolvedValueOnce([{ createdBy: 'other-user' }]); // not creator

      const result = await checkTeamGroupAccess(mockUserId, mockGroupId);

      expect(result.isAuthorized).toBe(false);
      expect(result.hasMembership).toBe(false);
      expect(result.hasRosterEntry).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      (dbPg.select as any).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await checkTeamGroupAccess(mockUserId, mockGroupId);

      expect(result.isAuthorized).toBe(false);
      expect(result.hasMembership).toBe(false);
      expect(result.hasRosterEntry).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('checkTeamGroupLeadership', () => {
    it('should return hasLeadership true when user is captain', async () => {
      const mockQueryChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
      };

      (dbPg.select as any).mockReturnValue(mockQueryChain);
      
      mockQueryChain.where.mockResolvedValueOnce([{ role: 'captain' }]); // membership
      mockQueryChain.where.mockResolvedValueOnce([{ createdBy: 'other-user' }]); // team group

      const result = await checkTeamGroupLeadership(mockUserId, mockGroupId);

      expect(result.hasLeadership).toBe(true);
      expect(result.role).toBe('captain');
    });

    it('should return hasLeadership true when user is co_captain', async () => {
      const mockQueryChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
      };

      (dbPg.select as any).mockReturnValue(mockQueryChain);
      
      mockQueryChain.where.mockResolvedValueOnce([{ role: 'co_captain' }]); // membership
      mockQueryChain.where.mockResolvedValueOnce([{ createdBy: 'other-user' }]); // team group

      const result = await checkTeamGroupLeadership(mockUserId, mockGroupId);

      expect(result.hasLeadership).toBe(true);
      expect(result.role).toBe('co_captain');
    });

    it('should return hasLeadership true when user is team creator', async () => {
      const mockQueryChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
      };

      (dbPg.select as any).mockReturnValue(mockQueryChain);
      
      mockQueryChain.where.mockResolvedValueOnce([]); // no membership
      mockQueryChain.where.mockResolvedValueOnce([{ createdBy: mockUserId }]); // is creator

      const result = await checkTeamGroupLeadership(mockUserId, mockGroupId);

      expect(result.hasLeadership).toBe(true);
      expect(result.role).toBe('creator');
    });

    it('should return hasLeadership false when user has no leadership role', async () => {
      const mockQueryChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
      };

      (dbPg.select as any).mockReturnValue(mockQueryChain);
      
      mockQueryChain.where.mockResolvedValueOnce([{ role: 'member' }]); // membership but not leadership
      mockQueryChain.where.mockResolvedValueOnce([{ createdBy: 'other-user' }]); // not creator

      const result = await checkTeamGroupLeadership(mockUserId, mockGroupId);

      expect(result.hasLeadership).toBe(false);
      expect(result.role).toBe('member');
    });

    it('should handle database errors gracefully', async () => {
      (dbPg.select as any).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await checkTeamGroupLeadership(mockUserId, mockGroupId);

      expect(result.hasLeadership).toBe(false);
    });
  });
});