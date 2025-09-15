-- Create team_groups table to group subteams under one slug per (school, division)
CREATE TABLE IF NOT EXISTS team_groups (
  id SERIAL PRIMARY KEY,
  school VARCHAR(255) NOT NULL,
  division CHAR(1) NOT NULL CHECK (division IN ('B','C')),
  slug VARCHAR(32) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school, division)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_groups_slug ON team_groups(slug);
CREATE INDEX IF NOT EXISTS idx_team_groups_school_division ON team_groups(school, division);

-- Add group_id to team_units and index
ALTER TABLE team_units ADD COLUMN IF NOT EXISTS group_id INT;
ALTER TABLE team_units ADD CONSTRAINT fk_team_units_group FOREIGN KEY (group_id) REFERENCES team_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_team_units_group ON team_units(group_id);

-- Backfill groups for existing team_units (one group per school+division)
INSERT INTO team_groups (school, division, slug)
SELECT DISTINCT tu.school, tu.division, lower(substr(gen_random_uuid()::string, 1, 12)) AS slug
FROM team_units tu
LEFT JOIN team_groups tg ON tg.school = tu.school AND tg.division = tu.division
WHERE tg.id IS NULL;

-- Link existing team_units to their group
UPDATE team_units tu
SET group_id = tg.id,
    updated_at = NOW()
FROM team_groups tg
WHERE tu.group_id IS NULL AND tg.school = tu.school AND tg.division = tu.division;


