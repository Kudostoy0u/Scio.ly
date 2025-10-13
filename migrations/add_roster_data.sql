-- Add roster data storage for subteams
-- This allows each subteam to have its own roster data

CREATE TABLE IF NOT EXISTS new_team_roster_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_unit_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    slot_index INTEGER NOT NULL,
    student_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_unit_id, event_name, slot_index)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_roster_data_team_unit ON new_team_roster_data(team_unit_id);
CREATE INDEX IF NOT EXISTS idx_roster_data_event ON new_team_roster_data(event_name);
CREATE INDEX IF NOT EXISTS idx_roster_data_team_event ON new_team_roster_data(team_unit_id, event_name);

-- Create index for roster queries
CREATE INDEX IF NOT EXISTS idx_roster_data_lookup ON new_team_roster_data(team_unit_id, event_name, slot_index);
