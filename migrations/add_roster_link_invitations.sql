-- Add table to track roster link invitations by student name
CREATE TABLE IF NOT EXISTS roster_link_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    invited_user_id UUID NOT NULL,
    invited_by UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    message TEXT,
    UNIQUE(team_id, student_name, invited_user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_roster_link_invitations_team_student ON roster_link_invitations(team_id, student_name);
CREATE INDEX IF NOT EXISTS idx_roster_link_invitations_user ON roster_link_invitations(invited_user_id);
