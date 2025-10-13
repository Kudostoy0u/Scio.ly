-- Add 'deleted' status support for team units
-- This migration adds 'deleted' status to the status check constraints

-- Update new_team_units status constraint
ALTER TABLE new_team_units 
DROP CONSTRAINT IF EXISTS new_team_units_status_check;

ALTER TABLE new_team_units 
ADD CONSTRAINT new_team_units_status_check 
CHECK (status IN ('active', 'archived', 'deleted'));

-- Update new_team_memberships status constraint to include 'deleted'
ALTER TABLE new_team_memberships 
DROP CONSTRAINT IF EXISTS new_team_memberships_status_check;

ALTER TABLE new_team_memberships 
ADD CONSTRAINT new_team_memberships_status_check 
CHECK (status IN ('active', 'inactive', 'pending', 'banned', 'left', 'removed', 'archived', 'deleted'));

-- Create indexes for deleted status queries
CREATE INDEX IF NOT EXISTS idx_new_team_units_deleted ON new_team_units(status) WHERE status = 'deleted';
CREATE INDEX IF NOT EXISTS idx_new_team_memberships_deleted ON new_team_memberships(status) WHERE status = 'deleted';
