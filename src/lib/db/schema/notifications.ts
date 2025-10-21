import { pgTable, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from './core';
import { newTeamUnits } from './teams';

// ==================== TEAM NOTIFICATIONS ====================

export const newTeamNotifications = pgTable('new_team_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  teamId: uuid('team_id').references(() => newTeamUnits.id),
  notificationType: text('notification_type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: jsonb('data').default('{}'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  readAt: timestamp('read_at', { withTimezone: true }),
});
