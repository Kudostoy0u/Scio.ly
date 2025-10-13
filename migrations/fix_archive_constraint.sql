-- Fix archive constraint for team memberships
-- This allows 'archived' status for team memberships when teams are archived

-- First, drop the existing constraint
ALTER TABLE new_team_memberships DROP CONSTRAINT IF EXISTS new_team_memberships_status_check;

-- Add the new constraint that includes 'archived'
ALTER TABLE new_team_memberships 
ADD CONSTRAINT new_team_memberships_status_check 
CHECK (status IN ('active', 'inactive', 'pending', 'banned', 'archived'));

-- Also ensure the team units constraint includes 'archived'
ALTER TABLE new_team_units DROP CONSTRAINT IF EXISTS new_team_units_status_check;

ALTER TABLE new_team_units 
ADD CONSTRAINT new_team_units_status_check 
CHECK (status IN ('active', 'archived', 'deleted'));

-- Ensure team groups constraint includes 'archived'
ALTER TABLE new_team_groups DROP CONSTRAINT IF EXISTS new_team_groups_status_check;

ALTER TABLE new_team_groups 
ADD CONSTRAINT new_team_groups_status_check 
CHECK (status IN ('active', 'archived', 'deleted'));
