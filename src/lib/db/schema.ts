import { sql } from "drizzle-orm";
import {
	boolean,
	doublePrecision,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * Database schema definitions for Science Olympiad platform
 * Comprehensive Drizzle ORM schema definitions for all database tables
 */

/**
 * Questions table schema
 * Stores Science Olympiad questions with metadata and content
 */
export const questions = pgTable("questions", {
	id: uuid("id").primaryKey(),
	question: text("question").notNull(),
	tournament: text("tournament").notNull(),
	division: text("division").notNull(),
	options: jsonb("options").default("[]"),
	answers: jsonb("answers").notNull(),
	subtopics: jsonb("subtopics").default("[]"),
	difficulty: numeric("difficulty").default("0.5"),
	event: text("event").notNull(),
	randomF: doublePrecision("random_f").notNull().default(sql`random()`),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Quotes table schema
 * Stores inspirational quotes for the platform
 */
export const quotes = pgTable("quotes", {
	id: uuid("id").primaryKey().defaultRandom(),
	author: text("author").notNull(),
	quote: text("quote").notNull(),
	language: text("language").notNull(),
	charLength: integer("char_length").notNull(),
	randomF: doublePrecision("random_f").notNull().default(sql`random()`),
	createdAt: timestamp("created_at").defaultNow(),
});

/**
 * ID Events table schema
 * Stores Science Olympiad ID event questions
 */
export const idEvents = pgTable("id_events", {
	id: uuid("id").primaryKey(),
	question: text("question").notNull(),
	tournament: text("tournament").notNull(),
	division: text("division").notNull(),
	options: jsonb("options").default("[]"),
	answers: jsonb("answers").notNull(),
	subtopics: jsonb("subtopics").default("[]"),
	images: jsonb("images").default("[]"),
	difficulty: numeric("difficulty").default("0.5"),
	event: text("event").notNull(),
	randomF: doublePrecision("random_f").notNull().default(sql`random()`),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Base52 Codes table schema
 * Stores short codes for question sharing
 */
export const base52Codes = pgTable("base52_codes", {
	id: uuid("id").primaryKey().defaultRandom(),
	questionId: uuid("question_id").notNull(),
	tableName: text("table_name").notNull(),
	code: text("code").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Team Groups table schema
 * Top-level team organization (school + division)
 */
export const newTeamGroups = pgTable("new_team_groups", {
	id: uuid("id").primaryKey().defaultRandom(),
	school: text("school").notNull(),
	division: text("division").notNull(),
	slug: text("slug").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Team Units table schema
 * Individual team instances within a group
 */
export const newTeamUnits = pgTable("new_team_units", {
	id: uuid("id").primaryKey().defaultRandom(),
	groupId: uuid("group_id")
		.notNull()
		.references(() => newTeamGroups.id, { onDelete: "cascade" }),
	captainCode: text("captain_code").notNull().unique(),
	userCode: text("user_code").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Team Memberships table schema
 * User-team relationships
 */
export const newTeamMemberships = pgTable("new_team_memberships", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => newTeamUnits.id, { onDelete: "cascade" }),
	userId: uuid("user_id").notNull(),
	role: text("role").notNull(),
	status: text("status").default("active"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Team Invitations table schema
 * Pending team invitations
 */
export const newTeamInvitations = pgTable("new_team_invitations", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => newTeamUnits.id, { onDelete: "cascade" }),
	email: text("email").notNull(),
	role: text("role").notNull(),
	invitedBy: uuid("invited_by").notNull(),
	status: text("status").default("pending"),
	createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Team Posts table schema
 * General posts/announcements for teams
 */
export const newTeamPosts = pgTable("new_team_posts", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => newTeamUnits.id, { onDelete: "cascade" }),
	authorId: uuid("author_id").notNull(),
	title: text("title"),
	content: text("content").notNull(),
	postType: text("post_type").default("announcement"), // 'announcement', 'assignment', 'material', 'event'
	priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
	isPinned: boolean("is_pinned").default(false),
	isPublic: boolean("is_public").default(true),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	scheduledAt: timestamp("scheduled_at"),
	expiresAt: timestamp("expires_at"),
});

/**
 * Team Post Attachments table schema
 * File attachments for posts
 */
export const newTeamPostAttachments = pgTable("new_team_post_attachments", {
	id: uuid("id").primaryKey().defaultRandom(),
	postId: uuid("post_id")
		.notNull()
		.references(() => newTeamPosts.id, { onDelete: "cascade" }),
	fileName: text("file_name").notNull(),
	fileUrl: text("file_url").notNull(),
	fileType: text("file_type"),
	fileSize: integer("file_size"),
	uploadedBy: uuid("uploaded_by").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Team Events table schema
 * Calendar events for teams
 */
export const newTeamEvents = pgTable("new_team_events", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => newTeamUnits.id, { onDelete: "cascade" }),
	createdBy: uuid("created_by").notNull(),
	title: text("title").notNull(),
	description: text("description"),
	startTime: timestamp("start_time", { withTimezone: true }),
	endTime: timestamp("end_time", { withTimezone: true }),
	eventType: text("event_type").default("practice"),
	location: text("location"),
	isRecurring: boolean("is_recurring").default(false),
	recurringPattern: jsonb("recurring_pattern"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Team Assignments table schema
 * Assignments for team members
 */
export const newTeamAssignments = pgTable("new_team_assignments", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => newTeamUnits.id, { onDelete: "cascade" }),
	createdBy: uuid("created_by").notNull(),
	title: text("title").notNull(),
	description: text("description"),
	assignmentType: text("assignment_type").default("task"),
	dueDate: timestamp("due_date", { withTimezone: true }),
	points: integer("points"),
	isRequired: boolean("is_required").default(true),
	maxAttempts: integer("max_attempts"),
	timeLimitMinutes: integer("time_limit_minutes"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Team Assignment Submissions table schema
 * User submissions for assignments
 */
export const newTeamAssignmentSubmissions = pgTable(
	"new_team_assignment_submissions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => newTeamAssignments.id, { onDelete: "cascade" }),
		userId: uuid("user_id").notNull(),
		status: text("status").default("pending"),
		submittedAt: timestamp("submitted_at", { withTimezone: true }),
		grade: integer("grade"),
		attemptNumber: integer("attempt_number").default(1),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
);

/**
 * Team Assignment Roster table schema
 * Roster entries for assignments
 */
export const newTeamAssignmentRoster = pgTable("new_team_assignment_roster", {
	id: uuid("id").primaryKey().defaultRandom(),
	assignmentId: uuid("assignment_id")
		.notNull()
		.references(() => newTeamAssignments.id, { onDelete: "cascade" }),
	studentName: text("student_name").notNull(),
	userId: uuid("user_id"),
	createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Team Assignment Questions table schema
 * Questions associated with assignments
 */
export const newTeamAssignmentQuestions = pgTable(
	"new_team_assignment_questions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => newTeamAssignments.id, { onDelete: "cascade" }),
		questionId: uuid("question_id").notNull(),
		order: integer("order").default(0),
		points: integer("points"),
		createdAt: timestamp("created_at").defaultNow(),
	},
);

/**
 * Team Notifications table schema
 * Notifications for team members
 */
export const newTeamNotifications = pgTable("new_team_notifications", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => newTeamUnits.id, { onDelete: "cascade" }),
	userId: uuid("user_id").notNull(),
	type: text("type").notNull(),
	title: text("title").notNull(),
	message: text("message").notNull(),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Team Roster Data table schema
 * Student roster information for teams
 */
export const newTeamRosterData = pgTable("new_team_roster_data", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamUnitId: uuid("team_unit_id")
		.notNull()
		.references(() => newTeamUnits.id, { onDelete: "cascade" }),
	eventName: text("event_name").notNull(),
	slotIndex: integer("slot_index").notNull(),
	studentName: text("student_name"),
	userId: uuid("user_id"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Roster Link Invitations table schema
 * Invitations to link roster entries to user accounts
 */
export const rosterLinkInvitations = pgTable("roster_link_invitations", {
	id: uuid("id").primaryKey().defaultRandom(),
	studentName: text("student_name").notNull(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => newTeamUnits.id, { onDelete: "cascade" }),
	invitedBy: uuid("invited_by").notNull(),
	message: text("message"),
	status: text("status").default("pending"),
	createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Users table schema (for reference)
 * This should match the Supabase users table structure
 */
export const users = pgTable("users", {
	id: uuid("id").primaryKey(),
	email: text("email").notNull().unique(),
	username: text("username").notNull().unique(),
	displayName: text("display_name"),
	firstName: text("first_name"),
	lastName: text("last_name"),
	photoUrl: text("photo_url"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Re-export team-related schemas from teams.ts
export {
	newTeamStreamPosts,
	newTeamStreamComments,
	newTeamActiveTimers,
	newTeamRemovedEvents,
} from "./schema/teams";

// Teams v2 canonical tables
export {
	teamsAssignment,
	teamsInvitation,
	teamsMembership,
	teamsRoster,
	teamsSubmission,
	teamsSubteam,
	teamsTeam,
} from "./schema/teams_v2";

// Re-export additional schemas from core.ts
export { longquotes, quoteBlacklists, quoteEdits } from "./schema/core";
