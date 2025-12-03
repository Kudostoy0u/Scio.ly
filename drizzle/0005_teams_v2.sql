-- Teams v2 canonical schema
-- All tables prefixed with teams_ and share a single updated_at/version field on teams_team.

CREATE TABLE IF NOT EXISTS teams_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug STRING NOT NULL UNIQUE,
  name STRING NOT NULL,
  school STRING NOT NULL,
  division STRING NOT NULL,
  created_by UUID NOT NULL REFERENCES users (id),
  status STRING NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}',
  version INT8 NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams_subteam (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams_team (id) ON DELETE CASCADE,
  name STRING NOT NULL,
  description STRING,
  display_order INT8 NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teams_subteam_name_unique UNIQUE (team_id, lower(name))
);
CREATE INDEX IF NOT EXISTS idx_teams_subteam_team_id ON teams_subteam (team_id);

CREATE TABLE IF NOT EXISTS teams_membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams_team (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id),
  role STRING NOT NULL DEFAULT 'member',
  status STRING NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by UUID REFERENCES users (id),
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teams_membership_unique UNIQUE (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_teams_membership_team_id ON teams_membership (team_id);
CREATE INDEX IF NOT EXISTS idx_teams_membership_user_id ON teams_membership (user_id);

CREATE TABLE IF NOT EXISTS teams_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams_team (id) ON DELETE CASCADE,
  subteam_id UUID REFERENCES teams_subteam (id) ON DELETE CASCADE,
  user_id UUID REFERENCES users (id),
  display_name STRING NOT NULL,
  event_name STRING NOT NULL,
  slot_index INT8 NOT NULL DEFAULT 0,
  role STRING NOT NULL DEFAULT 'competitor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teams_roster_unique UNIQUE (team_id, subteam_id, event_name, slot_index)
);
CREATE INDEX IF NOT EXISTS idx_teams_roster_team_id ON teams_roster (team_id);
CREATE INDEX IF NOT EXISTS idx_teams_roster_subteam_id ON teams_roster (subteam_id);

CREATE TABLE IF NOT EXISTS teams_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams_team (id) ON DELETE CASCADE,
  subteam_id UUID REFERENCES teams_subteam (id) ON DELETE SET NULL,
  title STRING NOT NULL,
  description STRING,
  due_date TIMESTAMPTZ,
  status STRING NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teams_assignment_team_id ON teams_assignment (team_id);

CREATE TABLE IF NOT EXISTS teams_submission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES teams_assignment (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id),
  content JSONB NOT NULL DEFAULT '{}',
  status STRING NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  grade JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teams_submission_unique UNIQUE (assignment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_teams_submission_assignment_id ON teams_submission (assignment_id);

CREATE TABLE IF NOT EXISTS teams_invitation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams_team (id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES users (id),
  invited_email STRING,
  role STRING NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES users (id),
  status STRING NOT NULL DEFAULT 'pending',
  token STRING NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teams_invitation_team_id ON teams_invitation (team_id);

-- Version bump helpers
CREATE OR REPLACE FUNCTION teams_team_bump_self() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := COALESCE(OLD.version, 1) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION teams_touch_team() RETURNS TRIGGER AS $$
DECLARE
  target uuid;
BEGIN
  IF TG_TABLE_NAME = 'teams_submission' THEN
    SELECT team_id INTO target FROM teams_assignment WHERE id = COALESCE(NEW.assignment_id, OLD.assignment_id);
  ELSE
    target := COALESCE(NEW.team_id, OLD.team_id);
  END IF;

  IF target IS NOT NULL THEN
    UPDATE teams_team SET updated_at = now(), version = version + 1 WHERE id = target;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teams_team_bump_self ON teams_team;
CREATE TRIGGER teams_team_bump_self
BEFORE UPDATE ON teams_team
FOR EACH ROW
EXECUTE FUNCTION teams_team_bump_self();

DROP TRIGGER IF EXISTS teams_subteam_touch ON teams_subteam;
CREATE TRIGGER teams_subteam_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_subteam
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team();

DROP TRIGGER IF EXISTS teams_membership_touch ON teams_membership;
CREATE TRIGGER teams_membership_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_membership
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team();

DROP TRIGGER IF EXISTS teams_roster_touch ON teams_roster;
CREATE TRIGGER teams_roster_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_roster
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team();

DROP TRIGGER IF EXISTS teams_assignment_touch ON teams_assignment;
CREATE TRIGGER teams_assignment_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_assignment
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team();

DROP TRIGGER IF EXISTS teams_submission_touch ON teams_submission;
CREATE TRIGGER teams_submission_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_submission
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team();

DROP TRIGGER IF EXISTS teams_invitation_touch ON teams_invitation;
CREATE TRIGGER teams_invitation_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_invitation
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team();
