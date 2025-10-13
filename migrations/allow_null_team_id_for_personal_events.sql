-- Allow NULL team_id for personal events in new_team_events table
-- This enables users to create personal events that are not associated with any team

-- First, we need to drop the NOT NULL constraint on team_id
ALTER TABLE new_team_events ALTER COLUMN team_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
-- Note: This might require dropping and recreating the foreign key constraint
-- depending on the database system

-- For CockroachDB, we can modify the constraint to allow NULL
-- The existing foreign key constraint should already handle NULL values correctly
-- since NULL values don't violate foreign key constraints

-- Add a comment to document this change
COMMENT ON COLUMN new_team_events.team_id IS 'Team unit ID for team events, NULL for personal events';
