import {
  bigint,
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./core";

// ==================== TEAM GROUPS ====================

export const newTeamGroups = pgTable("new_team_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  school: text("school").notNull(),
  division: varchar("division", { length: 1 }).notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  settings: jsonb("settings").default("{}"),
  status: text("status").default("active"),
});

// ==================== TEAM UNITS ====================

export const newTeamUnits = pgTable("new_team_units", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => newTeamGroups.id),
  teamId: text("team_id").notNull(),
  description: text("description"),
  captainCode: text("captain_code").notNull(),
  userCode: text("user_code").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  settings: jsonb("settings").default("{}"),
  status: text("status").default("active"),
  displayOrder: bigint("display_order", { mode: "number" }).default(0),
});

// ==================== TEAM MEMBERSHIPS ====================

export const newTeamMemberships = pgTable("new_team_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  teamId: uuid("team_id")
    .notNull()
    .references(() => newTeamUnits.id),
  role: text("role").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  invitedBy: uuid("invited_by").references(() => users.id),
  status: text("status").default("active"),
  permissions: jsonb("permissions").default("{}"),
});

// ==================== TEAM INVITATIONS ====================

export const newTeamInvitations = pgTable("new_team_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => newTeamUnits.id),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => users.id),
  email: text("email").notNull(),
  role: text("role").notNull(),
  invitationCode: text("invitation_code").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  message: text("message"),
});

// ==================== TEAM PEOPLE ====================

export const newTeamPeople = pgTable("new_team_people", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamUnitId: uuid("team_unit_id")
    .notNull()
    .references(() => newTeamUnits.id),
  name: text("name").notNull(),
  userId: uuid("user_id").references(() => users.id), // null for unlinked people
  isAdmin: text("is_admin").default("false"), // 'true' or 'false'
  events: jsonb("events").default("[]"), // array of event names
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ==================== TEAM ROSTER DATA ====================

export const newTeamRosterData = pgTable("new_team_roster_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamUnitId: uuid("team_unit_id")
    .notNull()
    .references(() => newTeamUnits.id),
  eventName: text("event_name").notNull(),
  slotIndex: bigint("slot_index", { mode: "number" }).notNull(),
  studentName: text("student_name"),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ==================== ROSTER LINK INVITATIONS ====================

export const rosterLinkInvitations = pgTable("roster_link_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => newTeamUnits.id),
  studentName: text("student_name").notNull(),
  invitedUserId: uuid("invited_user_id")
    .notNull()
    .references(() => users.id),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => users.id),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  message: text("message"),
});

// ==================== LEGACY TEAM TABLES ====================

export const teamGroups = pgTable("team_groups", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  school: text("school").notNull(),
  division: varchar("division", { length: 1 }).notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const teamUnits = pgTable("team_units", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  school: text("school").notNull(),
  division: varchar("division", { length: 1 }).notNull(),
  teamId: text("team_id").notNull(),
  name: text("name").notNull(),
  roster: jsonb("roster").notNull().default("{}"),
  captainCode: text("captain_code").notNull(),
  userCode: text("user_code").notNull(),
  slug: text("slug").notNull(),
  groupId: bigint("group_id", { mode: "number" }).references(() => teamGroups.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const teamMemberships = pgTable("team_memberships", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  teamUnitId: bigint("team_unit_id", { mode: "number" })
    .notNull()
    .references(() => teamUnits.id),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const teams = pgTable("teams", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  school: text("school").notNull(),
  division: varchar("division", { length: 1 }).notNull(),
  teams: jsonb("teams").notNull().default("[]"),
  captainCode: text("captain_code").notNull(),
  userCode: text("user_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const teamLinks = pgTable("team_links", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  school: text("school").notNull(),
  division: varchar("division", { length: 1 }).notNull(),
  teamId: text("team_id").notNull(),
  memberName: text("member_name").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("linked"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ==================== TEAM EVENTS ====================
// Note: This is also defined in schema.ts but included here for completeness

export const newTeamEvents = pgTable("new_team_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => newTeamUnits.id, { onDelete: "cascade" }), // Nullable for personal events
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").default("practice"), // 'practice', 'tournament', 'meeting', 'deadline', 'other'
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  location: text("location"),
  isAllDay: boolean("is_all_day").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: jsonb("recurrence_pattern"),
  reminderMinutes: jsonb("reminder_minutes").default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ==================== TEAM EVENT ATTENDEES ====================

export const newTeamEventAttendees = pgTable("new_team_event_attendees", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => newTeamEvents.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").default("pending"), // 'pending', 'attending', 'declined', 'tentative'
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  notes: text("notes"),
});

// ==================== TEAM REMOVED EVENTS ====================

export const newTeamRemovedEvents = pgTable(
  "new_team_removed_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamUnitId: uuid("team_unit_id")
      .notNull()
      .references(() => newTeamUnits.id, { onDelete: "cascade" }),
    eventName: text("event_name").notNull(),
    conflictBlock: text("conflict_block").notNull(),
    removedBy: uuid("removed_by")
      .notNull()
      .references(() => users.id),
    removedAt: timestamp("removed_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    teamUnitEventUnique: unique().on(table.teamUnitId, table.eventName),
  })
);

// ==================== TEAM STREAM POSTS ====================

export const newTeamStreamPosts = pgTable("new_team_stream_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamUnitId: uuid("team_unit_id")
    .notNull()
    .references(() => newTeamUnits.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  showTournamentTimer: boolean("show_tournament_timer").default(false),
  tournamentId: uuid("tournament_id").references(() => newTeamEvents.id, { onDelete: "set null" }),
  attachmentUrl: text("attachment_url"),
  attachmentTitle: text("attachment_title"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ==================== TEAM STREAM COMMENTS ====================

export const newTeamStreamComments = pgTable("new_team_stream_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => newTeamStreamPosts.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ==================== TEAM ACTIVE TIMERS ====================

export const newTeamActiveTimers = pgTable("new_team_active_timers", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamUnitId: uuid("team_unit_id")
    .notNull()
    .references(() => newTeamUnits.id, { onDelete: "cascade" }),
  eventId: uuid("event_id")
    .notNull()
    .references(() => newTeamEvents.id, { onDelete: "cascade" }),
  addedBy: uuid("added_by")
    .notNull()
    .references(() => users.id),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
});

// ==================== TEAM RECURRING MEETINGS ====================

export const newTeamRecurringMeetings = pgTable("new_team_recurring_meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => newTeamUnits.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  daysOfWeek: jsonb("days_of_week").notNull(), // Array of day numbers (0=Sunday, 1=Monday, etc.)
  startTime: text("start_time").notNull(), // TIME type stored as text
  endTime: text("end_time").notNull(), // TIME type stored as text
  startDate: timestamp("start_date", { mode: "date" }), // Start date for the recurring meeting series
  endDate: timestamp("end_date", { mode: "date" }), // End date for the recurring meeting series (NULL means no end date)
  exceptions: jsonb("exceptions").default("[]"), // Array of dates to skip (YYYY-MM-DD format)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
