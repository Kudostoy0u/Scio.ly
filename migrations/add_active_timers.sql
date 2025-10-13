-- Add active timers table
-- This stores which events have active countdown timers displayed on the team stream

CREATE TABLE IF NOT EXISTS new_team_active_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_unit_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES new_team_events(id) ON DELETE CASCADE,
    added_by UUID NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_unit_id, event_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_active_timers_team_unit ON new_team_active_timers(team_unit_id);
CREATE INDEX IF NOT EXISTS idx_active_timers_event ON new_team_active_timers(event_id);
CREATE INDEX IF NOT EXISTS idx_active_timers_added_at ON new_team_active_timers(added_at DESC);

-- Add comment
COMMENT ON TABLE new_team_active_timers IS 'Stores which events have active countdown timers displayed on the team stream';
