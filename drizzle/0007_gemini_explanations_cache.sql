-- Create cache table for Gemini explanations

CREATE TABLE IF NOT EXISTS gemini_explanations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Use question ID if available, otherwise use content hash
  question_id STRING,
  question_hash STRING,

  -- Event context (same question might have different explanations for different events)
  event STRING NOT NULL,

  -- User's answer (explanations may vary based on what user answered)
  user_answer STRING,

  -- Cached explanation
  explanation TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hit_count INT NOT NULL DEFAULT 1,

  -- Ensure we have either question_id or question_hash
  CONSTRAINT check_identifier CHECK (question_id IS NOT NULL OR question_hash IS NOT NULL)
);

-- Index for quick lookups by question_id + event + user_answer
CREATE INDEX IF NOT EXISTS idx_gemini_cache_question_id
  ON gemini_explanations_cache (question_id, event, user_answer)
  WHERE question_id IS NOT NULL;

-- Index for quick lookups by question_hash + event + user_answer
CREATE INDEX IF NOT EXISTS idx_gemini_cache_question_hash
  ON gemini_explanations_cache (question_hash, event, user_answer)
  WHERE question_hash IS NOT NULL;

-- Index for cleanup of old entries (optional, for future cache eviction)
CREATE INDEX IF NOT EXISTS idx_gemini_cache_created_at
  ON gemini_explanations_cache (created_at DESC);
