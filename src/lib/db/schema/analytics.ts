import { pgTable, uuid, text, timestamp, jsonb, bigint } from 'drizzle-orm/pg-core';
import { users } from './core';
import { newTeamUnits } from './teams';

// ==================== TEAM ANALYTICS ====================

export const newTeamAnalytics = pgTable('new_team_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id),
  metricName: text('metric_name').notNull(),
  metricValue: bigint('metric_value', { mode: 'number' }),
  metricData: jsonb('metric_data').default('{}'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow(),
  periodStart: timestamp('period_start', { withTimezone: true }),
  periodEnd: timestamp('period_end', { withTimezone: true }),
});

// ==================== ACTIVE TIMERS ====================

export const newTeamActiveTimers = pgTable('new_team_active_timers', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamUnitId: uuid('team_unit_id').notNull().references(() => newTeamUnits.id),
  eventId: uuid('event_id').notNull(),
  addedBy: uuid('added_by').notNull().references(() => users.id),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
});
