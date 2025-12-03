-- Add join codes and support archiving teams

ALTER TABLE teams_team ADD COLUMN IF NOT EXISTS member_code STRING;
ALTER TABLE teams_team ADD COLUMN IF NOT EXISTS captain_code STRING;

-- Populate codes for existing rows
UPDATE teams_team
SET
  member_code = COALESCE(
    member_code,
    substr(replace(gen_random_uuid()::string, '-', ''), 1, 8)
  ),
  captain_code = COALESCE(
    captain_code,
    substr(replace(gen_random_uuid()::string, '-', ''), 1, 10)
  );

ALTER TABLE teams_team ALTER COLUMN member_code SET NOT NULL;
ALTER TABLE teams_team ALTER COLUMN captain_code SET NOT NULL;
ALTER TABLE teams_team ALTER COLUMN member_code SET DEFAULT substr(replace(gen_random_uuid()::string, '-', ''), 1, 8);
ALTER TABLE teams_team ALTER COLUMN captain_code SET DEFAULT substr(replace(gen_random_uuid()::string, '-', ''), 1, 10);

ALTER TABLE teams_team ADD CONSTRAINT teams_team_member_code_unique UNIQUE (member_code);
ALTER TABLE teams_team ADD CONSTRAINT teams_team_captain_code_unique UNIQUE (captain_code);
