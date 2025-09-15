-- Example RLS/permissions if querying Cockroach directly (we route via Next.js)
-- This placeholder is provided; implement as needed.
-- ALTER TABLE team_units ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY team_members_can_read ON team_units USING (
--   EXISTS(SELECT 1 FROM team_memberships m WHERE m.team_unit_id = team_units.id AND m.user_id = current_setting('app.user_id')::uuid)
-- );


