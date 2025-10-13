-- Add team stream posts table
-- This allows captains/leaders to post updates to the team stream

CREATE TABLE IF NOT EXISTS new_team_stream_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_unit_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    show_tournament_timer BOOLEAN DEFAULT FALSE,
    tournament_id UUID REFERENCES new_team_events(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_stream_posts_team_unit ON new_team_stream_posts(team_unit_id);
CREATE INDEX IF NOT EXISTS idx_stream_posts_author ON new_team_stream_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_stream_posts_created_at ON new_team_stream_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_posts_team_created ON new_team_stream_posts(team_unit_id, created_at DESC);

-- Add comment
COMMENT ON TABLE new_team_stream_posts IS 'Team stream posts from captains/leaders with optional tournament timer display';
