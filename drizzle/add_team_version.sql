-- Add updatedAt to team groups for versioning
ALTER TABLE new_team_groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create trigger function to update team group timestamp
CREATE OR REPLACE FUNCTION update_team_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the team group's updated_at whenever related data changes
  UPDATE new_team_groups
  SET updated_at = NOW()
  WHERE id = (
    SELECT group_id
    FROM new_team_units
    WHERE id = CASE
      WHEN TG_TABLE_NAME = 'new_team_memberships' THEN NEW.team_id
      WHEN TG_TABLE_NAME = 'new_team_roster_data' THEN NEW.team_unit_id
      WHEN TG_TABLE_NAME = 'new_team_assignments' THEN NEW.team_id
      WHEN TG_TABLE_NAME = 'new_team_units' THEN NEW.id
      ELSE NULL
    END
    LIMIT 1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_team_on_membership_change ON new_team_memberships;
DROP TRIGGER IF EXISTS update_team_on_roster_change ON new_team_roster_data;
DROP TRIGGER IF EXISTS update_team_on_assignment_change ON new_team_assignments;
DROP TRIGGER IF EXISTS update_team_on_unit_change ON new_team_units;

-- Create triggers for all team-related tables
CREATE TRIGGER update_team_on_membership_change
  AFTER INSERT OR UPDATE OR DELETE ON new_team_memberships
  FOR EACH ROW EXECUTE FUNCTION update_team_group_timestamp();

CREATE TRIGGER update_team_on_roster_change
  AFTER INSERT OR UPDATE OR DELETE ON new_team_roster_data
  FOR EACH ROW EXECUTE FUNCTION update_team_group_timestamp();

CREATE TRIGGER update_team_on_assignment_change
  AFTER INSERT OR UPDATE OR DELETE ON new_team_assignments
  FOR EACH ROW EXECUTE FUNCTION update_team_group_timestamp();

CREATE TRIGGER update_team_on_unit_change
  AFTER INSERT OR UPDATE ON new_team_units
  FOR EACH ROW EXECUTE FUNCTION update_team_group_timestamp();

-- Backfill existing teams with current timestamp
UPDATE new_team_groups SET updated_at = NOW() WHERE updated_at IS NULL;
