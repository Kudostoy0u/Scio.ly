import { pgTable, uuid, text, timestamp, boolean, jsonb, bigint, time, date, integer } from 'drizzle-orm/pg-core';
import { users } from './core';
import { newTeamUnits } from './teams';

// ==================== TEAM EVENTS ====================

export const newTeamEvents = pgTable('new_team_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => newTeamUnits.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  eventType: text('event_type').default('practice'),
  startTime: timestamp('start_time', { withTimezone: true }),
  endTime: timestamp('end_time', { withTimezone: true }),
  location: text('location'),
  isAllDay: boolean('is_all_day').default(false),
  isRecurring: boolean('is_recurring').default(false),
  recurrencePattern: jsonb('recurrence_pattern'),
  reminderMinutes: integer('reminder_minutes').array().default([15, 60, 1440]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ==================== RECURRING MEETINGS ====================

export const newTeamRecurringMeetings = pgTable('new_team_recurring_meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  daysOfWeek: jsonb('days_of_week').notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  exceptions: jsonb('exceptions').default('[]'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ==================== EVENT ATTENDEES ====================

export const newTeamEventAttendees = pgTable('new_team_event_attendees', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => newTeamEvents.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  status: text('status').default('pending'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  notes: text('notes'),
});

// ==================== REMOVED EVENTS ====================

export const newTeamRemovedEvents = pgTable('new_team_removed_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamUnitId: uuid('team_unit_id').notNull().references(() => newTeamUnits.id),
  eventName: text('event_name').notNull(),
  conflictBlock: text('conflict_block').notNull(),
  removedBy: uuid('removed_by').notNull().references(() => users.id),
  removedAt: timestamp('removed_at', { withTimezone: true }).defaultNow(),
});

// ==================== TEAM GROUP TOURNAMENTS ====================

export const teamGroupTournaments = pgTable('team_group_tournaments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  groupId: bigint('group_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  dateTime: timestamp('date_time').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
