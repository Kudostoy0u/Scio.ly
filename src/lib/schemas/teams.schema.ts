/**
 * Zod Schemas for Teams Feature
 *
 * Centralized validation schemas for all teams-related data.
 * These schemas ensure type safety and data validation across the entire teams feature.
 */

import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

export const teamIdSchema = z.string().min(1, 'Team ID is required');
export const slugSchema = z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens');
export const divisionSchema = z.enum(['B', 'C']).refine(val => ['B', 'C'].includes(val), {
  message: 'Division must be B or C'
});
export const roleSchema = z.enum(['captain', 'member']).refine(val => ['captain', 'member'].includes(val), {
  message: 'Role must be captain or member'
});

// ============================================================================
// Team Schemas
// ============================================================================

export const teamSchema = z.object({
  id: teamIdSchema,
  name: z.string().min(1, 'Team name is required').max(100, 'Team name must be less than 100 characters'),
  slug: slugSchema,
  school: z.string().min(1, 'School name is required').max(200, 'School name must be less than 200 characters'),
  division: divisionSchema,
  created_at: z.string().datetime().optional(),
  archived: z.boolean().optional().default(false),
});

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  school: z.string().min(1, 'School name is required').max(200),
  division: divisionSchema,
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  school: z.string().min(1).max(200).optional(),
  division: divisionSchema.optional(),
  archived: z.boolean().optional(),
});

// ============================================================================
// Subteam Schemas
// ============================================================================

export const subteamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Subteam name is required').max(100, 'Subteam name must be less than 100 characters'),
  team_id: teamIdSchema,
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable(),
  created_at: z.string().datetime().optional(),
});

export const createSubteamSchema = z.object({
  name: z.string().min(1, 'Subteam name is required').max(100),
  description: z.string().max(500).optional(),
});

export const updateSubteamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

// ============================================================================
// Member Schemas
// ============================================================================

export const teamMemberSchema = z.object({
  id: z.string().nullable(),
  user_id: z.string().optional().nullable(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().nullable(),
  username: z.string().optional().nullable(),
  role: roleSchema,
  joined_at: z.string().datetime().optional().nullable(),
  subteam_id: z.string().optional().nullable(),
  events: z.array(z.string()).default([]),
  is_pending_invitation: z.boolean().optional().default(false),
  is_unlinked: z.boolean().optional().default(false),
  invitation_code: z.string().optional().nullable(),
});

export const inviteMemberSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  role: roleSchema.optional().default('member'),
  subteam_id: z.string().optional(),
});

export const updateMemberSchema = z.object({
  role: roleSchema.optional(),
  subteam_id: z.string().optional().nullable(),
});

// ============================================================================
// Roster Schemas
// ============================================================================

export const rosterEntrySchema = z.object({
  subteam_id: z.string().min(1, 'Subteam ID is required'),
  event_name: z.string().min(1, 'Event name is required').max(100),
  slot_index: z.number().int().min(0).max(10, 'Slot index must be between 0 and 10'),
  student_name: z.string().min(1, 'Student name is required').max(100),
  user_id: z.string().optional().nullable(),
});

export const updateRosterEntrySchema = z.object({
  subteam_id: z.string().min(1),
  event_name: z.string().min(1).max(100),
  slot_index: z.number().int().min(0).max(10),
  student_name: z.string().max(100),
  user_id: z.string().optional().nullable(),
});

export const removeRosterEntrySchema = z.object({
  student_name: z.string().min(1).optional(),
  user_id: z.string().optional(),
  event_name: z.string().optional(),
  subteam_id: z.string().optional(),
}).refine(
  (data) => data.student_name || data.user_id,
  { message: 'Either student_name or user_id must be provided' }
);

export const rosterDataSchema = z.object({
  roster: z.record(z.string(), z.array(z.string())), // event_name -> array of student names
  removed_events: z.array(z.string()).default([]),
});

// ============================================================================
// Stream/Post Schemas
// ============================================================================

export const streamPostSchema = z.object({
  id: z.string(),
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be less than 5000 characters'),
  author_name: z.string(),
  author_email: z.string().email(),
  team_id: teamIdSchema,
  subteam_id: z.string().optional().nullable(),
  created_at: z.string().datetime(),
  attachment_url: z.string().url().optional().nullable(),
  attachment_title: z.string().max(200).optional().nullable(),
  show_tournament_timer: z.boolean().default(false),
  tournament_id: z.string().optional().nullable(),
});

export const createStreamPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000),
  subteam_id: z.string().optional(),
  attachment_url: z.string().url().optional().nullable(),
  attachment_title: z.string().max(200).optional().nullable(),
  show_tournament_timer: z.boolean().optional().default(false),
  tournament_id: z.string().optional().nullable(),
});

// ============================================================================
// Assignment Schemas
// ============================================================================

export const assignmentSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  due_date: z.string().datetime(),
  team_id: teamIdSchema,
  created_by: z.string(),
  created_at: z.string().datetime(),
  assigned_to: z.array(z.string()).default([]),
});

export const createAssignmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  due_date: z.string().datetime('Invalid date format'),
  assigned_to: z.array(z.string()).optional().default([]),
  subteam_id: z.string().optional(),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  due_date: z.string().datetime().optional(),
  assigned_to: z.array(z.string()).optional(),
});

// ============================================================================
// Tournament/Timer Schemas
// ============================================================================

export const tournamentSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  start_time: z.string().datetime(),
  location: z.string().max(300).optional().nullable(),
  event_type: z.string().max(100),
  has_timer: z.boolean().default(false),
  team_id: teamIdSchema.optional(),
  subteam_id: z.string().optional().nullable(),
});

export const timerSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  start_time: z.string().datetime(),
  location: z.string().max(300).optional().nullable(),
  event_type: z.string().max(100),
  added_at: z.string().datetime(),
  team_id: teamIdSchema.optional(),
  subteam_id: z.string().optional().nullable(),
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const teamQuerySchema = z.object({
  teamSlug: slugSchema,
});

export const subteamQuerySchema = z.object({
  teamSlug: slugSchema,
  subteamId: z.string().optional(),
});

export const memberQuerySchema = z.object({
  teamSlug: slugSchema,
  subteamId: z.string().optional().nullable(),
});

export const rosterQuerySchema = z.object({
  teamSlug: slugSchema,
  subteamId: z.string().min(1, 'Subteam ID is required'),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const teamResponseSchema = z.object({
  team: teamSchema,
  user_role: roleSchema.optional(),
  is_member: z.boolean(),
});

export const teamsListResponseSchema = z.object({
  teams: z.array(teamSchema.extend({
    user_role: roleSchema,
  })),
});

export const subteamsResponseSchema = z.object({
  subteams: z.array(subteamSchema),
});

export const membersResponseSchema = z.object({
  members: z.array(teamMemberSchema),
});

export const rosterResponseSchema = z.object({
  roster: z.record(z.string(), z.array(z.string())),
  removed_events: z.array(z.string()),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Team = z.infer<typeof teamSchema>;
export type CreateTeam = z.infer<typeof createTeamSchema>;
export type UpdateTeam = z.infer<typeof updateTeamSchema>;

export type Subteam = z.infer<typeof subteamSchema>;
export type CreateSubteam = z.infer<typeof createSubteamSchema>;
export type UpdateSubteam = z.infer<typeof updateSubteamSchema>;

export type TeamMember = z.infer<typeof teamMemberSchema>;
export type InviteMember = z.infer<typeof inviteMemberSchema>;
export type UpdateMember = z.infer<typeof updateMemberSchema>;

export type RosterEntry = z.infer<typeof rosterEntrySchema>;
export type UpdateRosterEntry = z.infer<typeof updateRosterEntrySchema>;
export type RemoveRosterEntry = z.infer<typeof removeRosterEntrySchema>;
export type RosterData = z.infer<typeof rosterDataSchema>;

export type StreamPost = z.infer<typeof streamPostSchema>;
export type CreateStreamPost = z.infer<typeof createStreamPostSchema>;

export type Assignment = z.infer<typeof assignmentSchema>;
export type CreateAssignment = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignment = z.infer<typeof updateAssignmentSchema>;

export type Tournament = z.infer<typeof tournamentSchema>;
export type Timer = z.infer<typeof timerSchema>;
