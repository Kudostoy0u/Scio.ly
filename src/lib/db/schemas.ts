import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import * as schema from './schema';

// Base schemas for all tables using drizzle-zod
export const insertQuestionsSchema = createInsertSchema(schema.questions);
export const selectQuestionsSchema = createSelectSchema(schema.questions);

export const insertQuotesSchema = createInsertSchema(schema.quotes);
export const selectQuotesSchema = createSelectSchema(schema.quotes);

export const insertLongQuotesSchema = createInsertSchema(schema.longquotes);
export const selectLongQuotesSchema = createSelectSchema(schema.longquotes);

export const insertShareLinksSchema = createInsertSchema(schema.shareLinks);
export const selectShareLinksSchema = createSelectSchema(schema.shareLinks);

export const insertEditsSchema = createInsertSchema(schema.edits);
export const selectEditsSchema = createSelectSchema(schema.edits);

export const insertBlacklistsSchema = createInsertSchema(schema.blacklists);
export const selectBlacklistsSchema = createSelectSchema(schema.blacklists);

export const insertIdEventsSchema = createInsertSchema(schema.idEvents);
export const selectIdEventsSchema = createSelectSchema(schema.idEvents);

export const insertBase52CodesSchema = createInsertSchema(schema.base52Codes);
export const selectBase52CodesSchema = createSelectSchema(schema.base52Codes);

// Team-related schemas
export const insertNewTeamGroupsSchema = createInsertSchema(schema.newTeamGroups);
export const selectNewTeamGroupsSchema = createSelectSchema(schema.newTeamGroups);

export const insertNewTeamUnitsSchema = createInsertSchema(schema.newTeamUnits);
export const selectNewTeamUnitsSchema = createSelectSchema(schema.newTeamUnits);

export const insertNewTeamMembershipsSchema = createInsertSchema(schema.newTeamMemberships);
export const selectNewTeamMembershipsSchema = createSelectSchema(schema.newTeamMemberships);

export const insertNewTeamInvitationsSchema = createInsertSchema(schema.newTeamInvitations);
export const selectNewTeamInvitationsSchema = createSelectSchema(schema.newTeamInvitations);

export const insertNewTeamPostsSchema = createInsertSchema(schema.newTeamPosts);
export const selectNewTeamPostsSchema = createSelectSchema(schema.newTeamPosts);

export const insertNewTeamPostAttachmentsSchema = createInsertSchema(schema.newTeamPostAttachments);
export const selectNewTeamPostAttachmentsSchema = createSelectSchema(schema.newTeamPostAttachments);

export const insertNewTeamEventsSchema = createInsertSchema(schema.newTeamEvents);
export const selectNewTeamEventsSchema = createSelectSchema(schema.newTeamEvents);

export const insertNewTeamAssignmentsSchema = createInsertSchema(schema.newTeamAssignments);
export const selectNewTeamAssignmentsSchema = createSelectSchema(schema.newTeamAssignments);

export const insertNewTeamAssignmentSubmissionsSchema = createInsertSchema(schema.newTeamAssignmentSubmissions);
export const selectNewTeamAssignmentSubmissionsSchema = createSelectSchema(schema.newTeamAssignmentSubmissions);

export const insertNewTeamAssignmentRosterSchema = createInsertSchema(schema.newTeamAssignmentRoster);
export const selectNewTeamAssignmentRosterSchema = createSelectSchema(schema.newTeamAssignmentRoster);

export const insertNewTeamAssignmentQuestionsSchema = createInsertSchema(schema.newTeamAssignmentQuestions);
export const selectNewTeamAssignmentQuestionsSchema = createSelectSchema(schema.newTeamAssignmentQuestions);

export const insertNewTeamNotificationsSchema = createInsertSchema(schema.newTeamNotifications);
export const selectNewTeamNotificationsSchema = createSelectSchema(schema.newTeamNotifications);

export const insertNewTeamRosterDataSchema = createInsertSchema(schema.newTeamRosterData);
export const selectNewTeamRosterDataSchema = createSelectSchema(schema.newTeamRosterData);

export const insertRosterLinkInvitationsSchema = createInsertSchema(schema.rosterLinkInvitations);
export const selectRosterLinkInvitationsSchema = createSelectSchema(schema.rosterLinkInvitations);

export const insertUsersSchema = createInsertSchema(schema.users);
export const selectUsersSchema = createSelectSchema(schema.users);

// Custom validation schemas for specific use cases
export const teamGroupCreateSchema = z.object({
  school: z.string().min(1).max(255),
  division: z.enum(['B', 'C']),
  slug: z.string().min(1).max(255),
  description: z.string().optional(),
  createdBy: z.string().uuid()
});

export const teamUnitCreateSchema = z.object({
  groupId: z.string().uuid(),
  teamId: z.string().min(1).max(10),
  captainCode: z.string().min(1).max(20),
  userCode: z.string().min(1).max(20),
  description: z.string().optional(),
  createdBy: z.string().uuid()
});

export const teamMembershipCreateSchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid(),
  role: z.enum(['captain', 'co_captain', 'member', 'observer']),
  status: z.enum(['active', 'inactive', 'pending', 'banned']).default('active'),
  invitedBy: z.string().uuid().optional(),
  permissions: z.record(z.string(), z.any()).default({})
});

export const teamInvitationCreateSchema = z.object({
  teamId: z.string().uuid(),
  invitedBy: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['captain', 'co_captain', 'member', 'observer']),
  invitationCode: z.string().min(1).max(50),
  expiresAt: z.date(),
  message: z.string().optional()
});

export const teamPostCreateSchema = z.object({
  teamId: z.string().uuid(),
  authorId: z.string().uuid(),
  title: z.string().max(255).optional(),
  content: z.string().min(1),
  postType: z.enum(['announcement', 'assignment', 'material', 'event']).default('announcement'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  isPinned: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  scheduledAt: z.date().optional(),
  expiresAt: z.date().optional()
});

export const teamEventCreateSchema = z.object({
  teamId: z.string().uuid(),
  createdBy: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  eventType: z.enum(['practice', 'tournament', 'meeting', 'deadline', 'other']).default('practice'),
  startTime: z.date(),
  endTime: z.date().optional(),
  location: z.string().max(255).optional(),
  isAllDay: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.record(z.string(), z.any()).optional(),
  reminderMinutes: z.array(z.number()).default([15, 60, 1440])
});

export const teamAssignmentCreateSchema = z.object({
  teamId: z.string().uuid(),
  createdBy: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assignmentType: z.enum(['task', 'homework', 'project', 'study', 'other']).default('task'),
  dueDate: z.date().optional(),
  points: z.number().int().positive().optional(),
  isRequired: z.boolean().default(true),
  maxAttempts: z.number().int().positive().optional(),
  timeLimitMinutes: z.number().int().positive().optional(),
  eventName: z.string().max(255).optional()
});

export const teamAssignmentSubmissionCreateSchema = z.object({
  assignmentId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string().optional(),
  attachments: z.array(z.any()).default([]),
  grade: z.number().int().min(0).max(100).optional(),
  feedback: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'graded', 'returned']).default('submitted'),
  attemptNumber: z.number().int().positive().default(1)
});

export const teamNotificationCreateSchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid(),
  notificationType: z.string().min(1),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  data: z.record(z.string(), z.any()).default({}),
  isRead: z.boolean().default(false)
});

export const rosterDataCreateSchema = z.object({
  teamUnitId: z.string().uuid(),
  eventName: z.string().min(1).max(255),
  slotIndex: z.number().int().min(0),
  studentName: z.string().max(255).optional(),
  userId: z.string().uuid().optional()
});

// Query parameter validation schemas
export const teamQuerySchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  status: z.enum(['active', 'archived', 'deleted']).default('active')
});

export const assignmentQuerySchema = z.object({
  teamId: z.string().uuid(),
  assignmentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'graded', 'returned']).optional()
});

export const notificationQuerySchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  isRead: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(50)
});

// Type exports for TypeScript
export type TeamGroupCreate = z.infer<typeof teamGroupCreateSchema>;
export type TeamUnitCreate = z.infer<typeof teamUnitCreateSchema>;
export type TeamMembershipCreate = z.infer<typeof teamMembershipCreateSchema>;
export type TeamInvitationCreate = z.infer<typeof teamInvitationCreateSchema>;
export type TeamPostCreate = z.infer<typeof teamPostCreateSchema>;
export type TeamEventCreate = z.infer<typeof teamEventCreateSchema>;
export type TeamAssignmentCreate = z.infer<typeof teamAssignmentCreateSchema>;
export type TeamAssignmentSubmissionCreate = z.infer<typeof teamAssignmentSubmissionCreateSchema>;
export type TeamNotificationCreate = z.infer<typeof teamNotificationCreateSchema>;
export type RosterDataCreate = z.infer<typeof rosterDataCreateSchema>;

export type TeamQuery = z.infer<typeof teamQuerySchema>;
export type AssignmentQuery = z.infer<typeof assignmentQuerySchema>;
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
