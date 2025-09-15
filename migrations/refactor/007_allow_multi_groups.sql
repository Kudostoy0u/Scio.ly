-- Allow multiple groups per (school, division)
-- Drop the unique constraint if it exists
ALTER TABLE team_groups DROP CONSTRAINT IF EXISTS team_groups_school_division_key;

-- Ensure there is a non-unique index for performance
DROP INDEX IF EXISTS idx_team_groups_school_division;
CREATE INDEX IF NOT EXISTS idx_team_groups_school_division ON team_groups(school, division);


