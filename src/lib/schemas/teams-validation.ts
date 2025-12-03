/**
 * Comprehensive Zod validation schemas for Teams API routes
 *
 * This file provides type-safe validation for all teams-related API endpoints.
 * All schemas should be used for request validation and response validation where appropriate.
 */

import { z } from "zod";

// ==================== COMMON VALIDATORS ====================

/** UUID validator - validates UUID v4 format */
export const UUIDSchema = z.string().uuid("Invalid UUID format");

/** Team slug validator - validates team slug format */
export const TeamSlugSchema = z
	.string()
	.min(1, "Team slug is required")
	.regex(
		/^[a-z0-9-]+$/,
		"Team slug must contain only lowercase letters, numbers, and hyphens",
	);

/** Division validator - validates Science Olympiad division */
export const DivisionSchema = z.enum(["B", "C"], {
	message: "Division must be 'B' or 'C'",
});

/** Team role validator - validates team membership roles */
export const TeamRoleSchema = z.enum(["captain", "co_captain", "member"], {
	message: "Role must be 'captain', 'co_captain', or 'member'",
});

/** Team status validator */
export const TeamStatusSchema = z.enum(["active", "inactive", "archived"], {
	message: "Status must be 'active', 'inactive', or 'archived'",
});

/** Event name validator - validates Science Olympiad event names */
export const EventNameSchema = z
	.string()
	.min(1, "Event name is required")
	.max(100, "Event name must be 100 characters or less");

/** Slot index validator - validates roster slot index (0-10) */
export const SlotIndexSchema = z
	.number()
	.int("Slot index must be an integer")
	.min(0, "Slot index must be at least 0")
	.max(10, "Slot index must be at most 10");

// ==================== ROSTER SCHEMAS ====================

/** Roster data entry schema */
export const RosterDataEntrySchema = z.object({
	event_name: EventNameSchema,
	slot_index: SlotIndexSchema,
	student_name: z.string().min(1, "Student name is required").max(200),
	user_id: UUIDSchema.nullable().optional(),
});

/** Roster response schema */
export const RosterResponseSchema = z.object({
	roster: z.record(z.string(), z.array(z.string())),
	removedEvents: z.array(z.string()),
});

/** POST roster request schema */
export const PostRosterRequestSchema = z.object({
	subteamId: UUIDSchema,
	eventName: EventNameSchema,
	slotIndex: SlotIndexSchema,
	studentName: z.string().max(200).nullable().optional(),
	userId: UUIDSchema.nullable().optional(),
});

// ==================== STREAM SCHEMAS ====================

/** Stream post schema */
export const StreamPostSchema = z.object({
	id: UUIDSchema,
	content: z
		.string()
		.min(1, "Content is required")
		.max(5000, "Content must be 5000 characters or less"),
	show_tournament_timer: z.boolean().default(false),
	tournament_id: UUIDSchema.nullable().optional(),
	tournament_title: z.string().nullable().optional(),
	tournament_start_time: z.string().nullable().optional(),
	author_name: z.string(),
	author_email: z.string().email(),
	created_at: z.string().datetime(),
	attachment_url: z.string().url().nullable().optional(),
	attachment_title: z.string().max(200).nullable().optional(),
});

/** Stream comment schema */
export const StreamCommentSchema = z.object({
	id: UUIDSchema,
	content: z
		.string()
		.min(1, "Content is required")
		.max(2000, "Content must be 2000 characters or less"),
	author_name: z.string(),
	author_email: z.string().email(),
	created_at: z.string().datetime(),
});

/** Stream post with comments schema */
export const StreamPostWithCommentsSchema = StreamPostSchema.extend({
	comments: z.array(StreamCommentSchema),
});

/** Stream response schema */
export const StreamResponseSchema = z.object({
	posts: z.array(StreamPostWithCommentsSchema),
});

/** POST stream request schema */
export const PostStreamRequestSchema = z.object({
	subteamId: UUIDSchema,
	content: z
		.string()
		.min(1, "Content is required")
		.max(5000, "Content must be 5000 characters or less"),
	showTournamentTimer: z.boolean().default(false).optional(),
	tournamentId: UUIDSchema.nullable().optional(),
	attachmentUrl: z.string().url().nullable().optional(),
	attachmentTitle: z.string().max(200).nullable().optional(),
});

/** PUT stream request schema */
export const PutStreamRequestSchema = z.object({
	postId: UUIDSchema,
	content: z
		.string()
		.min(1, "Content is required")
		.max(5000, "Content must be 5000 characters or less"),
	attachmentUrl: z.string().url().nullable().optional(),
	attachmentTitle: z.string().max(200).nullable().optional(),
});

/** POST stream comment request schema */
export const PostStreamCommentRequestSchema = z.object({
	postId: UUIDSchema,
	content: z
		.string()
		.min(1, "Content is required")
		.max(2000, "Content must be 2000 characters or less"),
});

// ==================== ASSIGNMENT SCHEMAS ====================

/** Assignment question schema */
export const AssignmentQuestionSchema = z.object({
	questionText: z.string().min(1, "Question text is required"),
	questionType: z.enum(["mcq", "frq", "codebusters"]),
	options: z.array(z.string()).optional(),
	correctAnswer: z.string().optional(),
	points: z.number().int().min(1).default(1).optional(),
	orderIndex: z.number().int().min(0),
	imageData: z.string().nullable().optional(),
	difficulty: z.number().min(0).max(1).default(0.5).optional(),
});

/** POST assignment request schema */
export const PostAssignmentRequestSchema = z.object({
	subteamId: UUIDSchema,
	title: z
		.string()
		.min(1, "Title is required")
		.max(200, "Title must be 200 characters or less"),
	description: z.string().max(5000).nullable().optional(),
	assignmentType: z.enum(["task", "quiz", "exam"]).default("task").optional(),
	dueDate: z.string().datetime().nullable().optional(),
	points: z.number().int().min(0).nullable().optional(),
	isRequired: z.boolean().default(true).optional(),
	maxAttempts: z.number().int().min(1).nullable().optional(),
	timeLimitMinutes: z.number().int().min(1).nullable().optional(),
	eventName: EventNameSchema.nullable().optional(),
	questions: z.array(AssignmentQuestionSchema).optional(),
	rosterMembers: z.array(z.string()).optional(), // Array of student names or user IDs
});

// ==================== SUBTEAM SCHEMAS ====================

/** POST subteam request schema */
export const PostSubteamRequestSchema = z.object({
	name: z
		.string()
		.min(1, "Subteam name is required")
		.max(100, "Subteam name must be 100 characters or less"),
	description: z.string().max(500).nullable().optional(),
});

/** PUT subteam request schema */
export const PutSubteamRequestSchema = z.object({
	name: z
		.string()
		.min(1, "Subteam name is required")
		.max(100, "Subteam name must be 100 characters or less"),
});

/** Subteam response schema */
export const SubteamResponseSchema = z.object({
	id: UUIDSchema,
	name: z.string(),
	team_id: z.string(),
	description: z.string().nullable(),
});

// ==================== INVITE SCHEMAS ====================

/** POST invite request schema */
export const PostInviteRequestSchema = z
	.object({
		username: z.string().min(1).max(100).optional(),
		email: z.string().email().optional(),
		requestedTeamUnitId: UUIDSchema.optional(),
	})
	.refine((data) => data.username || data.email, {
		message: "Either username or email is required",
	});

/** Invite response schema */
export const InviteResponseSchema = z.object({
	message: z.string(),
	invitationId: UUIDSchema.optional(),
});

// ==================== CALENDAR SCHEMAS ====================

/** GET calendar events query schema */
export const GetCalendarEventsQuerySchema = z.object({
	userId: UUIDSchema.optional(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
});

/** Event type validator */
export const EventTypeSchema = z.enum(
	["practice", "tournament", "meeting", "deadline", "other"],
	{
		message:
			"Event type must be one of: practice, tournament, meeting, deadline, other",
	},
);

/** POST calendar event request schema */
export const PostCalendarEventRequestSchema = z.object({
	teamId: UUIDSchema,
	title: z
		.string()
		.min(1, "Title is required")
		.max(200, "Title must be 200 characters or less"),
	description: z.string().max(5000).nullable().optional(),
	eventType: EventTypeSchema.default("practice"),
	startTime: z.string().datetime("Start time must be a valid ISO datetime"),
	endTime: z
		.string()
		.datetime("End time must be a valid ISO datetime")
		.nullable()
		.optional(),
	location: z.string().max(200).nullable().optional(),
	isAllDay: z.boolean().default(false).optional(),
	isRecurring: z.boolean().default(false).optional(),
	recurrencePattern: z.record(z.string(), z.any()).nullable().optional(),
	reminderMinutes: z.array(z.number().int()).default([]).optional(),
});

/** PUT calendar event request schema */
export const PutCalendarEventRequestSchema =
	PostCalendarEventRequestSchema.partial().extend({
		id: UUIDSchema,
	});

// ==================== TIMER SCHEMAS ====================

/** POST timer request schema */
export const PostTimerRequestSchema = z.object({
	subteamId: UUIDSchema,
	eventName: EventNameSchema,
	targetTime: z.string().datetime("Target time must be a valid ISO datetime"),
	title: z.string().min(1).max(200).optional(),
});

/** Timer response schema */
export const TimerResponseSchema = z.object({
	id: UUIDSchema,
	teamUnitId: UUIDSchema,
	eventName: EventNameSchema,
	targetTime: z.string().datetime(),
	title: z.string().nullable(),
	createdAt: z.string().datetime(),
});

// ==================== MEMBER SCHEMAS ====================

/** Team member schema */
export const TeamMemberSchema = z.object({
	userId: UUIDSchema,
	role: TeamRoleSchema,
	joinedAt: z.string().datetime(),
	subteamId: UUIDSchema,
	subteamName: z.string(),
	email: z.string().email(),
	displayName: z.string().nullable(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	username: z.string(),
});

/** Members response schema */
export const MembersResponseSchema = z.object({
	members: z.array(TeamMemberSchema),
	unlinked: z.array(TeamMemberSchema).optional(),
});

// ==================== UTILITY FUNCTIONS ====================

/**
 * Validates a UUID string
 * @param uuid - The UUID string to validate
 * @returns The validated UUID string
 * @throws ZodError if validation fails
 */
export function validateUUID(uuid: string): string {
	return UUIDSchema.parse(uuid);
}

/**
 * Validates a team slug
 * @param slug - The team slug to validate
 * @returns The validated slug
 * @throws ZodError if validation fails
 */
export function validateTeamSlug(slug: string): string {
	return TeamSlugSchema.parse(slug);
}

/**
 * Creates a standardized error response for validation failures
 * @param error - The Zod error
 * @returns Formatted error response
 */
export function formatValidationError(error: z.ZodError): {
	error: string;
	details: string[];
} {
	const details = error.issues.map((issue) => {
		const path = issue.path.join(".");
		return path ? `${path}: ${issue.message}` : issue.message;
	});

	return {
		error: "Validation failed",
		details,
	};
}

/**
 * Validates request body against a Zod schema
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns The validated data
 * @throws ZodError if validation fails
 */
export function validateRequest<T extends z.ZodTypeAny>(
	schema: T,
	data: unknown,
): z.infer<T> {
	return schema.parse(data);
}

// ==================== TYPE EXPORTS ====================

export type RosterDataEntry = z.infer<typeof RosterDataEntrySchema>;
export type RosterResponse = z.infer<typeof RosterResponseSchema>;
export type PostRosterRequest = z.infer<typeof PostRosterRequestSchema>;
export type StreamPost = z.infer<typeof StreamPostSchema>;
export type StreamComment = z.infer<typeof StreamCommentSchema>;
export type StreamPostWithComments = z.infer<
	typeof StreamPostWithCommentsSchema
>;
export type StreamResponse = z.infer<typeof StreamResponseSchema>;
export type PostStreamRequest = z.infer<typeof PostStreamRequestSchema>;
export type PutStreamRequest = z.infer<typeof PutStreamRequestSchema>;
export type PostStreamCommentRequest = z.infer<
	typeof PostStreamCommentRequestSchema
>;
export type PostAssignmentRequest = z.infer<typeof PostAssignmentRequestSchema>;
export type PostSubteamRequest = z.infer<typeof PostSubteamRequestSchema>;
export type PutSubteamRequest = z.infer<typeof PutSubteamRequestSchema>;
export type SubteamResponse = z.infer<typeof SubteamResponseSchema>;
export type PostInviteRequest = z.infer<typeof PostInviteRequestSchema>;
export type InviteResponse = z.infer<typeof InviteResponseSchema>;
export type PostCalendarEventRequest = z.infer<
	typeof PostCalendarEventRequestSchema
>;
export type PutCalendarEventRequest = z.infer<
	typeof PutCalendarEventRequestSchema
>;
export type PostTimerRequest = z.infer<typeof PostTimerRequestSchema>;
export type TimerResponse = z.infer<typeof TimerResponseSchema>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;
export type MembersResponse = z.infer<typeof MembersResponseSchema>;
