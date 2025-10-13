-- Remove team name from team creation and management
-- Since subteams handle naming (Varsity, JV, etc.), we only need school name

-- Remove name column from new_team_units table
ALTER TABLE new_team_units DROP COLUMN IF EXISTS name;

-- Update any existing data to use team_id as the display name
-- This ensures existing teams still work
UPDATE new_team_units SET description = CONCAT('Team ', team_id) WHERE description IS NULL OR description = '';

-- Create index for team_id lookups (since this will be the primary identifier)
CREATE INDEX IF NOT EXISTS idx_new_team_units_team_id ON new_team_units(team_id);

-- Update any views that reference the name column
-- Note: This will be handled in the application layer
