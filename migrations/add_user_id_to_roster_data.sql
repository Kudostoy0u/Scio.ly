-- Add user_id column to new_team_roster_data table for linking roster entries to users
ALTER TABLE new_team_roster_data 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Create index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_roster_data_user_id ON new_team_roster_data(user_id);

-- Create index for team unit and user lookups
CREATE INDEX IF NOT EXISTS idx_roster_data_team_user ON new_team_roster_data(team_unit_id, user_id);
