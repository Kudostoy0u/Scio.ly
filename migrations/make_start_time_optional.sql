-- Make start_time optional in new_team_events table
-- This allows events to be created without specific start times

ALTER TABLE new_team_events 
ALTER COLUMN start_time DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN new_team_events.start_time IS 'Event start time - optional for all-day events or events without specific times';
