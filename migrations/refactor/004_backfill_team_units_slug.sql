-- Step 2: backfill values in small batches (avoid backfill overlap errors)
-- Run multiple times if needed until no NULL slugs remain
UPDATE team_units
SET slug = substr(upper(encode(gen_random_bytes(16), 'hex')), 1, 12)
WHERE slug IS NULL
LIMIT 1000;


