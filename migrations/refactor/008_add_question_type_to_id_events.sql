-- Add a generated question_type column based on options length
-- mcq if options has at least 2 entries, else frq

ALTER TABLE public.id_events
ADD COLUMN IF NOT EXISTS question_type text GENERATED ALWAYS AS (
  CASE
    WHEN jsonb_typeof(options) = 'array' AND jsonb_array_length(options) >= 2 THEN 'mcq'
    ELSE 'frq'
  END
) STORED;

-- Helpful index for filtering by question_type
CREATE INDEX IF NOT EXISTS idx_id_events_question_type ON public.id_events (question_type);


