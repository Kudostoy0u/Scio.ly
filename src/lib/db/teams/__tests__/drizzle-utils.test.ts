import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateRandomCode,
  upsertUserProfile,
  addUserToTeam,
  getUserTeamMemberships,
  isUserMemberOfTeam,
  getTeamMembers,
  removeUserFromTeam,
  deleteUserMemberships,
  isUserCaptainOfSchoolDivision,
  createShareCode,
  validateShareCode,
  cleanupExpiredCodes,
  listShareCodes,
  deleteShareCode,
} from '../drizzle-utils';
import { dbPg } from '@/lib/db';

// Mock the database
vi.mock('@/lib/db', () => ({
  dbPg: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock console.log to reduce noise in tests
vi.mock('console', () => ({
  log: vi.fn(),
  error: vi.fn(),
}));

describe('drizzle-utils', () => {
  const mockUserId = 'user-123';
  const mockTeamUnitId = 'team-unit-456';
  // const mockGroupId = 'group-789'; // Not used in current tests
  const mockSchool = 'Test School';
  const mockDivision = 'B' as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateRandomCode', () => {
    it('should generate a code of specified length', () => {
      const code = generateRandomCode(8);
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate different codes on multiple calls', () => {
      const code1 = generateRandomCode(8);
      const code2 = generateRandomCode(8);
      expect(code1).not.toBe(code2);
    });

    it('should use default length of 12', () => {
      const code = generateRandomCode();
      expect(code).toHaveLength(12);
    });
  });

  describe('upsertUserProfile', () => {
    it('should insert new user profile', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      });
      (dbPg.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: mockInsert,
        }),
      });

      await upsertUserProfile({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(dbPg.insert).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('addUserToTeam', () => {
    it('should add user to team and return membership', async () => {
      const mockMembership = {
        id: 'membership-123',
        userId: mockUserId,
        teamId: mockTeamUnitId,
        role: 'captain',
        joinedAt: new Date(),
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMembership]),
        }),
      });
      (dbPg.insert as any).mockReturnValue(mockInsert);

      const result = await addUserToTeam(mockUserId, mockTeamUnitId, 'captain');

      expect(result).toEqual({
        id: mockMembership.id,
        userId: mockMembership.userId,
        teamUnitId: mockMembership.teamId,
        role: 'captain',
        createdAt: mockMembership.joinedAt,
      });
    });
  });

  describe('getUserTeamMemberships', () => {
    it('should return user team memberships', async () => {
      const mockMemberships = [
        {
          id: 'membership-1',
          userId: mockUserId,
          teamId: 'team-1',
          role: 'captain',
          joinedAt: new Date('2023-01-01'),
        },
        {
          id: 'membership-2',
          userId: mockUserId,
          teamId: 'team-2',
          role: 'user',
          joinedAt: new Date('2023-01-02'),
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockMemberships),
          }),
        }),
      });
      (dbPg.select as any).mockReturnValue(mockSelect);

      const result = await getUserTeamMemberships(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: mockMemberships[0].id,
        userId: mockMemberships[0].userId,
        teamUnitId: mockMemberships[0].teamId,
        role: 'captain',
        createdAt: mockMemberships[0].joinedAt,
      });
    });
  });

  describe('isUserMemberOfTeam', () => {
    it('should return true when user is member', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'membership-123' }]),
          }),
        }),
      });
      (dbPg.select as any).mockReturnValue(mockSelect);

      const result = await isUserMemberOfTeam(mockUserId, mockTeamUnitId);

      expect(result).toBe(true);
    });

    it('should return false when user is not member', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (dbPg.select as any).mockReturnValue(mockSelect);

      const result = await isUserMemberOfTeam(mockUserId, mockTeamUnitId);

      expect(result).toBe(false);
    });
  });

  describe('getTeamMembers', () => {
    it('should return team members', async () => {
      const mockMembers = [
        {
          id: 'membership-1',
          userId: 'user-1',
          teamId: mockTeamUnitId,
          role: 'captain',
          joinedAt: new Date('2023-01-01'),
        },
        {
          id: 'membership-2',
          userId: 'user-2',
          teamId: mockTeamUnitId,
          role: 'user',
          joinedAt: new Date('2023-01-02'),
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockMembers),
          }),
        }),
      });
      (dbPg.select as any).mockReturnValue(mockSelect);

      const result = await getTeamMembers(mockTeamUnitId);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('captain');
      expect(result[1].role).toBe('user');
    });
  });

  describe('removeUserFromTeam', () => {
    it('should remove user from team', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'membership-123' }]),
          }),
        }),
      });
      (dbPg.update as any).mockReturnValue(mockUpdate);

      const result = await removeUserFromTeam(mockUserId, mockTeamUnitId);

      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (dbPg.update as any).mockReturnValue(mockUpdate);

      const result = await removeUserFromTeam(mockUserId, mockTeamUnitId);

      expect(result).toBe(false);
    });
  });

  describe('deleteUserMemberships', () => {
    it('should delete specific team membership', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'membership-123' }]),
          }),
        }),
      });
      (dbPg.update as any).mockReturnValue(mockUpdate);

      const result = await deleteUserMemberships(mockUserId, mockTeamUnitId);

      expect(result).toBe(1);
    });

    it('should delete all user memberships when no team specified', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: 'membership-1' },
              { id: 'membership-2' },
            ]),
          }),
        }),
      });
      (dbPg.update as any).mockReturnValue(mockUpdate);

      const result = await deleteUserMemberships(mockUserId);

      expect(result).toBe(2);
    });
  });

  describe('isUserCaptainOfSchoolDivision', () => {
    it('should return true when user is captain', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: 'membership-123' }]),
              }),
            }),
          }),
        }),
      });
      (dbPg.select as any).mockReturnValue(mockSelect);

      const result = await isUserCaptainOfSchoolDivision(mockUserId, mockSchool, mockDivision);

      expect(result).toBe(true);
    });

    it('should return false when user is not captain', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });
      (dbPg.select as any).mockReturnValue(mockSelect);

      const result = await isUserCaptainOfSchoolDivision(mockUserId, mockSchool, mockDivision);

      expect(result).toBe(false);
    });
  });

  describe('createShareCode', () => {
    it('should create and return share code', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      (dbPg.insert as any).mockReturnValue(mockInsert);

      const result = await createShareCode(mockSchool, mockDivision, 'captain', 24);

      expect(result).toMatch(/^[A-Z0-9]+$/);
      expect(result).toHaveLength(8);
      expect(dbPg.insert).toHaveBeenCalled();
    });
  });

  describe('validateShareCode', () => {
    it('should return code info for valid code', async () => {
      const mockCodeInfo = {
        school: mockSchool,
        division: mockDivision,
        type: 'captain',
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockCodeInfo]),
          }),
        }),
      });
      (dbPg.select as any).mockReturnValue(mockSelect);

      const result = await validateShareCode('ABC123');

      expect(result).toEqual(mockCodeInfo);
    });

    it('should return null for invalid code', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (dbPg.select as any).mockReturnValue(mockSelect);

      const result = await validateShareCode('INVALID');

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredCodes', () => {
    it('should delete expired codes', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      (dbPg.delete as any).mockReturnValue(mockDelete);

      await cleanupExpiredCodes();

      expect(dbPg.delete).toHaveBeenCalled();
    });
  });

  describe('listShareCodes', () => {
    it('should return share codes for school and division', async () => {
      const mockCodes = [
        {
          id: 'code-1',
          school: mockSchool,
          division: mockDivision,
          type: 'captain',
          code: 'ABC123',
          expiresAt: new Date('2024-01-01'),
          createdAt: new Date('2023-01-01'),
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockCodes),
          }),
        }),
      });
      (dbPg.select as any).mockReturnValue(mockSelect);

      const result = await listShareCodes(mockSchool, mockDivision);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockCodes[0]);
    });
  });

  describe('deleteShareCode', () => {
    it('should delete share code and return true', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'code-123' }]),
        }),
      });
      (dbPg.delete as any).mockReturnValue(mockDelete);

      const result = await deleteShareCode('ABC123');

      expect(result).toBe(true);
    });

    it('should return false when code not found', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });
      (dbPg.delete as any).mockReturnValue(mockDelete);

      const result = await deleteShareCode('INVALID');

      expect(result).toBe(false);
    });
  });
});
