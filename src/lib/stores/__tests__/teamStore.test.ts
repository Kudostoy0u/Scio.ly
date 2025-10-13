import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTeamStore } from '../teamStore';

// Mock fetch
global.fetch = vi.fn();

const mockFetch = vi.mocked(fetch);

describe('Team Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset store state
    useTeamStore.getState().reset();
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchMembers', () => {
    it('should fetch members successfully', async () => {
      const mockMembers = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'captain',
          subteam: { id: 'subteam-1', name: 'Team A', description: 'Team A' },
          joinedAt: new Date('2024-01-01'),
          events: ['Anatomy'],
          isCreator: false
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchMembers('team-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/members');
      expect(store.members).toEqual(mockMembers);
      expect(store.loading.members).toBe(false);
    });

    it('should handle fetch members error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const store = useTeamStore.getState();
      await store.fetchMembers('team-123');

      expect(store.members).toEqual([]);
      expect(store.loading.members).toBe(false);
    });

    it('should fetch members with subteam filter', async () => {
      const mockMembers = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'captain',
          subteam: { id: 'subteam-1', name: 'Team A', description: 'Team A' },
          joinedAt: new Date('2024-01-01'),
          events: ['Anatomy'],
          isCreator: false
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchMembers('team-123', 'subteam-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/members?subteamId=subteam-1');
      expect(store.members).toEqual(mockMembers);
    });
  });

  describe('fetchSubteams', () => {
    it('should fetch subteams successfully', async () => {
      const mockSubteams = [
        {
          id: 'subteam-1',
          name: 'Team A',
          teamId: 'A',
          description: 'Team A',
          createdAt: new Date('2024-01-01')
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subteams: mockSubteams })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchSubteams('team-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/subteams');
      expect(store.subteams).toEqual(mockSubteams);
      expect(store.loading.subteams).toBe(false);
    });

    it('should handle fetch subteams error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const store = useTeamStore.getState();
      await store.fetchSubteams('team-123');

      expect(store.subteams).toEqual([]);
      expect(store.loading.subteams).toBe(false);
    });
  });

  describe('fetchRoster', () => {
    it('should fetch roster successfully', async () => {
      const mockRoster = [
        {
          id: 'roster-1',
          userId: 'user-1',
          teamUnitId: 'subteam-1',
          studentName: 'John Doe',
          eventName: 'Anatomy',
          createdAt: new Date('2024-01-01')
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roster: mockRoster })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchRoster('team-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/roster');
      expect(store.roster).toEqual(mockRoster);
      expect(store.loading.roster).toBe(false);
    });

    it('should fetch roster with subteam filter', async () => {
      const mockRoster = [
        {
          id: 'roster-1',
          userId: 'user-1',
          teamUnitId: 'subteam-1',
          studentName: 'John Doe',
          eventName: 'Anatomy',
          createdAt: new Date('2024-01-01')
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roster: mockRoster })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchRoster('team-123', 'subteam-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/roster?subteamId=subteam-1');
      expect(store.roster).toEqual(mockRoster);
    });
  });

  describe('fetchAssignments', () => {
    it('should fetch assignments successfully', async () => {
      const mockAssignments = [
        {
          id: 'assignment-1',
          title: 'Test Assignment',
          description: 'Test description',
          dueDate: new Date('2024-12-31'),
          createdBy: 'user-1',
          createdAt: new Date('2024-01-01'),
          teamUnitId: 'subteam-1'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ assignments: mockAssignments })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchAssignments('team-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/assignments');
      expect(store.assignments).toEqual(mockAssignments);
      expect(store.loading.assignments).toBe(false);
    });

    it('should handle fetch assignments error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const store = useTeamStore.getState();
      await store.fetchAssignments('team-123');

      expect(store.assignments).toEqual([]);
      expect(store.loading.assignments).toBe(false);
    });
  });

  describe('fetchStream', () => {
    it('should fetch stream successfully', async () => {
      const mockStream = [
        {
          id: 'post-1',
          content: 'Test post',
          authorId: 'user-1',
          teamUnitId: 'subteam-1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ posts: mockStream })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchStream('team-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/stream');
      expect(store.stream).toEqual(mockStream);
      expect(store.loading.stream).toBe(false);
    });

    it('should fetch stream with subteam filter', async () => {
      const mockStream = [
        {
          id: 'post-1',
          content: 'Test post',
          authorId: 'user-1',
          teamUnitId: 'subteam-1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ posts: mockStream })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchStream('team-123', 'subteam-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/stream?subteamId=subteam-1');
      expect(store.stream).toEqual(mockStream);
    });
  });

  describe('fetchTimers', () => {
    it('should fetch timers successfully', async () => {
      const mockTimers = [
        {
          id: 'timer-1',
          eventName: 'Anatomy',
          duration: 50,
          teamUnitId: 'subteam-1',
          createdBy: 'user-1',
          createdAt: new Date('2024-01-01'),
          isActive: true
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ timers: mockTimers })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchTimers('team-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/timers');
      expect(store.timers).toEqual(mockTimers);
      expect(store.loading.timers).toBe(false);
    });

    it('should fetch timers with subteam filter', async () => {
      const mockTimers = [
        {
          id: 'timer-1',
          eventName: 'Anatomy',
          duration: 50,
          teamUnitId: 'subteam-1',
          createdBy: 'user-1',
          createdAt: new Date('2024-01-01'),
          isActive: true
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ timers: mockTimers })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchTimers('team-123', 'subteam-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/timers?subteamId=subteam-1');
      expect(store.timers).toEqual(mockTimers);
    });
  });

  describe('fetchTournaments', () => {
    it('should fetch tournaments successfully', async () => {
      const mockTournaments = [
        {
          id: 'tournament-1',
          name: 'State Tournament',
          date: new Date('2024-03-15'),
          location: 'State University'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tournaments: mockTournaments })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchTournaments('team-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/tournaments');
      expect(store.tournaments).toEqual(mockTournaments);
      expect(store.loading.tournaments).toBe(false);
    });
  });

  describe('fetchStreamData', () => {
    it('should fetch stream data successfully', async () => {
      const mockStream = [
        {
          id: 'post-1',
          content: 'Test post',
          authorId: 'user-1',
          teamUnitId: 'subteam-1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      const mockTournaments = [
        {
          id: 'tournament-1',
          name: 'State Tournament',
          date: new Date('2024-03-15'),
          location: 'State University'
        }
      ];

      const mockTimers = [
        {
          id: 'timer-1',
          eventName: 'Anatomy',
          duration: 50,
          teamUnitId: 'subteam-1',
          createdBy: 'user-1',
          createdAt: new Date('2024-01-01'),
          isActive: true
        }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ posts: mockStream })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tournaments: mockTournaments })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ timers: mockTimers })
        } as Response);

      const store = useTeamStore.getState();
      await store.fetchStreamData('team-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/stream');
      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/tournaments');
      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/timers');
      
      expect(store.stream).toEqual(mockStream);
      expect(store.tournaments).toEqual(mockTournaments);
      expect(store.timers).toEqual(mockTimers);
      expect(store.loading.streamData).toBe(false);
    });

    it('should handle partial failures in stream data fetch', async () => {
      const mockStream = [
        {
          id: 'post-1',
          content: 'Test post',
          authorId: 'user-1',
          teamUnitId: 'subteam-1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ posts: mockStream })
        } as Response)
        .mockRejectedValueOnce(new Error('Tournaments fetch failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ timers: [] })
        } as Response);

      const store = useTeamStore.getState();
      await store.fetchStreamData('team-123');

      expect(store.stream).toEqual(mockStream);
      expect(store.tournaments).toEqual([]);
      expect(store.timers).toEqual([]);
      expect(store.loading.streamData).toBe(false);
    });
  });

  describe('fetchUserTeams', () => {
    it('should fetch user teams successfully', async () => {
      const mockUserTeams = [
        {
          id: 'team-1',
          name: 'Test School C',
          slug: 'test-school-c-abc123',
          school: 'Test School',
          division: 'C',
          description: 'Test team description',
          captainCode: 'CAP123456',
          userCode: 'USR123456',
          members: [
            {
              id: 'user-1',
              name: 'John Doe',
              email: 'john@example.com',
              role: 'captain'
            }
          ],
          wasReactivated: false
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ teams: mockUserTeams })
      } as Response);

      const store = useTeamStore.getState();
      await store.fetchUserTeams();

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/user-teams');
      expect(store.userTeams).toEqual(mockUserTeams);
      expect(store.loading.userTeams).toBe(false);
    });

    it('should handle fetch user teams error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const store = useTeamStore.getState();
      await store.fetchUserTeams();

      expect(store.userTeams).toEqual([]);
      expect(store.loading.userTeams).toBe(false);
    });
  });

  describe('invalidateCache', () => {
    it('should clear all cached data', () => {
      const store = useTeamStore.getState();
      
      // Set some data
      store.members = [{ id: 'user-1', name: 'John Doe' } as any];
      store.subteams = [{ id: 'subteam-1', name: 'Team A' } as any];
      store.roster = [{ id: 'roster-1', studentName: 'John Doe' } as any];
      store.assignments = [{ id: 'assignment-1', title: 'Test' } as any];
      store.stream = [{ id: 'post-1', content: 'Test post' } as any];
      store.timers = [{ id: 'timer-1', eventName: 'Anatomy' } as any];
      store.tournaments = [{ id: 'tournament-1', name: 'State' } as any];
      store.userTeams = [{ id: 'team-1', name: 'Test School' } as any];

      store.invalidateCache();

      expect(store.members).toEqual([]);
      expect(store.subteams).toEqual([]);
      expect(store.roster).toEqual([]);
      expect(store.assignments).toEqual([]);
      expect(store.stream).toEqual([]);
      expect(store.timers).toEqual([]);
      expect(store.tournaments).toEqual([]);
      expect(store.userTeams).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const store = useTeamStore.getState();
      
      // Set some data
      store.members = [{ id: 'user-1', name: 'John Doe' } as any];
      store.loading.members = true;
      store.error = 'Some error';

      store.reset();

      expect(store.members).toEqual([]);
      expect(store.loading.members).toBe(false);
      expect(store.error).toBe(null);
    });
  });
});
