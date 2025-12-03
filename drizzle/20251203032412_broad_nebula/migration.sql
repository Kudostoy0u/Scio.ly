-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "drizzle";
--> statement-breakpoint
CREATE TABLE "drizzle"."__drizzle_migrations" (
	"id" int8 PRIMARY KEY DEFAULT unique_rowid(),
	"hash" string NOT NULL,
	"created_at" int8
);
--> statement-breakpoint
CREATE TABLE "api_key_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ip_address" string NOT NULL,
	"api_key_hash" string NOT NULL,
	"user_id" uuid,
	"generated_at" timestamptz DEFAULT now(),
	"created_at" timestamptz DEFAULT now(),
	CONSTRAINT "idx_api_key_generations_ip_unique" UNIQUE("ip_address")
);
--> statement-breakpoint
CREATE TABLE "assignment_results" (
	"id" int8 PRIMARY KEY DEFAULT unique_rowid(),
	"assignment_id" int8 NOT NULL,
	"user_id" varchar(255),
	"name" varchar(255),
	"event_name" varchar(255),
	"score" decimal,
	"submitted_at" timestamptz DEFAULT now() NOT NULL,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" int8 PRIMARY KEY DEFAULT unique_rowid(),
	"school" varchar(255) NOT NULL,
	"division" char NOT NULL,
	"team_id" varchar(10) NOT NULL,
	"event_name" varchar(255) NOT NULL,
	"assignees" jsonb NOT NULL,
	"params" jsonb NOT NULL,
	"questions" jsonb NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "assignments_check_division" CHECK (CHECK ((division IN ('B'::STRING, 'C'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "base52_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(5) NOT NULL,
	"question_id" uuid NOT NULL,
	"table_name" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "base52_codes_code_key" UNIQUE("code"),
	CONSTRAINT "base52_codes_unique_code" UNIQUE("code"),
	CONSTRAINT "base52_codes_unique_question" UNIQUE("question_id","table_name"),
	CONSTRAINT "check_table_name" CHECK (CHECK ((table_name IN ('questions'::STRING, 'idEvents'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "blacklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"event" varchar(255) NOT NULL,
	"question_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp()
);
--> statement-breakpoint
CREATE TABLE "edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"event" varchar(255) NOT NULL,
	"original_question" jsonb NOT NULL,
	"edited_question" jsonb NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp(),
	"updated_at" timestamp DEFAULT current_timestamp()
);
--> statement-breakpoint
CREATE TABLE "gemini_explanations_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"question_id" string,
	"question_hash" string,
	"event" string NOT NULL,
	"user_answer" string,
	"explanation" string NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	"hit_count" int8 DEFAULT 1 NOT NULL,
	CONSTRAINT "check_identifier" CHECK (CHECK (((question_id IS NOT NULL) OR (question_hash IS NOT NULL))))
);
--> statement-breakpoint
CREATE TABLE "id_events" (
	"id" uuid PRIMARY KEY,
	"question" string NOT NULL,
	"tournament" string NOT NULL,
	"division" string NOT NULL,
	"options" jsonb DEFAULT '[]',
	"answers" jsonb NOT NULL,
	"subtopics" jsonb DEFAULT '[]',
	"difficulty" decimal DEFAULT 0.5,
	"event" string NOT NULL,
	"images" jsonb DEFAULT '[]' NOT NULL,
	"random_f" float DEFAULT random(),
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	"question_type" string GENERATED ALWAYS AS (CASE WHEN (jsonb_typeof(options) = 'array') AND (jsonb_array_length(options) >= 2) THEN 'mcq' ELSE 'frq' END) STORED,
	"pure_id" bool DEFAULT false,
	"rm_type" string
);
--> statement-breakpoint
CREATE TABLE "invites_v2" (
	"id" int8 PRIMARY KEY DEFAULT unique_rowid(),
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"inviter_user_id" varchar(255) NOT NULL,
	"invitee_username" varchar(255) NOT NULL,
	"invitee_user_id" varchar(255),
	"school" varchar(255) NOT NULL,
	"division" char NOT NULL,
	"team_id" varchar(10) NOT NULL,
	"code" uuid DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	CONSTRAINT "uq_pending_invite" UNIQUE("invitee_username","school","division","team_id","status"),
	CONSTRAINT "invites_v2_check_division" CHECK (CHECK ((division IN ('B'::STRING, 'C'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "longquotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"author" string NOT NULL,
	"quote" string NOT NULL,
	"language" string NOT NULL,
	"char_length" int8 NOT NULL,
	"random_f" float DEFAULT random() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "new_team_active_timers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_unit_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"added_by" uuid NOT NULL,
	"added_at" timestamptz DEFAULT now(),
	CONSTRAINT "new_team_active_timers_team_unit_id_event_id_key" UNIQUE("team_unit_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "new_team_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"metric_value" decimal,
	"metric_data" jsonb DEFAULT '{}',
	"recorded_at" timestamptz DEFAULT now(),
	"period_start" timestamptz,
	"period_end" timestamptz
);
--> statement-breakpoint
CREATE TABLE "new_team_assignment_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assignment_id" uuid NOT NULL,
	"student_name" varchar(255) NOT NULL,
	"user_id" uuid,
	"total_questions" int8 NOT NULL,
	"correct_answers" int8 NOT NULL,
	"total_points" int8 NOT NULL,
	"earned_points" int8 NOT NULL,
	"completion_time_seconds" int8,
	"submitted_at" timestamptz NOT NULL,
	"created_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "new_team_assignment_question_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"submission_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"response_text" string,
	"response_data" jsonb,
	"is_correct" bool,
	"points_earned" int8 DEFAULT 0,
	"graded_at" timestamptz,
	"graded_by" uuid,
	CONSTRAINT "new_team_assignment_question_responses_submission_id_question_id_key" UNIQUE("submission_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "new_team_assignment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assignment_id" uuid NOT NULL,
	"question_text" string NOT NULL,
	"question_type" varchar(20) NOT NULL,
	"options" jsonb,
	"correct_answer" string,
	"points" int8 DEFAULT 1,
	"order_index" int8 NOT NULL,
	"created_at" timestamptz DEFAULT now(),
	"image_data" string,
	"difficulty" decimal(3,2) DEFAULT 0.5,
	CONSTRAINT "check_question_type" CHECK (CHECK ((question_type IN ('multiple_choice'::STRING, 'free_response'::STRING, 'codebusters'::STRING))))
);
--> statement-breakpoint
ALTER TABLE "new_team_assignment_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "new_team_assignment_roster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assignment_id" uuid NOT NULL,
	"student_name" varchar(255) NOT NULL,
	"user_id" uuid,
	"subteam_id" uuid,
	"assigned_at" timestamptz DEFAULT now(),
	CONSTRAINT "new_team_assignment_roster_assignment_id_student_name_subteam_id_key" UNIQUE("assignment_id","student_name","subteam_id")
);
--> statement-breakpoint
CREATE TABLE "new_team_assignment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assignment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" string,
	"attachments" jsonb DEFAULT '[]',
	"submitted_at" timestamptz DEFAULT now(),
	"grade" int8,
	"feedback" string,
	"status" varchar(20) DEFAULT 'submitted',
	"attempt_number" int8 DEFAULT 1,
	CONSTRAINT "new_team_assignment_submissions_assignment_id_user_id_attempt_number_key" UNIQUE("assignment_id","user_id","attempt_number"),
	CONSTRAINT "new_team_assignment_submissions_check_status" CHECK (CHECK ((status IN ('draft'::STRING, 'submitted'::STRING, 'graded'::STRING, 'returned'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "new_team_assignment_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" string,
	"event_name" varchar(255) NOT NULL,
	"question_count" int8 NOT NULL,
	"time_limit_minutes" int8,
	"question_types" jsonb,
	"subtopics" string[],
	"division" char,
	"is_public" bool DEFAULT false,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	CONSTRAINT "new_team_assignment_templates_check_division" CHECK (CHECK ((division IN ('B'::STRING, 'C'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "new_team_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" string,
	"assignment_type" varchar(20) DEFAULT 'task',
	"due_date" timestamptz,
	"points" int8,
	"is_required" bool DEFAULT true,
	"max_attempts" int8,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	"time_limit_minutes" int8,
	"event_name" varchar(255),
	CONSTRAINT "check_assignment_type" CHECK (CHECK ((assignment_type IN ('task'::STRING, 'homework'::STRING, 'project'::STRING, 'study'::STRING, 'other'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "new_team_event_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"responded_at" timestamptz,
	"notes" string,
	CONSTRAINT "new_team_event_attendees_event_id_user_id_key" UNIQUE("event_id","user_id"),
	CONSTRAINT "new_team_event_attendees_check_status" CHECK (CHECK ((status IN ('pending'::STRING, 'attending'::STRING, 'declined'::STRING, 'tentative'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "new_team_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid,
	"created_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" string,
	"event_type" varchar(20) DEFAULT 'practice',
	"start_time" timestamptz,
	"end_time" timestamptz,
	"location" varchar(255),
	"is_all_day" bool DEFAULT false,
	"is_recurring" bool DEFAULT false,
	"recurrence_pattern" jsonb,
	"reminder_minutes" int8[] DEFAULT '{15,60,1440}'::int8[],
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	CONSTRAINT "check_event_type" CHECK (CHECK ((event_type IN ('practice'::STRING, 'tournament'::STRING, 'meeting'::STRING, 'deadline'::STRING, 'other'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "new_team_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"school" varchar(255) NOT NULL,
	"division" char NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" string,
	"created_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	"settings" jsonb DEFAULT '{}',
	"status" varchar(20) DEFAULT 'active',
	CONSTRAINT "new_team_groups_slug_key" UNIQUE("slug"),
	CONSTRAINT "new_team_groups_check_division" CHECK (CHECK ((division IN ('B'::STRING, 'C'::STRING)))),
	CONSTRAINT "new_team_groups_status_check" CHECK (CHECK ((status IN ('active'::STRING, 'archived'::STRING, 'deleted'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "new_team_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"invitation_code" varchar(50) NOT NULL,
	"expires_at" timestamptz NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamptz DEFAULT now(),
	"accepted_at" timestamptz,
	"message" string,
	CONSTRAINT "new_team_invitations_invitation_code_key" UNIQUE("invitation_code"),
	CONSTRAINT "check_status" CHECK (CHECK ((status IN ('pending'::STRING, 'accepted'::STRING, 'declined'::STRING, 'expired'::STRING)))),
	CONSTRAINT "new_team_invitations_check_role" CHECK (CHECK (("role" IN ('captain'::STRING, 'co_captain'::STRING, 'member'::STRING, 'observer'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "new_team_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" string,
	"file_name" varchar(255) NOT NULL,
	"file_url" string NOT NULL,
	"file_type" varchar(50),
	"file_size" int8,
	"category" varchar(50),
	"tags" string[],
	"is_public" bool DEFAULT true,
	"download_count" int8 DEFAULT 0,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "new_team_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"joined_at" timestamptz DEFAULT now(),
	"invited_by" uuid,
	"status" varchar(20) DEFAULT 'active',
	"permissions" jsonb DEFAULT '{}',
	CONSTRAINT "new_team_memberships_user_id_team_id_key" UNIQUE("user_id","team_id"),
	CONSTRAINT "new_team_memberships_check_role" CHECK (CHECK (("role" IN ('captain'::STRING, 'co_captain'::STRING, 'member'::STRING, 'observer'::STRING)))),
	CONSTRAINT "new_team_memberships_status_check" CHECK (CHECK ((status IN ('active'::STRING, 'inactive'::STRING, 'pending'::STRING, 'banned'::STRING, 'archived'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "new_team_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" string NOT NULL,
	"message_type" varchar(20) DEFAULT 'text',
	"reply_to" uuid,
	"is_edited" bool DEFAULT false,
	"edited_at" timestamptz,
	"created_at" timestamptz DEFAULT now(),
	CONSTRAINT "check_message_type" CHECK (CHECK ((message_type IN ('text'::STRING, 'image'::STRING, 'file'::STRING, 'system'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "new_team_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" string NOT NULL,
	"data" jsonb DEFAULT '{}',
	"is_read" bool DEFAULT false,
	"created_at" timestamptz DEFAULT now(),
	"read_at" timestamptz
);
--> statement-breakpoint
CREATE TABLE "new_team_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_unit_id" uuid NOT NULL,
	"name" string NOT NULL,
	"user_id" uuid,
	"is_admin" string DEFAULT 'false',
	"events" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "new_team_poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"poll_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"selected_options" jsonb NOT NULL,
	"voted_at" timestamptz DEFAULT now(),
	CONSTRAINT "new_team_poll_votes_poll_id_user_id_key" UNIQUE("poll_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "new_team_polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"question" string NOT NULL,
	"options" jsonb NOT NULL,
	"is_anonymous" bool DEFAULT false,
	"allow_multiple" bool DEFAULT false,
	"expires_at" timestamptz,
	"created_at" timestamptz DEFAULT now(),
	"closed_at" timestamptz
);
--> statement-breakpoint
CREATE TABLE "new_team_post_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"post_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" string NOT NULL,
	"file_type" varchar(50),
	"file_size" int8,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "new_team_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title" varchar(255),
	"content" string NOT NULL,
	"post_type" varchar(20) DEFAULT 'announcement',
	"priority" varchar(10) DEFAULT 'normal',
	"is_pinned" bool DEFAULT false,
	"is_public" bool DEFAULT true,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	"scheduled_at" timestamptz,
	"expires_at" timestamptz,
	CONSTRAINT "check_post_type" CHECK (CHECK ((post_type IN ('announcement'::STRING, 'assignment'::STRING, 'material'::STRING, 'event'::STRING)))),
	CONSTRAINT "check_priority" CHECK (CHECK ((priority IN ('low'::STRING, 'normal'::STRING, 'high'::STRING, 'urgent'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "new_team_recurring_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" string,
	"location" varchar(255),
	"days_of_week" jsonb NOT NULL,
	"start_time" time,
	"end_time" time,
	"exceptions" jsonb DEFAULT '[]',
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	"start_date" date,
	"end_date" date
);
--> statement-breakpoint
ALTER TABLE "new_team_recurring_meetings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "new_team_removed_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_unit_id" uuid NOT NULL,
	"event_name" varchar(255) NOT NULL,
	"conflict_block" varchar(255) NOT NULL,
	"removed_by" uuid NOT NULL,
	"removed_at" timestamptz DEFAULT now(),
	CONSTRAINT "new_team_removed_events_team_unit_id_event_name_key" UNIQUE("team_unit_id","event_name")
);
--> statement-breakpoint
CREATE TABLE "new_team_roster_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_unit_id" uuid NOT NULL,
	"event_name" varchar(255) NOT NULL,
	"slot_index" int8 NOT NULL,
	"student_name" varchar(255),
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	"user_id" uuid,
	CONSTRAINT "new_team_roster_data_team_unit_id_event_name_slot_index_key" UNIQUE("team_unit_id","event_name","slot_index")
);
--> statement-breakpoint
CREATE TABLE "new_team_stream_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" string NOT NULL,
	"created_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "new_team_stream_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_unit_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" string NOT NULL,
	"show_tournament_timer" bool DEFAULT false,
	"tournament_id" uuid,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	"attachment_url" string,
	"attachment_title" string
);
--> statement-breakpoint
CREATE TABLE "new_team_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"group_id" uuid NOT NULL,
	"team_id" varchar(50) NOT NULL,
	"description" string,
	"captain_code" varchar(20) NOT NULL,
	"user_code" varchar(20) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	"settings" jsonb DEFAULT '{}',
	"status" varchar(20) DEFAULT 'active',
	"display_order" int8 DEFAULT 0,
	CONSTRAINT "new_team_units_captain_code_key" UNIQUE("captain_code"),
	CONSTRAINT "new_team_units_group_id_team_id_key" UNIQUE("group_id","team_id"),
	CONSTRAINT "new_team_units_user_code_key" UNIQUE("user_code"),
	CONSTRAINT "new_team_units_status_check" CHECK (CHECK ((status IN ('active'::STRING, 'archived'::STRING, 'deleted'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" int8 PRIMARY KEY DEFAULT unique_rowid(),
	"user_id" uuid NOT NULL,
	"type" string NOT NULL,
	"title" string NOT NULL,
	"body" string,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"is_read" bool DEFAULT false NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY,
	"question" string NOT NULL,
	"tournament" varchar(255) NOT NULL,
	"division" varchar(10) NOT NULL,
	"options" jsonb DEFAULT '[]',
	"answers" jsonb NOT NULL,
	"subtopics" jsonb DEFAULT '[]',
	"difficulty" decimal(3,2) DEFAULT 0.5,
	"event" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp(),
	"updated_at" timestamp DEFAULT current_timestamp(),
	"random_f" float DEFAULT random() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"author" varchar(255) NOT NULL,
	"quote" string NOT NULL,
	"language" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp(),
	"random_f" float DEFAULT random() NOT NULL,
	"char_length" int8,
	CONSTRAINT "quotes_char_length_check" CHECK (CHECK ((char_length <= 100)))
);
--> statement-breakpoint
CREATE TABLE "roster_link_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"student_name" varchar(255) NOT NULL,
	"invited_user_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamptz DEFAULT now(),
	"expires_at" timestamptz NOT NULL,
	"message" string,
	CONSTRAINT "roster_link_invitations_team_id_student_name_invited_user_id_key" UNIQUE("team_id","student_name","invited_user_id"),
	CONSTRAINT "roster_link_invitations_check_status" CHECK (CHECK ((status IN ('pending'::STRING, 'accepted'::STRING, 'declined'::STRING, 'expired'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" string NOT NULL,
	"indices" jsonb,
	"test_params_raw" jsonb NOT NULL,
	"expires_at" timestamptz NOT NULL,
	"created_at" timestamptz DEFAULT now(),
	CONSTRAINT "share_links_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "team_group_tournaments" (
	"id" int8 PRIMARY KEY DEFAULT unique_rowid(),
	"group_id" int8 NOT NULL,
	"name" string NOT NULL,
	"date_time" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_groups" (
	"id" int8 PRIMARY KEY DEFAULT unique_rowid(),
	"school" varchar(255) NOT NULL,
	"division" char NOT NULL,
	"slug" varchar(32) NOT NULL,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	CONSTRAINT "team_groups_slug_key" UNIQUE("slug"),
	CONSTRAINT "uq_team_groups_slug" UNIQUE("slug"),
	CONSTRAINT "team_groups_check_division" CHECK (CHECK ((division IN ('B'::STRING, 'C'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "team_links" (
	"id" int8 PRIMARY KEY DEFAULT unique_rowid(),
	"school" varchar(255) NOT NULL,
	"division" char NOT NULL,
	"team_id" varchar(10) NOT NULL,
	"member_name" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'linked' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "team_links_check_division" CHECK (CHECK ((division IN ('B'::STRING, 'C'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" int8 PRIMARY KEY DEFAULT unique_rowid(),
	"user_id" uuid NOT NULL,
	"team_unit_id" int8 NOT NULL,
	"role" varchar(10) NOT NULL,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	CONSTRAINT "team_memberships_user_id_team_unit_id_key" UNIQUE("user_id","team_unit_id"),
	CONSTRAINT "check_role" CHECK (CHECK (("role" IN ('captain'::STRING, 'user'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "team_units" (
	"id" int8 PRIMARY KEY DEFAULT unique_rowid(),
	"school" varchar(255) NOT NULL,
	"division" char NOT NULL,
	"team_id" varchar(8) NOT NULL,
	"name" varchar(255) NOT NULL,
	"roster" jsonb DEFAULT '{}' NOT NULL,
	"captain_code" varchar(255) NOT NULL,
	"user_code" varchar(255) NOT NULL,
	"slug" varchar(32) NOT NULL,
	"group_id" int8,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	CONSTRAINT "team_units_captain_code_key" UNIQUE("captain_code"),
	CONSTRAINT "team_units_slug_key" UNIQUE("slug"),
	CONSTRAINT "team_units_user_code_key" UNIQUE("user_code"),
	CONSTRAINT "uq_team_units_group_teamid" UNIQUE("group_id","team_id"),
	CONSTRAINT "uq_team_units_slug" UNIQUE("slug"),
	CONSTRAINT "team_units_check_division" CHECK (CHECK ((division IN ('B'::STRING, 'C'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" int8 PRIMARY KEY DEFAULT unique_rowid(),
	"school" varchar(255) NOT NULL,
	"division" char NOT NULL,
	"teams" jsonb DEFAULT '[]' NOT NULL,
	"captain_code" varchar(255) NOT NULL,
	"user_code" varchar(255) NOT NULL,
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now(),
	CONSTRAINT "teams_captain_code_key" UNIQUE("captain_code"),
	CONSTRAINT "teams_school_division_unique" UNIQUE("school","division"),
	CONSTRAINT "teams_user_code_key" UNIQUE("user_code"),
	CONSTRAINT "check_division" CHECK (CHECK ((division IN ('B'::STRING, 'C'::STRING))))
);
--> statement-breakpoint
CREATE TABLE "teams_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"title" string NOT NULL,
	"description" string,
	"due_date" timestamptz,
	"status" string DEFAULT 'open' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"invited_user_id" uuid,
	"invited_email" string,
	"role" string DEFAULT 'member' NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" string DEFAULT 'pending' NOT NULL,
	"token" string NOT NULL,
	"expires_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "teams_invitation_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "teams_link_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"roster_display_name" string NOT NULL,
	"invited_username" string NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" string DEFAULT 'pending' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" string DEFAULT 'member' NOT NULL,
	"status" string DEFAULT 'active' NOT NULL,
	"joined_at" timestamptz DEFAULT now() NOT NULL,
	"invited_by" uuid,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "teams_membership_unique" UNIQUE("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams_roster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"user_id" uuid,
	"display_name" string NOT NULL,
	"event_name" string NOT NULL,
	"slot_index" int8 DEFAULT 0 NOT NULL,
	"role" string DEFAULT 'competitor' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "teams_roster_unique" UNIQUE("team_id","subteam_id","event_name","slot_index")
);
--> statement-breakpoint
CREATE TABLE "teams_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assignment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" jsonb DEFAULT '{}' NOT NULL,
	"status" string DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamptz,
	"grade" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "teams_submission_unique" UNIQUE("assignment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams_subteam" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"name" string NOT NULL,
	"description" string,
	"display_order" int8 DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "teams_subteam_name_unique" UNIQUE("team_id",{(lower(name))})
);
--> statement-breakpoint
CREATE TABLE "teams_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" string NOT NULL,
	"name" string NOT NULL,
	"school" string NOT NULL,
	"division" string NOT NULL,
	"created_by" uuid NOT NULL,
	"status" string DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"version" int8 DEFAULT 1 NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	"member_code" string DEFAULT substr(replace(gen_random_uuid()::STRING, '-'::STRING, ''::STRING), 1, 8) NOT NULL,
	"captain_code" string DEFAULT substr(replace(gen_random_uuid()::STRING, '-'::STRING, ''::STRING), 1, 10) NOT NULL,
	CONSTRAINT "teams_team_captain_code_unique" UNIQUE("captain_code"),
	CONSTRAINT "teams_team_member_code_unique" UNIQUE("member_code"),
	CONSTRAINT "teams_team_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY,
	"email" string NOT NULL,
	"username" string NOT NULL,
	"first_name" string,
	"last_name" string,
	"display_name" string,
	"photo_url" string,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	"supabase_user_id" uuid,
	"supabase_username" string,
	CONSTRAINT "users_supabase_user_id_unique" UNIQUE("supabase_user_id"),
	CONSTRAINT "users_supabase_username_unique" UNIQUE("supabase_username"),
	CONSTRAINT "users_username_key" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "assignment_results" ADD CONSTRAINT "fk_assignment" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_units" ADD CONSTRAINT "team_units_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "team_groups"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "fk_team_memberships_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_unit_id_fkey" FOREIGN KEY ("team_unit_id") REFERENCES "team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_units" ADD CONSTRAINT "new_team_units_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "new_team_groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_memberships" ADD CONSTRAINT "new_team_memberships_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_invitations" ADD CONSTRAINT "new_team_invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_posts" ADD CONSTRAINT "new_team_posts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_post_attachments" ADD CONSTRAINT "new_team_post_attachments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "new_team_posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_events" ADD CONSTRAINT "new_team_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_event_attendees" ADD CONSTRAINT "new_team_event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "new_team_events"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_assignments" ADD CONSTRAINT "new_team_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_assignment_submissions" ADD CONSTRAINT "new_team_assignment_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "new_team_assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_materials" ADD CONSTRAINT "new_team_materials_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_notifications" ADD CONSTRAINT "new_team_notifications_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_analytics" ADD CONSTRAINT "new_team_analytics_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_messages" ADD CONSTRAINT "new_team_messages_reply_to_fkey" FOREIGN KEY ("reply_to") REFERENCES "new_team_messages"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "new_team_messages" ADD CONSTRAINT "new_team_messages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_polls" ADD CONSTRAINT "new_team_polls_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_poll_votes" ADD CONSTRAINT "new_team_poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "new_team_polls"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_roster_data" ADD CONSTRAINT "new_team_roster_data_team_unit_id_fkey" FOREIGN KEY ("team_unit_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_recurring_meetings" ADD CONSTRAINT "new_team_recurring_meetings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "roster_link_invitations" ADD CONSTRAINT "roster_link_invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_assignment_questions" ADD CONSTRAINT "new_team_assignment_questions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "new_team_assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_assignment_roster" ADD CONSTRAINT "new_team_assignment_roster_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "new_team_assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_assignment_roster" ADD CONSTRAINT "new_team_assignment_roster_subteam_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_assignment_question_responses" ADD CONSTRAINT "new_team_assignment_question_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "new_team_assignment_questions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_assignment_question_responses" ADD CONSTRAINT "new_team_assignment_question_responses_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "new_team_assignment_submissions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_assignment_templates" ADD CONSTRAINT "new_team_assignment_templates_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_assignment_analytics" ADD CONSTRAINT "new_team_assignment_analytics_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "new_team_assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_removed_events" ADD CONSTRAINT "new_team_removed_events_team_unit_id_fkey" FOREIGN KEY ("team_unit_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_stream_posts" ADD CONSTRAINT "new_team_stream_posts_team_unit_id_fkey" FOREIGN KEY ("team_unit_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_stream_posts" ADD CONSTRAINT "new_team_stream_posts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "new_team_events"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "new_team_stream_comments" ADD CONSTRAINT "new_team_stream_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "new_team_stream_posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_active_timers" ADD CONSTRAINT "new_team_active_timers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "new_team_events"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_active_timers" ADD CONSTRAINT "new_team_active_timers_team_unit_id_fkey" FOREIGN KEY ("team_unit_id") REFERENCES "new_team_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "new_team_people" ADD CONSTRAINT "new_team_people_team_unit_id_new_team_units_id_fk" FOREIGN KEY ("team_unit_id") REFERENCES "new_team_units"("id");--> statement-breakpoint
ALTER TABLE "new_team_people" ADD CONSTRAINT "new_team_people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams_team" ADD CONSTRAINT "teams_team_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams_subteam" ADD CONSTRAINT "teams_subteam_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams_subteam" ADD CONSTRAINT "teams_subteam_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams_team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teams_membership" ADD CONSTRAINT "teams_membership_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams_membership" ADD CONSTRAINT "teams_membership_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams_team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teams_membership" ADD CONSTRAINT "teams_membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams_roster" ADD CONSTRAINT "teams_roster_subteam_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "teams_subteam"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teams_roster" ADD CONSTRAINT "teams_roster_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams_team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teams_roster" ADD CONSTRAINT "teams_roster_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams_assignment" ADD CONSTRAINT "teams_assignment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams_assignment" ADD CONSTRAINT "teams_assignment_subteam_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "teams_subteam"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "teams_assignment" ADD CONSTRAINT "teams_assignment_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams_team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teams_submission" ADD CONSTRAINT "teams_submission_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "teams_assignment"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teams_submission" ADD CONSTRAINT "teams_submission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams_invitation" ADD CONSTRAINT "teams_invitation_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams_invitation" ADD CONSTRAINT "teams_invitation_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams_invitation" ADD CONSTRAINT "teams_invitation_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams_team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teams_link_invitation" ADD CONSTRAINT "teams_link_invitation_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams_link_invitation" ADD CONSTRAINT "teams_link_invitation_team_id_teams_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "teams_team"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX "base52_codes_code_idx" ON "base52_codes" ("code");--> statement-breakpoint
CREATE INDEX "base52_codes_question_table_idx" ON "base52_codes" ("question_id","table_name");--> statement-breakpoint
CREATE INDEX "idx_active_timers_added_at" ON "new_team_active_timers" ("added_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_active_timers_event" ON "new_team_active_timers" ("event_id");--> statement-breakpoint
CREATE INDEX "idx_active_timers_team_unit" ON "new_team_active_timers" ("team_unit_id");--> statement-breakpoint
CREATE INDEX "idx_api_key_generations_ip" ON "api_key_generations" ("ip_address");--> statement-breakpoint
CREATE INDEX "idx_api_key_generations_user" ON "api_key_generations" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_assignment_analytics_assignment" ON "new_team_assignment_analytics" ("assignment_id");--> statement-breakpoint
CREATE INDEX "idx_assignment_analytics_student" ON "new_team_assignment_analytics" ("student_name");--> statement-breakpoint
CREATE INDEX "idx_assignment_questions_assignment_id" ON "new_team_assignment_questions" ("assignment_id");--> statement-breakpoint
CREATE INDEX "idx_assignment_questions_order" ON "new_team_assignment_questions" ("assignment_id","order_index");--> statement-breakpoint
CREATE INDEX "idx_assignment_roster_assignment_id" ON "new_team_assignment_roster" ("assignment_id");--> statement-breakpoint
CREATE INDEX "idx_assignment_roster_student" ON "new_team_assignment_roster" ("student_name","subteam_id");--> statement-breakpoint
CREATE INDEX "idx_assignment_roster_user" ON "new_team_assignment_roster" ("user_id") WHERE user_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_assignment_templates_event" ON "new_team_assignment_templates" ("event_name");--> statement-breakpoint
CREATE INDEX "idx_assignment_templates_team" ON "new_team_assignment_templates" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_assignments_event_name" ON "new_team_assignments" ("event_name");--> statement-breakpoint
CREATE INDEX "idx_new_team_assignments_due_date" ON "new_team_assignments" ("due_date");--> statement-breakpoint
CREATE INDEX "idx_new_team_assignments_team_id" ON "new_team_assignments" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_assignments_team" ON "assignments" ("school","division","team_id");--> statement-breakpoint
CREATE INDEX "idx_blacklists_event" ON "blacklists" ("event");--> statement-breakpoint
CREATE INDEX "idx_edits_event" ON "edits" ("event");--> statement-breakpoint
CREATE INDEX "idx_gemini_cache_created_at" ON "gemini_explanations_cache" ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_gemini_cache_question_hash" ON "gemini_explanations_cache" ("question_hash","event","user_answer") WHERE question_hash IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_gemini_cache_question_id" ON "gemini_explanations_cache" ("question_id","event","user_answer") WHERE question_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_id_events_question_type" ON "id_events" ("question_type");--> statement-breakpoint
CREATE INDEX "idx_invites_v2_invitee" ON "invites_v2" ("invitee_username","status");--> statement-breakpoint
CREATE INDEX "idx_invites_v2_team" ON "invites_v2" ("school","division","team_id");--> statement-breakpoint
CREATE INDEX "idx_longquotes_char_length" ON "longquotes" ("char_length");--> statement-breakpoint
CREATE INDEX "idx_longquotes_language" ON "longquotes" ("language");--> statement-breakpoint
CREATE INDEX "idx_longquotes_language_char_length" ON "longquotes" ("language","char_length");--> statement-breakpoint
CREATE INDEX "idx_longquotes_random_f" ON "longquotes" ("random_f");--> statement-breakpoint
CREATE INDEX "idx_new_team_events_start_time" ON "new_team_events" ("start_time");--> statement-breakpoint
CREATE INDEX "idx_new_team_events_team_id" ON "new_team_events" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_new_team_groups_archived" ON "new_team_groups" ("status") WHERE status = 'archived'::STRING;--> statement-breakpoint
CREATE INDEX "idx_new_team_groups_school_division" ON "new_team_groups" ("school","division");--> statement-breakpoint
CREATE INDEX "idx_new_team_groups_slug" ON "new_team_groups" ("slug");--> statement-breakpoint
CREATE INDEX "idx_new_team_groups_status" ON "new_team_groups" ("status");--> statement-breakpoint
CREATE INDEX "idx_new_team_invitations_code" ON "new_team_invitations" ("invitation_code");--> statement-breakpoint
CREATE INDEX "idx_new_team_invitations_email" ON "new_team_invitations" ("email");--> statement-breakpoint
CREATE INDEX "idx_new_team_materials_category" ON "new_team_materials" ("category");--> statement-breakpoint
CREATE INDEX "idx_new_team_materials_team_id" ON "new_team_materials" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_new_team_memberships_archived" ON "new_team_memberships" ("status") WHERE status = 'archived'::STRING;--> statement-breakpoint
CREATE INDEX "idx_new_team_memberships_deleted" ON "new_team_memberships" ("status") WHERE status = 'deleted'::STRING;--> statement-breakpoint
CREATE INDEX "idx_new_team_memberships_role" ON "new_team_memberships" ("role");--> statement-breakpoint
CREATE INDEX "idx_new_team_memberships_status" ON "new_team_memberships" ("status");--> statement-breakpoint
CREATE INDEX "idx_new_team_memberships_team_id" ON "new_team_memberships" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_new_team_memberships_user_id" ON "new_team_memberships" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_new_team_messages_created_at" ON "new_team_messages" ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_new_team_messages_team_id" ON "new_team_messages" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_new_team_notifications_is_read" ON "new_team_notifications" ("is_read");--> statement-breakpoint
CREATE INDEX "idx_new_team_notifications_user_id" ON "new_team_notifications" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_new_team_posts_created_at" ON "new_team_posts" ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_new_team_posts_team_id" ON "new_team_posts" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_new_team_units_archived" ON "new_team_units" ("status") WHERE status = 'archived'::STRING;--> statement-breakpoint
CREATE INDEX "idx_new_team_units_codes" ON "new_team_units" ("captain_code","user_code");--> statement-breakpoint
CREATE INDEX "idx_new_team_units_deleted" ON "new_team_units" ("status") WHERE status = 'deleted'::STRING;--> statement-breakpoint
CREATE INDEX "idx_new_team_units_group_display_order" ON "new_team_units" ("group_id","display_order");--> statement-breakpoint
CREATE INDEX "idx_new_team_units_group_id" ON "new_team_units" ("group_id");--> statement-breakpoint
CREATE INDEX "idx_new_team_units_status" ON "new_team_units" ("status");--> statement-breakpoint
CREATE INDEX "idx_new_team_units_team_id" ON "new_team_units" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_question_responses_question" ON "new_team_assignment_question_responses" ("question_id");--> statement-breakpoint
CREATE INDEX "idx_question_responses_submission" ON "new_team_assignment_question_responses" ("submission_id");--> statement-breakpoint
CREATE INDEX "idx_questions_difficulty" ON "questions" ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_questions_division" ON "questions" ("division");--> statement-breakpoint
CREATE INDEX "idx_questions_event" ON "questions" ("event");--> statement-breakpoint
CREATE INDEX "idx_questions_event_division" ON "questions" ("event","division");--> statement-breakpoint
CREATE INDEX "idx_questions_event_division_difficulty" ON "questions" ("event","division","difficulty");--> statement-breakpoint
CREATE INDEX "idx_questions_subtopics" ON "questions" USING gin ("subtopics");--> statement-breakpoint
CREATE INDEX "idx_questions_tournament" ON "questions" ("tournament");--> statement-breakpoint
CREATE INDEX "questions_division_random_f_idx" ON "questions" ("division","random_f");--> statement-breakpoint
CREATE INDEX "questions_event_random_f_idx" ON "questions" ("event","random_f");--> statement-breakpoint
CREATE INDEX "questions_question_event_idx" ON "questions" ("question","event");--> statement-breakpoint
CREATE INDEX "questions_random_f_idx" ON "questions" ("random_f");--> statement-breakpoint
CREATE INDEX "idx_quotes_author" ON "quotes" ("author");--> statement-breakpoint
CREATE INDEX "idx_quotes_char_length" ON "quotes" ("char_length");--> statement-breakpoint
CREATE INDEX "idx_quotes_language" ON "quotes" ("language");--> statement-breakpoint
CREATE INDEX "idx_quotes_language_char_length" ON "quotes" ("language","char_length");--> statement-breakpoint
CREATE INDEX "idx_quotes_language_id" ON "quotes" ("language","id");--> statement-breakpoint
CREATE INDEX "quotes_language_random_f_idx" ON "quotes" ("language","random_f");--> statement-breakpoint
CREATE INDEX "idx_recurring_meetings_created_by" ON "new_team_recurring_meetings" ("created_by");--> statement-breakpoint
CREATE INDEX "idx_recurring_meetings_end_date" ON "new_team_recurring_meetings" ("end_date");--> statement-breakpoint
CREATE INDEX "idx_recurring_meetings_start_date" ON "new_team_recurring_meetings" ("start_date");--> statement-breakpoint
CREATE INDEX "idx_recurring_meetings_team_id" ON "new_team_recurring_meetings" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_removed_events_conflict_block" ON "new_team_removed_events" ("conflict_block");--> statement-breakpoint
CREATE INDEX "idx_removed_events_team_conflict" ON "new_team_removed_events" ("team_unit_id","conflict_block");--> statement-breakpoint
CREATE INDEX "idx_removed_events_team_unit" ON "new_team_removed_events" ("team_unit_id");--> statement-breakpoint
CREATE INDEX "idx_roster_data_event" ON "new_team_roster_data" ("event_name");--> statement-breakpoint
CREATE INDEX "idx_roster_data_lookup" ON "new_team_roster_data" ("team_unit_id","event_name","slot_index");--> statement-breakpoint
CREATE INDEX "idx_roster_data_team_event" ON "new_team_roster_data" ("team_unit_id","event_name");--> statement-breakpoint
CREATE INDEX "idx_roster_data_team_unit" ON "new_team_roster_data" ("team_unit_id");--> statement-breakpoint
CREATE INDEX "idx_roster_data_team_user" ON "new_team_roster_data" ("team_unit_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_roster_data_user_id" ON "new_team_roster_data" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_roster_link_invitations_team_student" ON "roster_link_invitations" ("team_id","student_name");--> statement-breakpoint
CREATE INDEX "idx_roster_link_invitations_user" ON "roster_link_invitations" ("invited_user_id");--> statement-breakpoint
CREATE INDEX "idx_share_links_code" ON "share_links" ("code");--> statement-breakpoint
CREATE INDEX "idx_share_links_expires" ON "share_links" ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_stream_comments_author" ON "new_team_stream_comments" ("author_id");--> statement-breakpoint
CREATE INDEX "idx_stream_comments_created_at" ON "new_team_stream_comments" ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_stream_comments_post_id" ON "new_team_stream_comments" ("post_id");--> statement-breakpoint
CREATE INDEX "idx_stream_posts_author" ON "new_team_stream_posts" ("author_id");--> statement-breakpoint
CREATE INDEX "idx_stream_posts_created_at" ON "new_team_stream_posts" ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_stream_posts_team_created" ON "new_team_stream_posts" ("team_unit_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_stream_posts_team_unit" ON "new_team_stream_posts" ("team_unit_id");--> statement-breakpoint
CREATE INDEX "idx_team_links_team" ON "team_links" ("school","division","team_id");--> statement-breakpoint
CREATE INDEX "idx_team_memberships_team" ON "team_memberships" ("team_unit_id");--> statement-breakpoint
CREATE INDEX "idx_team_memberships_user" ON "team_memberships" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_team_units_codes" ON "team_units" ("captain_code","user_code");--> statement-breakpoint
CREATE INDEX "idx_team_units_school_division" ON "team_units" ("school","division");--> statement-breakpoint
CREATE INDEX "idx_teams_assignment_team_id" ON "teams_assignment" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_teams_captain_code" ON "teams" ("captain_code");--> statement-breakpoint
CREATE INDEX "idx_teams_school_division" ON "teams" ("school","division");--> statement-breakpoint
CREATE INDEX "idx_teams_user_code" ON "teams" ("user_code");--> statement-breakpoint
CREATE INDEX "idx_teams_invitation_team_id" ON "teams_invitation" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_teams_membership_team_id" ON "teams_membership" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_teams_membership_user_id" ON "teams_membership" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_teams_roster_subteam_id" ON "teams_roster" ("subteam_id");--> statement-breakpoint
CREATE INDEX "idx_teams_roster_team_id" ON "teams_roster" ("team_id");--> statement-breakpoint
CREATE INDEX "idx_teams_submission_assignment_id" ON "teams_submission" ("assignment_id");--> statement-breakpoint
CREATE INDEX "idx_teams_subteam_team_id" ON "teams_subteam" ("team_id");--> statement-breakpoint
CREATE INDEX "team_group_tournaments_group_idx" ON "team_group_tournaments" ("group_id");--> statement-breakpoint
CREATE VIEW "new_team_member_details" AS (SELECT tm.id, tm.user_id, tm.team_id, tm.role, tm.status, tm.joined_at, tm.invited_by, tu.team_id AS unit_team_id, tu.description, tu.captain_code, tu.user_code, tg.school, tg.division, tg.slug FROM defaultdb.public.new_team_memberships AS tm JOIN defaultdb.public.new_team_units AS tu ON tm.team_id = tu.id JOIN defaultdb.public.new_team_groups AS tg ON tu.group_id = tg.id);--> statement-breakpoint
CREATE VIEW "new_team_stats" AS (SELECT tu.id, tu.team_id, tu.description, tu.captain_code, tu.user_code, tg.school, tg.division, tg.slug, count(tm.id) AS member_count, count(CASE WHEN tm.role = 'captain' THEN 1 END) AS captain_count FROM defaultdb.public.new_team_units AS tu JOIN defaultdb.public.new_team_groups AS tg ON tu.group_id = tg.id LEFT JOIN defaultdb.public.new_team_memberships AS tm ON (tu.id = tm.team_id) AND (tm.status = 'active') GROUP BY tu.id, tu.team_id, tu.description, tu.captain_code, tu.user_code, tg.school, tg.division, tg.slug);
*/