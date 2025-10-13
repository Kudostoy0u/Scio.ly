-- Remove team name from team creation and management
-- Since subteams handle naming (Varsity, JV, etc.), we only need school name

-- First, drop views that depend on the name column
DROP VIEW IF EXISTS new_team_stats;
DROP VIEW IF EXISTS new_team_member_details;

-- Remove name column from new_team_units table
ALTER TABLE new_team_units DROP COLUMN IF EXISTS name;

-- Update any existing data to use team_id as the display name
-- This ensures existing teams still work
UPDATE new_team_units SET description = CONCAT('Team ', team_id) WHERE description IS NULL OR description = '';

-- Create index for team_id lookups (since this will be the primary identifier)
CREATE INDEX IF NOT EXISTS idx_new_team_units_team_id ON new_team_units(team_id);

-- Recreate the views without the name column
CREATE VIEW new_team_member_details AS
SELECT 
    tm.id,
    tm.user_id,
    tm.team_id,
    tm.role,
    tm.status,
    tm.joined_at,
    tm.invited_by,
    tu.team_id as unit_team_id,
    tu.description,
    tu.captain_code,
    tu.user_code,
    tg.school,
    tg.division,
    tg.slug
FROM new_team_memberships tm
JOIN new_team_units tu ON tm.team_id = tu.id
JOIN new_team_groups tg ON tu.group_id = tg.id;

CREATE VIEW new_team_stats AS
SELECT 
    tu.id,
    tu.team_id,
    tu.description,
    tu.captain_code,
    tu.user_code,
    tg.school,
    tg.division,
    tg.slug,
    COUNT(tm.id) as member_count,
    COUNT(CASE WHEN tm.role = 'captain' THEN 1 END) as captain_count
FROM new_team_units tu
JOIN new_team_groups tg ON tu.group_id = tg.id
LEFT JOIN new_team_memberships tm ON tu.id = tm.team_id AND tm.status = 'active'
GROUP BY tu.id, tu.team_id, tu.description, tu.captain_code, tu.user_code, tg.school, tg.division, tg.slug;
