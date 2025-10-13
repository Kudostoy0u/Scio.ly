-- Add archiving support to teams tables
-- This migration adds status fields to support team archiving

-- Add status column to new_team_groups
ALTER TABLE new_team_groups 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'archived', 'deleted'));

-- Add status column to new_team_units  
ALTER TABLE new_team_units 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'archived', 'deleted'));

-- Update new_team_memberships to include 'archived' status
ALTER TABLE new_team_memberships 
DROP CONSTRAINT IF EXISTS new_team_memberships_status_check;

ALTER TABLE new_team_memberships 
ADD CONSTRAINT new_team_memberships_status_check 
CHECK (status IN ('active', 'inactive', 'pending', 'banned', 'left', 'removed', 'archived'));

-- Create indexes for status queries
CREATE INDEX IF NOT EXISTS idx_new_team_groups_status ON new_team_groups(status);
CREATE INDEX IF NOT EXISTS idx_new_team_units_status ON new_team_units(status);
CREATE INDEX IF NOT EXISTS idx_new_team_memberships_status ON new_team_memberships(status);

-- Create index for archived teams queries
CREATE INDEX IF NOT EXISTS idx_new_team_groups_archived ON new_team_groups(status) WHERE status = 'archived';
CREATE INDEX IF NOT EXISTS idx_new_team_units_archived ON new_team_units(status) WHERE status = 'archived';
CREATE INDEX IF NOT EXISTS idx_new_team_memberships_archived ON new_team_memberships(status) WHERE status = 'archived';
