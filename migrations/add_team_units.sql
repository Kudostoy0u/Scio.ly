-- Create normalized table for individual teams under a school/division
CREATE TABLE IF NOT EXISTS team_units (
  id SERIAL PRIMARY KEY,
  school VARCHAR(255) NOT NULL,
  division CHAR(1) NOT NULL CHECK (division IN ('B', 'C')),
  team_id VARCHAR(8) NOT NULL,
  name VARCHAR(255) NOT NULL,
  roster JSONB NOT NULL DEFAULT '{}'::jsonb,
  captain_code VARCHAR(255) UNIQUE NOT NULL,
  user_code VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(32) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_units_school_division ON team_units(school, division);
CREATE INDEX IF NOT EXISTS idx_team_units_codes ON team_units(captain_code, user_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_units_school_division_teamid ON team_units(school, division, team_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_units_slug ON team_units(slug);

-- Optional backfill from existing aggregated teams table (if present)

-- Memberships table for persisting user-team association and role
CREATE TABLE IF NOT EXISTS team_memberships (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  team_unit_id INTEGER NOT NULL REFERENCES team_units(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('captain','user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, team_unit_id)
);
CREATE INDEX IF NOT EXISTS idx_team_memberships_user ON team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON team_memberships(team_unit_id);

-- This assumes teams JSON matches shape: [{ id, name, roster }]
-- INSERT INTO team_units (school, division, team_id, name, roster, captain_code, user_code)
-- SELECT t.school,
--        t.division,
--        elem->>'id' AS team_id,
--        elem->>'name' AS name,
--        elem->'roster' AS roster,
--        t.captain_code,
--        t.user_code
-- FROM teams t,
-- LATERAL jsonb_array_elements(t.teams) AS elem;


