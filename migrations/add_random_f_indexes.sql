-- Add random_f columns and supporting indexes for indexed-random selection
-- Questions: add column and composite indexes to support filters + random seek
-- Safer phased add to avoid long-running backfill blocking schema visibility
ALTER TABLE questions ADD COLUMN IF NOT EXISTS random_f DOUBLE PRECISION;
UPDATE questions SET random_f = random() WHERE random_f IS NULL;
ALTER TABLE questions ALTER COLUMN random_f SET NOT NULL;
ALTER TABLE questions ALTER COLUMN random_f SET DEFAULT random();
CREATE INDEX IF NOT EXISTS questions_random_f_idx ON questions (random_f);
CREATE INDEX IF NOT EXISTS questions_event_random_f_idx ON questions (event, random_f);
CREATE INDEX IF NOT EXISTS questions_division_random_f_idx ON questions (division, random_f);
-- Note: subtopics is jsonb; depending on usage, consider a GIN index separately, out of scope here.

-- Quotes: add column and index by (language, random_f)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS random_f DOUBLE PRECISION;
UPDATE quotes SET random_f = random() WHERE random_f IS NULL;
ALTER TABLE quotes ALTER COLUMN random_f SET NOT NULL;
ALTER TABLE quotes ALTER COLUMN random_f SET DEFAULT random();
CREATE INDEX IF NOT EXISTS quotes_language_random_f_idx ON quotes (language, random_f);
