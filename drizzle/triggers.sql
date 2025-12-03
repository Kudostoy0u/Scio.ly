SET use_declarative_schema_changer = on;

-- Drop any existing triggers
DROP TRIGGER IF EXISTS teams_team_bump_self ON teams_team;
DROP TRIGGER IF EXISTS teams_subteam_touch ON teams_subteam;
DROP TRIGGER IF EXISTS teams_membership_touch ON teams_membership;
DROP TRIGGER IF EXISTS teams_roster_touch ON teams_roster;
DROP TRIGGER IF EXISTS teams_assignment_touch ON teams_assignment;
DROP TRIGGER IF EXISTS teams_submission_touch ON teams_submission;
DROP TRIGGER IF EXISTS teams_invitation_touch ON teams_invitation;

-- Drop old functions
DROP FUNCTION IF EXISTS teams_team_bump_self();
DROP FUNCTION IF EXISTS teams_touch_team();
DROP FUNCTION IF EXISTS teams_touch_team_direct();
DROP FUNCTION IF EXISTS teams_touch_team_from_submission();

----------------------------------------------------------------------
-- 1) BEFORE UPDATE trigger on teams_team: bump updated_at
----------------------------------------------------------------------

CREATE FUNCTION teams_team_bump_self()
RETURNS TRIGGER AS $$
BEGIN
  -- adjust column name if different
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

----------------------------------------------------------------------
-- 2) AFTER triggers for tables that have a team_id column
--    (teams_subteam, teams_membership, teams_roster,
--     teams_assignment, teams_invitation)
----------------------------------------------------------------------

CREATE FUNCTION teams_touch_team_direct()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE teams_team
       SET updated_at = now()
     WHERE id = (NEW).team_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE teams_team
       SET updated_at = now()
     WHERE id = (OLD).team_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

----------------------------------------------------------------------
-- 3) AFTER triggers for teams_submission, which has assignment_id
--    and not team_id. We go via teams_assignment(team_id).
----------------------------------------------------------------------

CREATE FUNCTION teams_touch_team_from_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id uuid;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT team_id
      INTO v_team_id
      FROM teams_assignment
     WHERE id = (NEW).assignment_id;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT team_id
      INTO v_team_id
      FROM teams_assignment
     WHERE id = (OLD).assignment_id;
  END IF;

  IF v_team_id IS NOT NULL THEN
    UPDATE teams_team
       SET updated_at = now()
     WHERE id = v_team_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

----------------------------------------------------------------------
-- Recreate triggers
----------------------------------------------------------------------

CREATE TRIGGER teams_team_bump_self
BEFORE UPDATE ON teams_team
FOR EACH ROW
EXECUTE FUNCTION teams_team_bump_self();

-- These tables are assumed to have a team_id column
CREATE TRIGGER teams_subteam_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_subteam
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team_direct();

CREATE TRIGGER teams_membership_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_membership
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team_direct();

CREATE TRIGGER teams_roster_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_roster
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team_direct();

CREATE TRIGGER teams_assignment_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_assignment
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team_direct();

-- teams_submission uses assignment_id → teams_assignment(team_id)
CREATE TRIGGER teams_submission_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_submission
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team_from_submission();

CREATE TRIGGER teams_invitation_touch
AFTER INSERT OR UPDATE OR DELETE ON teams_invitation
FOR EACH ROW
EXECUTE FUNCTION teams_touch_team_direct();
