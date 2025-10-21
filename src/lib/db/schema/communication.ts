import { pgTable, uuid, text, timestamp, boolean, jsonb, bigint } from 'drizzle-orm/pg-core';
import { users } from './core';
import { newTeamUnits } from './teams';

// ==================== TEAM POSTS ====================

export const newTeamPosts = pgTable('new_team_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id),
  authorId: uuid('author_id').notNull().references(() => users.id),
  title: text('title'),
  content: text('content').notNull(),
  postType: text('post_type').default('announcement'),
  priority: text('priority').default('normal'),
  isPinned: boolean('is_pinned').default(false),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

// ==================== POST ATTACHMENTS ====================

export const newTeamPostAttachments = pgTable('new_team_post_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => newTeamPosts.id),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type'),
  fileSize: bigint('file_size', { mode: 'number' }),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ==================== TEAM MESSAGES ====================

export const newTeamMessages = pgTable('new_team_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id),
  senderId: uuid('sender_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  messageType: text('message_type').default('text'),
  replyTo: uuid('reply_to').references(() => newTeamMessages.id),
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ==================== TEAM POLLS ====================

export const newTeamPolls = pgTable('new_team_polls', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  question: text('question').notNull(),
  options: jsonb('options').notNull(),
  isAnonymous: boolean('is_anonymous').default(false),
  allowMultiple: boolean('allow_multiple').default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

// ==================== POLL VOTES ====================

export const newTeamPollVotes = pgTable('new_team_poll_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  pollId: uuid('poll_id').notNull().references(() => newTeamPolls.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  selectedOptions: jsonb('selected_options').notNull(),
  votedAt: timestamp('voted_at', { withTimezone: true }).defaultNow(),
});

// ==================== STREAM POSTS ====================

export const newTeamStreamPosts = pgTable('new_team_stream_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamUnitId: uuid('team_unit_id').notNull().references(() => newTeamUnits.id),
  authorId: uuid('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  showTournamentTimer: boolean('show_tournament_timer').default(false),
  tournamentId: uuid('tournament_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  attachmentUrl: text('attachment_url'),
  attachmentTitle: text('attachment_title'),
});

// ==================== STREAM COMMENTS ====================

export const newTeamStreamComments = pgTable('new_team_stream_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => newTeamStreamPosts.id),
  authorId: uuid('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
