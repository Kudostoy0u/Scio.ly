DROP VIEW "new_team_member_details";--> statement-breakpoint
DROP VIEW "new_team_stats";--> statement-breakpoint
ALTER TABLE "assignment_results" DROP CONSTRAINT "fk_assignment";--> statement-breakpoint
ALTER TABLE "team_units" DROP CONSTRAINT "team_units_group_id_fkey";--> statement-breakpoint
ALTER TABLE "team_memberships" DROP CONSTRAINT "fk_team_memberships_user";--> statement-breakpoint
ALTER TABLE "team_memberships" DROP CONSTRAINT "team_memberships_team_unit_id_fkey";--> statement-breakpoint
ALTER TABLE "new_team_units" DROP CONSTRAINT "new_team_units_group_id_fkey";--> statement-breakpoint
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
ALTER TABLE "new_team_people" DROP CONSTRAINT "new_team_people_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "teams_team" DROP CONSTRAINT "teams_team_created_by_fkey";--> statement-breakpoint
ALTER TABLE "teams_subteam" DROP CONSTRAINT "teams_subteam_created_by_fkey";--> statement-breakpoint
ALTER TABLE "teams_subteam" DROP CONSTRAINT "teams_subteam_team_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_membership" DROP CONSTRAINT "teams_membership_invited_by_fkey";--> statement-breakpoint
ALTER TABLE "teams_membership" DROP CONSTRAINT "teams_membership_team_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_membership" DROP CONSTRAINT "teams_membership_user_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_roster" DROP CONSTRAINT "teams_roster_subteam_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_roster" DROP CONSTRAINT "teams_roster_team_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_roster" DROP CONSTRAINT "teams_roster_user_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_assignment" DROP CONSTRAINT "teams_assignment_created_by_fkey";--> statement-breakpoint
ALTER TABLE "teams_assignment" DROP CONSTRAINT "teams_assignment_subteam_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_assignment" DROP CONSTRAINT "teams_assignment_team_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_submission" DROP CONSTRAINT "teams_submission_assignment_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_submission" DROP CONSTRAINT "teams_submission_user_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_invitation" DROP CONSTRAINT "teams_invitation_invited_by_fkey";--> statement-breakpoint
ALTER TABLE "teams_invitation" DROP CONSTRAINT "teams_invitation_invited_user_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_invitation" DROP CONSTRAINT "teams_invitation_team_id_fkey";--> statement-breakpoint
ALTER TABLE "teams_link_invitation" DROP CONSTRAINT "teams_link_invitation_invited_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "teams_link_invitation" DROP CONSTRAINT "teams_link_invitation_team_id_teams_team_id_fk";--> statement-breakpoint
DROP TABLE "drizzle"."__drizzle_migrations";--> statement-breakpoint
DROP TABLE "api_key_generations";--> statement-breakpoint
DROP TABLE "assignment_results";--> statement-breakpoint
DROP TABLE "assignments";--> statement-breakpoint
DROP TABLE "base52_codes";--> statement-breakpoint
DROP TABLE "blacklists";--> statement-breakpoint
DROP TABLE "edits";--> statement-breakpoint
DROP TABLE "gemini_explanations_cache";--> statement-breakpoint
DROP TABLE "id_events";--> statement-breakpoint
DROP TABLE "invites_v2";--> statement-breakpoint
DROP TABLE "longquotes";--> statement-breakpoint
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
DROP TABLE "new_team_groups";--> statement-breakpoint
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
DROP TABLE "questions";--> statement-breakpoint
DROP TABLE "quotes";--> statement-breakpoint
DROP TABLE "roster_link_invitations";--> statement-breakpoint
DROP TABLE "share_links";--> statement-breakpoint
DROP TABLE "team_group_tournaments";--> statement-breakpoint
DROP TABLE "team_groups";--> statement-breakpoint
DROP TABLE "team_links";--> statement-breakpoint
DROP TABLE "team_memberships";--> statement-breakpoint
DROP TABLE "team_units";--> statement-breakpoint
DROP TABLE "teams";--> statement-breakpoint
DROP TABLE "teams_assignment";--> statement-breakpoint
DROP TABLE "teams_invitation";--> statement-breakpoint
DROP TABLE "teams_link_invitation";--> statement-breakpoint
DROP TABLE "teams_membership";--> statement-breakpoint
DROP TABLE "teams_roster";--> statement-breakpoint
DROP TABLE "teams_submission";--> statement-breakpoint
DROP TABLE "teams_subteam";--> statement-breakpoint
DROP TABLE "teams_team";--> statement-breakpoint
DROP TABLE "users";--> statement-breakpoint
DROP SCHEMA "drizzle";
