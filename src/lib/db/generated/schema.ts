import { sql } from "drizzle-orm";
import {
	bool,
	char,
	cockroachTable,
	decimal,
	float,
	index,
	int8,
	jsonb,
	string,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/cockroach-core";

export const apiKeyGenerations = cockroachTable(
	"api_key_generations",
	{
		id: uuid().defaultRandom().primaryKey(),
		ipAddress: string("ip_address").notNull(),
		apiKeyHash: string("api_key_hash").notNull(),
		userId: uuid("user_id"),
		generatedAt: timestamp("generated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_api_key_generations_ip").using("btree", table.ipAddress.asc()),
		uniqueIndex("idx_api_key_generations_ip_unique").using(
			"btree",
			table.ipAddress.asc(),
		),
		index("idx_api_key_generations_user").using("btree", table.userId.asc()),
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
		index("idx_assignments_team").using(
			"btree",
			table.school.asc(),
			table.division.asc(),
			table.teamId.asc(),
		),
	],
);

export const base52Codes = cockroachTable(
	"base52_codes",
	{
		id: uuid().defaultRandom().primaryKey(),
		code: varchar({ length: 5 }).notNull(),
		questionId: uuid("question_id").notNull(),
		tableName: varchar("table_name", { length: 20 }).notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
	},
	(table) => [
		index("base52_codes_code_idx").using("btree", table.code.asc()),
		uniqueIndex("base52_codes_code_key").using("btree", table.code.asc()),
		index("base52_codes_question_table_idx").using(
			"btree",
			table.questionId.asc(),
			table.tableName.asc(),
		),
		uniqueIndex("base52_codes_unique_code").using("btree", table.code.asc()),
		uniqueIndex("base52_codes_unique_question").using(
			"btree",
			table.questionId.asc(),
			table.tableName.asc(),
		),
	],
);

export const blacklists = cockroachTable(
	"blacklists",
	{
		id: uuid().defaultRandom().primaryKey(),
		event: varchar({ length: 255 }).notNull(),
		questionData: jsonb("question_data").notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
	},
	(table) => [index("idx_blacklists_event").using("btree", table.event.asc())],
);

export const calendarEventAttendees = cockroachTable(
	"calendar_event_attendees",
	{
		id: uuid().defaultRandom().primaryKey(),
		eventId: uuid("event_id")
			.notNull()
			.references(() => calendarEvents.id, { onDelete: "cascade" }),
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
	},
);

export const calendarEvents = cockroachTable("calendar_events", {
	id: uuid().defaultRandom().primaryKey(),
	ownerUserId: uuid("owner_user_id").references(() => users.id, {
		onDelete: "cascade",
	}),
	teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
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
	endTime: timestamp("end_time", { mode: "string", withTimezone: true }),
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

export const edits = cockroachTable(
	"edits",
	{
		id: uuid().defaultRandom().primaryKey(),
		event: varchar({ length: 255 }).notNull(),
		originalQuestion: jsonb("original_question").notNull(),
		editedQuestion: jsonb("edited_question").notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
	},
	(table) => [index("idx_edits_event").using("btree", table.event.asc())],
);

export const geminiExplanationsCache = cockroachTable(
	"gemini_explanations_cache",
	{
		id: uuid().defaultRandom().primaryKey(),
		questionId: string("question_id"),
		questionHash: string("question_hash"),
		event: string().notNull(),
		userAnswer: string("user_answer"),
		explanation: string().notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		hitCount: int8("hit_count", { mode: "number" }).default(1).notNull(),
	},
	(table) => [
		index("idx_gemini_cache_created_at").using("btree", table.createdAt.asc()),
	],
);

export const idEvents = cockroachTable(
	"id_events",
	{
		id: uuid().primaryKey(),
		question: string().notNull(),
		tournament: string().notNull(),
		division: string().notNull(),
		options: jsonb().default([]),
		answers: jsonb().notNull(),
		subtopics: jsonb().default([]),
		difficulty: decimal().default("0.5"),
		event: string().notNull(),
		images: jsonb().default([]).notNull(),
		randomF: float("random_f").default(sql`random()`),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		questionType: string("question_type").generatedAlwaysAs(
			sql`CASE WHEN (jsonb_typeof(options) = 'array') AND (jsonb_array_length(options) >= 2) THEN 'mcq' ELSE 'frq' END`,
		),
		pureId: bool("pure_id").default(false),
		rmType: string("rm_type"),
	},
	(table) => [
		index("idx_id_events_question_type").using(
			"btree",
			table.questionType.asc(),
		),
	],
);

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

export const questions = cockroachTable(
	"questions",
	{
		id: uuid().primaryKey(),
		question: string().notNull(),
		tournament: varchar({ length: 255 }).notNull(),
		division: varchar({ length: 10 }).notNull(),
		options: jsonb().default([]),
		answers: jsonb().notNull(),
		subtopics: jsonb().default([]),
		difficulty: decimal({ precision: 3, scale: 2 }).default("0.5"),
		event: varchar({ length: 255 }).notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
		randomF: float("random_f").default(sql`random()`).notNull(),
	},
	(table) => [
		index("idx_questions_difficulty").using("btree", table.difficulty.asc()),
		index("idx_questions_division").using("btree", table.division.asc()),
		index("idx_questions_event").using("btree", table.event.asc()),
		index("idx_questions_event_division").using(
			"btree",
			table.event.asc(),
			table.division.asc(),
		),
		index("idx_questions_event_division_difficulty").using(
			"btree",
			table.event.asc(),
			table.division.asc(),
			table.difficulty.asc(),
		),
		index("idx_questions_subtopics").using("btree", table.subtopics.asc()),
		index("idx_questions_tournament").using("btree", table.tournament.asc()),
		index("questions_division_random_f_idx").using(
			"btree",
			table.division.asc(),
			table.randomF.asc(),
		),
		index("questions_event_random_f_idx").using(
			"btree",
			table.event.asc(),
			table.randomF.asc(),
		),
		index("questions_question_event_idx").using(
			"btree",
			table.question.asc(),
			table.event.asc(),
		),
		index("questions_random_f_idx").using("btree", table.randomF.asc()),
	],
);

export const quotes = cockroachTable(
	"quotes",
	{
		id: uuid().defaultRandom().primaryKey(),
		author: string().notNull(),
		quote: string().notNull(),
		language: string().notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
		randomF: float("random_f").default(sql`random()`).notNull(),
		charLength: int8("char_length", { mode: "number" }),
	},
	(table) => [
		index("idx_quotes_author").using("btree", table.author.asc()),
		index("idx_quotes_char_length").using("btree", table.charLength.asc()),
		index("idx_quotes_language").using("btree", table.language.asc()),
		index("idx_quotes_language_char_length").using(
			"btree",
			table.language.asc(),
			table.charLength.asc(),
		),
		index("idx_quotes_language_id").using(
			"btree",
			table.language.asc(),
			table.id.asc(),
		),
		index("quotes_language_random_f_idx").using(
			"btree",
			table.language.asc(),
			table.randomF.asc(),
		),
	],
);

export const shareLinks = cockroachTable(
	"share_links",
	{
		id: uuid().defaultRandom().primaryKey(),
		code: string().notNull(),
		indices: jsonb(),
		testParamsRaw: jsonb("test_params_raw").notNull(),
		expiresAt: timestamp("expires_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_share_links_code").using("btree", table.code.asc()),
		index("idx_share_links_expires").using("btree", table.expiresAt.asc()),
		uniqueIndex("share_links_code_key").using("btree", table.code.asc()),
	],
);

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
		totalPoints: float("total_points").default(0.0),
		earnedPoints: float("earned_points").default(0.0),
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
		pointsEarned: float("points_earned").default(0.0),
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

export const teamCacheManifests = cockroachTable("team_cache_manifests", {
	teamId: uuid("team_id")
		.primaryKey()
		.references(() => teams.id, { onDelete: "cascade" }),
	fullUpdatedAt: timestamp("full_updated_at", {
		mode: "string",
		withTimezone: true,
	})
		.defaultNow()
		.notNull(),
	assignmentsUpdatedAt: timestamp("assignments_updated_at", {
		mode: "string",
		withTimezone: true,
	})
		.defaultNow()
		.notNull(),
	rosterUpdatedAt: timestamp("roster_updated_at", {
		mode: "string",
		withTimezone: true,
	})
		.defaultNow()
		.notNull(),
	membersUpdatedAt: timestamp("members_updated_at", {
		mode: "string",
		withTimezone: true,
	})
		.defaultNow()
		.notNull(),
	subteamsUpdatedAt: timestamp("subteams_updated_at", {
		mode: "string",
		withTimezone: true,
	})
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	calendarUpdatedAt: timestamp("calendar_updated_at", {
		mode: "string",
		withTimezone: true,
	})
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

export const teamEvents = cockroachTable("team_events", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
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
		uniqueIndex("team_memberships_unique").using(
			"btree",
			table.teamId.asc(),
			table.userId.asc(),
		),
	],
);

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
		uniqueIndex("team_poll_votes_unique").using(
			"btree",
			table.pollId.asc(),
			table.userId.asc(),
		),
	],
);

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
	exceptions: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	meetingType: varchar("meeting_type", { length: 20 }).default("team"),
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
		uniqueIndex("team_roster_unique").using(
			"btree",
			table.teamId.asc(),
			table.subteamId.asc(),
			table.eventName.asc(),
			table.slotIndex.asc(),
		),
	],
);

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

export const teamSubteamCacheManifests = cockroachTable(
	"team_subteam_cache_manifests",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		subteamId: uuid("subteam_id")
			.notNull()
			.references(() => teamSubteams.id, { onDelete: "cascade" }),
		streamUpdatedAt: timestamp("stream_updated_at", {
			mode: "string",
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
		timersUpdatedAt: timestamp("timers_updated_at", {
			mode: "string",
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
		tournamentsUpdatedAt: timestamp("tournaments_updated_at", {
			mode: "string",
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		rosterNotesUpdatedAt: timestamp("roster_notes_updated_at", {
			mode: "string",
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("team_subteam_cache_manifest_unique").using(
			"btree",
			table.teamId.asc(),
			table.subteamId.asc(),
		),
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
		rosterNotes: string("roster_notes"),
	},
	(table) => [
		uniqueIndex("team_subteams_name_unique").using(
			"btree",
			table.teamId.asc(),
			table.name.asc(),
		),
	],
);

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
				"substr(replace(gen_random_uuid()::STRING, '-'::STRING, ''::STRING), 1, 8)",
			)
			.notNull(),
		captainCode: string("captain_code")
			.default(
				"substr(replace(gen_random_uuid()::STRING, '-'::STRING, ''::STRING), 1, 10)",
			)
			.notNull(),
		description: string(),
	},
	(table) => [
		uniqueIndex("teams_captain_code_unique").using(
			"btree",
			table.captainCode.asc(),
		),
		uniqueIndex("teams_member_code_unique").using(
			"btree",
			table.memberCode.asc(),
		),
		uniqueIndex("teams_slug_key").using("btree", table.slug.asc()),
	],
);

export const userCalendarManifests = cockroachTable("user_calendar_manifests", {
	userId: uuid("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	personalUpdatedAt: timestamp("personal_updated_at", {
		mode: "string",
		withTimezone: true,
	})
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	teamsUpdatedAt: timestamp("teams_updated_at", {
		mode: "string",
		withTimezone: true,
	})
		.defaultNow()
		.notNull(),
});

export const users = cockroachTable(
	"users",
	{
		id: uuid().primaryKey(),
		email: string().notNull(),
		username: string().notNull(),
		firstName: string("first_name"),
		lastName: string("last_name"),
		displayName: string("display_name"),
		photoUrl: string("photo_url"),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		supabaseUserId: uuid("supabase_user_id"),
		supabaseUsername: string("supabase_username"),
	},
	(table) => [
		uniqueIndex("users_supabase_user_id_unique").using(
			"btree",
			table.supabaseUserId.asc(),
		),
		uniqueIndex("users_supabase_username_unique").using(
			"btree",
			table.supabaseUsername.asc(),
		),
		uniqueIndex("users_username_key").using("btree", table.username.asc()),
	],
);
