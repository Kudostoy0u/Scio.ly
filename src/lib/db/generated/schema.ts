import { sql } from "drizzle-orm";
import {
	bool,
	char,
	check,
	cockroachSchema,
	cockroachTable,
	cockroachView,
	customType,
	date,
	decimal,
	float,
	foreignKey,
	index,
	int8,
	jsonb,
	string,
	time,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/cockroach-core";

export const drizzle = cockroachSchema("drizzle");

export const drizzleMigrationsInDrizzle = drizzle.table(
	"__drizzle_migrations",
	{
		id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
		hash: string().notNull(),
		createdAt: int8("created_at", { mode: "number" }),
	},
);

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
		check(
			"assignments_check_division",
			sql`CHECK ((division IN ('B'::STRING, 'C'::STRING)))`,
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
		check(
			"check_table_name",
			sql`CHECK ((table_name IN ('questions'::STRING, 'idEvents'::STRING)))`,
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
		index("idx_gemini_cache_created_at").using("btree", table.createdAt.desc()),
		index("idx_gemini_cache_question_hash")
			.using(
				"btree",
				table.questionHash.asc(),
				table.event.asc(),
				table.userAnswer.asc(),
			)
			.where(sql`question_hash IS NOT NULL`),
		index("idx_gemini_cache_question_id")
			.using(
				"btree",
				table.questionId.asc(),
				table.event.asc(),
				table.userAnswer.asc(),
			)
			.where(sql`question_id IS NOT NULL`),
		check(
			"check_identifier",
			sql`CHECK (((question_id IS NOT NULL) OR (question_hash IS NOT NULL)))`,
		),
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

export const invitesV2 = cockroachTable(
	"invites_v2",
	{
		id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		inviterUserId: varchar("inviter_user_id", { length: 255 }).notNull(),
		inviteeUsername: varchar("invitee_username", { length: 255 }).notNull(),
		inviteeUserId: varchar("invitee_user_id", { length: 255 }),
		school: varchar({ length: 255 }).notNull(),
		division: char().notNull(),
		teamId: varchar("team_id", { length: 10 }).notNull(),
		code: uuid().defaultRandom().notNull(),
		status: varchar({ length: 16 }).default("pending").notNull(),
	},
	(table) => [
		index("idx_invites_v2_invitee").using(
			"btree",
			table.inviteeUsername.asc(),
			table.status.asc(),
		),
		index("idx_invites_v2_team").using(
			"btree",
			table.school.asc(),
			table.division.asc(),
			table.teamId.asc(),
		),
		uniqueIndex("uq_pending_invite").using(
			"btree",
			table.inviteeUsername.asc(),
			table.school.asc(),
			table.division.asc(),
			table.teamId.asc(),
			table.status.asc(),
		),
		check(
			"invites_v2_check_division",
			sql`CHECK ((division IN ('B'::STRING, 'C'::STRING)))`,
		),
	],
);

export const longquotes = cockroachTable(
	"longquotes",
	{
		id: uuid().defaultRandom().primaryKey(),
		author: string().notNull(),
		quote: string().notNull(),
		language: string().notNull(),
		charLength: int8("char_length", { mode: "number" }).notNull(),
		randomF: float("random_f").default(sql`random()`).notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
	},
	(table) => [
		index("idx_longquotes_char_length").using("btree", table.charLength.asc()),
		index("idx_longquotes_language").using("btree", table.language.asc()),
		index("idx_longquotes_language_char_length").using(
			"btree",
			table.language.asc(),
			table.charLength.asc(),
		),
		index("idx_longquotes_random_f").using("btree", table.randomF.asc()),
	],
);

export const newTeamActiveTimers = cockroachTable(
	"new_team_active_timers",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamUnitId: uuid("team_unit_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		eventId: uuid("event_id")
			.notNull()
			.references(() => newTeamEvents.id, { onDelete: "cascade" }),
		addedBy: uuid("added_by").notNull(),
		addedAt: timestamp("added_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_active_timers_added_at").using("btree", table.addedAt.desc()),
		index("idx_active_timers_event").using("btree", table.eventId.asc()),
		index("idx_active_timers_team_unit").using("btree", table.teamUnitId.asc()),
		uniqueIndex("new_team_active_timers_team_unit_id_event_id_key").using(
			"btree",
			table.teamUnitId.asc(),
			table.eventId.asc(),
		),
	],
);

export const newTeamAnalytics = cockroachTable("new_team_analytics", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => newTeamUnits.id, { onDelete: "cascade" }),
	metricName: varchar("metric_name", { length: 100 }).notNull(),
	metricValue: decimal("metric_value"),
	metricData: jsonb("metric_data").default({}),
	recordedAt: timestamp("recorded_at", {
		mode: "string",
		withTimezone: true,
	}).defaultNow(),
	periodStart: timestamp("period_start", {
		mode: "string",
		withTimezone: true,
	}),
	periodEnd: timestamp("period_end", { mode: "string", withTimezone: true }),
});

export const newTeamAssignmentAnalytics = cockroachTable(
	"new_team_assignment_analytics",
	{
		id: uuid().defaultRandom().primaryKey(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => newTeamAssignments.id, { onDelete: "cascade" }),
		studentName: varchar("student_name", { length: 255 }).notNull(),
		userId: uuid("user_id"),
		totalQuestions: int8("total_questions", { mode: "number" }).notNull(),
		correctAnswers: int8("correct_answers", { mode: "number" }).notNull(),
		totalPoints: int8("total_points", { mode: "number" }).notNull(),
		earnedPoints: int8("earned_points", { mode: "number" }).notNull(),
		completionTimeSeconds: int8("completion_time_seconds", { mode: "number" }),
		submittedAt: timestamp("submitted_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_assignment_analytics_assignment").using(
			"btree",
			table.assignmentId.asc(),
		),
		index("idx_assignment_analytics_student").using(
			"btree",
			table.studentName.asc(),
		),
	],
);

export const newTeamAssignmentQuestionResponses = cockroachTable(
	"new_team_assignment_question_responses",
	{
		id: uuid().defaultRandom().primaryKey(),
		submissionId: uuid("submission_id")
			.notNull()
			.references(() => newTeamAssignmentSubmissions.id, {
				onDelete: "cascade",
			}),
		questionId: uuid("question_id")
			.notNull()
			.references(() => newTeamAssignmentQuestions.id, { onDelete: "cascade" }),
		responseText: string("response_text"),
		responseData: jsonb("response_data"),
		isCorrect: bool("is_correct"),
		pointsEarned: int8("points_earned", { mode: "number" }).default(0),
		gradedAt: timestamp("graded_at", { mode: "string", withTimezone: true }),
		gradedBy: uuid("graded_by"),
	},
	(table) => [
		index("idx_question_responses_question").using(
			"btree",
			table.questionId.asc(),
		),
		index("idx_question_responses_submission").using(
			"btree",
			table.submissionId.asc(),
		),
		uniqueIndex(
			"new_team_assignment_question_responses_submission_id_question_id_key",
		).using("btree", table.submissionId.asc(), table.questionId.asc()),
	],
);

export const newTeamAssignmentQuestions = cockroachTable.withRLS(
	"new_team_assignment_questions",
	{
		id: uuid().defaultRandom().primaryKey(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => newTeamAssignments.id, { onDelete: "cascade" }),
		questionText: string("question_text").notNull(),
		questionType: varchar("question_type", { length: 20 }).notNull(),
		options: jsonb(),
		correctAnswer: string("correct_answer"),
		points: int8({ mode: "number" }).default(1),
		orderIndex: int8("order_index", { mode: "number" }).notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		imageData: string("image_data"),
		difficulty: decimal({ precision: 3, scale: 2 }).default("0.5"),
	},
	(table) => [
		index("idx_assignment_questions_assignment_id").using(
			"btree",
			table.assignmentId.asc(),
		),
		index("idx_assignment_questions_order").using(
			"btree",
			table.assignmentId.asc(),
			table.orderIndex.asc(),
		),
		check(
			"check_question_type",
			sql`CHECK ((question_type IN ('multiple_choice'::STRING, 'free_response'::STRING, 'codebusters'::STRING)))`,
		),
	],
);

export const newTeamAssignmentRoster = cockroachTable(
	"new_team_assignment_roster",
	{
		id: uuid().defaultRandom().primaryKey(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => newTeamAssignments.id, { onDelete: "cascade" }),
		studentName: varchar("student_name", { length: 255 }).notNull(),
		userId: uuid("user_id"),
		subteamId: uuid("subteam_id").references(() => newTeamUnits.id, {
			onDelete: "cascade",
		}),
		assignedAt: timestamp("assigned_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_assignment_roster_assignment_id").using(
			"btree",
			table.assignmentId.asc(),
		),
		index("idx_assignment_roster_student").using(
			"btree",
			table.studentName.asc(),
			table.subteamId.asc(),
		),
		index("idx_assignment_roster_user")
			.using("btree", table.userId.asc())
			.where(sql`user_id IS NOT NULL`),
		uniqueIndex(
			"new_team_assignment_roster_assignment_id_student_name_subteam_id_key",
		).using(
			"btree",
			table.assignmentId.asc(),
			table.studentName.asc(),
			table.subteamId.asc(),
		),
	],
);

export const newTeamAssignmentSubmissions = cockroachTable(
	"new_team_assignment_submissions",
	{
		id: uuid().defaultRandom().primaryKey(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => newTeamAssignments.id, { onDelete: "cascade" }),
		userId: uuid("user_id").notNull(),
		content: string(),
		attachments: jsonb().default([]),
		submittedAt: timestamp("submitted_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		grade: int8({ mode: "number" }),
		feedback: string(),
		status: varchar({ length: 20 }).default("submitted"),
		attemptNumber: int8("attempt_number", { mode: "number" }).default(1),
	},
	(table) => [
		uniqueIndex(
			"new_team_assignment_submissions_assignment_id_user_id_attempt_number_key",
		).using(
			"btree",
			table.assignmentId.asc(),
			table.userId.asc(),
			table.attemptNumber.asc(),
		),
		check(
			"new_team_assignment_submissions_check_status",
			sql`CHECK ((status IN ('draft'::STRING, 'submitted'::STRING, 'graded'::STRING, 'returned'::STRING)))`,
		),
	],
);

export const newTeamAssignmentTemplates = cockroachTable(
	"new_team_assignment_templates",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		createdBy: uuid("created_by").notNull(),
		name: varchar({ length: 255 }).notNull(),
		description: string(),
		eventName: varchar("event_name", { length: 255 }).notNull(),
		questionCount: int8("question_count", { mode: "number" }).notNull(),
		timeLimitMinutes: int8("time_limit_minutes", { mode: "number" }),
		questionTypes: jsonb("question_types"),
		subtopics: string().array(),
		division: char(),
		isPublic: bool("is_public").default(false),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_assignment_templates_event").using(
			"btree",
			table.eventName.asc(),
		),
		index("idx_assignment_templates_team").using("btree", table.teamId.asc()),
		check(
			"new_team_assignment_templates_check_division",
			sql`CHECK ((division IN ('B'::STRING, 'C'::STRING)))`,
		),
	],
);

export const newTeamAssignments = cockroachTable(
	"new_team_assignments",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		createdBy: uuid("created_by").notNull(),
		title: varchar({ length: 255 }).notNull(),
		description: string(),
		assignmentType: varchar("assignment_type", { length: 20 }).default("task"),
		dueDate: timestamp("due_date", { mode: "string", withTimezone: true }),
		points: int8({ mode: "number" }),
		isRequired: bool("is_required").default(true),
		maxAttempts: int8("max_attempts", { mode: "number" }),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		timeLimitMinutes: int8("time_limit_minutes", { mode: "number" }),
		eventName: varchar("event_name", { length: 255 }),
	},
	(table) => [
		index("idx_assignments_event_name").using("btree", table.eventName.asc()),
		index("idx_new_team_assignments_due_date").using(
			"btree",
			table.dueDate.asc(),
		),
		index("idx_new_team_assignments_team_id").using(
			"btree",
			table.teamId.asc(),
		),
		check(
			"check_assignment_type",
			sql`CHECK ((assignment_type IN ('task'::STRING, 'homework'::STRING, 'project'::STRING, 'study'::STRING, 'other'::STRING)))`,
		),
	],
);

export const newTeamEventAttendees = cockroachTable(
	"new_team_event_attendees",
	{
		id: uuid().defaultRandom().primaryKey(),
		eventId: uuid("event_id")
			.notNull()
			.references(() => newTeamEvents.id, { onDelete: "cascade" }),
		userId: uuid("user_id").notNull(),
		status: varchar({ length: 20 }).default("pending"),
		respondedAt: timestamp("responded_at", {
			mode: "string",
			withTimezone: true,
		}),
		notes: string(),
	},
	(table) => [
		uniqueIndex("new_team_event_attendees_event_id_user_id_key").using(
			"btree",
			table.eventId.asc(),
			table.userId.asc(),
		),
		check(
			"new_team_event_attendees_check_status",
			sql`CHECK ((status IN ('pending'::STRING, 'attending'::STRING, 'declined'::STRING, 'tentative'::STRING)))`,
		),
	],
);

export const newTeamEvents = cockroachTable(
	"new_team_events",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id").references(() => newTeamUnits.id, {
			onDelete: "cascade",
		}),
		createdBy: uuid("created_by").notNull(),
		title: varchar({ length: 255 }).notNull(),
		description: string(),
		eventType: varchar("event_type", { length: 20 }).default("practice"),
		startTime: timestamp("start_time", { mode: "string", withTimezone: true }),
		endTime: timestamp("end_time", { mode: "string", withTimezone: true }),
		location: varchar({ length: 255 }),
		isAllDay: bool("is_all_day").default(false),
		isRecurring: bool("is_recurring").default(false),
		recurrencePattern: jsonb("recurrence_pattern"),
		reminderMinutes: int8("reminder_minutes", { mode: "bigint" })
			.array()
			.default([15n, 60n, 1440n]),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_new_team_events_start_time").using(
			"btree",
			table.startTime.asc(),
		),
		index("idx_new_team_events_team_id").using("btree", table.teamId.asc()),
		check(
			"check_event_type",
			sql`CHECK ((event_type IN ('practice'::STRING, 'tournament'::STRING, 'meeting'::STRING, 'deadline'::STRING, 'other'::STRING)))`,
		),
	],
);

export const newTeamGroups = cockroachTable(
	"new_team_groups",
	{
		id: uuid().defaultRandom().primaryKey(),
		school: varchar({ length: 255 }).notNull(),
		division: char().notNull(),
		slug: varchar({ length: 255 }).notNull(),
		description: string(),
		createdBy: uuid("created_by").notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		settings: jsonb().default({}),
		status: varchar({ length: 20 }).default("active"),
	},
	(table) => [
		index("idx_new_team_groups_archived")
			.using("btree", table.status.asc())
			.where(sql`status = 'archived'::STRING`),
		index("idx_new_team_groups_school_division").using(
			"btree",
			table.school.asc(),
			table.division.asc(),
		),
		index("idx_new_team_groups_slug").using("btree", table.slug.asc()),
		index("idx_new_team_groups_status").using("btree", table.status.asc()),
		uniqueIndex("new_team_groups_slug_key").using("btree", table.slug.asc()),
		check(
			"new_team_groups_check_division",
			sql`CHECK ((division IN ('B'::STRING, 'C'::STRING)))`,
		),
		check(
			"new_team_groups_status_check",
			sql`CHECK ((status IN ('active'::STRING, 'archived'::STRING, 'deleted'::STRING)))`,
		),
	],
);

export const newTeamInvitations = cockroachTable(
	"new_team_invitations",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		invitedBy: uuid("invited_by").notNull(),
		email: varchar({ length: 255 }).notNull(),
		role: varchar({ length: 20 }).notNull(),
		invitationCode: varchar("invitation_code", { length: 50 }).notNull(),
		expiresAt: timestamp("expires_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
		status: varchar({ length: 20 }).default("pending"),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		acceptedAt: timestamp("accepted_at", {
			mode: "string",
			withTimezone: true,
		}),
		message: string(),
	},
	(table) => [
		index("idx_new_team_invitations_code").using(
			"btree",
			table.invitationCode.asc(),
		),
		index("idx_new_team_invitations_email").using("btree", table.email.asc()),
		uniqueIndex("new_team_invitations_invitation_code_key").using(
			"btree",
			table.invitationCode.asc(),
		),
		check(
			"check_status",
			sql`CHECK ((status IN ('pending'::STRING, 'accepted'::STRING, 'declined'::STRING, 'expired'::STRING)))`,
		),
		check(
			"new_team_invitations_check_role",
			sql`CHECK (("role" IN ('captain'::STRING, 'member'::STRING, 'observer'::STRING)))`,
		),
	],
);

export const newTeamMaterials = cockroachTable(
	"new_team_materials",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		uploadedBy: uuid("uploaded_by").notNull(),
		title: varchar({ length: 255 }).notNull(),
		description: string(),
		fileName: varchar("file_name", { length: 255 }).notNull(),
		fileUrl: string("file_url").notNull(),
		fileType: varchar("file_type", { length: 50 }),
		fileSize: int8("file_size", { mode: "number" }),
		category: varchar({ length: 50 }),
		tags: string().array(),
		isPublic: bool("is_public").default(true),
		downloadCount: int8("download_count", { mode: "number" }).default(0),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_new_team_materials_category").using(
			"btree",
			table.category.asc(),
		),
		index("idx_new_team_materials_team_id").using("btree", table.teamId.asc()),
	],
);

export const newTeamMemberships = cockroachTable(
	"new_team_memberships",
	{
		id: uuid().defaultRandom().primaryKey(),
		userId: uuid("user_id").notNull(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		role: varchar({ length: 20 }).notNull(),
		joinedAt: timestamp("joined_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		invitedBy: uuid("invited_by"),
		status: varchar({ length: 20 }).default("active"),
		permissions: jsonb().default({}),
	},
	(table) => [
		index("idx_new_team_memberships_archived")
			.using("btree", table.status.asc())
			.where(sql`status = 'archived'::STRING`),
		index("idx_new_team_memberships_deleted")
			.using("btree", table.status.asc())
			.where(sql`status = 'deleted'::STRING`),
		index("idx_new_team_memberships_role").using("btree", table.role.asc()),
		index("idx_new_team_memberships_status").using("btree", table.status.asc()),
		index("idx_new_team_memberships_team_id").using(
			"btree",
			table.teamId.asc(),
		),
		index("idx_new_team_memberships_user_id").using(
			"btree",
			table.userId.asc(),
		),
		uniqueIndex("new_team_memberships_user_id_team_id_key").using(
			"btree",
			table.userId.asc(),
			table.teamId.asc(),
		),
		check(
			"new_team_memberships_check_role",
			sql`CHECK (("role" IN ('captain'::STRING, 'member'::STRING, 'observer'::STRING)))`,
		),
		check(
			"new_team_memberships_status_check",
			sql`CHECK ((status IN ('active'::STRING, 'inactive'::STRING, 'pending'::STRING, 'banned'::STRING, 'archived'::STRING)))`,
		),
	],
);

export const newTeamMessages = cockroachTable(
	"new_team_messages",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		senderId: uuid("sender_id").notNull(),
		content: string().notNull(),
		messageType: varchar("message_type", { length: 20 }).default("text"),
		replyTo: uuid("reply_to"),
		isEdited: bool("is_edited").default(false),
		editedAt: timestamp("edited_at", { mode: "string", withTimezone: true }),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		foreignKey({
			columns: [table.replyTo],
			foreignColumns: [table.id],
			name: "new_team_messages_reply_to_fkey",
		}).onDelete("set null"),
		index("idx_new_team_messages_created_at").using(
			"btree",
			table.createdAt.desc(),
		),
		index("idx_new_team_messages_team_id").using("btree", table.teamId.asc()),
		check(
			"check_message_type",
			sql`CHECK ((message_type IN ('text'::STRING, 'image'::STRING, 'file'::STRING, 'system'::STRING)))`,
		),
	],
);

export const newTeamNotifications = cockroachTable(
	"new_team_notifications",
	{
		id: uuid().defaultRandom().primaryKey(),
		userId: uuid("user_id").notNull(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		notificationType: varchar("notification_type", { length: 50 }).notNull(),
		title: varchar({ length: 255 }).notNull(),
		message: string().notNull(),
		data: jsonb().default({}),
		isRead: bool("is_read").default(false),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		readAt: timestamp("read_at", { mode: "string", withTimezone: true }),
	},
	(table) => [
		index("idx_new_team_notifications_is_read").using(
			"btree",
			table.isRead.asc(),
		),
		index("idx_new_team_notifications_user_id").using(
			"btree",
			table.userId.asc(),
		),
	],
);

export const newTeamPeople = cockroachTable("new_team_people", {
	id: uuid().defaultRandom().primaryKey(),
	teamUnitId: uuid("team_unit_id")
		.notNull()
		.references(() => newTeamUnits.id),
	name: string().notNull(),
	userId: uuid("user_id").references(() => users.id),
	isAdmin: string("is_admin").default("false"),
	events: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

export const newTeamPollVotes = cockroachTable(
	"new_team_poll_votes",
	{
		id: uuid().defaultRandom().primaryKey(),
		pollId: uuid("poll_id")
			.notNull()
			.references(() => newTeamPolls.id, { onDelete: "cascade" }),
		userId: uuid("user_id").notNull(),
		selectedOptions: jsonb("selected_options").notNull(),
		votedAt: timestamp("voted_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		uniqueIndex("new_team_poll_votes_poll_id_user_id_key").using(
			"btree",
			table.pollId.asc(),
			table.userId.asc(),
		),
	],
);

export const newTeamPolls = cockroachTable("new_team_polls", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => newTeamUnits.id, { onDelete: "cascade" }),
	createdBy: uuid("created_by").notNull(),
	question: string().notNull(),
	options: jsonb().notNull(),
	isAnonymous: bool("is_anonymous").default(false),
	allowMultiple: bool("allow_multiple").default(false),
	expiresAt: timestamp("expires_at", { mode: "string", withTimezone: true }),
	createdAt: timestamp("created_at", {
		mode: "string",
		withTimezone: true,
	}).defaultNow(),
	closedAt: timestamp("closed_at", { mode: "string", withTimezone: true }),
});

export const newTeamPostAttachments = cockroachTable(
	"new_team_post_attachments",
	{
		id: uuid().defaultRandom().primaryKey(),
		postId: uuid("post_id")
			.notNull()
			.references(() => newTeamPosts.id, { onDelete: "cascade" }),
		fileName: varchar("file_name", { length: 255 }).notNull(),
		fileUrl: string("file_url").notNull(),
		fileType: varchar("file_type", { length: 50 }),
		fileSize: int8("file_size", { mode: "number" }),
		uploadedBy: uuid("uploaded_by").notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
);

export const newTeamPosts = cockroachTable(
	"new_team_posts",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		authorId: uuid("author_id").notNull(),
		title: varchar({ length: 255 }),
		content: string().notNull(),
		postType: varchar("post_type", { length: 20 }).default("announcement"),
		priority: varchar({ length: 10 }).default("normal"),
		isPinned: bool("is_pinned").default(false),
		isPublic: bool("is_public").default(true),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		scheduledAt: timestamp("scheduled_at", {
			mode: "string",
			withTimezone: true,
		}),
		expiresAt: timestamp("expires_at", { mode: "string", withTimezone: true }),
	},
	(table) => [
		index("idx_new_team_posts_created_at").using(
			"btree",
			table.createdAt.desc(),
		),
		index("idx_new_team_posts_team_id").using("btree", table.teamId.asc()),
		check(
			"check_post_type",
			sql`CHECK ((post_type IN ('announcement'::STRING, 'assignment'::STRING, 'material'::STRING, 'event'::STRING)))`,
		),
		check(
			"check_priority",
			sql`CHECK ((priority IN ('low'::STRING, 'normal'::STRING, 'high'::STRING, 'urgent'::STRING)))`,
		),
	],
);

export const newTeamRecurringMeetings = cockroachTable.withRLS(
	"new_team_recurring_meetings",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		createdBy: uuid("created_by").notNull(),
		title: varchar({ length: 255 }).notNull(),
		description: string(),
		location: varchar({ length: 255 }),
		daysOfWeek: jsonb("days_of_week").notNull(),
		startTime: time("start_time"),
		endTime: time("end_time"),
		exceptions: jsonb().default([]),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		startDate: date("start_date", { mode: "string" }),
		endDate: date("end_date", { mode: "string" }),
	},
	(table) => [
		index("idx_recurring_meetings_created_by").using(
			"btree",
			table.createdBy.asc(),
		),
		index("idx_recurring_meetings_end_date").using(
			"btree",
			table.endDate.asc(),
		),
		index("idx_recurring_meetings_start_date").using(
			"btree",
			table.startDate.asc(),
		),
		index("idx_recurring_meetings_team_id").using("btree", table.teamId.asc()),
	],
);

export const newTeamRemovedEvents = cockroachTable(
	"new_team_removed_events",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamUnitId: uuid("team_unit_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		eventName: varchar("event_name", { length: 255 }).notNull(),
		conflictBlock: varchar("conflict_block", { length: 255 }).notNull(),
		removedBy: uuid("removed_by").notNull(),
		removedAt: timestamp("removed_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_removed_events_conflict_block").using(
			"btree",
			table.conflictBlock.asc(),
		),
		index("idx_removed_events_team_conflict").using(
			"btree",
			table.teamUnitId.asc(),
			table.conflictBlock.asc(),
		),
		index("idx_removed_events_team_unit").using(
			"btree",
			table.teamUnitId.asc(),
		),
		uniqueIndex("new_team_removed_events_team_unit_id_event_name_key").using(
			"btree",
			table.teamUnitId.asc(),
			table.eventName.asc(),
		),
	],
);

export const newTeamRosterData = cockroachTable(
	"new_team_roster_data",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamUnitId: uuid("team_unit_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		eventName: varchar("event_name", { length: 255 }).notNull(),
		slotIndex: int8("slot_index", { mode: "number" }).notNull(),
		studentName: varchar("student_name", { length: 255 }),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		userId: uuid("user_id"),
	},
	(table) => [
		index("idx_roster_data_event").using("btree", table.eventName.asc()),
		index("idx_roster_data_lookup").using(
			"btree",
			table.teamUnitId.asc(),
			table.eventName.asc(),
			table.slotIndex.asc(),
		),
		index("idx_roster_data_team_event").using(
			"btree",
			table.teamUnitId.asc(),
			table.eventName.asc(),
		),
		index("idx_roster_data_team_unit").using("btree", table.teamUnitId.asc()),
		index("idx_roster_data_team_user").using(
			"btree",
			table.teamUnitId.asc(),
			table.userId.asc(),
		),
		index("idx_roster_data_user_id").using("btree", table.userId.asc()),
		uniqueIndex(
			"new_team_roster_data_team_unit_id_event_name_slot_index_key",
		).using(
			"btree",
			table.teamUnitId.asc(),
			table.eventName.asc(),
			table.slotIndex.asc(),
		),
	],
);

export const newTeamStreamComments = cockroachTable(
	"new_team_stream_comments",
	{
		id: uuid().defaultRandom().primaryKey(),
		postId: uuid("post_id")
			.notNull()
			.references(() => newTeamStreamPosts.id, { onDelete: "cascade" }),
		authorId: uuid("author_id").notNull(),
		content: string().notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_stream_comments_author").using("btree", table.authorId.asc()),
		index("idx_stream_comments_created_at").using(
			"btree",
			table.createdAt.desc(),
		),
		index("idx_stream_comments_post_id").using("btree", table.postId.asc()),
	],
);

export const newTeamStreamPosts = cockroachTable(
	"new_team_stream_posts",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamUnitId: uuid("team_unit_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		authorId: uuid("author_id").notNull(),
		content: string().notNull(),
		showTournamentTimer: bool("show_tournament_timer").default(false),
		tournamentId: uuid("tournament_id").references(() => newTeamEvents.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		attachmentUrl: string("attachment_url"),
		attachmentTitle: string("attachment_title"),
	},
	(table) => [
		index("idx_stream_posts_author").using("btree", table.authorId.asc()),
		index("idx_stream_posts_created_at").using("btree", table.createdAt.desc()),
		index("idx_stream_posts_team_created").using(
			"btree",
			table.teamUnitId.asc(),
			table.createdAt.desc(),
		),
		index("idx_stream_posts_team_unit").using("btree", table.teamUnitId.asc()),
	],
);

export const newTeamUnits = cockroachTable(
	"new_team_units",
	{
		id: uuid().defaultRandom().primaryKey(),
		groupId: uuid("group_id")
			.notNull()
			.references(() => newTeamGroups.id, { onDelete: "cascade" }),
		teamId: varchar("team_id", { length: 50 }).notNull(),
		description: string(),
		captainCode: varchar("captain_code", { length: 20 }).notNull(),
		userCode: varchar("user_code", { length: 20 }).notNull(),
		createdBy: uuid("created_by").notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		settings: jsonb().default({}),
		status: varchar({ length: 20 }).default("active"),
		displayOrder: int8("display_order", { mode: "number" }).default(0),
	},
	(table) => [
		index("idx_new_team_units_archived")
			.using("btree", table.status.asc())
			.where(sql`status = 'archived'::STRING`),
		index("idx_new_team_units_codes").using(
			"btree",
			table.captainCode.asc(),
			table.userCode.asc(),
		),
		index("idx_new_team_units_deleted")
			.using("btree", table.status.asc())
			.where(sql`status = 'deleted'::STRING`),
		index("idx_new_team_units_group_display_order").using(
			"btree",
			table.groupId.asc(),
			table.displayOrder.asc(),
		),
		index("idx_new_team_units_group_id").using("btree", table.groupId.asc()),
		index("idx_new_team_units_status").using("btree", table.status.asc()),
		index("idx_new_team_units_team_id").using("btree", table.teamId.asc()),
		uniqueIndex("new_team_units_captain_code_key").using(
			"btree",
			table.captainCode.asc(),
		),
		uniqueIndex("new_team_units_group_id_team_id_key").using(
			"btree",
			table.groupId.asc(),
			table.teamId.asc(),
		),
		uniqueIndex("new_team_units_user_code_key").using(
			"btree",
			table.userCode.asc(),
		),
		check(
			"new_team_units_status_check",
			sql`CHECK ((status IN ('active'::STRING, 'archived'::STRING, 'deleted'::STRING)))`,
		),
	],
);

export const notifications = cockroachTable(
	"notifications",
	{
		id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
		userId: uuid("user_id").notNull(),
		type: string().notNull(),
		title: string().notNull(),
		body: string(),
		data: jsonb().default({}).notNull(),
		isRead: bool("is_read").default(false).notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_notifications_created").using("btree", table.createdAt.asc()),
		index("idx_notifications_user").using(
			"btree",
			table.userId.asc(),
			table.isRead.asc(),
		),
	],
);

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
		index("idx_questions_subtopics").using("gin", table.subtopics.asc()),
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
		author: varchar({ length: 255 }).notNull(),
		quote: string().notNull(),
		language: varchar({ length: 10 }).notNull(),
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
		check("quotes_char_length_check", sql`CHECK ((char_length <= 100))`),
	],
);

export const rosterLinkInvitations = cockroachTable(
	"roster_link_invitations",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => newTeamUnits.id, { onDelete: "cascade" }),
		studentName: varchar("student_name", { length: 255 }).notNull(),
		invitedUserId: uuid("invited_user_id").notNull(),
		invitedBy: uuid("invited_by").notNull(),
		status: varchar({ length: 20 }).default("pending"),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		expiresAt: timestamp("expires_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
		message: string(),
	},
	(table) => [
		index("idx_roster_link_invitations_team_student").using(
			"btree",
			table.teamId.asc(),
			table.studentName.asc(),
		),
		index("idx_roster_link_invitations_user").using(
			"btree",
			table.invitedUserId.asc(),
		),
		uniqueIndex(
			"roster_link_invitations_team_id_student_name_invited_user_id_key",
		).using(
			"btree",
			table.teamId.asc(),
			table.studentName.asc(),
			table.invitedUserId.asc(),
		),
		check(
			"roster_link_invitations_check_status",
			sql`CHECK ((status IN ('pending'::STRING, 'accepted'::STRING, 'declined'::STRING, 'expired'::STRING)))`,
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

export const teamGroupTournaments = cockroachTable(
	"team_group_tournaments",
	{
		id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
		groupId: int8("group_id", { mode: "number" }).notNull(),
		name: string().notNull(),
		dateTime: timestamp("date_time", { mode: "string" }).notNull(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("team_group_tournaments_group_idx").using(
			"btree",
			table.groupId.asc(),
		),
	],
);

export const teamGroups = cockroachTable(
	"team_groups",
	{
		id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
		school: varchar({ length: 255 }).notNull(),
		division: char().notNull(),
		slug: varchar({ length: 32 }).notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		uniqueIndex("team_groups_slug_key").using("btree", table.slug.asc()),
		uniqueIndex("uq_team_groups_slug").using("btree", table.slug.asc()),
		check(
			"team_groups_check_division",
			sql`CHECK ((division IN ('B'::STRING, 'C'::STRING)))`,
		),
	],
);

export const teamLinks = cockroachTable(
	"team_links",
	{
		id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
		school: varchar({ length: 255 }).notNull(),
		division: char().notNull(),
		teamId: varchar("team_id", { length: 10 }).notNull(),
		memberName: varchar("member_name", { length: 255 }).notNull(),
		userId: varchar("user_id", { length: 255 }).notNull(),
		status: varchar({ length: 20 }).default("linked").notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_team_links_team").using(
			"btree",
			table.school.asc(),
			table.division.asc(),
			table.teamId.asc(),
		),
		check(
			"team_links_check_division",
			sql`CHECK ((division IN ('B'::STRING, 'C'::STRING)))`,
		),
	],
);

export const teamMemberships = cockroachTable(
	"team_memberships",
	{
		id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		teamUnitId: int8("team_unit_id", { mode: "number" })
			.notNull()
			.references(() => teamUnits.id, { onDelete: "cascade" }),
		role: varchar({ length: 10 }).notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_team_memberships_team").using("btree", table.teamUnitId.asc()),
		index("idx_team_memberships_user").using("btree", table.userId.asc()),
		uniqueIndex("team_memberships_user_id_team_unit_id_key").using(
			"btree",
			table.userId.asc(),
			table.teamUnitId.asc(),
		),
		check(
			"check_role",
			sql`CHECK (("role" IN ('captain'::STRING, 'user'::STRING)))`,
		),
	],
);

export const teamUnits = cockroachTable(
	"team_units",
	{
		id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
		school: varchar({ length: 255 }).notNull(),
		division: char().notNull(),
		teamId: varchar("team_id", { length: 8 }).notNull(),
		name: varchar({ length: 255 }).notNull(),
		roster: jsonb().default({}).notNull(),
		captainCode: varchar("captain_code", { length: 255 }).notNull(),
		userCode: varchar("user_code", { length: 255 }).notNull(),
		slug: varchar({ length: 32 }).notNull(),
		groupId: int8("group_id", { mode: "number" }).references(
			() => teamGroups.id,
			{ onDelete: "set null" },
		),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_team_units_codes").using(
			"btree",
			table.captainCode.asc(),
			table.userCode.asc(),
		),
		index("idx_team_units_school_division").using(
			"btree",
			table.school.asc(),
			table.division.asc(),
		),
		uniqueIndex("team_units_captain_code_key").using(
			"btree",
			table.captainCode.asc(),
		),
		uniqueIndex("team_units_slug_key").using("btree", table.slug.asc()),
		uniqueIndex("team_units_user_code_key").using(
			"btree",
			table.userCode.asc(),
		),
		uniqueIndex("uq_team_units_group_teamid").using(
			"btree",
			table.groupId.asc(),
			table.teamId.asc(),
		),
		uniqueIndex("uq_team_units_slug").using("btree", table.slug.asc()),
		check(
			"team_units_check_division",
			sql`CHECK ((division IN ('B'::STRING, 'C'::STRING)))`,
		),
	],
);

export const teams = cockroachTable(
	"teams",
	{
		id: int8({ mode: "number" }).default(sql`unique_rowid()`).primaryKey(),
		school: varchar({ length: 255 }).notNull(),
		division: char().notNull(),
		teams: jsonb().default([]).notNull(),
		captainCode: varchar("captain_code", { length: 255 }).notNull(),
		userCode: varchar("user_code", { length: 255 }).notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_teams_captain_code").using("btree", table.captainCode.asc()),
		index("idx_teams_school_division").using(
			"btree",
			table.school.asc(),
			table.division.asc(),
		),
		index("idx_teams_user_code").using("btree", table.userCode.asc()),
		uniqueIndex("teams_captain_code_key").using(
			"btree",
			table.captainCode.asc(),
		),
		uniqueIndex("teams_school_division_unique").using(
			"btree",
			table.school.asc(),
			table.division.asc(),
		),
		uniqueIndex("teams_user_code_key").using("btree", table.userCode.asc()),
		check(
			"check_division",
			sql`CHECK ((division IN ('B'::STRING, 'C'::STRING)))`,
		),
	],
);

export const teamsAssignment = cockroachTable(
	"teams_assignment",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teamsTeam.id, { onDelete: "cascade" }),
		subteamId: uuid("subteam_id").references(() => teamsSubteam.id, {
			onDelete: "set null",
		}),
		title: string().notNull(),
		description: string(),
		dueDate: timestamp("due_date", { mode: "string", withTimezone: true }),
		status: string().default("open").notNull(),
		createdBy: uuid("created_by")
			.notNull()
			.references(() => users.id),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_teams_assignment_team_id").using("btree", table.teamId.asc()),
	],
);

export const teamsInvitation = cockroachTable(
	"teams_invitation",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teamsTeam.id, { onDelete: "cascade" }),
		invitedUserId: uuid("invited_user_id").references(() => users.id),
		invitedEmail: string("invited_email"),
		role: string().default("member").notNull(),
		invitedBy: uuid("invited_by")
			.notNull()
			.references(() => users.id),
		status: string().default("pending").notNull(),
		token: string().notNull(),
		expiresAt: timestamp("expires_at", { mode: "string", withTimezone: true }),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_teams_invitation_team_id").using("btree", table.teamId.asc()),
		uniqueIndex("teams_invitation_token_key").using("btree", table.token.asc()),
	],
);

export const teamsLinkInvitation = cockroachTable("teams_link_invitation", {
	id: uuid().defaultRandom().primaryKey(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teamsTeam.id, { onDelete: "cascade" }),
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

export const teamsMembership = cockroachTable(
	"teams_membership",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teamsTeam.id, { onDelete: "cascade" }),
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
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_teams_membership_team_id").using("btree", table.teamId.asc()),
		index("idx_teams_membership_user_id").using("btree", table.userId.asc()),
		uniqueIndex("teams_membership_unique").using(
			"btree",
			table.teamId.asc(),
			table.userId.asc(),
		),
	],
);

export const teamsRoster = cockroachTable(
	"teams_roster",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teamsTeam.id, { onDelete: "cascade" }),
		subteamId: uuid("subteam_id").references(() => teamsSubteam.id, {
			onDelete: "cascade",
		}),
		userId: uuid("user_id").references(() => users.id),
		displayName: string("display_name").notNull(),
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
		index("idx_teams_roster_subteam_id").using("btree", table.subteamId.asc()),
		index("idx_teams_roster_team_id").using("btree", table.teamId.asc()),
		uniqueIndex("teams_roster_unique").using(
			"btree",
			table.teamId.asc(),
			table.subteamId.asc(),
			table.eventName.asc(),
			table.slotIndex.asc(),
		),
	],
);

export const teamsSubmission = cockroachTable(
	"teams_submission",
	{
		id: uuid().defaultRandom().primaryKey(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => teamsAssignment.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id),
		content: jsonb().default({}).notNull(),
		status: string().default("draft").notNull(),
		submittedAt: timestamp("submitted_at", {
			mode: "string",
			withTimezone: true,
		}),
		grade: jsonb().default({}).notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_teams_submission_assignment_id").using(
			"btree",
			table.assignmentId.asc(),
		),
		uniqueIndex("teams_submission_unique").using(
			"btree",
			table.assignmentId.asc(),
			table.userId.asc(),
		),
	],
);

export const teamsSubteam = cockroachTable(
	"teams_subteam",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teamsTeam.id, { onDelete: "cascade" }),
		name: string().notNull(),
		description: string(),
		displayOrder: int8("display_order", { mode: "number" })
			.default(0)
			.notNull(),
		createdBy: uuid("created_by").references(() => users.id),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_teams_subteam_team_id").using("btree", table.teamId.asc()),
		uniqueIndex("teams_subteam_name_unique").using(
			"btree",
			table.teamId.asc(),
			sql`true`,
		),
	],
);

export const teamsTeam = cockroachTable(
	"teams_team",
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
	},
	(table) => [
		uniqueIndex("teams_team_captain_code_unique").using(
			"btree",
			table.captainCode.asc(),
		),
		uniqueIndex("teams_team_member_code_unique").using(
			"btree",
			table.memberCode.asc(),
		),
		uniqueIndex("teams_team_slug_key").using("btree", table.slug.asc()),
	],
);

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
export const newTeamMemberDetails = cockroachView("new_team_member_details", {
	id: uuid(),
	userId: uuid("user_id"),
	teamId: uuid("team_id"),
	role: varchar({ length: 20 }),
	status: varchar({ length: 20 }),
	joinedAt: customType({ dataType: () => "timestamp with time zone" })(
		"joined_at",
	),
	invitedBy: uuid("invited_by"),
	unitTeamId: varchar("unit_team_id", { length: 50 }),
	description: customType({ dataType: () => "text" })(),
	captainCode: varchar("captain_code", { length: 20 }),
	userCode: varchar("user_code", { length: 20 }),
	school: varchar({ length: 255 }),
	division: char({ length: 1 }),
	slug: varchar({ length: 255 }),
}).as(
	sql`SELECT tm.id, tm.user_id, tm.team_id, tm.role, tm.status, tm.joined_at, tm.invited_by, tu.team_id AS unit_team_id, tu.description, tu.captain_code, tu.user_code, tg.school, tg.division, tg.slug FROM defaultdb.public.new_team_memberships AS tm JOIN defaultdb.public.new_team_units AS tu ON tm.team_id = tu.id JOIN defaultdb.public.new_team_groups AS tg ON tu.group_id = tg.id`,
);

export const newTeamStats = cockroachView("new_team_stats", {
	id: uuid(),
	teamId: varchar("team_id", { length: 50 }),
	description: customType({ dataType: () => "text" })(),
	captainCode: varchar("captain_code", { length: 20 }),
	userCode: varchar("user_code", { length: 20 }),
	school: varchar({ length: 255 }),
	division: char({ length: 1 }),
	slug: varchar({ length: 255 }),
	memberCount: int8("member_count", { mode: "number" }),
	captainCount: int8("captain_count", { mode: "number" }),
}).as(
	sql`SELECT tu.id, tu.team_id, tu.description, tu.captain_code, tu.user_code, tg.school, tg.division, tg.slug, count(tm.id) AS member_count, count(CASE WHEN tm.role = 'captain' THEN 1 END) AS captain_count FROM defaultdb.public.new_team_units AS tu JOIN defaultdb.public.new_team_groups AS tg ON tu.group_id = tg.id LEFT JOIN defaultdb.public.new_team_memberships AS tm ON (tu.id = tm.team_id) AND (tm.status = 'active') GROUP BY tu.id, tu.team_id, tu.description, tu.captain_code, tu.user_code, tg.school, tg.division, tg.slug`,
);
