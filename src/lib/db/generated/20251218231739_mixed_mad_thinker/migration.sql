CREATE TABLE "team_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"value" float NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"recorded_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_assignment_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assignment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"student_name" string,
	"total_questions" int8 DEFAULT 0,
	"correct_answers" int8 DEFAULT 0,
	"total_points" float DEFAULT 0,
	"earned_points" float DEFAULT 0,
	"time_spent_seconds" int8 DEFAULT 0,
	"completion_time_seconds" int8 DEFAULT 0,
	"start_time" timestamptz DEFAULT now(),
	"end_time" timestamptz,
	"submitted_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_assignment_question_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"submission_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"response" string NOT NULL,
	"response_text" string,
	"is_correct" bool,
	"points_earned" float DEFAULT 0,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_assignment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assignment_id" uuid NOT NULL,
	"question_text" string NOT NULL,
	"question_type" varchar(20) DEFAULT 'multiple_choice',
	"options" jsonb DEFAULT '[]',
	"correct_answer" string,
	"points" int8 DEFAULT 1,
	"order_index" int8 DEFAULT 0,
	"image_data" string,
	"difficulty" varchar(50),
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_assignment_roster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assignment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"subteam_id" uuid,
	"display_name" string,
	"student_name" string,
	"status" varchar(20) DEFAULT 'assigned',
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_assignment_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" string,
	"config" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"title" string NOT NULL,
	"description" string,
	"due_date" timestamptz,
	"status" string DEFAULT 'active' NOT NULL,
	"created_by" uuid NOT NULL,
	"assignment_type" varchar(50) DEFAULT 'standard',
	"points" int8 DEFAULT 0,
	"is_required" bool DEFAULT false,
	"max_attempts" int8 DEFAULT 1,
	"time_limit_minutes" int8,
	"event_name" varchar(255),
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_event_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'invited',
	"responded_at" timestamptz,
	"notes" string,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" string,
	"location" varchar(255),
	"start_time" timestamptz NOT NULL,
	"end_time" timestamptz NOT NULL,
	"all_day" bool DEFAULT false,
	"color" varchar(50),
	"event_type" varchar(50) DEFAULT 'general',
	"is_recurring" bool DEFAULT false,
	"recurrence_pattern" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"email" string NOT NULL,
	"invited_user_id" uuid,
	"invited_email" string,
	"role" string DEFAULT 'member' NOT NULL,
	"status" string DEFAULT 'pending' NOT NULL,
	"invited_by" uuid NOT NULL,
	"invitation_code" varchar(50),
	"token" string,
	"accepted_at" timestamptz,
	"expires_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_link_invitations" (
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
CREATE TABLE "team_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" string,
	"file_url" string NOT NULL,
	"file_type" varchar(50),
	"created_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"sender_id" uuid NOT NULL,
	"content" string NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"team_id" uuid,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" string NOT NULL,
	"is_read" bool DEFAULT false,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"user_id" uuid,
	"name" string NOT NULL,
	"is_admin" bool DEFAULT false,
	"events" jsonb DEFAULT '[]',
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"poll_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"option_indices" jsonb NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "team_poll_votes_unique" UNIQUE("poll_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "team_polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"question" string NOT NULL,
	"options" jsonb NOT NULL,
	"allow_multiple" bool DEFAULT false,
	"expires_at" timestamptz,
	"created_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_post_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"post_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"url" string NOT NULL,
	"type" varchar(50),
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_recurring_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"created_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" string,
	"location" varchar(255),
	"days_of_week" jsonb NOT NULL,
	"start_time" string,
	"end_time" string,
	"start_date" timestamptz,
	"end_date" timestamptz,
	"exceptions" jsonb DEFAULT '[]',
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_removed_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"event_name" varchar(255) NOT NULL,
	"conflict_block" varchar(255) NOT NULL,
	"removed_by" uuid NOT NULL,
	"removed_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_roster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"user_id" uuid,
	"display_name" string NOT NULL,
	"student_name" string,
	"event_name" string NOT NULL,
	"slot_index" int8 DEFAULT 0 NOT NULL,
	"role" string DEFAULT 'competitor' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "team_roster_unique" UNIQUE("team_id","subteam_id","event_name","slot_index")
);
--> statement-breakpoint
CREATE TABLE "team_stream_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" string NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_stream_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"subteam_id" uuid,
	"author_id" uuid NOT NULL,
	"title" varchar(255),
	"content" string NOT NULL,
	"post_type" varchar(20) DEFAULT 'announcement',
	"priority" varchar(10) DEFAULT 'normal',
	"is_pinned" bool DEFAULT false,
	"is_public" bool DEFAULT true,
	"show_tournament_timer" bool DEFAULT false,
	"tournament_id" uuid,
	"attachment_url" string,
	"attachment_title" string,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assignment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" jsonb DEFAULT '{}' NOT NULL,
	"status" string DEFAULT 'draft' NOT NULL,
	"attempt_number" int8 DEFAULT 1,
	"grade" float,
	"submitted_at" timestamptz,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_subteams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"name" string NOT NULL,
	"description" string,
	"display_order" int8 DEFAULT 0 NOT NULL,
	"captain_code" varchar(20),
	"user_code" varchar(20),
	"created_by" uuid,
	"status" string DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "team_subteams_name_unique" UNIQUE("team_id","name")
);
--> statement-breakpoint
DROP VIEW "new_team_member_details";--> statement-breakpoint
DROP VIEW "new_team_stats";--> statement-breakpoint
ALTER TABLE "new_team_groups" RENAME TO "team_active_timers";--> statement-breakpoint
ALTER TABLE "team_memberships" DROP CONSTRAINT "fk_team_memberships_user";--> statement-breakpoint
ALTER TABLE "team_memberships" DROP CONSTRAINT "team_memberships_team_unit_id_fkey";--> statement-breakpoint
ALTER TABLE "assignment_results" DROP CONSTRAINT "fk_assignment";--> statement-breakpoint
ALTER TABLE "team_units" DROP CONSTRAINT "team_units_group_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_memberships" DROP CONSTRAINT "new_team_memberships_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_invitations" DROP CONSTRAINT "new_team_invitations_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_posts" DROP CONSTRAINT "new_team_posts_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_post_attachments" DROP CONSTRAINT "new_team_post_attachments_post_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_events" DROP CONSTRAINT "new_team_events_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_event_attendees" DROP CONSTRAINT "new_team_event_attendees_event_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_assignments" DROP CONSTRAINT "new_team_assignments_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_assignment_submissions" DROP CONSTRAINT "new_team_assignment_submissions_assignment_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_materials" DROP CONSTRAINT "new_team_materials_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_notifications" DROP CONSTRAINT "new_team_notifications_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_analytics" DROP CONSTRAINT "new_team_analytics_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_messages" DROP CONSTRAINT "new_team_messages_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_polls" DROP CONSTRAINT "new_team_polls_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_poll_votes" DROP CONSTRAINT "new_team_poll_votes_poll_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_roster_data" DROP CONSTRAINT "new_team_roster_data_team_unit_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_recurring_meetings" DROP CONSTRAINT "new_team_recurring_meetings_team_id_fkey";--> statement-breakpoint
ALTER TABLE "roster_link_invitations" DROP CONSTRAINT "roster_link_invitations_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_assignment_questions" DROP CONSTRAINT "new_team_assignment_questions_assignment_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_assignment_roster" DROP CONSTRAINT "new_team_assignment_roster_assignment_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_assignment_roster" DROP CONSTRAINT "new_team_assignment_roster_subteam_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_assignment_question_responses" DROP CONSTRAINT "new_team_assignment_question_responses_question_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_assignment_question_responses" DROP CONSTRAINT "new_team_assignment_question_responses_submission_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_assignment_templates" DROP CONSTRAINT "new_team_assignment_templates_team_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_assignment_analytics" DROP CONSTRAINT "new_team_assignment_analytics_assignment_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_removed_events" DROP CONSTRAINT "new_team_removed_events_team_unit_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_stream_posts" DROP CONSTRAINT "new_team_stream_posts_team_unit_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_stream_posts" DROP CONSTRAINT "new_team_stream_posts_tournament_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_stream_comments" DROP CONSTRAINT "new_team_stream_comments_post_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_active_timers" DROP CONSTRAINT "new_team_active_timers_event_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_active_timers" DROP CONSTRAINT "new_team_active_timers_team_unit_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_people" DROP CONSTRAINT "new_team_people_team_unit_id_new_team_units_id_fk";--> statement-breakpoint
ALTER TABLE "teams_subteam" DROP CONSTRAINT "teams_subteam_team_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_membership" DROP CONSTRAINT "teams_membership_team_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_roster" DROP CONSTRAINT "teams_roster_subteam_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_roster" DROP CONSTRAINT "teams_roster_team_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_assignment" DROP CONSTRAINT "teams_assignment_subteam_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_assignment" DROP CONSTRAINT "teams_assignment_team_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_submission" DROP CONSTRAINT "teams_submission_assignment_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_invitation" DROP CONSTRAINT "teams_invitation_team_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_link_invitation" DROP CONSTRAINT "teams_link_invitation_team_id_teams_team_id_fk";--> statement-breakpoint
DROP TABLE "drizzle"."__drizzle_migrations";--> statement-breakpoint
DROP TABLE "new_team_active_timers";--> statement-breakpoint
DROP TABLE "new_team_analytics";--> statement-breakpoint
DROP TABLE "new_team_assignment_analytics";--> statement-breakpoint
DROP TABLE "new_team_assignment_question_responses";--> statement-breakpoint
DROP TABLE "new_team_assignment_questions";--> statement-breakpoint
DROP TABLE "new_team_assignment_roster";--> statement-breakpoint
DROP TABLE "new_team_assignment_submissions";--> statement-breakpoint
DROP TABLE "new_team_assignment_templates";--> statement-breakpoint
DROP TABLE "new_team_assignments";--> statement-breakpoint
DROP TABLE "new_team_event_attendees";--> statement-breakpoint
DROP TABLE "new_team_events";--> statement-breakpoint
DROP TABLE "new_team_invitations";--> statement-breakpoint
DROP TABLE "new_team_materials";--> statement-breakpoint
DROP TABLE "new_team_memberships";--> statement-breakpoint
DROP TABLE "new_team_messages";--> statement-breakpoint
DROP TABLE "new_team_notifications";--> statement-breakpoint
DROP TABLE "new_team_people";--> statement-breakpoint
DROP TABLE "new_team_poll_votes";--> statement-breakpoint
DROP TABLE "new_team_polls";--> statement-breakpoint
DROP TABLE "new_team_post_attachments";--> statement-breakpoint
DROP TABLE "new_team_posts";--> statement-breakpoint
DROP TABLE "new_team_recurring_meetings";--> statement-breakpoint
DROP TABLE "new_team_removed_events";--> statement-breakpoint
DROP TABLE "new_team_roster_data";--> statement-breakpoint
DROP TABLE "new_team_stream_comments";--> statement-breakpoint
DROP TABLE "new_team_stream_posts";--> statement-breakpoint
DROP TABLE "new_team_units";--> statement-breakpoint
DROP TABLE "notifications";--> statement-breakpoint
DROP TABLE "roster_link_invitations";--> statement-breakpoint
DROP TABLE "team_group_tournaments";--> statement-breakpoint
DROP TABLE "team_groups";--> statement-breakpoint
DROP TABLE "team_links";--> statement-breakpoint
DROP TABLE "team_units";--> statement-breakpoint
DROP TABLE "teams_assignment";--> statement-breakpoint
DROP TABLE "teams_invitation";--> statement-breakpoint
DROP TABLE "teams_link_invitation";--> statement-breakpoint
DROP TABLE "teams_membership";--> statement-breakpoint
DROP TABLE "teams_roster";--> statement-breakpoint
DROP TABLE "teams_submission";--> statement-breakpoint
DROP TABLE "teams_subteam";--> statement-breakpoint
DROP TABLE "teams_team";--> statement-breakpoint
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_char_length_check";--> statement-breakpoint
ALTER TABLE "base52_codes" DROP CONSTRAINT "check_table_name";--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "check_division";--> statement-breakpoint
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_check_division";--> statement-breakpoint
ALTER TABLE "team_memberships" DROP CONSTRAINT "check_role";--> statement-breakpoint
ALTER TABLE "invites_v2" DROP CONSTRAINT "invites_v2_check_division";--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP CONSTRAINT "new_team_groups_check_division";--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP CONSTRAINT "new_team_groups_status_check";--> statement-breakpoint
ALTER TABLE "gemini_explanations_cache" DROP CONSTRAINT "check_identifier";--> statement-breakpoint
DROP INDEX "idx_team_memberships_team";--> statement-breakpoint
DROP INDEX "idx_team_memberships_user";--> statement-breakpoint
DROP INDEX "team_memberships_user_id_team_unit_id_key" CASCADE;--> statement-breakpoint
DROP INDEX "idx_teams_captain_code";--> statement-breakpoint
DROP INDEX "idx_teams_school_division";--> statement-breakpoint
DROP INDEX "idx_teams_user_code";--> statement-breakpoint
DROP INDEX "teams_captain_code_key" CASCADE;--> statement-breakpoint
DROP INDEX "teams_school_division_unique" CASCADE;--> statement-breakpoint
DROP INDEX "teams_user_code_key" CASCADE;--> statement-breakpoint
DROP INDEX "idx_gemini_cache_question_hash";--> statement-breakpoint
DROP INDEX "idx_gemini_cache_question_id";--> statement-breakpoint
DROP INDEX "idx_invites_v2_invitee";--> statement-breakpoint
DROP INDEX "idx_invites_v2_team";--> statement-breakpoint
DROP INDEX "uq_pending_invite" CASCADE;--> statement-breakpoint
DROP INDEX "idx_new_team_groups_archived";--> statement-breakpoint
DROP INDEX "idx_new_team_groups_school_division";--> statement-breakpoint
DROP INDEX "idx_new_team_groups_slug";--> statement-breakpoint
DROP INDEX "idx_new_team_groups_status";--> statement-breakpoint
DROP INDEX "new_team_groups_slug_key" CASCADE;--> statement-breakpoint
DROP INDEX "idx_gemini_cache_created_at";--> statement-breakpoint
CREATE INDEX "idx_gemini_cache_created_at" ON "gemini_explanations_cache" ("created_at");--> statement-breakpoint
DROP INDEX "idx_questions_subtopics";--> statement-breakpoint
CREATE INDEX "idx_questions_subtopics" ON "questions" ("subtopics");--> statement-breakpoint
ALTER TABLE "team_active_timers" ADD COLUMN "team_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "team_active_timers" ADD COLUMN "subteam_id" uuid;--> statement-breakpoint
ALTER TABLE "team_active_timers" ADD COLUMN "event_id" string NOT NULL;--> statement-breakpoint
ALTER TABLE "team_active_timers" ADD COLUMN "added_by" uuid;--> statement-breakpoint
ALTER TABLE "team_active_timers" ADD COLUMN "added_at" timestamptz DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD COLUMN "team_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD COLUMN "status" string DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD COLUMN "joined_at" timestamptz DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD COLUMN "metadata" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD COLUMN "permissions" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "slug" string NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "name" string NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "status" string DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "settings" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "version" int8 DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "member_code" string DEFAULT substr(replace(gen_random_uuid()::STRING, '-'::STRING, ''::STRING), 1, 8) NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "description" string;--> statement-breakpoint
ALTER TABLE "team_memberships" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "team_memberships" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "team_memberships" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "school" SET DATA TYPE string;--> statement-breakpoint
ALTER TABLE "invites_v2" ALTER COLUMN "inviter_user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "division" SET DATA TYPE string;--> statement-breakpoint
ALTER TABLE "blacklists" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "team_memberships" ALTER COLUMN "role" SET DATA TYPE string;--> statement-breakpoint
ALTER TABLE "team_memberships" ALTER COLUMN "role" SET DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "edits" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "captain_code" SET DATA TYPE string;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "captain_code" SET DEFAULT substr(replace(gen_random_uuid()::STRING, '-'::STRING, ''::STRING), 1, 10);--> statement-breakpoint
ALTER TABLE "invites_v2" ALTER COLUMN "invitee_user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "edits" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "invites_v2" ALTER COLUMN "code" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "invites_v2" ALTER COLUMN "code" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "invites_v2" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP CONSTRAINT "new_team_groups_pkey", ADD CONSTRAINT "team_active_timers_pkey" PRIMARY KEY("id");--> statement-breakpoint
ALTER TABLE "team_active_timers" ADD CONSTRAINT "team_active_timers_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_active_timers" ADD CONSTRAINT "team_active_timers_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_active_timers" ADD CONSTRAINT "team_active_timers_added_by_users_id_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_analytics" ADD CONSTRAINT "team_analytics_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_assignment_analytics" ADD CONSTRAINT "team_assignment_analytics_WXGeaSTKVRA5_fkey" FOREIGN KEY ("assignment_id") REFERENCES "team_assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_assignment_analytics" ADD CONSTRAINT "team_assignment_analytics_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_assignment_question_responses" ADD CONSTRAINT "team_assignment_question_responses_7dSpmi8TEtXW_fkey" FOREIGN KEY ("submission_id") REFERENCES "team_submissions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_assignment_question_responses" ADD CONSTRAINT "team_assignment_question_responses_95L3PuXbSeTK_fkey" FOREIGN KEY ("question_id") REFERENCES "team_assignment_questions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_assignment_questions" ADD CONSTRAINT "team_assignment_questions_ykQUERuUxa3W_fkey" FOREIGN KEY ("assignment_id") REFERENCES "team_assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_assignment_roster" ADD CONSTRAINT "team_assignment_roster_assignment_id_team_assignments_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "team_assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_assignment_roster" ADD CONSTRAINT "team_assignment_roster_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_assignment_roster" ADD CONSTRAINT "team_assignment_roster_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_assignment_templates" ADD CONSTRAINT "team_assignment_templates_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_assignment_templates" ADD CONSTRAINT "team_assignment_templates_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_event_attendees" ADD CONSTRAINT "team_event_attendees_event_id_team_events_id_fkey" FOREIGN KEY ("event_id") REFERENCES "team_events"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_event_attendees" ADD CONSTRAINT "team_event_attendees_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_events" ADD CONSTRAINT "team_events_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_events" ADD CONSTRAINT "team_events_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_events" ADD CONSTRAINT "team_events_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_user_id_users_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_users_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_link_invitations" ADD CONSTRAINT "team_link_invitations_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_link_invitations" ADD CONSTRAINT "team_link_invitations_invited_by_users_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_materials" ADD CONSTRAINT "team_materials_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_materials" ADD CONSTRAINT "team_materials_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_materials" ADD CONSTRAINT "team_materials_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_invited_by_users_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_sender_id_users_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_notifications" ADD CONSTRAINT "team_notifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_notifications" ADD CONSTRAINT "team_notifications_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_people" ADD CONSTRAINT "team_people_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_people" ADD CONSTRAINT "team_people_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_people" ADD CONSTRAINT "team_people_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_poll_votes" ADD CONSTRAINT "team_poll_votes_poll_id_team_polls_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "team_polls"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_poll_votes" ADD CONSTRAINT "team_poll_votes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_polls" ADD CONSTRAINT "team_polls_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_polls" ADD CONSTRAINT "team_polls_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_polls" ADD CONSTRAINT "team_polls_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_post_attachments" ADD CONSTRAINT "team_post_attachments_post_id_team_stream_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "team_stream_posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_recurring_meetings" ADD CONSTRAINT "team_recurring_meetings_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_recurring_meetings" ADD CONSTRAINT "team_recurring_meetings_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_recurring_meetings" ADD CONSTRAINT "team_recurring_meetings_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_removed_events" ADD CONSTRAINT "team_removed_events_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_removed_events" ADD CONSTRAINT "team_removed_events_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_removed_events" ADD CONSTRAINT "team_removed_events_removed_by_users_id_fkey" FOREIGN KEY ("removed_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_roster" ADD CONSTRAINT "team_roster_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_roster" ADD CONSTRAINT "team_roster_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_roster" ADD CONSTRAINT "team_roster_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_stream_comments" ADD CONSTRAINT "team_stream_comments_post_id_team_stream_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "team_stream_posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_stream_comments" ADD CONSTRAINT "team_stream_comments_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_stream_posts" ADD CONSTRAINT "team_stream_posts_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_stream_posts" ADD CONSTRAINT "team_stream_posts_subteam_id_team_subteams_id_fkey" FOREIGN KEY ("subteam_id") REFERENCES "team_subteams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_stream_posts" ADD CONSTRAINT "team_stream_posts_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_submissions" ADD CONSTRAINT "team_submissions_assignment_id_team_assignments_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "team_assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_submissions" ADD CONSTRAINT "team_submissions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "team_subteams" ADD CONSTRAINT "team_subteams_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_subteams" ADD CONSTRAINT "team_subteams_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "assignment_results" ADD CONSTRAINT "assignment_results_assignment_id_assignments_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invites_v2" ADD CONSTRAINT "invites_v2_inviter_user_id_users_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "invites_v2" ADD CONSTRAINT "invites_v2_invitee_user_id_users_id_fkey" FOREIGN KEY ("invitee_user_id") REFERENCES "users"("id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_memberships_unique" ON "team_memberships" ("team_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_captain_code_unique" ON "teams" ("captain_code");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_member_code_unique" ON "teams" ("member_code");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_slug_key" ON "teams" ("slug");--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP COLUMN "school";--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP COLUMN "division";--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP COLUMN "settings";--> statement-breakpoint
ALTER TABLE "team_active_timers" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "team_memberships" DROP COLUMN "team_unit_id";--> statement-breakpoint
ALTER TABLE "team_memberships" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "teams";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "user_code";--> statement-breakpoint
DROP SCHEMA "drizzle";
