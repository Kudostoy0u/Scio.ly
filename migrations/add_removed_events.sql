-- Add removed events storage for conflict blocks
-- This allows teams to remove events from conflict blocks and restore them later

CREATE TABLE IF NOT EXISTS new_team_removed_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_unit_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    conflict_block VARCHAR(255) NOT NULL,
    removed_by UUID NOT NULL,
    removed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_unit_id, event_name)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_removed_events_team_unit ON new_team_removed_events(team_unit_id);
CREATE INDEX IF NOT EXISTS idx_removed_events_conflict_block ON new_team_removed_events(conflict_block);
CREATE INDEX IF NOT EXISTS idx_removed_events_team_conflict ON new_team_removed_events(team_unit_id, conflict_block);

-- Add comment
COMMENT ON TABLE new_team_removed_events IS 'Stores events that have been removed from conflict blocks by team captains';
