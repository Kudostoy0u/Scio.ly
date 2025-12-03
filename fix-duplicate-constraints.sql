-- Fix duplicate constraint names for drizzle-kit compatibility
-- Rename check constraints to include table names for uniqueness

-- Fix check_division constraints
ALTER TABLE team_links DROP CONSTRAINT IF EXISTS check_division;
ALTER TABLE team_links ADD CONSTRAINT team_links_check_division
    CHECK (division IN ('A', 'B', 'C'));

ALTER TABLE assignments DROP CONSTRAINT IF EXISTS check_division;
ALTER TABLE assignments ADD CONSTRAINT assignments_check_division
    CHECK (division IN ('A', 'B', 'C'));

ALTER TABLE team_groups DROP CONSTRAINT IF EXISTS check_division;
ALTER TABLE team_groups ADD CONSTRAINT team_groups_check_division
    CHECK (division IN ('A', 'B', 'C'));

ALTER TABLE team_units DROP CONSTRAINT IF EXISTS check_division;
ALTER TABLE team_units ADD CONSTRAINT team_units_check_division
    CHECK (division IN ('A', 'B', 'C'));

ALTER TABLE invites_v2 DROP CONSTRAINT IF EXISTS check_division;
ALTER TABLE invites_v2 ADD CONSTRAINT invites_v2_check_division
    CHECK (division IN ('A', 'B', 'C'));

ALTER TABLE new_team_groups DROP CONSTRAINT IF EXISTS check_division;
ALTER TABLE new_team_groups ADD CONSTRAINT new_team_groups_check_division
    CHECK (division IN ('A', 'B', 'C'));

ALTER TABLE new_team_assignment_templates DROP CONSTRAINT IF EXISTS check_division;
ALTER TABLE new_team_assignment_templates ADD CONSTRAINT new_team_assignment_templates_check_division
    CHECK (division IN ('A', 'B', 'C'));

-- Fix check_role constraints
ALTER TABLE new_team_memberships DROP CONSTRAINT IF EXISTS check_role;
ALTER TABLE new_team_memberships ADD CONSTRAINT new_team_memberships_check_role
    CHECK (role IN ('member', 'captain', 'coach'));

ALTER TABLE new_team_invitations DROP CONSTRAINT IF EXISTS check_role;
ALTER TABLE new_team_invitations ADD CONSTRAINT new_team_invitations_check_role
    CHECK (role IN ('member', 'captain', 'coach'));

-- Fix check_status constraints
ALTER TABLE new_team_event_attendees DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE new_team_event_attendees ADD CONSTRAINT new_team_event_attendees_check_status
    CHECK (status IN ('attending', 'not_attending', 'maybe'));

ALTER TABLE new_team_assignment_submissions DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE new_team_assignment_submissions ADD CONSTRAINT new_team_assignment_submissions_check_status
    CHECK (status IN ('pending', 'submitted', 'graded'));

ALTER TABLE roster_link_invitations DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE roster_link_invitations ADD CONSTRAINT roster_link_invitations_check_status
    CHECK (status IN ('pending', 'accepted', 'rejected'));
