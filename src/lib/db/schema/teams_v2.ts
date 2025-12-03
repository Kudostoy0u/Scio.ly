import {
	bigint,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./core";

/**
 * Teams v2 schema
 *
 * All tables are prefixed with teams_ and share a single versioned team record.
 * The teams_team.updatedAt/version fields are bumped whenever related data changes.
 */

export const teamsTeam = pgTable("teams_team", {
	id: uuid("id").primaryKey().defaultRandom(),
	slug: text("slug").notNull().unique(),
	name: text("name").notNull(),
	school: text("school").notNull(),
	division: text("division").notNull(),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => users.id),
	status: text("status").notNull().default("active"),
	memberCode: text("member_code").notNull().unique(),
	captainCode: text("captain_code").notNull().unique(),
	settings: jsonb("settings").notNull().default("{}"),
	version: bigint("version", { mode: "number" }).notNull().default(1),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const teamsSubteam = pgTable("teams_subteam", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teamsTeam.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	displayOrder: bigint("display_order", { mode: "number" })
		.notNull()
		.default(0),
	createdBy: uuid("created_by").references(() => users.id),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const teamsMembership = pgTable("teams_membership", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teamsTeam.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	role: text("role").notNull().default("member"),
	status: text("status").notNull().default("active"),
	joinedAt: timestamp("joined_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	invitedBy: uuid("invited_by").references(() => users.id),
	metadata: jsonb("metadata").notNull().default("{}"),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const teamsRoster = pgTable("teams_roster", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teamsTeam.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamsSubteam.id, {
		onDelete: "cascade",
	}),
	userId: uuid("user_id").references(() => users.id),
	displayName: text("display_name").notNull(),
	eventName: text("event_name").notNull(),
	slotIndex: bigint("slot_index", { mode: "number" }).notNull().default(0),
	role: text("role").notNull().default("competitor"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const teamsAssignment = pgTable("teams_assignment", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teamsTeam.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamsSubteam.id, {
		onDelete: "set null",
	}),
	title: text("title").notNull(),
	description: text("description"),
	dueDate: timestamp("due_date", { withTimezone: true }),
	status: text("status").notNull().default("open"),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const teamsSubmission = pgTable("teams_submission", {
	id: uuid("id").primaryKey().defaultRandom(),
	assignmentId: uuid("assignment_id")
		.notNull()
		.references(() => teamsAssignment.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	content: jsonb("content").notNull().default("{}"),
	status: text("status").notNull().default("draft"),
	submittedAt: timestamp("submitted_at", { withTimezone: true }),
	grade: jsonb("grade").notNull().default("{}"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const teamsInvitation = pgTable("teams_invitation", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teamsTeam.id, { onDelete: "cascade" }),
	invitedUserId: uuid("invited_user_id").references(() => users.id),
	invitedEmail: text("invited_email"),
	role: text("role").notNull().default("member"),
	invitedBy: uuid("invited_by")
		.notNull()
		.references(() => users.id),
	status: text("status").notNull().default("pending"),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
