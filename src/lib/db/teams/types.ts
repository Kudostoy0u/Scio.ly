/**
 * Team data types and interfaces
 */

// Team data structure
export interface TeamData {
  id: string;
  school: string;
  division: 'B' | 'C';
  teams: Array<{
    id: string;
    name: string;
    roster: Record<string, string[]>;
  }>;
  captainCode: string;
  userCode: string;
  createdAt: Date;
  updatedAt: Date;
}

// New team unit structure (one row per team)
export interface TeamUnit {
  id: string;          // sequential or UUID
  school: string;
  division: 'B' | 'C';
  teamId: string;      // display id like 'A', 'B', ...
  name: string;        // team name
  roster: Record<string, string[]>;
  captainCode: string;
  userCode: string;
  slug: string;        // unique slug for deep link /teams/[slug]
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamGroup {
  id: string;
  school: string;
  division: 'B' | 'C';
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMembership {
  id: string;
  userId: string;
  teamUnitId: string;
  role: 'captain' | 'user';
  createdAt: Date;
}

// Share code structure
export interface ShareCode {
  id: string;
  school: string;
  division: 'B' | 'C';
  type: 'captain' | 'user';
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

export type GroupTournament = { 
  id: string; 
  groupId: string; 
  name: string; 
  dateTime: string; 
  createdAt: Date; 
  updatedAt: Date 
};
