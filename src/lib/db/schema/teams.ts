import { sql } from "drizzle-orm";
import {
	bool,
	cockroachTable,
	float,
	int8,
	jsonb,
	string,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/cockroach-core";
import { users } from "./core";

/**
 * Team Management System (Unified)
 */

export const teams = cockroachTable(
	"teams",
	{
		id: uuid().defaultRandom().primaryKey(),
		slug: string().notNull(),
		name: string().notNull(),
		school: string().notNull(),
		division: string().notNull(),
		createdBy: uuid("created_by")
			.notNull()
			.references(() => users.id),
		status: string().default("active").notNull(),
		settings: jsonb().default({}).notNull(),
		version: int8({ mode: "number" }).default(1).notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		memberCode: string("member_code")
			.default(
				sql`substr(replace(gen_random_uuid()::STRING, '-'::STRING, ''::STRING), 1, 8)`,
			)
			.notNull(),
		captainCode: string("captain_code")
			.default(
				sql`substr(replace(gen_random_uuid()::STRING, '-'::STRING, ''::STRING), 1, 10)`,
			)
			.notNull(),
		description: string(),
	},
	(table) => [
		uniqueIndex("teams_captain_code_unique").on(table.captainCode),
		uniqueIndex("teams_member_code_unique").on(table.memberCode),
		uniqueIndex("teams_slug_key").on(table.slug),
	],
);

export const teamSubteams = cockroachTable(
	"team_subteams",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		name: string().notNull(),
		description: string(),
		displayOrder: int8("display_order", { mode: "number" })
			.default(0)
			.notNull(),
		captainCode: varchar("captain_code", { length: 20 }),
		userCode: varchar("user_code", { length: 20 }),
		createdBy: uuid("created_by").references(() => users.id),
		status: string().default("active").notNull(),
		settings: jsonb().default({}).notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("team_subteams_name_unique").on(table.teamId, table.name),
	],
);

export const teamMemberships = cockroachTable(
	"team_memberships",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id),
		role: string().default("member").notNull(),
		status: string().default("active").notNull(),
		joinedAt: timestamp("joined_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		invitedBy: uuid("invited_by").references(() => users.id),
		metadata: jsonb().default({}).notNull(),
		permissions: jsonb().default({}).notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("team_memberships_unique").on(table.teamId, table.userId),
	],
);

export const teamRoster = cockroachTable(
	"team_roster",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
			onDelete: "cascade",
		}),
		userId: uuid("user_id").references(() => users.id),
		displayName: string("display_name").notNull(),
		studentName: string("student_name"),
		eventName: string("event_name").notNull(),
		slotIndex: int8("slot_index", { mode: "number" }).default(0).notNull(),
		role: string().default("competitor").notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("team_roster_unique").on(
			table.teamId,
			table.subteamId,
			table.eventName,
			table.slotIndex,
		),
	],
);

export const teamPeople = cockroachTable("team_people", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
		onDelete: "cascade",
	}),
	userId: uuid("user_id").references(() => users.id),
	name: string().notNull(),
	isAdmin: bool("is_admin").default(false),
	events: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

/**
 * Feature Tables
 */

export const teamEvents = cockroachTable("team_events", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
		onDelete: "cascade",
	}),
	title: varchar({ length: 255 }).notNull(),
	description: string(),
	location: varchar({ length: 255 }),
	startTime: timestamp("start_time", {
		mode: "string",
		withTimezone: true,
	}).notNull(),
	endTime: timestamp("end_time", {
		mode: "string",
		withTimezone: true,
	}).notNull(),
	allDay: bool("all_day").default(false),
	color: varchar({ length: 50 }),
	eventType: varchar("event_type", { length: 50 }).default("general"),
	isRecurring: bool("is_recurring").default(false),
	recurrencePattern: jsonb("recurrence_pattern"),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamEventAttendees = cockroachTable("team_event_attendees", {
	id: uuid().defaultRandom().primaryKey(),
	eventId: uuid("event_id")
		.notNull()
		.references(() => teamEvents.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	status: varchar({ length: 20 }).default("invited"),
	respondedAt: timestamp("responded_at", {
		mode: "string",
		withTimezone: true,
	}),
	notes: string(),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamStreamPosts = cockroachTable("team_stream_posts", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
		onDelete: "cascade",
	}),
	authorId: uuid("author_id")
		.notNull()
		.references(() => users.id),
	title: varchar({ length: 255 }),
	content: string().notNull(),
	postType: varchar("post_type", { length: 20 }).default("announcement"),
	priority: varchar({ length: 10 }).default("normal"),
	isPinned: bool("is_pinned").default(false),
	isPublic: bool("is_public").default(true),
	showTournamentTimer: bool("show_tournament_timer").default(false),
	tournamentId: uuid("tournament_id"),
	attachmentUrl: string("attachment_url"),
	attachmentTitle: string("attachment_title"),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamStreamComments = cockroachTable("team_stream_comments", {
	id: uuid().defaultRandom().primaryKey(),
	postId: uuid("post_id")
		.notNull()
		.references(() => teamStreamPosts.id, { onDelete: "cascade" }),
	authorId: uuid("author_id")
		.notNull()
		.references(() => users.id),
	content: string().notNull(),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamActiveTimers = cockroachTable("team_active_timers", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
		onDelete: "cascade",
	}),
	eventId: string("event_id").notNull(),
	addedBy: uuid("added_by").references(() => users.id),
	addedAt: timestamp("added_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamRecurringMeetings = cockroachTable("team_recurring_meetings", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
		onDelete: "cascade",
	}),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => users.id),
	title: varchar({ length: 255 }).notNull(),
	description: string(),
	location: varchar({ length: 255 }),
	daysOfWeek: jsonb("days_of_week").notNull(),
	startTime: string("start_time"),
	endTime: string("end_time"),
	startDate: timestamp("start_date", { mode: "string", withTimezone: true }),
	endDate: timestamp("end_date", { mode: "string", withTimezone: true }),
	exceptions: jsonb("exceptions").default([]),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamRemovedEvents = cockroachTable("team_removed_events", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
		onDelete: "cascade",
	}),
	eventName: varchar("event_name", { length: 255 }).notNull(),
	conflictBlock: varchar("conflict_block", { length: 255 }).notNull(),
	removedBy: uuid("removed_by")
		.notNull()
		.references(() => users.id),
	removedAt: timestamp("removed_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamAssignments = cockroachTable("team_assignments", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
		onDelete: "cascade",
	}),
	title: string().notNull(),
	description: string(),
	dueDate: timestamp("due_date", { mode: "string", withTimezone: true }),
	status: string().default("active").notNull(),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => users.id),
	assignmentType: varchar("assignment_type", { length: 50 }).default(
		"standard",
	),
	points: int8({ mode: "number" }).default(0),
	isRequired: bool("is_required").default(false),
	maxAttempts: int8("max_attempts", { mode: "number" }).default(1),
	timeLimitMinutes: int8("time_limit_minutes", { mode: "number" }),
	eventName: varchar("event_name", { length: 255 }),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamSubmissions = cockroachTable("team_submissions", {
	id: uuid().defaultRandom().primaryKey(),
	assignmentId: uuid("assignment_id")
		.notNull()
		.references(() => teamAssignments.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	content: jsonb().default({}).notNull(),
	status: string().default("draft").notNull(),
	attemptNumber: int8("attempt_number", { mode: "number" }).default(1),
	grade: float(),
	submittedAt: timestamp("submitted_at", {
		mode: "string",
		withTimezone: true,
	}),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamAssignmentAnalytics = cockroachTable(
	"team_assignment_analytics",
	{
		id: uuid().defaultRandom().primaryKey(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => teamAssignments.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id),
		studentName: string("student_name"),
		totalQuestions: int8("total_questions", { mode: "number" }).default(0),
		correctAnswers: int8("correct_answers", { mode: "number" }).default(0),
		totalPoints: float("total_points").default(0),
		earnedPoints: float("earned_points").default(0),
		timeSpentSeconds: int8("time_spent_seconds", { mode: "number" }).default(0),
		completionTimeSeconds: int8("completion_time_seconds", {
			mode: "number",
		}).default(0),
		startTime: timestamp("start_time", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		endTime: timestamp("end_time", { mode: "string", withTimezone: true }),
		submittedAt: timestamp("submitted_at", {
			mode: "string",
			withTimezone: true,
		}),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
);

export const teamAssignmentQuestions = cockroachTable(
	"team_assignment_questions",
	{
		id: uuid().defaultRandom().primaryKey(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => teamAssignments.id, { onDelete: "cascade" }),
		questionText: string("question_text").notNull(),
		questionType: varchar("question_type", { length: 20 }).default(
			"multiple_choice",
		),
		options: jsonb().default([]),
		correctAnswer: string("correct_answer"),
		points: int8({ mode: "number" }).default(1),
		orderIndex: int8("order_index", { mode: "number" }).default(0),
		imageData: string("image_data"),
		difficulty: varchar({ length: 50 }),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
);

export const teamAssignmentQuestionResponses = cockroachTable(
	"team_assignment_question_responses",
	{
		id: uuid().defaultRandom().primaryKey(),
		submissionId: uuid("submission_id")
			.notNull()
			.references(() => teamSubmissions.id, { onDelete: "cascade" }),
		questionId: uuid("question_id")
			.notNull()
			.references(() => teamAssignmentQuestions.id, { onDelete: "cascade" }),
		response: string().notNull(),
		responseText: string("response_text"),
		isCorrect: bool("is_correct"),
		pointsEarned: float("points_earned").default(0),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
);

export const teamAssignmentRoster = cockroachTable("team_assignment_roster", {
	id: uuid().defaultRandom().primaryKey(),
	assignmentId: uuid("assignment_id")
		.notNull()
		.references(() => teamAssignments.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
		onDelete: "cascade",
	}),
	displayName: string("display_name"),
	studentName: string("student_name"),
	status: varchar({ length: 20 }).default("assigned"),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamAssignmentTemplates = cockroachTable(
	"team_assignment_templates",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		title: varchar({ length: 255 }).notNull(),
		description: string(),
		config: jsonb().notNull(),
		createdBy: uuid("created_by")
			.notNull()
			.references(() => users.id),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
);

export const teamInvitations = cockroachTable("team_invitations", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	email: string().notNull(),
	invitedUserId: uuid("invited_user_id").references(() => users.id),
	invitedEmail: string("invited_email"),
	role: string().default("member").notNull(),
	status: string().default("pending").notNull(),
	invitedBy: uuid("invited_by")
		.notNull()
		.references(() => users.id),
	invitationCode: varchar("invitation_code", { length: 50 }),
	token: string(),
	acceptedAt: timestamp("accepted_at", { mode: "string", withTimezone: true }),
	expiresAt: timestamp("expires_at", { mode: "string", withTimezone: true }),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamLinkInvitations = cockroachTable("team_link_invitations", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	rosterDisplayName: string("roster_display_name").notNull(),
	invitedUsername: string("invited_username").notNull(),
	invitedBy: uuid("invited_by")
		.notNull()
		.references(() => users.id),
	status: string().default("pending").notNull(),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamPolls = cockroachTable("team_polls", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
		onDelete: "cascade",
	}),
	question: string().notNull(),
	options: jsonb().notNull(),
	allowMultiple: bool("allow_multiple").default(false),
	expiresAt: timestamp("expires_at", { mode: "string", withTimezone: true }),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamPollVotes = cockroachTable(
	"team_poll_votes",
	{
		id: uuid().defaultRandom().primaryKey(),
		pollId: uuid("poll_id")
			.notNull()
			.references(() => teamPolls.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id),
		optionIndices: jsonb("option_indices").notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("team_poll_votes_unique").on(table.pollId, table.userId),
	],
);

export const teamAnalytics = cockroachTable("team_analytics", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	metricType: varchar("metric_type", { length: 50 }).notNull(),
	value: float().notNull(),
	metadata: jsonb().default({}),
	recordedAt: timestamp("recorded_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamMaterials = cockroachTable("team_materials", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
		onDelete: "cascade",
	}),
	title: varchar({ length: 255 }).notNull(),
	description: string(),
	fileUrl: string("file_url").notNull(),
	fileType: varchar("file_type", { length: 50 }),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamMessages = cockroachTable("team_messages", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	subteamId: uuid("subteam_id").references(() => teamSubteams.id, {
		onDelete: "cascade",
	}),
	senderId: uuid("sender_id")
		.notNull()
		.references(() => users.id),
	content: string().notNull(),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamNotifications = cockroachTable("team_notifications", {
	id: uuid().defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
	type: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: string().notNull(),
	isRead: bool("is_read").default(false),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const teamPostAttachments = cockroachTable("team_post_attachments", {
	id: uuid().defaultRandom().primaryKey(),
	postId: uuid("post_id")
		.notNull()
		.references(() => teamStreamPosts.id, { onDelete: "cascade" }),
	title: varchar({ length: 255 }).notNull(),
	url: string().notNull(),
	type: varchar({ length: 50 }),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
});
