import {
	bigint,
	boolean,
	char,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { newTeamUnits } from "./teams";

// ==================== ASSIGNMENTS ====================

export const newTeamAssignments = pgTable("new_team_assignments", {
	id: uuid("id").primaryKey().defaultRandom(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => newTeamUnits.id),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => users.id),
	title: text("title").notNull(),
	description: text("description"),
	assignmentType: text("assignment_type").default("task"),
	dueDate: timestamp("due_date", { withTimezone: true }),
	points: bigint("points", { mode: "number" }),
	isRequired: boolean("is_required").default(true),
	maxAttempts: bigint("max_attempts", { mode: "number" }),
	timeLimitMinutes: bigint("time_limit_minutes", { mode: "number" }),
	eventName: text("event_name"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ==================== ASSIGNMENT QUESTIONS ====================

export const newTeamAssignmentQuestions = pgTable(
	"new_team_assignment_questions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => newTeamAssignments.id),
		questionText: text("question_text").notNull(),
		questionType: text("question_type").notNull(),
		options: jsonb("options"),
		correctAnswer: text("correct_answer"),
		points: bigint("points", { mode: "number" }).default(1),
		orderIndex: bigint("order_index", { mode: "number" }).notNull(),
		imageData: text("image_data"),
		difficulty: bigint("difficulty", { mode: "number" }).default(0.5),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	},
);

// ==================== ASSIGNMENT ROSTER ====================

export const newTeamAssignmentRoster = pgTable("new_team_assignment_roster", {
	id: uuid("id").primaryKey().defaultRandom(),
	assignmentId: uuid("assignment_id")
		.notNull()
		.references(() => newTeamAssignments.id),
	studentName: text("student_name").notNull(),
	userId: uuid("user_id").references(() => users.id),
	subteamId: uuid("subteam_id").references(() => newTeamUnits.id),
	assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow(),
});

// ==================== ASSIGNMENT SUBMISSIONS ====================

export const newTeamAssignmentSubmissions = pgTable(
	"new_team_assignment_submissions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => newTeamAssignments.id),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id),
		content: text("content"),
		attachments: jsonb("attachments").default("[]"),
		submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
		grade: bigint("grade", { mode: "number" }),
		feedback: text("feedback"),
		status: text("status").default("submitted"),
		attemptNumber: bigint("attempt_number", { mode: "number" }).default(1),
	},
);

// ==================== ASSIGNMENT QUESTION RESPONSES ====================

export const newTeamAssignmentQuestionResponses = pgTable(
	"new_team_assignment_question_responses",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		submissionId: uuid("submission_id")
			.notNull()
			.references(() => newTeamAssignmentSubmissions.id),
		questionId: uuid("question_id")
			.notNull()
			.references(() => newTeamAssignmentQuestions.id),
		responseText: text("response_text"),
		responseData: jsonb("response_data"),
		isCorrect: boolean("is_correct"),
		pointsEarned: bigint("points_earned", { mode: "number" }).default(0),
		gradedAt: timestamp("graded_at", { withTimezone: true }),
		gradedBy: uuid("graded_by").references(() => users.id),
	},
);

// ==================== ASSIGNMENT ANALYTICS ====================

export const newTeamAssignmentAnalytics = pgTable(
	"new_team_assignment_analytics",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => newTeamAssignments.id),
		studentName: text("student_name").notNull(),
		userId: uuid("user_id").references(() => users.id),
		totalQuestions: bigint("total_questions", { mode: "number" }).notNull(),
		correctAnswers: bigint("correct_answers", { mode: "number" }).notNull(),
		totalPoints: bigint("total_points", { mode: "number" }).notNull(),
		earnedPoints: bigint("earned_points", { mode: "number" }).notNull(),
		completionTimeSeconds: bigint("completion_time_seconds", {
			mode: "number",
		}),
		submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	},
);

// ==================== ASSIGNMENT TEMPLATES ====================

export const newTeamAssignmentTemplates = pgTable(
	"new_team_assignment_templates",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => newTeamUnits.id),
		createdBy: uuid("created_by")
			.notNull()
			.references(() => users.id),
		name: text("name").notNull(),
		description: text("description"),
		eventName: text("event_name").notNull(),
		questionCount: bigint("question_count", { mode: "number" }).notNull(),
		timeLimitMinutes: bigint("time_limit_minutes", { mode: "number" }),
		questionTypes: jsonb("question_types"),
		subtopics: text("subtopics").array(),
		division: char("division"),
		isPublic: boolean("is_public").default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
);

// ==================== LEGACY ASSIGNMENT TABLES ====================

export const assignments = pgTable("assignments", {
	id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	school: text("school").notNull(),
	division: varchar("division", { length: 1 }).notNull(),
	teamId: text("team_id").notNull(),
	eventName: text("event_name").notNull(),
	assignees: jsonb("assignees").notNull(),
	params: jsonb("params").notNull(),
	questions: jsonb("questions").notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const assignmentResults = pgTable("assignment_results", {
	id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	assignmentId: bigint("assignment_id", { mode: "number" })
		.notNull()
		.references(() => assignments.id),
	userId: text("user_id"),
	name: text("name"),
	eventName: text("event_name"),
	score: bigint("score", { mode: "number" }),
	submittedAt: timestamp("submitted_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	detail: jsonb("detail"),
});

export const invitesV2 = pgTable("invites_v2", {
	id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	inviterUserId: text("inviter_user_id").notNull(),
	inviteeUsername: text("invitee_username").notNull(),
	inviteeUserId: text("invitee_user_id"),
	school: text("school").notNull(),
	division: varchar("division", { length: 1 }).notNull(),
	teamId: text("team_id").notNull(),
	code: uuid("code").notNull().defaultRandom(),
	status: text("status").notNull().default("pending"),
});
