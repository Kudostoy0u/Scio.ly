-- Step 1: add the column only (let CockroachDB backfill job finish)
ALTER TABLE team_units ADD COLUMN IF NOT EXISTS slug VARCHAR(32);


