import { pgTable, uuid, text, timestamp, jsonb, numeric, doublePrecision, integer, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Database schema definitions for Science Olympiad platform
 * Comprehensive Drizzle ORM schema definitions for all database tables
 */

/**
 * Questions table schema
 * Stores Science Olympiad questions with metadata and content
 */
export const questions = pgTable('questions', {
  id: uuid('id').primaryKey(),
  question: text('question').notNull(),
  tournament: text('tournament').notNull(),
  division: text('division').notNull(),
  options: jsonb('options').default('[]'),
  answers: jsonb('answers').notNull(),
  subtopics: jsonb('subtopics').default('[]'),
  difficulty: numeric('difficulty').default('0.5'),
  event: text('event').notNull(),
  randomF: doublePrecision('random_f').notNull().default(sql`random()`),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


/**
 * Quotes table schema
 * Stores inspirational quotes for the platform
 */
export const quotes = pgTable('quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  author: text('author').notNull(),
  quote: text('quote').notNull(),
  language: text('language').notNull(),
  charLength: integer('char_length').notNull(),
  randomF: doublePrecision('random_f').notNull().default(sql`random()`),
  createdAt: timestamp('created_at').defaultNow(),
});


/**
 * Long quotes table schema
 * Stores longer inspirational quotes for the platform
 */
export const longquotes = pgTable('longquotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  author: text('author').notNull(),
  quote: text('quote').notNull(),
  language: text('language').notNull(),
  charLength: integer('char_length').notNull(),
  randomF: doublePrecision('random_f').notNull().default(sql`random()`),
  createdAt: timestamp('created_at').defaultNow(),
});


/**
 * Share links table schema
 * Stores test sharing links with parameters and expiration
 */
export const shareLinks = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  indices: jsonb('indices'),
  testParamsRaw: jsonb('test_params_raw').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});


export const edits = pgTable('edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  event: text('event').notNull(),
  originalQuestion: jsonb('original_question').notNull(),
  editedQuestion: jsonb('edited_question').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


export const blacklists = pgTable('blacklists', {
  id: uuid('id').primaryKey().defaultRandom(),
  event: text('event').notNull(),
  questionData: jsonb('question_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


export const idEvents = pgTable('id_events', {
  id: uuid('id').primaryKey(),
  question: text('question').notNull(),
  tournament: text('tournament').notNull(),
  division: text('division').notNull(),
  options: jsonb('options').default('[]'),
  answers: jsonb('answers').notNull(),
  subtopics: jsonb('subtopics').default('[]'),
  difficulty: numeric('difficulty').default('0.5'),
  event: text('event').notNull(),
  images: jsonb('images').default('[]').notNull(),
  questionType: text('question_type'),
  pureId: boolean('pure_id').default(false),
  randomF: doublePrecision('random_f').notNull().default(sql`random()`),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


export const base52Codes = pgTable('base52_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  questionId: uuid('question_id').notNull(),
  tableName: text('table_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Team Groups table schema
 * Stores school/division groups that contain multiple team units
 */
export const newTeamGroups = pgTable('new_team_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  school: text('school').notNull(),
  division: text('division').notNull(), // 'B' or 'C'
  slug: text('slug').notNull().unique(),
  description: text('description'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  settings: jsonb('settings').default('{}'),
  status: text('status').default('active'), // 'active', 'archived', 'deleted'
});

/**
 * Team Units table schema
 * Individual teams within a group (A, B, C, etc.)
 */
export const newTeamUnits = pgTable('new_team_units', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => newTeamGroups.id, { onDelete: 'cascade' }),
  teamId: text('team_id').notNull(), // A, B, C, etc.
  description: text('description'),
  captainCode: text('captain_code').notNull().unique(),
  userCode: text('user_code').notNull().unique(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  settings: jsonb('settings').default('{}'),
  status: text('status').default('active'), // 'active', 'archived', 'deleted'
});

/**
 * Team Memberships table schema
 * User-team relationships with roles
 */
export const newTeamMemberships = pgTable('new_team_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'captain', 'co_captain', 'member', 'observer'
  joinedAt: timestamp('joined_at').defaultNow(),
  invitedBy: uuid('invited_by'),
  status: text('status').default('active'), // 'active', 'inactive', 'pending', 'banned'
  permissions: jsonb('permissions').default('{}'),
});

/**
 * Team Invitations table schema
 * Pending invitations to join teams
 */
export const newTeamInvitations = pgTable('new_team_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  invitationCode: text('invitation_code').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  message: text('message'),
});

/**
 * Team Posts table schema
 * Announcements, assignments, materials, events
 */
export const newTeamPosts = pgTable('new_team_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull(),
  title: text('title'),
  content: text('content').notNull(),
  postType: text('post_type').default('announcement'), // 'announcement', 'assignment', 'material', 'event'
  priority: text('priority').default('normal'), // 'low', 'normal', 'high', 'urgent'
  isPinned: boolean('is_pinned').default(false),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  scheduledAt: timestamp('scheduled_at'),
  expiresAt: timestamp('expires_at'),
});

/**
 * Team Post Attachments table schema
 * File attachments for posts
 */
export const newTeamPostAttachments = pgTable('new_team_post_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => newTeamPosts.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  uploadedBy: uuid('uploaded_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Team Events table schema
 * Calendar events for teams
 */
export const newTeamEvents = pgTable('new_team_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  eventType: text('event_type').default('practice'), // 'practice', 'tournament', 'meeting', 'deadline', 'other'
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  location: text('location'),
  isAllDay: boolean('is_all_day').default(false),
  isRecurring: boolean('is_recurring').default(false),
  recurrencePattern: jsonb('recurrence_pattern'),
  reminderMinutes: jsonb('reminder_minutes').default('[15, 60, 1440]'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Team Assignments table schema
 * Tasks and assignments for team members
 */
export const newTeamAssignments = pgTable('new_team_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  assignmentType: text('assignment_type').default('task'), // 'task', 'homework', 'project', 'study', 'other'
  dueDate: timestamp('due_date'),
  points: integer('points'),
  isRequired: boolean('is_required').default(true),
  maxAttempts: integer('max_attempts'),
  timeLimitMinutes: integer('time_limit_minutes'),
  eventName: text('event_name'), // Event name for assignments (e.g., 'Codebusters', 'Astronomy', etc.)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Team Assignment Submissions table schema
 * User submissions for assignments
 */
export const newTeamAssignmentSubmissions = pgTable('new_team_assignment_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').notNull().references(() => newTeamAssignments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  content: text('content'),
  attachments: jsonb('attachments').default('[]'),
  submittedAt: timestamp('submitted_at').defaultNow(),
  grade: integer('grade'),
  feedback: text('feedback'),
  status: text('status').default('submitted'), // 'draft', 'submitted', 'graded', 'returned'
  attemptNumber: integer('attempt_number').default(1),
});

/**
 * Team Assignment Roster table schema
 * Roster assignments for specific assignments
 */
export const newTeamAssignmentRoster = pgTable('new_team_assignment_roster', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').notNull().references(() => newTeamAssignments.id, { onDelete: 'cascade' }),
  studentName: text('student_name').notNull(),
  userId: uuid('user_id'),
  subteamId: uuid('subteam_id').references(() => newTeamUnits.id, { onDelete: 'cascade' }),
});

/**
 * Assignment questions table
 */
export const newTeamAssignmentQuestions = pgTable('new_team_assignment_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').notNull().references(() => newTeamAssignments.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  questionType: text('question_type').notNull(),
  options: jsonb('options'),
  correctAnswer: text('correct_answer'),
  points: integer('points').default(1),
  orderIndex: integer('order_index').notNull(),
  imageData: text('image_data'),
  difficulty: numeric('difficulty').default('0.5'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Team Notifications table schema
 * Notifications for team members
 */
export const newTeamNotifications = pgTable('new_team_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id, { onDelete: 'cascade' }),
  notificationType: text('notification_type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: jsonb('data').default('{}'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  readAt: timestamp('read_at'),
});

/**
 * Team Roster Data table schema
 * Student roster information for teams
 */
export const newTeamRosterData = pgTable('new_team_roster_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamUnitId: uuid('team_unit_id').notNull().references(() => newTeamUnits.id, { onDelete: 'cascade' }),
  eventName: text('event_name').notNull(),
  slotIndex: integer('slot_index').notNull(),
  studentName: text('student_name'),
  userId: uuid('user_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Roster Link Invitations table schema
 * Invitations to link roster entries to user accounts
 */
export const rosterLinkInvitations = pgTable('roster_link_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentName: text('student_name').notNull(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by').notNull(),
  message: text('message'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Users table schema (for reference)
 * This should match the Supabase users table structure
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  displayName: text('display_name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
 