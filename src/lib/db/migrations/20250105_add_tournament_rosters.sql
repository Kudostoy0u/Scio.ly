-- Add tournament roster versions for teams
CREATE TABLE IF NOT EXISTS team_tournament_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name STRING NOT NULL,
  status STRING NOT NULL DEFAULT 'inactive',
  is_public BOOL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

ALTER TABLE team_tournament_rosters
  ADD COLUMN IF NOT EXISTS is_public BOOL DEFAULT false;

ALTER TABLE team_roster
  ADD COLUMN IF NOT EXISTS tournament_roster_id UUID;

-- Backfill active tournament rosters for existing teams and attach roster entries.
INSERT INTO team_tournament_rosters (id, team_id, name, status, created_by, created_at, updated_at)
SELECT
  gen_random_uuid(),
  teams.id,
  'Tournament 1',
  'active',
  (
    SELECT team_memberships.user_id
    FROM team_memberships
    WHERE team_memberships.team_id = teams.id
    ORDER BY team_memberships.joined_at
    LIMIT 1
  ),
  now(),
  now()
FROM teams
WHERE EXISTS (
  SELECT 1
  FROM team_memberships
  WHERE team_memberships.team_id = teams.id
)
AND NOT EXISTS (
  SELECT 1
  FROM team_tournament_rosters
  WHERE team_tournament_rosters.team_id = teams.id
    AND team_tournament_rosters.status = 'active'
);

UPDATE team_roster
SET tournament_roster_id = (
  SELECT team_tournament_rosters.id
  FROM team_tournament_rosters
  WHERE team_tournament_rosters.team_id = team_roster.team_id
    AND team_tournament_rosters.status = 'active'
  LIMIT 1
)
WHERE tournament_roster_id IS NULL;

-- Allow backfill to complete before enforcing NOT NULL or adding FK/unique index.
