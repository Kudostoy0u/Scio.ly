-- Step 3: enforce NOT NULL and unique index after backfill completes
ALTER TABLE team_units ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_units_slug ON team_units(slug);


