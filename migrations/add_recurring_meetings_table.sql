-- Add table for recurring meetings
CREATE TABLE new_team_recurring_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    days_of_week JSONB NOT NULL, -- Array of day numbers (0=Sunday, 1=Monday, etc.)
    start_time TIME NOT NULL, -- HH:MM format
    end_time TIME NOT NULL, -- HH:MM format
    exceptions JSONB DEFAULT '[]'::jsonb, -- Array of dates to skip (YYYY-MM-DD format)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_recurring_meetings_team_id ON new_team_recurring_meetings(team_id);
CREATE INDEX idx_recurring_meetings_created_by ON new_team_recurring_meetings(created_by);

-- Add RLS policies
ALTER TABLE new_team_recurring_meetings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view recurring meetings for teams they're members of
CREATE POLICY "Users can view recurring meetings for their teams" ON new_team_recurring_meetings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM new_team_memberships
            WHERE team_id = new_team_recurring_meetings.team_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

-- Policy: Only captains and co-captains can create recurring meetings
CREATE POLICY "Captains can create recurring meetings" ON new_team_recurring_meetings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM new_team_memberships
            WHERE team_id = new_team_recurring_meetings.team_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('captain', 'co_captain')
        )
    );

-- Policy: Only captains and co-captains can update recurring meetings
CREATE POLICY "Captains can update recurring meetings" ON new_team_recurring_meetings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM new_team_memberships
            WHERE team_id = new_team_recurring_meetings.team_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('captain', 'co_captain')
        )
    );

-- Policy: Only captains and co-captains can delete recurring meetings
CREATE POLICY "Captains can delete recurring meetings" ON new_team_recurring_meetings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM new_team_memberships
            WHERE team_id = new_team_recurring_meetings.team_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('captain', 'co_captain')
        )
    );
