/**
 * Database type definitions for new teams feature
 * Comprehensive type definitions for the team management system
 */

/**
 * Team group interface
 * Represents a school's team group for a specific division
 */
export interface NewTeamGroup {
  /** Unique identifier for the team group */
  id: string;
  /** School name */
  school: string;
  /** Division (B or C) */
  division: 'B' | 'C';
  /** URL-friendly slug for the team group */
  slug: string;
  /** User ID who created the team group */
  created_by: string;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Team unit interface
 * Represents a specific team unit within a team group
 */
export interface NewTeamUnit {
  /** Unique identifier for the team unit */
  id: string;
  /** Parent team group ID */
  group_id: string;
  /** Team identifier */
  team_id: string;
  /** Team unit name */
  name: string;
  /** Optional description of the team unit */
  description?: string;
  /** Captain invitation code */
  captain_code: string;
  /** User invitation code */
  user_code: string;
  /** User ID who created the team unit */
  created_by: string;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
  /** Team unit settings and configuration */
  settings: Record<string, any>;
}

/**
 * Team membership interface
 * Represents a user's membership in a team unit
 */
export interface NewTeamMembership {
  /** Unique identifier for the membership */
  id: string;
  /** User ID of the team member */
  user_id: string;
  /** Team unit ID */
  team_id: string;
  /** Member role in the team */
  role: 'captain' | 'co_captain' | 'member' | 'observer';
  /** Membership status */
  status: 'active' | 'inactive' | 'pending' | 'banned';
  /** When the user joined the team */
  joined_at: string;
  /** User ID who invited this member (optional) */
  invited_by?: string;
  /** Member permissions and settings */
  permissions: Record<string, any>;
}

export interface NewTeamPost {
  id: string;
  team_id: string;
  author_id: string;
  content: string;
  post_type: 'announcement' | 'discussion' | 'poll';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewTeamEvent {
  id: string;
  team_id: string;
  created_by: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  event_type: 'practice' | 'competition' | 'meeting' | 'other';
  is_recurring: boolean;
  recurrence_pattern?: string;
  created_at: string;
  updated_at: string;
}

export interface NewTeamAssignment {
  id: string;
  team_id: string;
  created_by: string;
  title: string;
  description?: string;
  assignment_type: 'homework' | 'project' | 'study' | 'other';
  due_date?: string;
  points?: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewTeamMaterial {
  id: string;
  team_id: string;
  uploaded_by: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: 'study_guide' | 'practice_test' | 'resource' | 'other';
  is_public: boolean;
  created_at: string;
  updated_at: string;
}
