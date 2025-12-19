import { sql } from "drizzle-orm";
import {
	char,
	cockroachTable,
	decimal,
	index,
	int8,
	jsonb,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/cockroach-core";
import { users } from "./core";

export const assignments = cockroachTable(
	"assignments",
	{
		id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
		school: varchar({ length: 255 }).notNull(),
		division: char().notNull(),
		teamId: varchar("team_id", { length: 10 }).notNull(),
		eventName: varchar("event_name", { length: 255 }).notNull(),
		assignees: jsonb().notNull(),
		params: jsonb().notNull(),
		questions: jsonb().notNull(),
		createdBy: varchar("created_by", { length: 255 }).notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_assignments_team").on(
			table.school,
			table.division,
			table.teamId,
		),
	],
);

export const assignmentResults = cockroachTable("assignment_results", {
	id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
	assignmentId: int8("assignment_id", { mode: "number" })
		.notNull()
		.references(() => assignments.id, { onDelete: "cascade" }),
	userId: varchar("user_id", { length: 255 }),
	name: varchar({ length: 255 }),
	eventName: varchar("event_name", { length: 255 }),
	score: decimal(),
	submittedAt: timestamp("submitted_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	detail: jsonb(),
});

export const invitesV2 = cockroachTable("invites_v2", {
	id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
	inviterUserId: uuid("inviter_user_id")
		.notNull()
		.references(() => users.id),
	inviteeUsername: varchar("invitee_username", { length: 255 }).notNull(),
	inviteeUserId: uuid("invitee_user_id").references(() => users.id),
	school: varchar({ length: 255 }).notNull(),
	division: char().notNull(),
	teamId: varchar("team_id", { length: 10 }).notNull(),
	status: varchar({ length: 20 }).default("pending").notNull(),
	code: varchar({ length: 10 }).notNull(),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});
