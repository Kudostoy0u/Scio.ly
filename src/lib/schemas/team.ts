import { z } from 'zod';

// Team data schemas for validation and type safety
export const TeamGroupSchema = z.object({
  id: z.string().uuid(),
  school: z.string(),
  division: z.enum(['B', 'C']),
  slug: z.string(),
  description: z.string().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(['active', 'archived', 'deleted']).default('active'),
  settings: z.record(z.any()).default({})
});

export const TeamUnitSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  teamId: z.string(), // A, B, C, etc.
  description: z.string().optional(),
  captainCode: z.string(),
  userCode: z.string(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  settings: z.record(z.any()).default({}),
  status: z.enum(['active', 'archived', 'deleted']).default('active')
});

export const TeamMembershipSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  teamId: z.string().uuid(),
  role: z.enum(['captain', 'co_captain', 'member', 'observer']),
  joinedAt: z.date(),
  invitedBy: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'pending', 'banned']).default('active'),
  permissions: z.record(z.any()).default({})
});

export const RosterDataSchema = z.object({
  id: z.string().uuid(),
  teamUnitId: z.string().uuid(),
  eventName: z.string(),
  slotIndex: z.number(),
  studentName: z.string().optional(),
  userId: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// API request/response schemas
export const GetTeamDataRequestSchema = z.object({
  teamSlug: z.string(),
  includeSubteams: z.boolean().default(true),
  includeMembers: z.boolean().default(true),
  includeRoster: z.boolean().default(false),
  includeStream: z.boolean().default(false),
  includeAssignments: z.boolean().default(false),
  subteamId: z.string().uuid().optional()
});

export const TeamDataResponseSchema = z.object({
  team: TeamGroupSchema,
  subteams: z.array(TeamUnitSchema).optional(),
  members: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().optional(),
    username: z.string().optional(),
    role: z.string(),
    subteam: z.object({
      id: z.string().uuid(),
      name: z.string(),
      teamId: z.string()
    }).optional(),
    joinedAt: z.date().optional(),
    events: z.array(z.string()).default([]),
    isCreator: z.boolean().default(false),
    isUnlinked: z.boolean().default(false)
  })).optional(),
  roster: z.record(z.array(z.string())).optional(),
  removedEvents: z.array(z.string()).optional(),
  stream: z.array(z.any()).optional(),
  assignments: z.array(z.any()).optional()
});

export type TeamGroup = z.infer<typeof TeamGroupSchema>;
export type TeamUnit = z.infer<typeof TeamUnitSchema>;
export type TeamMembership = z.infer<typeof TeamMembershipSchema>;
export type RosterData = z.infer<typeof RosterDataSchema>;
export type GetTeamDataRequest = z.infer<typeof GetTeamDataRequestSchema>;
export type TeamDataResponse = z.infer<typeof TeamDataResponseSchema>;