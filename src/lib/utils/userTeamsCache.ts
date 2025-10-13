/**
 * Centralized user teams cache management
 * Handles caching, invalidation, and updates for user teams data
 */

import { LocalStorageCache } from './localStorageCache';

export interface UserTeam {
  id: string;
  name: string;
  slug: string;
  school: string;
  division: 'B' | 'C';
  description?: string;
  user_role: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: 'captain' | 'member';
  }>;
}

export class UserTeamsCache {
  private static readonly CACHE_KEY = 'user-teams-cache';
  private static readonly ARCHIVED_CACHE_KEY = 'user-archived-teams-cache';

  /**
   * Get cached user teams
   */
  static get(userId: string): UserTeam[] | null {
    const key = `${this.CACHE_KEY}_${userId}`;
    return LocalStorageCache.get<UserTeam[]>(key);
  }

  /**
   * Get cached archived teams
   */
  static getArchived(userId: string): UserTeam[] | null {
    const key = `${this.ARCHIVED_CACHE_KEY}_${userId}`;
    return LocalStorageCache.get<UserTeam[]>(key);
  }

  /**
   * Set user teams cache (infinite TTL)
   */
  static set(userId: string, teams: UserTeam[]): void {
    const key = `${this.CACHE_KEY}_${userId}`;
    LocalStorageCache.set(key, teams, LocalStorageCache.INFINITE_TTL);
  }

  /**
   * Set archived teams cache (infinite TTL)
   */
  static setArchived(userId: string, teams: UserTeam[]): void {
    const key = `${this.ARCHIVED_CACHE_KEY}_${userId}`;
    LocalStorageCache.set(key, teams, LocalStorageCache.INFINITE_TTL);
  }

  /**
   * Add a team to the cache
   */
  static addTeam(userId: string, team: UserTeam): void {
    const currentTeams = this.get(userId) || [];
    const updatedTeams = [...currentTeams, team];
    this.set(userId, updatedTeams);
  }

  /**
   * Remove a team from the cache (when archived)
   */
  static removeTeam(userId: string, teamSlug: string): void {
    const currentTeams = this.get(userId) || [];
    const updatedTeams = currentTeams.filter(team => team.slug !== teamSlug);
    this.set(userId, updatedTeams);
  }

  /**
   * Update a team in the cache
   */
  static updateTeam(userId: string, teamSlug: string, updates: Partial<UserTeam>): void {
    const currentTeams = this.get(userId) || [];
    const updatedTeams = currentTeams.map(team => 
      team.slug === teamSlug ? { ...team, ...updates } : team
    );
    this.set(userId, updatedTeams);
  }

  /**
   * Move a team from active to archived cache
   */
  static archiveTeam(userId: string, teamSlug: string): void {
    const activeTeams = this.get(userId) || [];
    const archivedTeams = this.getArchived(userId) || [];
    
    const teamToArchive = activeTeams.find(team => team.slug === teamSlug);
    if (teamToArchive) {
      // Remove from active teams
      const updatedActiveTeams = activeTeams.filter(team => team.slug !== teamSlug);
      this.set(userId, updatedActiveTeams);
      
      // Add to archived teams
      const updatedArchivedTeams = [...archivedTeams, teamToArchive];
      this.setArchived(userId, updatedArchivedTeams);
    }
  }

  /**
   * Move a team from archived to active cache
   */
  static unarchiveTeam(userId: string, teamSlug: string): void {
    const activeTeams = this.get(userId) || [];
    const archivedTeams = this.getArchived(userId) || [];
    
    const teamToUnarchive = archivedTeams.find(team => team.slug === teamSlug);
    if (teamToUnarchive) {
      // Remove from archived teams
      const updatedArchivedTeams = archivedTeams.filter(team => team.slug !== teamSlug);
      this.setArchived(userId, updatedArchivedTeams);
      
      // Add to active teams
      const updatedActiveTeams = [...activeTeams, teamToUnarchive];
      this.set(userId, updatedActiveTeams);
    }
  }

  /**
   * Clear all user teams cache
   */
  static clear(userId: string): void {
    const activeKey = `${this.CACHE_KEY}_${userId}`;
    const archivedKey = `${this.ARCHIVED_CACHE_KEY}_${userId}`;
    LocalStorageCache.remove(activeKey);
    LocalStorageCache.remove(archivedKey);
  }

  /**
   * Fetch and cache user teams from API
   */
  static async fetchAndCache(userId: string): Promise<UserTeam[]> {
    try {
      const response = await fetch('/api/teams/user-teams');
      if (response.ok) {
        const data = await response.json();
        const teams = data.teams || [];
        this.set(userId, teams);
        return teams;
      }
    } catch (error) {
      console.error('Error fetching user teams:', error);
    }
    return [];
  }

  /**
   * Fetch and cache archived teams from API
   */
  static async fetchAndCacheArchived(userId: string): Promise<UserTeam[]> {
    try {
      const response = await fetch('/api/teams/archived');
      if (response.ok) {
        const data = await response.json();
        const teams = data.teams || [];
        this.setArchived(userId, teams);
        return teams;
      }
    } catch (error) {
      console.error('Error fetching archived teams:', error);
    }
    return [];
  }
}
