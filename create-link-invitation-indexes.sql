-- Add indexes to teams_link_invitation table for better performance
-- Run this file with: psql <DATABASE_URL> -f create-link-invitation-indexes.sql
-- Or through CockroachDB SQL console

-- Index for looking up pending invitations by status and username
CREATE INDEX IF NOT EXISTS idx_teams_link_invitation_status_username
ON teams_link_invitation (status, invited_username);

-- Index for looking up pending invitations by team, status, and roster name
CREATE INDEX IF NOT EXISTS idx_teams_link_invitation_team_status
ON teams_link_invitation (team_id, status, roster_display_name);

-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'teams_link_invitation'
AND schemaname = 'public';
